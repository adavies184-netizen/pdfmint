from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from .http_client import http
from .settings import ADMIN_EMAILS, STRIPE_CONFIGS, SUPABASE_SERVICE_ROLE_KEY
from .supabase import has_aal2, rest_url, service_headers


VALID_PAYMENT_MODES = {"sandbox", "live"}


def stripe_config(mode: str) -> dict[str, Any]:
    if mode not in VALID_PAYMENT_MODES:
        raise HTTPException(status_code=400, detail="Choose sandbox or live payment mode.")
    return STRIPE_CONFIGS[mode]


def stripe_mode_configured(mode: str) -> bool:
    config = stripe_config(mode)
    prices = config["prices"]
    required = [
        config.get("secret_key"),
        config.get("webhook_secret"),
        config.get("publishable_key"),
        prices["document_trial"].get("initial"),
        prices["document_trial"].get("recurring"),
        prices["unlimited_trial"].get("initial"),
        prices["unlimited_trial"].get("recurring"),
        prices["annual"].get("recurring"),
    ]
    prefix = "sk_live_" if mode == "live" else "sk_test_"
    publishable_prefix = "pk_live_" if mode == "live" else "pk_test_"
    return bool(
        all(required)
        and str(config["secret_key"]).startswith(prefix)
        and str(config["publishable_key"]).startswith(publishable_prefix)
    )


def checkout_mode_for_user(
    requested_mode: str | None,
    user: dict[str, Any],
    authorization: str | None = None,
) -> str:
    """Normal customers are always live; only MFA-verified admins may opt into sandbox."""
    if (
        requested_mode == "sandbox"
        and str(user.get("email") or "").lower() in ADMIN_EMAILS
        and has_aal2(authorization)
    ):
        return "sandbox"
    return "live"


async def subscription_payment_mode(user_id: str) -> str:
    if not SUPABASE_SERVICE_ROLE_KEY:
        return "live"
    response = await http().get(
        rest_url("subscriptions"),
        headers=service_headers(),
        params={
            "user_id": f"eq.{user_id}",
            "provider": "eq.stripe",
            "status": "in.(trialing,active,past_due,unpaid,paused)",
            "select": "provider_mode",
            "order": "created_at.desc",
            "limit": "1",
        },
        timeout=8,
    )
    rows = [] if response.is_error else response.json()
    if not rows:
        return "live"
    mode = str(rows[0].get("provider_mode") or "live")
    return mode if mode in VALID_PAYMENT_MODES else "live"
