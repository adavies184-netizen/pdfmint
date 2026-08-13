# PDFBreeze payments setup

## Current GBP sandbox catalogue

| Plan | Immediate charge | Renewal | Stripe price |
|---|---:|---:|---|
| One-document trial | £0.50 | £49.99 every 4 weeks after 7 days | `price_1U3fRnJAG10RJqJq6EEF89De` |
| Unlimited trial | £1.00 | £49.99 every 4 weeks after 7 days | `price_1U3fOfJAG10RJqJq3QzBl76x` |
| Four-week membership | £49.99 | £49.99 every 4 weeks | `price_1U3fLOJAG10RJqJq0wxaDdFQ` |
| Annual membership | £299.99 | £299.99 every year | `price_1U3fPdJAG10RJqJq8i6gW9cb` |

The two trial prices are one-time invoice items charged when their associated
seven-day Stripe subscription is created. Both trial subscriptions use the
four-week recurring membership price for renewals.

## Planned USD catalogue

USD prices will use the same internal plan codes and separate Stripe price IDs.
No access-control or webhook logic should depend on GBP amounts.

## Secret handling

The Stripe secret key, webhook signing secret and Supabase service-role key are
server environment variables. They must never be added to `config.js` or the
static site ZIP.
