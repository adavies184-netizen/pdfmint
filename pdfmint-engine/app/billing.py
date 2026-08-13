from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
import stripe
from fastapi import Header, HTTPException, Request
from pydantic import BaseModel, Field

from .settings import (
    STRIPE_PRICES,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)


class CheckoutRequest(BaseModel):
    plan: str
    document_key: str | None = Field(default=None, max_length=200)


def _require_server_configuration() -> None:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    if not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="Authentication is not configured on the payment server.")


async def authenticated_user(authorization: str | None) -> dict[str, Any]:
    _require_server_configuration()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in before starting checkout.")

    token = authorization.split(" ", 1)[1].strip()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Your sign-in session has expired.")
    return response.json()


def _intent_details(subscription: Any) -> tuple[str | None, str | None]:
    invoice = getattr(subscription, "latest_invoice", None)
    confirmation_secret = getattr(invoice, "confirmation_secret", None) if invoice else None
    if confirmation_secret and getattr(confirmation_secret, "client_secret", None):
        return "payment", confirmation_secret.client_secret

    # Compatibility with Stripe API versions older than 2025-03-31.basil.
    payment_intent = getattr(invoice, "payment_intent", None) if invoice else None
    if payment_intent and getattr(payment_intent, "client_secret", None):
        return "payment", payment_intent.client_secret

    setup_intent = getattr(subscription, "pending_setup_intent", None)
    if setup_intent and getattr(setup_intent, "client_secret", None):
        return "setup", setup_intent.client_secret
    return None, None


async def create_checkout(
    payload: CheckoutRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = await authenticated_user(authorization)
    plan = STRIPE_PRICES.get(payload.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown PDFBreeze plan.")
    if payload.plan == "document_trial" and not payload.document_key:
        raise HTTPException(status_code=400, detail="The document trial must be linked to a document.")

    stripe.api_key = STRIPE_SECRET_KEY
    metadata = {
        "supabase_user_id": user["id"],
        "plan_code": payload.plan,
        "currency": "gbp",
        "document_key": payload.document_key or "",
    }

    try:
        customers = stripe.Customer.search(
            query=f"metadata['supabase_user_id']:'{user['id']}'",
            limit=1,
        )
        customer = customers.data[0] if customers.data else stripe.Customer.create(
            email=user.get("email"),
            metadata={"supabase_user_id": user["id"]},
        )

        subscription_args: dict[str, Any] = {
            "customer": customer.id,
            "items": [{"price": plan["recurring"]}],
            "payment_behavior": "default_incomplete",
            "payment_settings": {"save_default_payment_method": "on_subscription"},
            "metadata": metadata,
            "expand": ["latest_invoice.confirmation_secret", "pending_setup_intent"],
        }
        if plan["trial_days"]:
            subscription_args["trial_period_days"] = plan["trial_days"]
            subscription_args["trial_settings"] = {
                "end_behavior": {"missing_payment_method": "cancel"}
            }
        if plan["initial"]:
            subscription_args["add_invoice_items"] = [{"price": plan["initial"]}]

        subscription = stripe.Subscription.create(**subscription_args)
    except stripe.StripeError as exc:
        stripe_error = getattr(exc, "error", None)
        message = (
            getattr(exc, "user_message", None)
            or getattr(stripe_error, "message", None)
            or str(exc)
            or "Stripe could not start checkout."
        )
        raise HTTPException(status_code=400, detail=message) from exc

    intent_type, client_secret = _intent_details(subscription)
    if not client_secret:
        raise HTTPException(status_code=502, detail="Stripe did not return a payment confirmation.")

    return {
        "subscription_id": subscription.id,
        "intent_type": intent_type,
        "client_secret": client_secret,
        "status": subscription.status,
    }


def _iso_from_unix(value: int | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


async def _upsert_subscription(subscription: dict[str, Any]) -> None:
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("supabase_user_id")
    if not user_id:
        return

    record = {
        "user_id": user_id,
        "provider": "stripe",
        "provider_customer_id": subscription.get("customer"),
        "provider_subscription_id": subscription["id"],
        "plan_code": metadata.get("plan_code", "unlimited_trial"),
        "currency": metadata.get("currency", "gbp"),
        "status": subscription.get("status", "incomplete"),
        "trial_ends_at": _iso_from_unix(subscription.get("trial_end")),
        "current_period_ends_at": _iso_from_unix(subscription.get("current_period_end")),
        "cancel_at_period_end": bool(subscription.get("cancel_at_period_end")),
        "cancelled_at": _iso_from_unix(subscription.get("canceled_at")),
    }
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/subscriptions?on_conflict=provider,provider_subscription_id",
            headers=headers,
            json=record,
        )
    response.raise_for_status()


async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None)) -> dict[str, bool]:
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhooks are not configured.")
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook.") from exc

    if event["type"] in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        await _upsert_subscription(dict(event["data"]["object"]))
    return {"received": True}
