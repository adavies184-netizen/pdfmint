# Engine v1.24.0

- Analytics events accept and store the visitor's campaign tags (utm_source, utm_medium,
  utm_campaign, utm_content = ad group, utm_term = keyword).
- `/v1/admin/funnel` now also returns `daily` (visits, editor opened, downloads, paywall views
  and sales per London day) and `campaigns` (the same counts per source / campaign / ad group / keyword).
- Works before `database/analytics-utm-v1.sql` is run: events are stored without the tags and
  reports show everything under "(direct)" until the columns exist.
