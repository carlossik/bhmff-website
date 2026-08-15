# TournamentHQ Stripe Phase 1

## Supabase secrets

Set these Edge Function secrets before testing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`
- `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`
- `TOURNAMENTHQ_APP_URL`

For local testing, `TOURNAMENTHQ_APP_URL` can be `http://localhost:5173`.
For production, set it to the TournamentHQ SaaS application URL.

## Stripe catalogue

Create one recurring TournamentHQ Professional product with two GBP prices:

- Monthly: £39.00
- Annual: £390.00

Copy the two Stripe Price IDs into the corresponding Supabase secrets above.

## Webhook

Point Stripe at:

`https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## Supabase deployment order

1. Apply `20260814_add_stripe_subscription_billing.sql`.
2. Deploy `create-checkout-session`.
3. Deploy `create-billing-portal-session`.
4. Deploy `stripe-webhook`.
5. Ensure `supabase/config.toml` has `verify_jwt = false` for `stripe-webhook` only.
6. Test with Stripe test-mode keys and test-mode Price IDs before using live keys.

## Client journey

Marketing pricing -> `/signup?plan=starter|professional` -> account verification -> onboarding -> organisation creation -> Plan & Billing -> Stripe Checkout for Professional -> webhook activation -> continue onboarding.
