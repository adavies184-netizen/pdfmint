# PDFBreeze Engine v1.12.0

- Adds an authenticated Brevo welcome-email endpoint.
- Verifies the Stripe subscription belongs to the signed-in Supabase user before sending.
- Sends generated account credentials only after an active or trialling payment is confirmed.

Required environment variable: `BREVO_API_KEY` (Brevo API v3 key, not an SMTP key).

Optional environment variables: `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`.
