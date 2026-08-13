from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import Header, HTTPException

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


async def admin_overview(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = await authenticated_user(authorization)
    email = str(user.get("email") or "").lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="This account is not a PDFBreeze administrator.")

    async with httpx.AsyncClient(timeout=15) as client:
        profiles = await _rows(client, "profiles", "id,email,first_name,last_name,created_at")
        subscriptions = await _rows(client, "subscriptions", "user_id,provider,provider_subscription_id,plan_code,status,current_period_ends_at,cancel_at_period_end,created_at,updated_at")
        payments = await _rows(client, "payments", "user_id,provider,provider_payment_id,payment_type,status,amount,currency,paid_at,created_at")
        documents = await _rows(client, "documents", "id,user_id,name,byte_size,source_tool,created_at,updated_at")

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
            "next_payment": subscription.get("current_period_ends_at"),
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
        },
        "members": members,
        "payments": payments,
        "documents": documents,
        "providers": [{"name": "Stripe", "status": "connected", "default": True}],
    }
