-- PDFBreeze campaign tracking: store the UTM tags a visitor arrived with on each analytics event.
-- Safe to run more than once. The engine keeps working before and after this runs.

alter table public.analytics_events
  add column if not exists utm_source text not null default '',
  add column if not exists utm_medium text not null default '',
  add column if not exists utm_campaign text not null default '',
  add column if not exists utm_content text not null default '',
  add column if not exists utm_term text not null default '';
