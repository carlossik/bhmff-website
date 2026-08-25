begin;

-- TournamentHQ paid Starter / 14-day trial commercial guard.
--
-- New tenant organisations must not receive a permanently active free Starter
-- workspace before Stripe Checkout has completed. The Stripe webhook promotes
-- the workspace to `trial` (or `active` for a non-trial re-subscription) and
-- applies the selected plan entitlements after Checkout creates a subscription.
--
-- Existing organisations are intentionally left untouched by this migration.

create or replace function public.enforce_organisation_billing_control()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    is_privileged boolean := false;
begin
    is_privileged :=
        coalesce(auth.role() = 'service_role', false)
        or exists (
            select 1
            from public.platform_admins pa
            where pa.user_id = auth.uid()
              and pa.active = true
        );

    if is_privileged then
        return new;
    end if;

    if tg_op = 'INSERT' then
        -- The selected commercial plan is applied by the Stripe webhook.
        -- Starter is only the safe provisional entitlement before billing.
        new.subscription_plan := 'starter';
        new.subscription_status := 'suspended';
        new.trial_end := null;
        new.max_users := 2;
        new.max_competitions := 1;
        new.public_site_enabled := false;
        return new;
    end if;

    if new.subscription_plan
            is distinct from old.subscription_plan
       or new.subscription_status
            is distinct from old.subscription_status
       or new.trial_end
            is distinct from old.trial_end
       or new.max_users
            is distinct from old.max_users
       or new.max_competitions
            is distinct from old.max_competitions
       or new.public_site_enabled
            is distinct from old.public_site_enabled
    then
        raise exception
            'Subscription fields are managed by TournamentHQ billing.'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

revoke all on function
    public.enforce_organisation_billing_control()
from public;

grant execute on function
    public.enforce_organisation_billing_control()
to authenticated, service_role;

commit;
