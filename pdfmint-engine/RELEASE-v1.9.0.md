# PDFBreeze Engine v1.9.0

- Adds authenticated Stripe sandbox checkout creation.
- Supports the 50p one-document trial and £1 unlimited trial, followed by
  £49.99 recurring every four weeks after seven days.
- Supports the £299.99 annual recurring plan.
- Adds a signed Stripe webhook endpoint for provider-controlled subscription
  status updates in Supabase.
- Keeps Stripe and Supabase private keys entirely in server environment
  variables.
