from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.auth import SupabaseJWTClaims, auth_exception, verify_supabase_jwt
from app.core.exceptions import not_implemented_exception
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


def get_current_user_optional():
    # Authentication will be added in a later chunk.
    return None


def require_admin():
    # Admin authorization will be added in a later chunk.
    raise not_implemented_exception("Admin authentication")
