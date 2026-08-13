from __future__ import annotations

import json
from html import escape
from datetime import datetime, timezone
from typing import Any

import httpx
import stripe
from fastapi import Header, HTTPException, Request
from pydantic import BaseModel, Field

from .settings import (
    BREVO_API_KEY,
    BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME,
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


class WelcomeEmailRequest(BaseModel):
    subscription_id: str = Field(min_length=5, max_length=100)
    temporary_password: str = Field(min_length=12, max_length=128)
    plan_name: str = Field(min_length=1, max_length=100)
    amount: str = Field(min_length=1, max_length=30)


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

        existing_subscriptions = stripe.Subscription.list(
            customer=customer.id,
            status="all",
            limit=20,
        )
        for existing in existing_subscriptions.auto_paging_iter():
            if existing.status in {"trialing", "active", "past_due", "unpaid", "paused"}:
                raise HTTPException(
                    status_code=409,
                    detail="This account already has a PDFBreeze membership.",
                )
            if existing.status == "incomplete":
                stripe.Subscription.delete(existing.id)

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
    except HTTPException:
        raise
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


async def send_welcome_email(
    payload: WelcomeEmailRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, bool]:
    user = await authenticated_user(authorization)
    if not BREVO_API_KEY:
        raise HTTPException(status_code=503, detail="Welcome email delivery is not configured.")

    stripe.api_key = STRIPE_SECRET_KEY
    try:
        subscription = stripe.Subscription.retrieve(payload.subscription_id)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=400, detail="The paid membership could not be verified.") from exc

    stripe_metadata = getattr(subscription, "metadata", None)
    metadata_user_id = getattr(stripe_metadata, "supabase_user_id", None) if stripe_metadata else None
    if metadata_user_id != user.get("id"):
        raise HTTPException(status_code=403, detail="This membership does not belong to this account.")
    if getattr(subscription, "status", None) not in {"trialing", "active"}:
        raise HTTPException(status_code=409, detail="The membership is not active yet.")

    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="The account does not have an email address.")

    safe_email = escape(email)
    safe_password = escape(payload.temporary_password)
    safe_plan = escape(payload.plan_name)
    safe_amount = escape(payload.amount)
    html_content = f"""<!doctype html>
<html><body style="margin:0;background:#eefaf7;font-family:Arial,sans-serif;color:#10213f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="padding:34px 42px">
<div style="font-size:29px;font-weight:800;margin-bottom:28px"><span style="color:#10213f">PDF</span><span style="color:#21b887">Breeze</span></div>
<h1 style="font-size:34px;line-height:1.15;margin:0 0 16px">Welcome to PDFBreeze!</h1>
<p style="font-size:17px;line-height:1.55;margin:0 0 16px">Your account and membership are ready.</p>
<p style="font-size:17px;line-height:1.55;margin:0 0 8px">Use this generated password to sign in:</p>
<div style="font-size:28px;font-weight:800;letter-spacing:1px;padding:15px 18px;background:#f3f7f6;border-radius:10px;margin-bottom:24px">{safe_password}</div>
<a href="https://pdfbreeze.net/login.html" style="display:block;text-align:center;background:#21b887;color:#fff;text-decoration:none;font-size:18px;font-weight:700;padding:15px;border-radius:10px">Sign in</a>
<div style="margin-top:26px;padding:20px;background:#f6f8f8;border-radius:12px;font-size:15px;line-height:1.7">
<strong>Membership details</strong><br>User: {safe_email}<br>Plan: {safe_plan}<br>Paid today: {safe_amount}<br>Order appears as: pdfbreeze.net
</div>
<p style="font-size:13px;line-height:1.5;color:#687386;margin:24px 0 0">For security, you can change this password from your account settings after signing in.</p>
</td></tr></table></td></tr></table></body></html>"""

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "accept": "application/json",
                "content-type": "application/json",
            },
            json={
                "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
                "to": [{"email": email}],
                "subject": "Welcome to PDFBreeze - your account details",
                "htmlContent": html_content,
            },
        )
    if response.status_code != 201:
        raise HTTPException(status_code=502, detail="Brevo could not send the welcome email.")
    return {"sent": True}


def _iso_from_unix(value: int | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


async def _upsert_subscription(subscription: dict[str, Any]) -> str | None:
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is missing")
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("supabase_user_id")
    if not user_id:
        return None

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
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/subscriptions?on_conflict=provider,provider_subscription_id",
            headers=headers,
            json=record,
        )
    if response.is_error:
        raise RuntimeError(
            f"Supabase subscription sync failed ({response.status_code}): {response.text[:500]}"
        )
    rows = response.json()
    subscription_id = rows[0]["id"] if rows else None
    document_key = metadata.get("document_key")
    trial_end = subscription.get("trial_end")
    if (
        subscription_id
        and metadata.get("plan_code") == "document_trial"
        and document_key
        and trial_end
    ):
        entitlement = {
            "user_id": user_id,
            "subscription_id": subscription_id,
            "checkout_document_key": document_key,
            "ends_at": _iso_from_unix(trial_end),
        }
        async with httpx.AsyncClient(timeout=10) as client:
            entitlement_response = await client.post(
                f"{SUPABASE_URL}/rest/v1/document_trial_entitlements?on_conflict=subscription_id",
                headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=entitlement,
            )
        if entitlement_response.is_error:
            raise RuntimeError(
                "Supabase document entitlement sync failed "
                f"({entitlement_response.status_code}): {entitlement_response.text[:500]}"
            )
    return subscription_id


async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None)) -> dict[str, bool]:
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhooks are not configured.")
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")
    payload = await request.body()
    try:
        stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
        event = json.loads(payload)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook.") from exc

    if event["type"] in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        await _upsert_subscription(event["data"]["object"])
    return {"received": True}
