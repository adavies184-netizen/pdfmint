"""One pooled HTTP client for every outbound call (Supabase, Brevo).

Opening a new ``httpx.AsyncClient`` per request meant a fresh DNS lookup and
TLS handshake for every Supabase/Brevo call. A single pooled client keeps
connections warm, which is faster and lighter on CPU.
"""
from __future__ import annotations

import httpx

DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_LIMITS = httpx.Limits(max_connections=20, max_keepalive_connections=10, keepalive_expiry=30)

_client: httpx.AsyncClient | None = None


def http() -> httpx.AsyncClient:
    """Return the shared client, creating it on first use."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, limits=_LIMITS)
    return _client


async def close_http() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None
