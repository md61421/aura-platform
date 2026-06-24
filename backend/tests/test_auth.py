from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.auth import SUPABASE_JWT_ALGORITHM, verify_supabase_jwt
from app.core.config import settings
from app.core.dependencies import get_supabase_claims_optional, require_supabase_claims

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
