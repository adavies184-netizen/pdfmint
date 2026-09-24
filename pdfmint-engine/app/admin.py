from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
import base64
import json

import httpx
from fastapi import Header, HTTPException, Query
from pydantic import BaseModel, Field

from .billing import authenticated_user
from .settings import ADMIN_EMAILS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


def _service_headers() -> dict[str, str]:
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Admin reporting is not configured.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }


async def _rows(client: httpx.AsyncClient, table: str, select: str) -> list[dict[str, Any]]:
    response = await client.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=_service_headers(),
        params={"select": select, "order": "created_at.desc"},
    )
    if response.is_error:
        raise HTTPException(status_code=502, detail=f"Could not load {table} for the admin dashboard.")
    return response.json()


class ProviderSelectionRequest(BaseModel):
    provider: str = Field(pattern="^[a-z0-9_-]{2,40}$")


FUNNEL_STAGES = [
    ("landing_view", "Landing-page visit"),
    ("upload_clicked", "Upload clicked"),
    ("editor_opened", "Editor opened"),
    ("download_clicked", "Download clicked"),
    ("email_entered", "Email entered"),
    ("payment_plan_viewed", "Payment wall · plans"),
    ("payment_card_viewed", "Payment wall · card"),
    ("purchase_complete", "Purchase complete"),
]


def build_funnel_report(
    events: list[dict[str, Any]],
    profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    sessions_by_event: dict[str, set[str]] = {name: set() for name, _ in FUNNEL_STAGES}
    tools: dict[str, set[str]] = {}
    landing_pages: dict[str, set[str]] = {}
    journeys: dict[str, dict[str, Any]] = {}
    profile_email = {row.get("id"): row.get("email") for row in profiles}

    for event in events:
        session_id = str(event.get("session_id") or "")
        if not session_id:
            continue
        event_name = str(event.get("event_name") or "")
        event_value = str(event.get("event_value") or "")
        landing_page = str(event.get("landing_page") or "unknown")
        created_at = str(event.get("created_at") or "")
        if event_name in sessions_by_event:
            sessions_by_event[event_name].add(session_id)
        if event_name == "editor_tool_used" and event_value:
            tools.setdefault(event_value, set()).add(session_id)
        if event_name == "landing_view":
            landing_pages.setdefault(landing_page, set()).add(session_id)

        journey = journeys.setdefault(session_id, {
            "session_id": session_id,
            "user_id": event.get("user_id"),
            "landing_page": landing_page,
            "tools": set(),
            "last_stage": "Landing-page visit",
            "last_event_at": created_at,
            "stage_index": -1,
        })
        if event.get("user_id"):
            journey["user_id"] = event.get("user_id")
        if journey["landing_page"] == "unknown" and landing_page != "unknown":
            journey["landing_page"] = landing_page
        if event_name == "editor_tool_used" and event_value:
            journey["tools"].add(event_value)
        stage_index = next((index for index, item in enumerate(FUNNEL_STAGES) if item[0] == event_name), -1)
        if stage_index >= journey["stage_index"]:
            journey["stage_index"] = stage_index
            journey["last_stage"] = FUNNEL_STAGES[stage_index][1]
        if created_at > journey["last_event_at"]:
            journey["last_event_at"] = created_at

    stages = []
    first_count = len(sessions_by_event["landing_view"])
    previous_count = first_count
    for event_name, label in FUNNEL_STAGES:
        count = len(sessions_by_event[event_name])
        stages.append({
            "event": event_name,
            "label": label,
            "count": count,
            "original_rate": round((count / first_count * 100) if first_count else 0, 1),
            "previous_rate": round((count / previous_count * 100) if previous_count else 0, 1),
            "dropped": max(0, previous_count - count),
        })
        previous_count = count

    journey_rows = []
    for journey in sorted(journeys.values(), key=lambda item: item["last_event_at"], reverse=True)[:50]:
        user_id = journey.get("user_id")
        journey_rows.append({
            "session_id": journey["session_id"],
            "visitor": profile_email.get(user_id) or f"Visitor {journey['session_id'][:8]}",
            "landing_page": journey["landing_page"],
            "tools": sorted(journey["tools"]),
            "last_stage": journey["last_stage"],
            "last_event_at": journey["last_event_at"],
        })

    return {
        "stages": stages,
        "tools": [
            {"name": name, "sessions": len(session_ids)}
            for name, session_ids in sorted(tools.items(), key=lambda item: (-len(item[1]), item[0]))
        ],
        "landing_pages": [
            {"name": name, "sessions": len(session_ids)}
            for name, session_ids in sorted(landing_pages.items(), key=lambda item: (-len(item[1]), item[0]))
        ],
        "journeys": journey_rows,
    }


async def _require_admin(authorization: str | None) -> dict[str, Any]:
    user = await authenticated_user(authorization)
    email = str(user.get("email") or "").lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="This account is not a PDFBreeze administrator.")
    try:
        token = authorization.split(" ", 1)[1]
        encoded_claims = token.split(".")[1]
        encoded_claims += "=" * (-len(encoded_claims) % 4)
        claims = json.loads(base64.urlsafe_b64decode(encoded_claims))
    except (ValueError, IndexError, json.JSONDecodeError):
        claims = {}
    if claims.get("aal") != "aal2":
        raise HTTPException(status_code=403, detail="Administrator two-factor authentication is required.")
    return user


