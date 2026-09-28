from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Any
from urllib.parse import urlparse

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

LIVE_SITE_HOSTS = {"pdfbreeze.net", "www.pdfbreeze.net"}
BOT_USER_AGENT = re.compile(
    r"bot|crawler|spider|slurp|headlesschrome|lighthouse|pagespeed|preview|facebookexternalhit",
    re.IGNORECASE,
)


class AnalyticsEventRequest(BaseModel):
    session_id: str = Field(pattern=r"^[A-Za-z0-9_-]{16,80}$")
    event_name: str = Field(pattern=r"^[a-z_]{3,40}$")
    event_value: str = Field(default="", max_length=80)
    landing_page: str = Field(default="unknown", max_length=120)
    page_path: str = Field(default="", max_length=220)


class CookieConsentEventRequest(BaseModel):
    visitor_id: str = Field(pattern=r"^consent_[A-Za-z0-9_-]{16,64}$")
    event_name: str = Field(pattern=r"^(banner_shown|accept_all|reject_all|settings_opened|preferences_saved)$")
    statistics: bool | None = None
    marketing: bool | None = None


def _service_headers() -> dict[str, str]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Analytics storage is not configured.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _is_live_browser_request(request: Request) -> bool:
    origin = (request.headers.get("origin") or "").strip()
    referer = (request.headers.get("referer") or "").strip()
    candidate = origin or referer
    if not candidate:
        return False
    parsed = urlparse(candidate)
    return parsed.scheme == "https" and (parsed.hostname or "").lower() in LIVE_SITE_HOSTS


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
    user_agent = (request.headers.get("user-agent") or "")[:300]
    if (
        not payload.session_id.startswith("live_")
        or not _is_live_browser_request(request)
        or BOT_USER_AGENT.search(user_agent)
    ):
        return {"recorded": False}

    record: dict[str, Any] = {
        "session_id": payload.session_id,
        "event_name": payload.event_name,
        "event_value": payload.event_value.strip().lower(),
        "landing_page": payload.landing_page.strip().lower() or "unknown",
        "page_path": payload.page_path.strip(),
        "user_agent": user_agent,
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
    if (
        not session_id.startswith("live_")
        or event_name not in EVENT_NAMES
        or not SUPABASE_SERVICE_ROLE_KEY
    ):
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


async def store_cookie_consent_event(payload: CookieConsentEventRequest, request: Request) -> dict[str, bool]:
    """Record anonymous, aggregate consent interactions without loading analytics tags."""
    user_agent = (request.headers.get("user-agent") or "")[:300]
    if not _is_live_browser_request(request) or BOT_USER_AGENT.search(user_agent):
        return {"recorded": False}

    now = datetime.now(timezone.utc).isoformat()
    record: dict[str, Any] = {"visitor_id": payload.visitor_id, "last_seen_at": now}
    if payload.event_name == "banner_shown":
        record["banner_shown"] = True
    elif payload.event_name == "settings_opened":
        record["settings_opened"] = True
    elif payload.event_name == "accept_all":
        record.update({"accepted_all": True, "statistics": True, "marketing": True, "decided_at": now})
    elif payload.event_name == "reject_all":
        record.update({"rejected_all": True, "statistics": False, "marketing": False, "decided_at": now})
    else:
        if payload.statistics is None or payload.marketing is None:
            raise HTTPException(status_code=400, detail="Saved preferences require category choices.")
        record.update({
            "preferences_saved": True,
            "statistics": payload.statistics,
            "marketing": payload.marketing,
            "decided_at": now,
        })

    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/cookie_consent_visitors?on_conflict=visitor_id",
            headers={**_service_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=record,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail="The consent interaction could not be stored.")
    return {"recorded": True}
