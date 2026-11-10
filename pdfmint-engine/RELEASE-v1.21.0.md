# PDFMint engine 1.21.0

Reliability and speed release. No API changes: every endpoint, request and
response shape is the same as 1.20.0.

## Changes

- **Conversions no longer freeze the engine.** `/v1/jobs` used to run each
  conversion directly on the server's single event loop, so one long
  LibreOffice/OCR job blocked checkout, the Stripe webhook, welcome emails,
  admin and health checks until it finished. Conversions now run in a worker
  thread, limited by `JOB_CONCURRENCY` (default 1). When `JOB_QUEUE_LIMIT`
  (default 6) jobs are already waiting, new uploads get a fast
  "busy, try again" (503) instead of piling up.
- **Stripe calls no longer block.** The Stripe SDK is synchronous; every Stripe
  call now runs in a worker thread.
- **Fixed: checkout consent evidence.** `record_consent_evidence` called `.get()`
  on a Stripe object, which stripe-python 13+ objects do not have, so the call
  failed. It now reads metadata the same way the webhook does.
- **Fewer duplicate Stripe customers.** Checkout first reuses the customer ID
  stored in `subscriptions`, because Stripe customer search can lag by about a
  minute. New customers are created with an idempotency key.
- **Pooled connections.** One shared HTTP client for Supabase and Brevo, instead
  of a new TLS connection per call.
- **Cached public settings.** `/v1/site/cookie-consent` and
  `/v1/site/payment-wall` were a database query per visitor page view; they are
  now cached for 60 seconds and cleared when an admin changes them.
- **Faster admin overview.** Its seven Supabase queries now run in parallel.
- **Customer-safe error messages.** Raw tool output (LibreOffice/Ghostscript
  stderr, server paths) is no longer shown to customers; it stays in the logs.
  Our own validation messages (for example "This converter accepts: .docx.")
  are still shown, with the job reference.
- **LibreOffice runs one at a time** with a consistent headless profile
  (`app/operations/process.py`), so concurrent jobs cannot collide.
- Lighter conversions: PDF to PSD/DXF render only the page they use;
  PDF to JPG/BMP/WebP skip an intermediate PNG per page; MOV to MP4 uses the
  ffmpeg `veryfast` preset; image and PDF files are closed promptly.
- Docker: release label 1.21.0 and `EXPOSE 8080` (the port the app listens on).

## New optional environment variables

- `JOB_CONCURRENCY` (default `1`): conversions run at the same time. Keep 1 on a
  small plan; raise only if the plan has memory to spare.
- `JOB_QUEUE_LIMIT` (default `6`): waiting conversions before new ones get 503.

## Tests

`python -m unittest tests.test_engine_runtime tests.test_admin_funnel tests.test_cookie_consent_stats tests.test_stripe_objects`
