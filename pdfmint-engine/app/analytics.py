from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import Header, HTTPException, Request
from pydantic import BaseModel, Field

from .settings import SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


EVENT_NAMES = {
    "landing_view",
    "upload_clicked",
    "editor_opened",
    "editor_tool_used",
    "download_clicked",
    "email_entered",
    "payment_plan_viewed",
    "payment_card_viewed",
    "purchase_complete",
}


class AnalyticsEventRequest(BaseModel):
    session_id: str = Field(pattern=r"^[A-Za-z0-9_-]{16,80}$")
    event_name: str = Field(pattern=r"^[a-z_]{3,40}$")
    event_value: str = Field(default="", max_length=80)
    landing_page: str = Field(default="unknown", max_length=120)
    page_path: str = Field(default="", max_length=220)


def _service_headers() -> dict[str, str]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Analytics storage is not configured.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def _optional_user_id(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    token = authorization.split(" ", 1)[1].strip()
    async with httpx.AsyncClient(timeout=5) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
        )
    if response.status_code != 200:
        return None
    return response.json().get("id")


async def store_analytics_event(
    payload: AnalyticsEventRequest,
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, bool]:
    if payload.event_name not in EVENT_NAMES:
        raise HTTPException(status_code=400, detail="Unknown analytics event.")

    record: dict[str, Any] = {
        "session_id": payload.session_id,
        "event_name": payload.event_name,
        "event_value": payload.event_value.strip().lower(),
        "landing_page": payload.landing_page.strip().lower() or "unknown",
        "page_path": payload.page_path.strip(),
        "user_agent": (request.headers.get("user-agent") or "")[:300],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    user_id = await _optional_user_id(authorization)
    if user_id:
        record["user_id"] = user_id

    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/analytics_events?on_conflict=session_id,event_name,event_value",
            headers={**_service_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=record,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail="The analytics event could not be stored.")
    return {"recorded": True}


async def store_server_event(
    *,
    session_id: str,
    event_name: str,
    event_value: str = "",
    landing_page: str = "unknown",
    page_path: str = "",
    user_id: str | None = None,
) -> None:
    if not session_id or event_name not in EVENT_NAMES or not SUPABASE_SERVICE_ROLE_KEY:
        return
    record: dict[str, Any] = {
        "session_id": session_id[:80],
        "event_name": event_name,
        "event_value": event_value[:80].lower(),
        "landing_page": landing_page[:120].lower() or "unknown",
        "page_path": page_path[:220],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if user_id:
        record["user_id"] = user_id
    async with httpx.AsyncClient(timeout=8) as client:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/analytics_events?on_conflict=session_id,event_name,event_value",
            headers={**_service_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=record,
        )
