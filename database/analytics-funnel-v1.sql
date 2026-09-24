-- PDFBreeze anonymous journey analytics.
-- Apply once in Supabase before deploying the matching site and engine builds.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 16 and 80),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in (
    'landing_view',
    'upload_clicked',
    'editor_opened',
    'editor_tool_used',
    'download_clicked',
    'email_entered',
    'payment_plan_viewed',
    'payment_card_viewed',
    'purchase_complete'
  )),
  event_value text not null default '',
  landing_page text not null default 'unknown',
  page_path text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  unique(session_id, event_name, event_value)
);

create index if not exists analytics_events_created_idx
  on public.analytics_events(created_at desc);
create index if not exists analytics_events_landing_created_idx
  on public.analytics_events(landing_page, created_at desc);
create index if not exists analytics_events_session_created_idx
  on public.analytics_events(session_id, created_at);

alter table public.analytics_events enable row level security;

-- No browser policies are created. Events are written and reported only by the
-- PDFBreeze engine with the service role; the public Supabase client cannot
-- read or alter analytics rows.
