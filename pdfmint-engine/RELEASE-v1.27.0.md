# Engine v1.27.0

- Admin → Payment wall can set the line shown beside the customer photos on the Zendocs payment
  wall (`social_text`, up to 120 characters). Stored in `payment_provider_settings` row
  `site_payment_wall_social_text` (display_name). Empty = the default line. No SQL needed.
- `/v1/site/payment-wall` and `/v1/admin/payment-wall` return `social_text`; POST accepts `style`, `social_text` or both.
