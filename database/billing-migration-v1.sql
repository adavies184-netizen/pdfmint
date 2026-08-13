-- PDFBreeze billing foundation v1
-- Safe to run after the original supabase-schema.sql has already been applied.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'paypal')),
  provider_customer_id text not null,
  provider_subscription_id text not null,
  plan_code text not null check (plan_code in ('document_trial', 'unlimited_trial', 'annual')),
  currency text not null default 'gbp',
  status text not null default 'incomplete',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_subscription_id)
);
create index if not exists subscriptions_user_created_idx on public.subscriptions(user_id, created_at desc);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider in ('stripe', 'paypal')),
  provider_payment_id text not null,
  provider_invoice_id text,
  payment_type text not null check (payment_type in ('trial', 'renewal', 'annual', 'refund')),
  status text not null,
  amount integer not null check (amount >= 0),
  currency text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);
create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);

create table if not exists public.document_trial_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  checkout_document_key text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(subscription_id)
);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.document_trial_entitlements enable row level security;

drop policy if exists "subscriptions_read_own" on public.subscriptions;
create policy "subscriptions_read_own" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "payments_read_own" on public.payments;
create policy "payments_read_own" on public.payments for select using (auth.uid() = user_id);
drop policy if exists "document_trial_entitlements_read_own" on public.document_trial_entitlements;
create policy "document_trial_entitlements_read_own" on public.document_trial_entitlements for select using (auth.uid() = user_id);
