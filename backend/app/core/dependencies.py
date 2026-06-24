from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import SupabaseJWTClaims, auth_exception, verify_supabase_jwt
from app.core.exceptions import not_implemented_exception
from app.db.models import User
from app.db.models.enums import UserRole
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_supabase_claims_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> SupabaseJWTClaims | None:
    if credentials is None:
        return None
    return verify_supabase_jwt(credentials.credentials)


def require_supabase_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> SupabaseJWTClaims:
    if credentials is None:
        raise auth_exception("Missing bearer token")
    return verify_supabase_jwt(credentials.credentials)


def _claim_name(claims: SupabaseJWTClaims) -> str | None:
    user_metadata = claims.raw.get("user_metadata")
    if not isinstance(user_metadata, dict):
        return None

    for key in ("name", "full_name", "display_name"):
        value = user_metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def sync_supabase_user(db: Session, claims: SupabaseJWTClaims) -> User:
    user = db.scalar(select(User).where(User.supabase_user_id == claims.sub))
    name = _claim_name(claims)

    if user:
        changed = False
        if claims.email:
            changed = changed or user.email != claims.email
            user.email = claims.email
        if name:
            changed = changed or user.name != name
            user.name = name
        if changed:
            db.commit()
        return user

    user = User(
        supabase_user_id=claims.sub,
        email=claims.email,
        name=name,
        role=UserRole.CONTRIBUTOR,
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.commit()
    return user


def get_current_user_optional(
    claims: Annotated[SupabaseJWTClaims | None, Depends(get_supabase_claims_optional)],
    db: Annotated[Session, Depends(get_db_session)],
) -> User | None:
    if claims is None:
        return None
    return sync_supabase_user(db, claims)


def require_admin():
    # Admin authorization will be added in a later chunk.
    raise not_implemented_exception("Admin authentication")
