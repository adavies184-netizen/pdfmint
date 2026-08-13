-- PDFBreeze billing consent evidence and provider routing.
-- Run once in the Supabase SQL editor before deploying engine 1.15.0.

create table if not exists public.billing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  plan_code text not null,
  accepted boolean not null default false,
  accepted_at timestamptz not null,
  disclosure_version text not null,
  disclosure_text text not null,
  terms_url text not null,
  privacy_url text not null,
  amount_today integer not null,
  renewal_amount integer not null,
  renewal_interval text not null,
  trial_days integer not null default 0,
  ip_address text,
  user_agent text,
  checkout_origin text,
  evidence_hash text not null,
  payment_confirmed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_subscription_id)
);
create index if not exists billing_consents_user_created_idx on public.billing_consents(user_id, created_at desc);
alter table public.billing_consents enable row level security;

create table if not exists public.payment_provider_settings (
  provider text primary key,
  display_name text not null,
  enabled boolean not null default false,
  is_default boolean not null default false,
  configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_provider_settings enable row level security;
insert into public.payment_provider_settings(provider,display_name,enabled,is_default,configured)
values ('stripe','Stripe',true,true,true),('paypal','PayPal Advanced Cards',false,false,false),('solidgate','Solidgate',false,false,false)
on conflict(provider) do nothing;
