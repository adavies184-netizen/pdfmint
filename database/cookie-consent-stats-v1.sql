create table if not exists public.cookie_consent_visitors (
  visitor_id text primary key,
  banner_shown boolean not null default false,
  accepted_all boolean not null default false,
  rejected_all boolean not null default false,
  settings_opened boolean not null default false,
  preferences_saved boolean not null default false,
  statistics boolean,
  marketing boolean,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists cookie_consent_visitors_last_seen_idx
  on public.cookie_consent_visitors(last_seen_at desc);

alter table public.cookie_consent_visitors enable row level security;

-- No browser-facing policies are created. Consent events and admin reports are
-- written/read by the engine with the service role only.
