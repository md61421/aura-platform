from typing import Any

from fastapi import HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.config import settings

SUPABASE_JWT_ALGORITHM = "HS256"


class SupabaseJWTClaims(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None
    aud: str | list[str] | None = None
    iss: str | None = None
    exp: int | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


def auth_exception(message: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def auth_config_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Supabase authentication is not configured",
    )


def verify_supabase_jwt(
    token: str,
    *,
    jwt_secret: str | None = None,
    audience: str | None = None,
    issuer: str | None = None,
) -> SupabaseJWTClaims:
    secret = jwt_secret or settings.SUPABASE_JWT_SECRET
    if not secret:
        raise auth_config_exception()

    decode_kwargs: dict[str, Any] = {
        "key": secret,
        "algorithms": [SUPABASE_JWT_ALGORITHM],
    }
    token_audience = audience if audience is not None else settings.SUPABASE_JWT_AUDIENCE
    token_issuer = issuer if issuer is not None else settings.SUPABASE_JWT_ISSUER

    if token_audience:
        decode_kwargs["audience"] = token_audience
    if token_issuer:
        decode_kwargs["issuer"] = token_issuer

    try:
        payload = jwt.decode(token, **decode_kwargs)
    except JWTError as exc:
        raise auth_exception() from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise auth_exception("Token is missing subject")

    return SupabaseJWTClaims(
        sub=subject,
        email=payload.get("email"),
        role=payload.get("role"),
        aud=payload.get("aud"),
        iss=payload.get("iss"),
        exp=payload.get("exp"),
        raw=payload,
    )
