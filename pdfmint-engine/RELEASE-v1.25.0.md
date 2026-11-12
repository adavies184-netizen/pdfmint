# Engine v1.25.0

- `POST /v1/analytics/ping`: live site tabs ping about once a minute while in view. Kept in memory
  only (no database writes); bots, previews and other sites are ignored.
- `GET /v1/admin/visitors` (admin only): `online` = visitors seen in the last 2 minutes,
  `today` = unique visiting sessions since midnight UK time (cached for 30 seconds).
- "Online now" resets to 0 when the engine restarts and refills within a minute. It assumes one
  web worker (the default, WEB_CONCURRENCY=1).
