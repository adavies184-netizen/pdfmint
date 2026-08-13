# PDFBreeze Engine v1.9.4

- Uses the signature-verified raw Stripe webhook JSON for subscription
  synchronisation, avoiding SDK-version-specific StripeObject conversion.
- Logs the exact Supabase response if a subscription database write is rejected.
