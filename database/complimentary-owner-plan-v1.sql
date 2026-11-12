-- Complimentary permanent membership for the site owner (a.davies184@gmail.com).
-- Run once in Supabase → SQL Editor. Safe to run again (it just re-activates the same row).
--
-- What it does: gives the owner's account an active Annual plan that never expires, so the
-- site treats it like a paying member (no email step, no paywall).
-- No payment is recorded, and the row is marked 'sandbox' so admin stats (which count only
-- live rows) don't count it as a paying member or revenue. The row is marked as PayPal
-- with made-up "complimentary" IDs so the Stripe checkout code never tries to reuse it.
-- Note: don't press "Cancel subscription" on this account's dashboard; there is no real
-- PayPal subscription behind it, so that call would fail.

insert into public.subscriptions (
  user_id, provider, provider_mode, provider_customer_id, provider_subscription_id,
  plan_code, currency, status, trial_ends_at, current_period_ends_at,
  cancel_at_period_end, cancelled_at
)
select
  u.id, 'paypal', 'sandbox', 'complimentary-owner', 'complimentary-owner-plan',
  'annual', 'gbp', 'active', null, '2099-12-31 23:59:59+00',
  false, null
from auth.users u
where lower(u.email) = 'a.davies184@gmail.com'
on conflict (provider, provider_subscription_id) do update set
  status = 'active',
  plan_code = 'annual',
  current_period_ends_at = '2099-12-31 23:59:59+00',
  cancel_at_period_end = false,
  cancelled_at = null;

-- Check: should show one row with status 'active' and plan_code 'annual'.
select s.plan_code, s.status, s.current_period_ends_at
from public.subscriptions s
join auth.users u on u.id = s.user_id
where lower(u.email) = 'a.davies184@gmail.com'
order by s.created_at desc;
