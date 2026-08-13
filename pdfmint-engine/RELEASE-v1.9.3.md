# PDFBreeze Engine v1.9.3

- Converts Stripe webhook subscription objects using Stripe's supported
  `to_dict_recursive()` method before synchronising them to Supabase.
- Fixes the `KeyError: 0` that caused valid subscription webhooks to return
  HTTP 500 before reaching Supabase.
