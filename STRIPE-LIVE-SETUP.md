# PDFBreeze Stripe live and admin sandbox setup

PDFBreeze now defaults every public checkout to live Stripe. An MFA-verified admin can enable sandbox checkout only for their own browser from **Admin → Payment providers**.

## 1. Run the database migration

Run `database/payment-runtime-mode-v1.sql` in the Supabase SQL editor before deploying the engine.

## 2. Configure the engine in Sevalla

Add these live values to the `pdfmint-engine` service. Copy them from Stripe's **live mode**, never from test mode.

- `STRIPE_LIVE_SECRET_KEY`
- `STRIPE_LIVE_PUBLISHABLE_KEY`
- `STRIPE_LIVE_WEBHOOK_SECRET`
- `STRIPE_LIVE_PRICE_DOCUMENT_TRIAL_GBP`
- `STRIPE_LIVE_PRICE_UNLIMITED_TRIAL_GBP`
- `STRIPE_LIVE_PRICE_MEMBERSHIP_4WEEK_GBP`
- `STRIPE_LIVE_PRICE_ANNUAL_GBP`

Keep the sandbox values configured too:

- `STRIPE_SANDBOX_SECRET_KEY`
- `STRIPE_SANDBOX_PUBLISHABLE_KEY`
- `STRIPE_SANDBOX_WEBHOOK_SECRET`
- `STRIPE_PRICE_DOCUMENT_TRIAL_GBP`
- `STRIPE_PRICE_UNLIMITED_TRIAL_GBP`
- `STRIPE_PRICE_MEMBERSHIP_4WEEK_GBP`
- `STRIPE_PRICE_ANNUAL_GBP`

The old `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` variables remain sandbox fallbacks during migration.

## 3. Create live Stripe products and prices

Stripe test and live prices are separate. Create the equivalent live prices for the 50p document trial, £1 unlimited trial, £49.99 four-week renewal, and £299.99 annual plan. Put each resulting live `price_...` ID into the matching environment variable above.

## 4. Configure both webhooks

Use this endpoint for the Stripe webhook:

`https://pdfmint-engine-5dfdx.sevalla.app/v1/billing/stripe-webhook`

Create/configure it in both test and live mode, then put each signing secret in its matching environment variable.

## 5. Deployment order

1. Run the Supabase migration.
2. Add the engine environment variables.
3. Deploy `pdfmint-engine`.
4. Deploy the site.
5. Open **Admin → Payment providers** and confirm both modes show **Ready**.
6. Leave the switch on **Live payments** for ordinary use. Select **Sandbox testing** only when testing from the MFA-verified admin account in that browser.

Existing subscriptions keep the Stripe mode in which they were created. The admin switch never changes public visitors and never moves an existing subscription between modes.
