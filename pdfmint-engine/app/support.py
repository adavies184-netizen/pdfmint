from __future__ import annotations

from html import escape

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from .settings import BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME


class SupportMessageRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", max_length=254)
    subject: str = Field(default="PDFBreeze support request", min_length=1, max_length=160)
    message: str = Field(min_length=5, max_length=5000)
    source: str = Field(default="website", max_length=40)
    website: str = Field(default="", max_length=200)


async def send_support_message(payload: SupportMessageRequest) -> dict[str, bool]:
    if payload.website:
        return {"sent": True}
    if not BREVO_API_KEY:
        raise HTTPException(status_code=503, detail="Support email is not configured.")

    name = escape(payload.name.strip())
    email = escape(str(payload.email))
    subject = payload.subject.strip()
    message = escape(payload.message.strip()).replace("\n", "<br>")
    source = escape(payload.source.strip())
    html = (
        "<h2>New PDFBreeze support message</h2>"
        f"<p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Source:</b> {source}</p>"
        f"<p>{message}</p>"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
            json={
                "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
                "to": [{"name": "PDFBreeze Support", "email": "support@pdfbreeze.net"}],
                "replyTo": {"name": payload.name.strip(), "email": str(payload.email)},
                "subject": f"[PDFBreeze Support] {subject}",
                "htmlContent": html,
            },
        )
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail="PDFBreeze could not send your message.")
    return {"sent": True}
