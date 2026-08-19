-- TournamentHQ Club Finance Engine
-- 2026-08-16
--
-- Phase 2: hardened audit trail, finance accounts, authoritative charge balances,
-- atomic payment allocation/refunds, bulk monthly/matchday charge generation,
-- card fines, and server-side dashboard/reporting functions.
--
-- This migration extends Club Finance only. Tournament Finance remains separate.

begin;

-- ---------------------------------------------------------------------------
-- 1. Harden the audit log: authenticated users may read permitted records, but
--    only finance triggers/security-definer routines may append audit events.
-- ---------------------------------------------------------------------------

drop policy if exists club_finance_audit_log_full_access
    on public.club_finance_audit_log;

drop policy if exists club_finance_audit_log_select
    on public.club_finance_audit_log;
create policy club_finance_audit_log_select
on public.club_finance_audit_log
for select
to authenticated
using (public.club_finance_has_full_access(organisation_id));

revoke insert, update, delete, truncate
    on public.club_finance_audit_log
    from anon, authenticated;
grant select on public.club_finance_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Club cash/bank accounts. These support a genuine recorded cash position
--    rather than pretending that income minus expenditure is a bank balance.
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_accounts (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    name text not null,
    account_type text not null default 'bank'
        check (account_type in ('bank', 'cash', 'petty_cash', 'other')),
    currency text not null default 'GBP',
    opening_balance numeric(14,2) not null default 0,
    opening_balance_date date not null default current_date,
    is_default boolean not null default false,
    active boolean not null default true,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_accounts_org_name_key
        unique (organisation_id, name)
);

create unique index if not exists club_finance_accounts_one_default
    on public.club_finance_accounts (organisation_id)
    where is_default = true and active = true;

create index if not exists idx_club_finance_accounts_org
    on public.club_finance_accounts (organisation_id, active);

alter table public.club_finance_payments
    add column if not exists account_id uuid
        references public.club_finance_accounts(id) on delete set null;

alter table public.club_finance_income
    add column if not exists account_id uuid
        references public.club_finance_accounts(id) on delete set null;

alter table public.club_finance_expenses
    add column if not exists account_id uuid
        references public.club_finance_accounts(id) on delete set null;

create index if not exists idx_club_finance_payments_account
    on public.club_finance_payments (organisation_id, account_id, payment_date desc)
    where account_id is not null;

create index if not exists idx_club_finance_income_account
    on public.club_finance_income (organisation_id, account_id, income_date desc)
    where account_id is not null;

create index if not exists idx_club_finance_expenses_account
    on public.club_finance_expenses (organisation_id, account_id, expense_date desc)
    where account_id is not null;

-- Updated-at trigger for the new table.
drop trigger if exists trg_club_finance_accounts_updated_at
    on public.club_finance_accounts;
create trigger trg_club_finance_accounts_updated_at
before update on public.club_finance_accounts
for each row execute function public.club_finance_set_updated_at();

alter table public.club_finance_accounts enable row level security;

drop policy if exists club_finance_accounts_select
    on public.club_finance_accounts;
create policy club_finance_accounts_select
on public.club_finance_accounts
for select to authenticated
using (public.club_finance_has_full_access(organisation_id));

drop policy if exists club_finance_accounts_write
    on public.club_finance_accounts;
create policy club_finance_accounts_write
on public.club_finance_accounts
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

-- Seed one default account for existing clubs. It starts at zero deliberately;
-- treasurers can enter the real opening balance and date later.
insert into public.club_finance_accounts (
    organisation_id,
    name,
    account_type,
    currency,
    opening_balance,
    opening_balance_date,
    is_default,
    active
)
select
    o.id,
    'Main Club Account',
    'bank',
    coalesce(nullif(o.currency, ''), 'GBP'),
    0,
    current_date,
    true,
    true
from public.organisations o
where o.organisation_type = 'club'
  and not exists (
      select 1
      from public.club_finance_accounts a
      where a.organisation_id = o.id
  );

-- ---------------------------------------------------------------------------
-- 3. Authoritative charge-balance view.
-- ---------------------------------------------------------------------------

create or replace view public.club_finance_charge_balances
with (security_invoker = true)
as
select
    c.id,
    c.organisation_id,
    c.season_id,
    c.team_id,
    c.player_id,
    c.squad_member_id,
    c.fixture_id,
    c.match_event_id,
    c.payer_id,
    c.charge_type_id,
    c.charge_type,
    c.billing_period,
    c.description,
    c.amount_due,
    c.amount_paid,
    c.legacy_paid_amount,
    c.waived_amount,
    greatest(c.amount_due - c.amount_paid - c.waived_amount, 0)::numeric(12,2)
        as outstanding_amount,
    c.payment_status,
    c.due_date,
    (
        c.due_date is not null
        and c.due_date < current_date
        and greatest(c.amount_due - c.amount_paid - c.waived_amount, 0) > 0
    ) as overdue,
    c.currency,
    c.paid_at,
    c.waived_at,
    c.created_at,
    c.updated_at
