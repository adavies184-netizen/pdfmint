-- PDFBreeze: allow the "editor_action" analytics event (what people actually do in the editor).
-- Safe to run more than once.

alter table public.analytics_events drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check check (event_name in (
  'landing_view',
  'upload_clicked',
  'editor_opened',
  'editor_tool_used',
  'editor_action',
  'download_clicked',
  'email_entered',
  'payment_plan_viewed',
  'payment_card_viewed',
  'purchase_complete'
));