async def admin_overview(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    await _require_admin(authorization)

    async with httpx.AsyncClient(timeout=15) as client:
        profiles = await _rows(client, "profiles", "id,email,first_name,last_name,created_at")
        subscriptions = await _rows(client, "subscriptions", "user_id,provider,provider_subscription_id,plan_code,status,trial_ends_at,current_period_ends_at,cancel_at_period_end,created_at,updated_at")
        payments = await _rows(client, "payments", "user_id,provider,provider_payment_id,payment_type,status,amount,currency,paid_at,created_at")
        documents = await _rows(client, "documents", "id,user_id,name,byte_size,source_tool,created_at,updated_at")
        consents = await _rows(client, "billing_consents", "id,user_id,provider,provider_subscription_id,plan_code,accepted,accepted_at,disclosure_version,disclosure_text,terms_url,privacy_url,amount_today,renewal_amount,renewal_interval,trial_days,ip_address,user_agent,checkout_origin,evidence_hash,payment_confirmed,confirmed_at,created_at")
        providers = await _rows(client, "payment_provider_settings", "provider,display_name,enabled,is_default,configured,updated_at")

    subscription_by_user: dict[str, dict[str, Any]] = {}
    for subscription in subscriptions:
        subscription_by_user.setdefault(subscription["user_id"], subscription)

    now = datetime.now(timezone.utc)
    seven_days = now + timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def parsed(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    active_statuses = {"active", "trialing"}
    active_subscriptions = [item for item in subscriptions if item.get("status") in active_statuses]
    renewals_due = [
        item for item in active_subscriptions
        if (renewal := parsed(item.get("current_period_ends_at"))) and now <= renewal <= seven_days
    ]
    upcoming_items = []
    for item in active_subscriptions:
        if item.get("cancel_at_period_end") or item.get("status") == "paused":
            continue
        due_at = parsed(item.get("trial_ends_at")) if item.get("status") == "trialing" else parsed(item.get("current_period_ends_at"))
        if due_at and now <= due_at <= seven_days:
            upcoming_items.append({
                "user_id": item.get("user_id"),
                "plan": item.get("plan_code"),
                "due_at": due_at.isoformat(),
                "amount": 29999 if item.get("plan_code") == "annual" else 4999,
            })
    successful = [item for item in payments if item.get("status") in {"succeeded", "paid"}]
    failed = [item for item in payments if item.get("status") in {"failed", "past_due", "unpaid"}]
    refunds = [item for item in payments if item.get("payment_type") == "refund"]
    cancelled_month = [
        item for item in subscriptions
        if item.get("cancel_at_period_end") and (parsed(item.get("updated_at")) or now) >= month_start
    ]

    members = []
    for profile in profiles:
        subscription = subscription_by_user.get(profile["id"], {})
        members.append({
            "id": profile["id"],
            "email": profile.get("email"),
            "name": " ".join(filter(None, [profile.get("first_name"), profile.get("last_name")])).strip(),
            "joined_at": profile.get("created_at"),
            "plan": subscription.get("plan_code"),
            "provider": subscription.get("provider"),
            "status": subscription.get("status", "no_plan"),
            "next_payment": subscription.get("trial_ends_at") if subscription.get("status") == "trialing" else subscription.get("current_period_ends_at"),
            "trial_ends_at": subscription.get("trial_ends_at"),
            "provider_subscription_id": subscription.get("provider_subscription_id"),
        })

    return {
        "metrics": {
            "total_members": len(profiles),
            "active_subscriptions": len(active_subscriptions),
            "successful_payments": len(successful),
            "successful_value": sum(int(item.get("amount") or 0) for item in successful),
            "failed_payments": len(failed),
            "refunds": len(refunds),
            "cancelled_this_month": len(cancelled_month),
            "renewals_due": len(renewals_due),
            "documents": len(documents),
            "upcoming_revenue": sum(item["amount"] for item in upcoming_items),
            "upcoming_revenue_count": len(upcoming_items),
        },
        "members": members,
        "payments": payments,
        "documents": documents,
        "consents": consents,
        "upcoming": upcoming_items,
        "providers": providers,
    }


async def admin_funnel(
    authorization: str | None = Header(default=None),
    days: int = Query(default=7, ge=1, le=90),
    landing_page: str | None = Query(default=None, max_length=120),
) -> dict[str, Any]:
    await _require_admin(authorization)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    params: dict[str, str] = {
        "select": "session_id,user_id,event_name,event_value,landing_page,page_path,created_at",
        "created_at": f"gte.{since.isoformat()}",
        "order": "created_at.desc",
    }
    if landing_page and landing_page != "all":
        params["landing_page"] = f"eq.{landing_page}"

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/analytics_events",
            headers={**_service_headers(), "Range": "0-9999"},
            params=params,
        )
        if response.is_error:
            raise HTTPException(status_code=502, detail="Could not load conversion analytics.")
        events = response.json()
        user_ids = sorted({str(row.get("user_id")) for row in events if row.get("user_id")})
        profiles: list[dict[str, Any]] = []
        if user_ids:
            profile_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_service_headers(),
                params={"select": "id,email", "id": f"in.({','.join(user_ids)})"},
            )
            if not profile_response.is_error:
                profiles = profile_response.json()

    report = build_funnel_report(events, profiles)
    report["days"] = days
    report["landing_page"] = landing_page or "all"
    report["event_limit_reached"] = len(events) >= 10000
    return report


async def select_payment_provider(payload: ProviderSelectionRequest, authorization: str | None) -> dict[str, Any]:
    await _require_admin(authorization)
    headers = {**_service_headers(), "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        available = await client.get(
            f"{SUPABASE_URL}/rest/v1/payment_provider_settings",
            headers=headers,
            params={"provider": f"eq.{payload.provider}", "configured": "eq.true", "select": "provider"},
        )
        if available.is_error or not available.json():
            raise HTTPException(status_code=409, detail="Connect and verify this provider before selecting it.")
        clear = await client.patch(
            f"{SUPABASE_URL}/rest/v1/payment_provider_settings",
            headers=headers,
            params={"is_default": "eq.true"},
            json={"is_default": False},
        )
        selected = await client.patch(
            f"{SUPABASE_URL}/rest/v1/payment_provider_settings",
            headers=headers,
            params={"provider": f"eq.{payload.provider}"},
            json={"is_default": True, "enabled": True, "updated_at": datetime.now(timezone.utc).isoformat()},
        )
    if clear.is_error or selected.is_error:
        raise HTTPException(status_code=502, detail="The payment provider could not be updated.")
    return {"updated": True, "provider": payload.provider}
