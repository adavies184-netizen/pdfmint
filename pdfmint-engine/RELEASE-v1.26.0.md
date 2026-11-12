# Engine v1.26.0

- New analytics event `editor_action` (needs `database/analytics-editor-actions-v1.sql`): what people
  actually finish in the editor (edit text, add text, sign, draw, highlight, image, stamp, watermark,
  redact, crop, note, link, page changes), counted once per visit.
- `/v1/admin/funnel` adds `devices` (mobile / desktop / tablet, from the browser's user agent),
  `daily[].devices`, `editor_sessions`, `actions` and `actions_daily`.
- `/v1/admin/funnel` accepts `start` and `end` (YYYY-MM-DD, up to 92 days) for a custom range.
- Funnel events are now read page by page (Supabase returns 1,000 rows per request), up to 30,000
  events per report, so busy date ranges are no longer cut short.
