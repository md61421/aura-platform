from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.auth import SUPABASE_JWT_ALGORITHM, verify_supabase_jwt
from app.core.config import settings
from app.core.dependencies import (
    get_current_user_optional,
    get_supabase_claims_optional,
    require_admin,
    require_contributor,
    require_reviewer,
    require_supabase_claims,
    require_user,
    sync_supabase_user,
)
from app.db.models import User
from app.db.models.enums import UserRole

TEST_SECRET = "test-supabase-jwt-secret"
TEST_AUDIENCE = "authenticated"
TEST_ISSUER = "https://test-project.supabase.co/auth/v1"


def make_token(**overrides):
    now = datetime.now(UTC)
    payload = {
        "sub": str(uuid4()),
        "email": "researcher@example.org",
        "role": "authenticated",
        "aud": TEST_AUDIENCE,
        "iss": TEST_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    payload.update(overrides)
    return jwt.encode(payload, TEST_SECRET, algorithm=SUPABASE_JWT_ALGORITHM), payload


def bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class FakeUserSyncSession:
    def __init__(self, user: User | None = None):
        self.user = user
        self.added = []
        self.commits = 0
        self.flushes = 0

    def scalar(self, statement):
        return self.user

    def add(self, obj):
        self.added.append(obj)
        self.user = obj

    def flush(self):
        self.flushes += 1

    def commit(self):
        self.commits += 1


def make_claims(**overrides):
    token, _ = make_token(**overrides)
    return verify_supabase_jwt(
        token,
        jwt_secret=TEST_SECRET,
        audience=TEST_AUDIENCE,
        issuer=TEST_ISSUER,
    )


def make_user(role=UserRole.CONTRIBUTOR, *, is_active=True):
    return User(
        supabase_user_id=str(uuid4()),
        email="researcher@example.org",
        role=role,
        is_active=is_active,
    )


def test_verify_supabase_jwt_accepts_valid_token():
    token, payload = make_token()

    claims = verify_supabase_jwt(
        token,
        jwt_secret=TEST_SECRET,
        audience=TEST_AUDIENCE,
        issuer=TEST_ISSUER,
    )

    assert claims.sub == payload["sub"]
    assert claims.email == "researcher@example.org"
    assert claims.role == "authenticated"
    assert claims.raw["aud"] == TEST_AUDIENCE


def test_verify_supabase_jwt_rejects_wrong_signature():
    token, _ = make_token()

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_jwt(
            token,
            jwt_secret="wrong-secret",
            audience=TEST_AUDIENCE,
            issuer=TEST_ISSUER,
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


def test_verify_supabase_jwt_rejects_wrong_audience():
    token, _ = make_token(aud="not-aura")

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_jwt(
            token,
            jwt_secret=TEST_SECRET,
            audience=TEST_AUDIENCE,
            issuer=TEST_ISSUER,
        )

    assert exc_info.value.status_code == 401


def test_verify_supabase_jwt_rejects_missing_subject():
    token, _ = make_token(sub="")

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_jwt(
            token,
            jwt_secret=TEST_SECRET,
            audience=TEST_AUDIENCE,
            issuer=TEST_ISSUER,
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token is missing subject"


def test_verify_supabase_jwt_requires_configured_secret(monkeypatch):
    token, _ = make_token()
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", None)

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_jwt(token)

    assert exc_info.value.status_code == 503


def test_optional_claims_returns_none_without_credentials():
    assert get_supabase_claims_optional(None) is None


def test_required_claims_rejects_missing_credentials():
    with pytest.raises(HTTPException) as exc_info:
        require_supabase_claims(None)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing bearer token"


def test_dependencies_verify_bearer_credentials(monkeypatch):
    token, payload = make_token()
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(settings, "SUPABASE_JWT_AUDIENCE", TEST_AUDIENCE)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ISSUER", TEST_ISSUER)

    claims = require_supabase_claims(bearer(token))

    assert claims.sub == payload["sub"]


def test_sync_supabase_user_creates_contributor():
    claims = make_claims(
        email="new@example.org",
        user_metadata={"name": "New Researcher"},
    )
    db = FakeUserSyncSession()

    user = sync_supabase_user(db, claims)

    assert user.supabase_user_id == claims.sub
    assert user.email == "new@example.org"
    assert user.name == "New Researcher"
    assert user.role == UserRole.CONTRIBUTOR
    assert user.is_active is True
    assert db.added == [user]
    assert db.flushes == 1
    assert db.commits == 1


def test_sync_supabase_user_updates_existing_profile_without_changing_role():
    existing = User(
        supabase_user_id="existing-sub",
        email="old@example.org",
        name="Old Name",
        role=UserRole.REVIEWER,
        is_active=True,
    )
    claims = make_claims(
        sub="existing-sub",
        email="fresh@example.org",
        user_metadata={"full_name": "Fresh Name"},
    )
    db = FakeUserSyncSession(existing)

    user = sync_supabase_user(db, claims)

    assert user is existing
    assert user.email == "fresh@example.org"
    assert user.name == "Fresh Name"
    assert user.role == UserRole.REVIEWER
    assert db.added == []
    assert db.commits == 1


def test_sync_supabase_user_does_not_commit_unchanged_existing_user():
    existing = User(
        supabase_user_id="existing-sub",
        email="same@example.org",
        name="Same Name",
        role=UserRole.ADMIN,
        is_active=True,
    )
    claims = make_claims(
        sub="existing-sub",
        email="same@example.org",
        user_metadata={"display_name": "Same Name"},
    )
    db = FakeUserSyncSession(existing)

    user = sync_supabase_user(db, claims)

    assert user is existing
    assert user.role == UserRole.ADMIN
    assert db.commits == 0


def test_get_current_user_optional_syncs_when_claims_exist():
    claims = make_claims()
    db = FakeUserSyncSession()

    user = get_current_user_optional(claims=claims, db=db)

    assert user.supabase_user_id == claims.sub
    assert db.commits == 1


def test_get_current_user_optional_returns_none_without_claims():
    assert get_current_user_optional(claims=None, db=FakeUserSyncSession()) is None


def test_require_user_rejects_missing_user():
    with pytest.raises(HTTPException) as exc_info:
        require_user(None)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing bearer token"


def test_require_user_rejects_inactive_user():
    with pytest.raises(HTTPException) as exc_info:
        require_user(make_user(is_active=False))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "User account is inactive"


def test_require_user_accepts_active_user():
    user = make_user()

    assert require_user(user) is user


@pytest.mark.parametrize(
    "role",
    [UserRole.CONTRIBUTOR, UserRole.REVIEWER, UserRole.ADMIN],
)
def test_require_contributor_accepts_contributor_and_above(role):
    user = make_user(role)

    assert require_contributor(user) is user


def test_require_contributor_rejects_public_user():
    with pytest.raises(HTTPException) as exc_info:
        require_contributor(make_user(UserRole.PUBLIC_USER))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Contributor access required"


@pytest.mark.parametrize("role", [UserRole.REVIEWER, UserRole.ADMIN])
def test_require_reviewer_accepts_reviewer_and_admin(role):
    user = make_user(role)

    assert require_reviewer(user) is user


def test_require_reviewer_rejects_contributor():
    with pytest.raises(HTTPException) as exc_info:
        require_reviewer(make_user(UserRole.CONTRIBUTOR))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Reviewer access required"


def test_require_admin_accepts_admin():
    user = make_user(UserRole.ADMIN)

    assert require_admin(user) is user


@pytest.mark.parametrize("role", [UserRole.PUBLIC_USER, UserRole.CONTRIBUTOR, UserRole.REVIEWER])
def test_require_admin_rejects_non_admin(role):
    with pytest.raises(HTTPException) as exc_info:
        require_admin(make_user(role))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Admin access required"
