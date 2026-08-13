# PDFBreeze Engine v1.9.2

- Updates subscription checkout for Stripe's current Invoice API by expanding
  `latest_invoice.confirmation_secret` instead of the removed
  `latest_invoice.payment_intent` field.
- Retains compatibility with older Stripe API versions when reading a checkout
  confirmation.
- Returns Stripe's actionable error message when checkout creation fails.
