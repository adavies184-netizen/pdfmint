"""Small shared helpers for talking to Supabase from the engine."""
from __future__ import annotations

import base64
import json
from typing import Any

from fastapi import HTTPException

from .http_client import http
from .settings import SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


def rest_url(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


def service_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def service_headers(
    *,
    json_body: bool = False,
    prefer: str | None = None,
    missing_detail: str = "The database is not configured on the engine.",
) -> dict[str, str]:
    """Service-role headers. Raises 503 when the key is not configured."""
    if not service_configured():
        raise HTTPException(status_code=503, detail=missing_detail)
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    if json_body:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    return headers


def bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    return token or None


def token_claims(authorization: str | None) -> dict[str, Any]:
    """Decode (without verifying) the JWT payload. Only use after Supabase has
    verified the same token via /auth/v1/user."""
    token = bearer_token(authorization)
    if not token:
        return {}
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload.encode()).decode())
        return claims if isinstance(claims, dict) else {}
    except (ValueError, IndexError, UnicodeDecodeError):
        return {}


def has_aal2(authorization: str | None) -> bool:
    return token_claims(authorization).get("aal") == "aal2"


async def fetch_auth_user(token: str, timeout: float = 10) -> dict[str, Any] | None:
    """Return the Supabase user for a token, or None when it is not valid."""
    response = await http().get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
    if response.status_code != 200:
        return None
    return response.json()
