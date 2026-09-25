-- PDFBreeze dual Stripe mode support.
-- Run once in the Supabase SQL editor before deploying the matching engine.

alter table public.subscriptions
  add column if not exists provider_mode text not null default 'sandbox'
  check (provider_mode in ('sandbox','live'));

alter table public.payments
  add column if not exists provider_mode text not null default 'sandbox'
  check (provider_mode in ('sandbox','live'));

alter table public.billing_consents
  add column if not exists provider_mode text not null default 'sandbox'
  check (provider_mode in ('sandbox','live'));
