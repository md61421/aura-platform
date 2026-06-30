from typing import Any

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.config import settings

SUPABASE_JWT_ALGORITHM = "HS256"
SUPABASE_ASYMMETRIC_JWT_ALGORITHMS = {"ES256", "RS256"}
JWKS_CACHE_TTL_SECONDS = 300
_jwks_cache: dict[str, Any] = {"url": None, "keys": None, "expires_at": 0.0}


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


def _supabase_jwks_url() -> str | None:
    if settings.SUPABASE_JWKS_URL:
        return settings.SUPABASE_JWKS_URL
    if settings.SUPABASE_URL:
        return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return None


def _get_jwks(url: str) -> list[dict[str, Any]]:
    import time

    now = time.time()
    if _jwks_cache["url"] == url and _jwks_cache["keys"] and _jwks_cache["expires_at"] > now:
        return _jwks_cache["keys"]

    try:
        response = httpx.get(url, timeout=5)
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise auth_exception("Could not load Supabase signing keys") from exc

    keys = payload.get("keys")
    if not isinstance(keys, list):
        raise auth_exception("Supabase signing keys response is invalid")

    _jwks_cache.update(
        {
            "url": url,
            "keys": keys,
            "expires_at": now + JWKS_CACHE_TTL_SECONDS,
        }
    )
    return keys


def _get_jwks_key(token_header: dict[str, Any]) -> dict[str, Any]:
    jwks_url = _supabase_jwks_url()
    if not jwks_url:
        raise auth_config_exception()

    token_key_id = token_header.get("kid")
    keys = _get_jwks(jwks_url)
    if token_key_id:
        for key in keys:
            if key.get("kid") == token_key_id:
                return key

    if len(keys) == 1:
        return keys[0]

    raise auth_exception("Could not find matching Supabase signing key")


def verify_supabase_jwt(
    token: str,
    *,
    jwt_secret: str | None = None,
    audience: str | None = None,
    issuer: str | None = None,
) -> SupabaseJWTClaims:
    try:
        token_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise auth_exception() from exc

    token_algorithm = token_header.get("alg")
    if not isinstance(token_algorithm, str):
        raise auth_exception("Token is missing signing algorithm")

    if token_algorithm == SUPABASE_JWT_ALGORITHM:
        key = jwt_secret or settings.SUPABASE_JWT_SECRET
        if not key:
            raise auth_config_exception()
        algorithms = [SUPABASE_JWT_ALGORITHM]
    elif token_algorithm in SUPABASE_ASYMMETRIC_JWT_ALGORITHMS:
        key = _get_jwks_key(token_header)
        algorithms = [token_algorithm]
    else:
        raise auth_exception("Unsupported Supabase token signing algorithm")

    decode_kwargs: dict[str, Any] = {"key": key, "algorithms": algorithms}
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