from public.club_player_charges c;

grant select on public.club_finance_charge_balances to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Utility functions.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_assert_club(
    p_organisation_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    org_type text;
begin
    select organisation_type::text
    into org_type
    from public.organisations
    where id = p_organisation_id;

    if org_type is null then
        raise exception 'Organisation does not exist.';
    end if;

    if org_type <> 'club' then
        raise exception 'Club Finance is available only for club organisations.';
    end if;
end;
$$;

create or replace function public.club_finance_assert_full_access(
    p_organisation_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
begin
    perform public.club_finance_assert_club(p_organisation_id);

    if not public.club_finance_has_full_access(p_organisation_id) then
        raise exception 'Full Club Finance access is required.';
    end if;
end;
$$;

create or replace function public.club_finance_assert_team_access(
    p_organisation_id uuid,
    p_team_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
begin
    perform public.club_finance_assert_club(p_organisation_id);

    if not public.club_finance_has_team_access(p_organisation_id, p_team_id) then
        raise exception 'You do not have finance access to this team.';
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Atomic payment recording with allocations.
--    p_allocations format: [{"chargeId":"uuid","amount":12.50}, ...]
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_record_payment(
    p_organisation_id uuid,
    p_season_id uuid,
    p_team_id uuid,
    p_payer_id uuid,
    p_player_id uuid,
    p_account_id uuid,
    p_amount numeric,
    p_currency text,
    p_payment_date date,
    p_method text,
    p_status text,
    p_gateway_provider text,
    p_gateway_ref text,
    p_payment_reference text,
    p_notes text,
    p_allocations jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    payment_id uuid;
    allocation jsonb;
    allocation_charge_id uuid;
    allocation_amount numeric(12,2);
    allocation_total numeric(12,2) := 0;
begin
    if p_team_id is null then
        perform public.club_finance_assert_full_access(p_organisation_id);
    else
        perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);
    end if;

    if p_amount is null or p_amount <= 0 then
        raise exception 'Payment amount must be greater than zero.';
    end if;

    if p_account_id is not null and not exists (
        select 1 from public.club_finance_accounts a
        where a.id = p_account_id
          and a.organisation_id = p_organisation_id
          and a.active = true
    ) then
        raise exception 'The selected finance account is invalid.';
    end if;

    if p_payer_id is not null and not exists (
        select 1 from public.club_finance_payers p
        where p.id = p_payer_id
          and p.organisation_id = p_organisation_id
          and p.active = true
    ) then
        raise exception 'The selected payer is invalid.';
    end if;

    if p_player_id is not null and not exists (
        select 1 from public.club_players cp
        where cp.id = p_player_id
          and cp.organisation_id = p_organisation_id
    ) then
        raise exception 'The selected player is invalid.';
    end if;

    if p_allocations is not null and jsonb_typeof(p_allocations) <> 'array' then
        raise exception 'Payment allocations must be a JSON array.';
    end if;

    if p_allocations is not null then
        for allocation in
            select value from jsonb_array_elements(p_allocations)
        loop
            allocation_charge_id := nullif(allocation ->> 'chargeId', '')::uuid;
            allocation_amount := nullif(allocation ->> 'amount', '')::numeric;

            if allocation_charge_id is null
               or allocation_amount is null
               or allocation_amount <= 0 then
                raise exception 'Each allocation requires a valid chargeId and positive amount.';
            end if;

            if not exists (
                select 1
                from public.club_player_charges c
                where c.id = allocation_charge_id
                  and c.organisation_id = p_organisation_id
                  and (p_team_id is null or c.team_id = p_team_id)
            ) then
                raise exception 'A payment allocation references an inaccessible charge.';
            end if;

            allocation_total := allocation_total + allocation_amount;
        end loop;
    end if;

    if allocation_total > p_amount then
        raise exception 'Allocated amount exceeds the payment amount.';
    end if;

    insert into public.club_finance_payments (
        organisation_id,
        season_id,
        team_id,
        payer_id,
        player_id,
        account_id,
        amount,
        currency,
        payment_date,
        method,
        status,
        gateway_provider,
        gateway_ref,
        payment_reference,
        notes,
        created_by
    )
    values (
        p_organisation_id,
        p_season_id,
        p_team_id,
        p_payer_id,
        p_player_id,
        p_account_id,
        p_amount,
        coalesce(nullif(trim(p_currency), ''), 'GBP'),
        coalesce(p_payment_date, current_date),
        p_method,
        coalesce(nullif(p_status, ''), 'recorded'),
        nullif(trim(p_gateway_provider), ''),
        nullif(trim(p_gateway_ref), ''),
        nullif(trim(p_payment_reference), ''),
        nullif(trim(p_notes), ''),
        auth.uid()
    )
    returning id into payment_id;

    if p_allocations is not null then
        for allocation in
            select value from jsonb_array_elements(p_allocations)
        loop
            allocation_charge_id := (allocation ->> 'chargeId')::uuid;
            allocation_amount := (allocation ->> 'amount')::numeric;

            insert into public.club_finance_payment_allocations (
                organisation_id,
                payment_id,
                charge_id,
                amount
            )
            values (
                p_organisation_id,
                payment_id,
                allocation_charge_id,
                allocation_amount
            );
        end loop;
    end if;

    return payment_id;
end;
$$;

revoke all on function public.club_finance_record_payment(
    uuid, uuid, uuid, uuid, uuid, uuid, numeric, text, date, text, text,
    text, text, text, text, jsonb
) from public, anon;
grant execute on function public.club_finance_record_payment(
    uuid, uuid, uuid, uuid, uuid, uuid, numeric, text, date, text, text,
    text, text, text, text, jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Refund an allocated amount. Refunds are allocation-based so a payment that
--    covered several charges can be partially reversed accurately.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_refund_allocation(
    p_allocation_id uuid,
    p_refund_amount numeric,
    p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    allocation_row public.club_finance_payment_allocations%rowtype;
    payment_row public.club_finance_payments%rowtype;
    total_refunded numeric(12,2);
begin
    select *
    into allocation_row
    from public.club_finance_payment_allocations
    where id = p_allocation_id
    for update;

    if not found then
        raise exception 'Payment allocation does not exist.';
    end if;

    perform public.club_finance_assert_full_access(allocation_row.organisation_id);

    if p_refund_amount is null or p_refund_amount <= 0 then
        raise exception 'Refund amount must be greater than zero.';
    end if;

    if allocation_row.refunded_amount + p_refund_amount > allocation_row.amount then
        raise exception 'Refund exceeds the remaining allocated amount.';
    end if;

    update public.club_finance_payment_allocations
    set refunded_amount = refunded_amount + p_refund_amount,
        refund_reason = nullif(trim(p_reason), ''),
        refunded_at = now(),
        refunded_by = auth.uid(),
        updated_at = now()
    where id = p_allocation_id;

    select *
    into payment_row
    from public.club_finance_payments
    where id = allocation_row.payment_id
    for update;

    select coalesce(sum(refunded_amount), 0)
    into total_refunded
    from public.club_finance_payment_allocations
    where payment_id = allocation_row.payment_id;

    update public.club_finance_payments
    set status = case
            when total_refunded >= payment_row.amount then 'refunded'
            when total_refunded > 0 then 'part_refunded'
            else payment_row.status
        end,
        updated_at = now()
    where id = payment_row.id;
end;
$$;

revoke all on function public.club_finance_refund_allocation(uuid, numeric, text)
    from public, anon;
grant execute on function public.club_finance_refund_allocation(uuid, numeric, text)
    to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Charge waivers.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_waive_charge(
    p_charge_id uuid,
    p_amount numeric,
    p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    charge_row public.club_player_charges%rowtype;
    outstanding numeric(12,2);
begin
    select *
    into charge_row
    from public.club_player_charges
    where id = p_charge_id
    for update;

    if not found then
        raise exception 'Charge does not exist.';
    end if;

    perform public.club_finance_assert_full_access(charge_row.organisation_id);

    outstanding := greatest(
        charge_row.amount_due - charge_row.amount_paid - charge_row.waived_amount,
        0
    );

    if p_amount is null or p_amount <= 0 or p_amount > outstanding then
        raise exception 'Waiver amount must be positive and no greater than the outstanding balance.';
    end if;

    if nullif(trim(p_reason), '') is null then
        raise exception 'A waiver reason is required.';
    end if;

    update public.club_player_charges
    set waived_amount = waived_amount + p_amount,
        waived_reason = trim(p_reason),
        waived_at = now(),
        waived_by = auth.uid(),
        updated_at = now()
    where id = p_charge_id;

    perform public.club_finance_recalculate_charge(p_charge_id);
end;
$$;

revoke all on function public.club_finance_waive_charge(uuid, numeric, text)
    from public, anon;
grant execute on function public.club_finance_waive_charge(uuid, numeric, text)
    to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Bulk monthly fee generation.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_generate_monthly_charges(
    p_organisation_id uuid,
    p_season_id uuid,
    p_team_id uuid,
    p_billing_period date,
    p_due_date date
)
returns integer
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    policy_row public.club_team_seasons%rowtype;
    month_start date;
    effective_due_date date;
    inserted_count integer := 0;
    charge_type_id uuid;
begin
    perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);

    select *
    into policy_row
    from public.club_team_seasons
    where organisation_id = p_organisation_id
      and season_id = p_season_id
      and team_id = p_team_id
      and status <> 'archived';

    if not found then
        raise exception 'The selected team is not configured for this season.';
    end if;

    if policy_row.payment_model not in ('monthly', 'hybrid')
       or policy_row.monthly_fee_amount <= 0 then
        raise exception 'Monthly fees are not enabled for this team/season.';
    end if;

    month_start := date_trunc('month', coalesce(p_billing_period, current_date))::date;
    effective_due_date := coalesce(
        p_due_date,
        make_date(
            extract(year from month_start)::integer,
            extract(month from month_start)::integer,
            least(policy_row.monthly_due_day, 28)
        )
    );

    select id
    into charge_type_id
    from public.club_finance_charge_types
    where organisation_id = p_organisation_id
      and code = 'monthly_fee'
      and active = true
    limit 1;

    insert into public.club_player_charges (
        organisation_id,
        season_id,
        team_id,
        player_id,
        squad_member_id,
        charge_type,
        charge_type_id,
        billing_period,
        description,
        amount_due,
        amount_paid,
        payment_status,
        due_date,
        currency,
        created_by
    )
    select
        sm.organisation_id,
        sm.season_id,
        sm.team_id,
        sm.player_id,
        sm.id,
        'monthly_fee',
        charge_type_id,
        month_start,
        'Monthly fee - ' || to_char(month_start, 'FMMonth YYYY'),
        policy_row.monthly_fee_amount,
        0,
        case when effective_due_date > current_date then 'not_due' else 'due' end,
        effective_due_date,
        coalesce(nullif(o.currency, ''), 'GBP'),
        auth.uid()
    from public.club_squad_members sm
    join public.organisations o on o.id = sm.organisation_id
    where sm.organisation_id = p_organisation_id
      and sm.season_id = p_season_id
      and sm.team_id = p_team_id
      and sm.active = true
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke all on function public.club_finance_generate_monthly_charges(
    uuid, uuid, uuid, date, date
) from public, anon;
grant execute on function public.club_finance_generate_monthly_charges(
    uuid, uuid, uuid, date, date
) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Matchday subs for selected squad members.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_generate_matchday_charges(
    p_organisation_id uuid,
    p_season_id uuid,
    p_team_id uuid,
    p_fixture_id uuid,
    p_squad_member_ids uuid[],
    p_due_date date
)
returns integer
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    policy_row public.club_team_seasons%rowtype;
    fixture_date date;
    inserted_count integer := 0;
    charge_type_id uuid;
begin
    perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);

    if coalesce(array_length(p_squad_member_ids, 1), 0) = 0 then
        raise exception 'Select at least one squad member.';
    end if;

    select *
    into policy_row
    from public.club_team_seasons
    where organisation_id = p_organisation_id
      and season_id = p_season_id
      and team_id = p_team_id
      and status <> 'archived';

    if not found then
        raise exception 'The selected team is not configured for this season.';
    end if;

    if policy_row.payment_model not in ('matchday', 'hybrid')
       or policy_row.matchday_sub_amount <= 0 then
        raise exception 'Matchday subs are not enabled for this team/season.';
    end if;

    select f.fixture_date
    into fixture_date
    from public.club_fixtures f
    where f.id = p_fixture_id
      and f.organisation_id = p_organisation_id
      and f.season_id = p_season_id
      and f.team_id = p_team_id;

    if fixture_date is null then
        raise exception 'The selected fixture is invalid.';
    end if;

    select id
    into charge_type_id
    from public.club_finance_charge_types
    where organisation_id = p_organisation_id
      and code = 'matchday_sub'
      and active = true
    limit 1;

    insert into public.club_player_charges (
        organisation_id,
        season_id,
        team_id,
        player_id,
        squad_member_id,
        fixture_id,
        charge_type,
        charge_type_id,
        description,
        amount_due,
        amount_paid,
        payment_status,
        due_date,
        currency,
        created_by
    )
    select
        sm.organisation_id,
        sm.season_id,
        sm.team_id,
        sm.player_id,
        sm.id,
        p_fixture_id,
        'matchday_sub',
        charge_type_id,
        'Matchday sub',
        policy_row.matchday_sub_amount,
        0,
        case when coalesce(p_due_date, fixture_date) > current_date then 'not_due' else 'due' end,
        coalesce(p_due_date, fixture_date),
        coalesce(nullif(o.currency, ''), 'GBP'),
        auth.uid()
    from public.club_squad_members sm
    join public.organisations o on o.id = sm.organisation_id
    where sm.organisation_id = p_organisation_id
      and sm.season_id = p_season_id
      and sm.team_id = p_team_id
      and sm.active = true
      and sm.id = any(p_squad_member_ids)
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke all on function public.club_finance_generate_matchday_charges(
    uuid, uuid, uuid, uuid, uuid[], date
) from public, anon;
grant execute on function public.club_finance_generate_matchday_charges(
    uuid, uuid, uuid, uuid, uuid[], date
) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Card fine creation from a fixture/player/event.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_create_card_fine(
    p_organisation_id uuid,
    p_season_id uuid,
    p_team_id uuid,
    p_fixture_id uuid,
    p_player_id uuid,
    p_match_event_id uuid,
    p_offence text,
    p_due_date date,
    p_description text
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    policy_row public.club_team_seasons%rowtype;
    squad_member_id uuid;
    charge_type text;
    charge_type_id uuid;
    fine_amount numeric(12,2);
    charge_id uuid;
begin
    perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);

    select *
    into policy_row
    from public.club_team_seasons
    where organisation_id = p_organisation_id
      and season_id = p_season_id
      and team_id = p_team_id
      and status <> 'archived';

    if not found then
        raise exception 'The selected team is not configured for this season.';
    end if;

    if not exists (
        select 1
        from public.club_fixtures f
        where f.id = p_fixture_id
          and f.organisation_id = p_organisation_id
          and f.season_id = p_season_id
          and f.team_id = p_team_id
    ) then
        raise exception 'The selected fixture is invalid.';
    end if;

    select sm.id
    into squad_member_id
    from public.club_squad_members sm
    where sm.organisation_id = p_organisation_id
      and sm.season_id = p_season_id
      and sm.team_id = p_team_id
      and sm.player_id = p_player_id
      and sm.active = true
    limit 1;

    if squad_member_id is null then
        raise exception 'The selected player is not an active member of this team/season.';
    end if;

    if p_offence = 'yellow_card' then
        charge_type := 'yellow_card_fine';
        fine_amount := policy_row.yellow_card_fine_amount;
    elsif p_offence = 'red_card' then
        charge_type := 'red_card_fine';
        fine_amount := policy_row.red_card_fine_amount;
    else
        raise exception 'Offence must be yellow_card or red_card.';
    end if;

    if fine_amount <= 0 then
        raise exception 'No default fine amount is configured for this offence.';
    end if;

    select id
    into charge_type_id
    from public.club_finance_charge_types
    where organisation_id = p_organisation_id
      and canonical_type = charge_type
      and active = true
    order by system_defined desc
    limit 1;

    insert into public.club_player_charges (
        organisation_id,
        season_id,
        team_id,
        player_id,
        squad_member_id,
        fixture_id,
        match_event_id,
        charge_type,
        charge_type_id,
        description,
        amount_due,
        amount_paid,
        payment_status,
        due_date,
        currency,
        created_by
    )
    values (
        p_organisation_id,
        p_season_id,
        p_team_id,
        p_player_id,
        squad_member_id,
        p_fixture_id,
        p_match_event_id,
        charge_type,
        charge_type_id,
        coalesce(nullif(trim(p_description), ''),
            case when p_offence = 'yellow_card' then 'Yellow card fine' else 'Red card fine' end),
        fine_amount,
        0,
        case when p_due_date is not null and p_due_date > current_date then 'not_due' else 'due' end,
        p_due_date,
        coalesce((select nullif(currency, '') from public.organisations where id = p_organisation_id), 'GBP'),
        auth.uid()
    )
    returning id into charge_id;

    return charge_id;
exception
    when unique_violation then
        raise exception 'This card event already has the corresponding finance charge.';
end;
$$;

revoke all on function public.club_finance_create_card_fine(
    uuid, uuid, uuid, uuid, uuid, uuid, text, date, text
) from public, anon;
grant execute on function public.club_finance_create_card_fine(
    uuid, uuid, uuid, uuid, uuid, uuid, text, date, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Server-side dashboard summary.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_dashboard_summary(
    p_organisation_id uuid,
    p_season_id uuid default null,
    p_team_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
declare
    result jsonb;
    month_start date := date_trunc('month', current_date)::date;
    next_month date := (date_trunc('month', current_date) + interval '1 month')::date;
begin
    if p_team_id is null then
        perform public.club_finance_assert_full_access(p_organisation_id);
    else
        perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);
    end if;

    with charge_scope as (
        select *
        from public.club_finance_charge_balances c
        where c.organisation_id = p_organisation_id
          and (p_season_id is null or c.season_id = p_season_id)
          and (p_team_id is null or c.team_id = p_team_id)
    ),
    payment_scope as (
        select
            p.*,
            greatest(
                p.amount - coalesce((
                    select sum(a.refunded_amount)
                    from public.club_finance_payment_allocations a
                    where a.payment_id = p.id
                ), 0),
                0
            )::numeric(12,2) as net_amount
        from public.club_finance_payments p
        where p.organisation_id = p_organisation_id
          and (p_season_id is null or p.season_id = p_season_id)
          and (p_team_id is null or p.team_id = p_team_id)
          and p.status in ('recorded', 'cleared', 'part_refunded')
    ),
    other_income_scope as (
        select *
        from public.club_finance_income i
        where i.organisation_id = p_organisation_id
          and (p_season_id is null or i.season_id = p_season_id)
          and (p_team_id is null or i.team_id = p_team_id)
          and i.status <> 'cancelled'
    ),
    expense_scope as (
        select *
        from public.club_finance_expenses e
        where e.organisation_id = p_organisation_id
          and (p_season_id is null or e.season_id = p_season_id)
          and (p_team_id is null or e.team_id = p_team_id)
          and e.status not in ('draft', 'void')
    ),
    accounts_scope as (
        select *
        from public.club_finance_accounts a
        where a.organisation_id = p_organisation_id
          and a.active = true
          and p_team_id is null
    )
    select jsonb_build_object(
        'currency', coalesce((select nullif(currency, '') from public.organisations where id = p_organisation_id), 'GBP'),
        'totalCharged', coalesce((select sum(amount_due) from charge_scope), 0),
        'totalCollected', coalesce((select sum(amount_paid) from charge_scope), 0),
        'totalWaived', coalesce((select sum(waived_amount) from charge_scope), 0),
        'outstandingTotal', coalesce((select sum(outstanding_amount) from charge_scope), 0),
        'overdueTotal', coalesce((select sum(outstanding_amount) from charge_scope where overdue), 0),
        'membersOwing', coalesce((select count(distinct player_id) from charge_scope where outstanding_amount > 0), 0),
        'overdueMembers', coalesce((select count(distinct player_id) from charge_scope where overdue), 0),
        'incomeThisMonth',
            coalesce((select sum(net_amount) from payment_scope where payment_date >= month_start and payment_date < next_month), 0)
            + coalesce((select sum(amount_received) from other_income_scope where income_date >= month_start and income_date < next_month), 0),
        'expensesThisMonth', coalesce((select sum(amount + tax_amount) from expense_scope where expense_date >= month_start and expense_date < next_month), 0),
        'otherIncomeExpected', coalesce((select sum(amount_expected) from other_income_scope), 0),
        'otherIncomeReceived', coalesce((select sum(amount_received) from other_income_scope), 0),
        'unallocatedPayments', coalesce((
            select sum(greatest(
                p.amount - coalesce((
                    select sum(a.amount)
                    from public.club_finance_payment_allocations a
                    where a.payment_id = p.id
                ), 0),
                0
            ))
            from payment_scope p
        ), 0),
        'recordedCashPosition',
            case
                when p_team_id is not null then null
                else
                    coalesce((select sum(opening_balance) from accounts_scope), 0)
                    + coalesce((select sum(net_amount) from payment_scope), 0)
                    + coalesce((select sum(amount_received) from other_income_scope), 0)
                    - coalesce((select sum(amount + tax_amount) from expense_scope where status = 'paid'), 0)
            end,
        'collectionRate',
            case
                when coalesce((select sum(amount_due - waived_amount) from charge_scope), 0) <= 0 then 0
                else round(
                    100 * coalesce((select sum(amount_paid) from charge_scope), 0)
                    / nullif((select sum(amount_due - waived_amount) from charge_scope), 0),
                    1
                )
            end
    ) into result;

    return result;
end;
$$;

revoke all on function public.club_finance_dashboard_summary(uuid, uuid, uuid)
    from public, anon;
grant execute on function public.club_finance_dashboard_summary(uuid, uuid, uuid)
    to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Six-month income/expense trend, computed server-side.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_monthly_trend(
    p_organisation_id uuid,
    p_season_id uuid default null,
    p_team_id uuid default null,
    p_months integer default 6
)
returns table (
    month_start date,
    member_income numeric,
    other_income numeric,
    total_income numeric,
    expenses numeric,
    net numeric
)
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
begin
    if p_months < 1 or p_months > 24 then
        raise exception 'Trend period must be between 1 and 24 months.';
    end if;

    if p_team_id is null then
        perform public.club_finance_assert_full_access(p_organisation_id);
    else
        perform public.club_finance_assert_team_access(p_organisation_id, p_team_id);
    end if;

    return query
    with months as (
        select generate_series(
            date_trunc('month', current_date) - ((p_months - 1) || ' months')::interval,
            date_trunc('month', current_date),
            interval '1 month'
        )::date as month_start
    ),
    payment_net as (
        select
            date_trunc('month', p.payment_date)::date as month_start,
            sum(greatest(
                p.amount - coalesce((
                    select sum(a.refunded_amount)
                    from public.club_finance_payment_allocations a
                    where a.payment_id = p.id
                ), 0),
                0
            ))::numeric as amount
        from public.club_finance_payments p
        where p.organisation_id = p_organisation_id
          and (p_season_id is null or p.season_id = p_season_id)
          and (p_team_id is null or p.team_id = p_team_id)
          and p.status in ('recorded', 'cleared', 'part_refunded')
        group by 1
    ),
    other_income_net as (
        select
            date_trunc('month', i.income_date)::date as month_start,
            sum(i.amount_received)::numeric as amount
        from public.club_finance_income i
        where i.organisation_id = p_organisation_id
          and (p_season_id is null or i.season_id = p_season_id)
          and (p_team_id is null or i.team_id = p_team_id)
          and i.status <> 'cancelled'
        group by 1
    ),
    expense_net as (
        select
            date_trunc('month', e.expense_date)::date as month_start,
            sum(e.amount + e.tax_amount)::numeric as amount
        from public.club_finance_expenses e
        where e.organisation_id = p_organisation_id
          and (p_season_id is null or e.season_id = p_season_id)
          and (p_team_id is null or e.team_id = p_team_id)
          and e.status not in ('draft', 'void')
        group by 1
    )
    select
        m.month_start,
        coalesce(pn.amount, 0)::numeric as member_income,
        coalesce(oi.amount, 0)::numeric as other_income,
        (coalesce(pn.amount, 0) + coalesce(oi.amount, 0))::numeric as total_income,
        coalesce(en.amount, 0)::numeric as expenses,
        (coalesce(pn.amount, 0) + coalesce(oi.amount, 0) - coalesce(en.amount, 0))::numeric as net
    from months m
    left join payment_net pn using (month_start)
    left join other_income_net oi using (month_start)
    left join expense_net en using (month_start)
    order by m.month_start;
end;
$$;

revoke all on function public.club_finance_monthly_trend(uuid, uuid, uuid, integer)
    from public, anon;
grant execute on function public.club_finance_monthly_trend(uuid, uuid, uuid, integer)
    to authenticated;

-- ---------------------------------------------------------------------------
-- 13. Cross-tenant reference guard.
--     Foreign keys alone do not guarantee that referenced IDs belong to the same
--     organisation. This trigger prevents accidental or malicious cross-tenant
--     linkage for finance records.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_validate_reference_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    row_json jsonb := to_jsonb(new);
    org_id uuid;
    ref_id uuid;
begin
    if not (row_json ? 'organisation_id') then
        return new;
    end if;

    org_id := nullif(row_json ->> 'organisation_id', '')::uuid;

    if org_id is null then
        raise exception 'organisation_id is required.';
    end if;

    perform public.club_finance_assert_club(org_id);

    if row_json ? 'team_id' and nullif(row_json ->> 'team_id', '') is not null then
        ref_id := (row_json ->> 'team_id')::uuid;
        if not exists (
            select 1 from public.teams t
            where t.id = ref_id and t.organisation_id = org_id
        ) then
            raise exception 'Finance team reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'season_id' and nullif(row_json ->> 'season_id', '') is not null then
        ref_id := (row_json ->> 'season_id')::uuid;
        if not exists (
            select 1 from public.club_seasons s
            where s.id = ref_id and s.organisation_id = org_id
        ) then
            raise exception 'Finance season reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'player_id' and nullif(row_json ->> 'player_id', '') is not null then
        ref_id := (row_json ->> 'player_id')::uuid;
        if not exists (
            select 1 from public.club_players p
            where p.id = ref_id and p.organisation_id = org_id
        ) then
            raise exception 'Finance player reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'payer_id' and nullif(row_json ->> 'payer_id', '') is not null then
        ref_id := (row_json ->> 'payer_id')::uuid;
        if not exists (
            select 1 from public.club_finance_payers p
            where p.id = ref_id and p.organisation_id = org_id
        ) then
            raise exception 'Finance payer reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'account_id' and nullif(row_json ->> 'account_id', '') is not null then
        ref_id := (row_json ->> 'account_id')::uuid;
        if not exists (
            select 1 from public.club_finance_accounts a
            where a.id = ref_id and a.organisation_id = org_id
        ) then
            raise exception 'Finance account reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'fixture_id' and nullif(row_json ->> 'fixture_id', '') is not null then
        ref_id := (row_json ->> 'fixture_id')::uuid;
        if not exists (
            select 1 from public.club_fixtures f
            where f.id = ref_id and f.organisation_id = org_id
        ) then
            raise exception 'Finance fixture reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'squad_member_id' and nullif(row_json ->> 'squad_member_id', '') is not null then
        ref_id := (row_json ->> 'squad_member_id')::uuid;
        if not exists (
            select 1 from public.club_squad_members sm
            where sm.id = ref_id and sm.organisation_id = org_id
        ) then
            raise exception 'Finance squad-member reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'match_event_id' and nullif(row_json ->> 'match_event_id', '') is not null then
        ref_id := (row_json ->> 'match_event_id')::uuid;
        if not exists (
            select 1 from public.club_match_events me
            where me.id = ref_id and me.organisation_id = org_id
        ) then
            raise exception 'Finance match-event reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'charge_id' and nullif(row_json ->> 'charge_id', '') is not null then
        ref_id := (row_json ->> 'charge_id')::uuid;
        if not exists (
            select 1 from public.club_player_charges c
            where c.id = ref_id and c.organisation_id = org_id
        ) then
            raise exception 'Finance charge reference belongs to a different organisation.';
        end if;
    end if;

    if row_json ? 'official_payment_id' and nullif(row_json ->> 'official_payment_id', '') is not null then
        ref_id := (row_json ->> 'official_payment_id')::uuid;
        if not exists (
            select 1 from public.official_payments op
            where op.id = ref_id and op.organisation_id = org_id
        ) then
            raise exception 'Official payment belongs to a different organisation.';
        end if;
    end if;

    if tg_table_name = 'club_player_charges'
       and nullif(row_json ->> 'charge_type_id', '') is not null then
        ref_id := (row_json ->> 'charge_type_id')::uuid;
        if not exists (
            select 1 from public.club_finance_charge_types ct
            where ct.id = ref_id and ct.organisation_id = org_id
        ) then
            raise exception 'Charge type belongs to a different organisation.';
        end if;
    end if;

    if tg_table_name = 'club_finance_income'
       and nullif(row_json ->> 'category_id', '') is not null then
        ref_id := (row_json ->> 'category_id')::uuid;
        if not exists (
            select 1 from public.club_finance_income_categories c
            where c.id = ref_id and c.organisation_id = org_id
        ) then
            raise exception 'Income category belongs to a different organisation.';
        end if;
    end if;

    if tg_table_name = 'club_finance_expenses'
       and nullif(row_json ->> 'category_id', '') is not null then
        ref_id := (row_json ->> 'category_id')::uuid;
        if not exists (
            select 1 from public.club_finance_expense_categories c
            where c.id = ref_id and c.organisation_id = org_id
        ) then
            raise exception 'Expense category belongs to a different organisation.';
        end if;
    end if;

    return new;
end;
$$;

do $$
declare
    table_name text;
    trigger_name text;
begin
    foreach table_name in array array[
        'club_finance_access',
        'club_finance_payers',
        'club_finance_payer_links',
        'club_finance_charge_types',
        'club_player_charges',
        'club_finance_payments',
        'club_finance_income_categories',
        'club_finance_income',
        'club_finance_expense_categories',
        'club_finance_expenses',
        'club_finance_budgets',
        'club_finance_notifications',
        'club_finance_accounts'
    ] loop
        trigger_name := 'trg_' || table_name || '_scope_guard';
        execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
        execute format(
            'create trigger %I before insert or update on public.%I for each row execute function public.club_finance_validate_reference_scope()',
            trigger_name,
            table_name
        );
    end loop;
end
$$;

create or replace function public.club_finance_validate_budget_line_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    org_id uuid;
begin
    select organisation_id into org_id
    from public.club_finance_budgets
    where id = new.budget_id;

    if org_id is null then
        raise exception 'Budget does not exist.';
    end if;

    if new.income_category_id is not null and not exists (
        select 1 from public.club_finance_income_categories c
        where c.id = new.income_category_id
          and c.organisation_id = org_id
    ) then
        raise exception 'Budget income category belongs to a different organisation.';
    end if;

    if new.expense_category_id is not null and not exists (
        select 1 from public.club_finance_expense_categories c
        where c.id = new.expense_category_id
          and c.organisation_id = org_id
    ) then
        raise exception 'Budget expense category belongs to a different organisation.';
    end if;

    return new;
end;
$$;

drop trigger if exists trg_club_finance_budget_lines_scope_guard
    on public.club_finance_budget_lines;
create trigger trg_club_finance_budget_lines_scope_guard
before insert or update on public.club_finance_budget_lines
for each row execute function public.club_finance_validate_budget_line_scope();

-- ---------------------------------------------------------------------------
-- 14. Audit finance accounts as material records.
-- ---------------------------------------------------------------------------

drop trigger if exists trg_club_finance_accounts_finance_audit
    on public.club_finance_accounts;
create trigger trg_club_finance_accounts_finance_audit
after insert or update or delete on public.club_finance_accounts
for each row execute function public.club_finance_audit_trigger('finance_account');

commit;
