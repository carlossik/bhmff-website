-- TournamentHQ Club Finance Foundation
-- 2026-08-16
--
-- Purpose:
--   Extend the existing club payment/charge model into an AI-ready, auditable,
--   multi-team club finance foundation without changing Tournament Finance.
--
-- Design rules:
--   * Club Finance is organisation_type='club' only at application level.
--   * Existing club_player_charges behaviour is preserved.
--   * Existing competition_manager/super_admin charge policies are not removed.
--   * New finance roles are additive and team-scoped where applicable.
--   * Existing amount_paid values are preserved as legacy_paid_amount.
--   * New payments support partial/multi-charge allocations and partial refunds.
--   * Club expenses/income/budgets are separate from Tournament Finance.

begin;

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. Finance access model
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_access (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    role text not null
        check (role in ('treasurer', 'finance_admin', 'team_manager', 'committee_viewer')),
    team_id uuid
        references public.teams(id) on delete cascade,
    active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_access_team_scope_check check (
        (role = 'team_manager' and team_id is not null)
        or (role <> 'team_manager' and team_id is null)
    )
);

create unique index if not exists club_finance_access_unique_active_scope
    on public.club_finance_access (
        organisation_id,
        user_id,
        role,
        coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid)
    );

create index if not exists idx_club_finance_access_user
    on public.club_finance_access (user_id, active);

create index if not exists idx_club_finance_access_org_team
    on public.club_finance_access (organisation_id, team_id, active);

-- ---------------------------------------------------------------------------
-- 2. Payers / guardians / member payment contacts
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_payers (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    payer_type text not null default 'guardian'
        check (payer_type in ('self', 'parent', 'guardian', 'other')),
    full_name text not null,
    email text,
    phone text,
    whatsapp_number text,
    whatsapp_opt_in boolean not null default false,
    email_opt_in boolean not null default true,
    active boolean not null default true,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_payers_whatsapp_consent_check check (
        whatsapp_opt_in = false or whatsapp_number is not null
    )
);

create table if not exists public.club_finance_payer_links (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    payer_id uuid not null
        references public.club_finance_payers(id) on delete cascade,
    player_id uuid not null
        references public.club_players(id) on delete cascade,
    relationship text not null default 'guardian'
        check (relationship in ('self', 'parent', 'guardian', 'carer', 'other')),
    is_primary boolean not null default true,
    created_at timestamptz not null default now(),
    constraint club_finance_payer_links_unique
        unique (payer_id, player_id)
);

create index if not exists idx_club_finance_payers_org
    on public.club_finance_payers (organisation_id, active);

create index if not exists idx_club_finance_payer_links_player
    on public.club_finance_payer_links (organisation_id, player_id);

-- ---------------------------------------------------------------------------
-- 3. Configurable club charge definitions
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_charge_types (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    code text not null,
    name text not null,
    canonical_type text not null default 'custom'
        check (
            canonical_type in (
                'sign_on',
                'monthly_fee',
                'matchday_sub',
                'yellow_card_fine',
                'red_card_fine',
                'custom'
            )
        ),
    default_amount numeric(12,2)
        check (default_amount is null or default_amount >= 0),
    active boolean not null default true,
    system_defined boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_charge_types_org_code_key
        unique (organisation_id, code)
);

-- Preserve existing club_player_charges, adding richer finance metadata.
alter table public.club_player_charges
    add column if not exists payer_id uuid
        references public.club_finance_payers(id) on delete set null,
    add column if not exists charge_type_id uuid
        references public.club_finance_charge_types(id) on delete set null,
    add column if not exists currency text not null default 'GBP',
    add column if not exists legacy_paid_amount numeric(10,2) not null default 0,
    add column if not exists waived_amount numeric(10,2) not null default 0,
    add column if not exists waived_reason text,
    add column if not exists waived_at timestamptz,
    add column if not exists waived_by uuid references auth.users(id) on delete set null,
    add column if not exists created_by uuid references auth.users(id) on delete set null,
    add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Capture pre-ledger payment values exactly once. Existing rows have no allocation
-- records yet, so this preserves their historic paid balance when allocations begin.
update public.club_player_charges
set legacy_paid_amount = amount_paid
where legacy_paid_amount = 0
  and amount_paid > 0;

-- Preserve existing waived rows as an explicit waiver amount.
update public.club_player_charges
set waived_amount = greatest(amount_due - amount_paid, 0)
where payment_status = 'waived'
  and waived_amount = 0;

-- Defensive constraints for the new additive fields.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'club_player_charges_legacy_paid_nonnegative'
          and conrelid = 'public.club_player_charges'::regclass
    ) then
        alter table public.club_player_charges
            add constraint club_player_charges_legacy_paid_nonnegative
            check (legacy_paid_amount >= 0);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'club_player_charges_waived_nonnegative'
          and conrelid = 'public.club_player_charges'::regclass
    ) then
        alter table public.club_player_charges
            add constraint club_player_charges_waived_nonnegative
            check (waived_amount >= 0 and waived_amount <= amount_due);
    end if;
end
$$;

create index if not exists idx_club_player_charges_payer
    on public.club_player_charges (organisation_id, payer_id)
    where payer_id is not null;

create index if not exists idx_club_player_charges_charge_type_id
    on public.club_player_charges (organisation_id, charge_type_id)
    where charge_type_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Payments + allocations
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_payments (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid
        references public.club_seasons(id) on delete set null,
    team_id uuid
        references public.teams(id) on delete set null,
    payer_id uuid
        references public.club_finance_payers(id) on delete set null,
    player_id uuid
        references public.club_players(id) on delete set null,
    amount numeric(12,2) not null check (amount > 0),
    currency text not null default 'GBP',
    payment_date date not null default current_date,
    method text not null
        check (method in ('cash', 'bank_transfer', 'card', 'direct_debit', 'standing_order', 'other')),
    status text not null default 'recorded'
        check (status in ('pending', 'recorded', 'cleared', 'failed', 'part_refunded', 'refunded', 'cancelled')),
    gateway_provider text,
    gateway_ref text,
    payment_reference text,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.club_finance_payment_allocations (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    payment_id uuid not null
        references public.club_finance_payments(id) on delete cascade,
    charge_id uuid not null
        references public.club_player_charges(id) on delete cascade,
    amount numeric(12,2) not null check (amount > 0),
    refunded_amount numeric(12,2) not null default 0
        check (refunded_amount >= 0 and refunded_amount <= amount),
    refund_reason text,
    refunded_at timestamptz,
    refunded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_payment_allocations_unique
        unique (payment_id, charge_id)
);

create index if not exists idx_club_finance_payments_org_date
    on public.club_finance_payments (organisation_id, payment_date desc);

create index if not exists idx_club_finance_payments_team
    on public.club_finance_payments (organisation_id, team_id, payment_date desc)
    where team_id is not null;

create index if not exists idx_club_finance_allocations_charge
    on public.club_finance_payment_allocations (charge_id);

create index if not exists idx_club_finance_allocations_payment
    on public.club_finance_payment_allocations (payment_id);

-- ---------------------------------------------------------------------------
-- 5. Non-member income
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_income_categories (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    code text not null,
    name text not null,
    active boolean not null default true,
    system_defined boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_income_categories_org_code_key
        unique (organisation_id, code)
);

create table if not exists public.club_finance_income (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid references public.club_seasons(id) on delete set null,
    team_id uuid references public.teams(id) on delete set null,
    category_id uuid references public.club_finance_income_categories(id) on delete set null,
    source_name text not null,
    description text,
    amount_expected numeric(12,2) not null check (amount_expected >= 0),
    amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
    income_date date not null default current_date,
    due_date date,
    status text not null default 'expected'
        check (status in ('expected', 'part_received', 'received', 'cancelled')),
    currency text not null default 'GBP',
    reference text,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_income_amount_check
        check (amount_received <= amount_expected)
);

create index if not exists idx_club_finance_income_org_date
    on public.club_finance_income (organisation_id, income_date desc);

create index if not exists idx_club_finance_income_team
    on public.club_finance_income (organisation_id, team_id, income_date desc)
    where team_id is not null;

-- ---------------------------------------------------------------------------
-- 6. Expenses + receipts
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_expense_categories (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    code text not null,
    name text not null,
    active boolean not null default true,
    system_defined boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_expense_categories_org_code_key
        unique (organisation_id, code)
);

create table if not exists public.club_finance_expenses (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid references public.club_seasons(id) on delete set null,
    team_id uuid references public.teams(id) on delete set null,
    fixture_id uuid references public.club_fixtures(id) on delete set null,
    official_payment_id uuid references public.official_payments(id) on delete set null,
    category_id uuid references public.club_finance_expense_categories(id) on delete set null,
    supplier_name text,
    description text not null,
    amount numeric(12,2) not null check (amount >= 0),
    tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
    expense_date date not null default current_date,
    status text not null default 'recorded'
        check (status in ('draft', 'recorded', 'pending_approval', 'approved', 'paid', 'void')),
    payment_method text
        check (payment_method is null or payment_method in ('cash', 'bank_transfer', 'card', 'direct_debit', 'other')),
    payment_reference text,
    receipt_url text,
    recurring boolean not null default false,
    currency text not null default 'GBP',
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    approved_by uuid references auth.users(id) on delete set null,
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_club_finance_expenses_org_date
    on public.club_finance_expenses (organisation_id, expense_date desc);

create index if not exists idx_club_finance_expenses_team
    on public.club_finance_expenses (organisation_id, team_id, expense_date desc)
    where team_id is not null;

create index if not exists idx_club_finance_expenses_category
    on public.club_finance_expenses (organisation_id, category_id, expense_date desc);

-- Private storage bucket for expense receipts.
insert into storage.buckets (id, name, public)
values ('club-finance-receipts', 'club-finance-receipts', false)
on conflict (id) do update set public = false;

-- ---------------------------------------------------------------------------
-- 7. Budgets
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_budgets (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid references public.club_seasons(id) on delete set null,
    team_id uuid references public.teams(id) on delete set null,
    name text not null,
    period_start date,
    period_end date,
    status text not null default 'draft'
        check (status in ('draft', 'active', 'closed', 'archived')),
    currency text not null default 'GBP',
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_budget_period_check
        check (period_start is null or period_end is null or period_end >= period_start)
);

create table if not exists public.club_finance_budget_lines (
    id uuid primary key default uuid_generate_v4(),
    budget_id uuid not null
        references public.club_finance_budgets(id) on delete cascade,
    direction text not null check (direction in ('income', 'expense')),
    income_category_id uuid references public.club_finance_income_categories(id) on delete set null,
    expense_category_id uuid references public.club_finance_expense_categories(id) on delete set null,
    label text not null,
    amount numeric(12,2) not null check (amount >= 0),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint club_finance_budget_line_category_check check (
        (direction = 'income' and expense_category_id is null)
        or (direction = 'expense' and income_category_id is null)
    )
);

create index if not exists idx_club_finance_budgets_org_season
    on public.club_finance_budgets (organisation_id, season_id, team_id);

create index if not exists idx_club_finance_budget_lines_budget
    on public.club_finance_budget_lines (budget_id, direction);

-- ---------------------------------------------------------------------------
-- 8. Reminder / notification log
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_notifications (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    charge_id uuid not null
        references public.club_player_charges(id) on delete cascade,
    payer_id uuid references public.club_finance_payers(id) on delete set null,
    channel text not null check (channel in ('whatsapp', 'email')),
    template_key text not null,
    scheduled_for timestamptz,
    status text not null default 'queued'
        check (status in ('queued', 'sent', 'failed', 'skipped')),
    provider_message_id text,
    error_code text,
    error_message text,
    attempted_at timestamptz,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_club_finance_notifications_schedule
    on public.club_finance_notifications (status, scheduled_for)
    where status = 'queued';

create index if not exists idx_club_finance_notifications_charge
    on public.club_finance_notifications (organisation_id, charge_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Finance audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.club_finance_audit_log (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    before_state jsonb,
    after_state jsonb,
    reason text,
    correlation_id text,
    occurred_at timestamptz not null default now()
);

create index if not exists idx_club_finance_audit_org_time
    on public.club_finance_audit_log (organisation_id, occurred_at desc);

create index if not exists idx_club_finance_audit_entity
    on public.club_finance_audit_log (entity_type, entity_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 10. Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- Apply only to tables with updated_at.
do $$
declare
    table_name text;
    trigger_name text;
begin
    foreach table_name in array array[
        'club_finance_access',
        'club_finance_payers',
        'club_finance_charge_types',
        'club_finance_payments',
        'club_finance_payment_allocations',
        'club_finance_income_categories',
        'club_finance_income',
        'club_finance_expense_categories',
        'club_finance_expenses',
        'club_finance_budgets',
        'club_finance_budget_lines'
    ] loop
        trigger_name := 'trg_' || table_name || '_updated_at';
        execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
        execute format(
            'create trigger %I before update on public.%I for each row execute function public.club_finance_set_updated_at()',
            trigger_name,
            table_name
        );
    end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 11. Payment allocation validation + charge reconciliation
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_validate_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    payment_org uuid;
    payment_amount numeric(12,2);
    charge_org uuid;
    charge_amount numeric(12,2);
    charge_legacy_paid numeric(12,2);
    charge_waived numeric(12,2);
    allocated_total numeric(12,2);
    charge_allocated_total numeric(12,2);
begin
    select organisation_id, amount
    into payment_org, payment_amount
    from public.club_finance_payments
    where id = new.payment_id;

    select organisation_id, amount_due, legacy_paid_amount, waived_amount
    into charge_org, charge_amount, charge_legacy_paid, charge_waived
    from public.club_player_charges
    where id = new.charge_id;

    if payment_org is null or charge_org is null then
        raise exception 'Payment or charge does not exist.';
    end if;

    if new.organisation_id <> payment_org
       or new.organisation_id <> charge_org then
        raise exception 'Payment allocation organisation mismatch.';
    end if;

    select coalesce(sum(amount), 0)
    into allocated_total
    from public.club_finance_payment_allocations
    where payment_id = new.payment_id
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if allocated_total + new.amount > payment_amount then
        raise exception 'Allocated amount exceeds the payment amount.';
    end if;

    select coalesce(sum(amount), 0)
    into charge_allocated_total
    from public.club_finance_payment_allocations
    where charge_id = new.charge_id
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if charge_allocated_total + new.amount > greatest(
        charge_amount - charge_legacy_paid - charge_waived,
        0
    ) then
        raise exception 'Allocated amount exceeds the outstanding charge balance.';
    end if;

    return new;
end;
$$;

create or replace function public.club_finance_recalculate_charge(
    p_charge_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    charge_row public.club_player_charges%rowtype;
    allocated_net numeric(12,2);
    new_paid numeric(12,2);
    settled numeric(12,2);
    new_status text;
begin
    select *
    into charge_row
    from public.club_player_charges
    where id = p_charge_id
    for update;

    if not found then
        return;
    end if;

    select coalesce(sum(a.amount - a.refunded_amount), 0)
    into allocated_net
    from public.club_finance_payment_allocations a
    join public.club_finance_payments p
      on p.id = a.payment_id
    where a.charge_id = p_charge_id
      and p.status in ('recorded', 'cleared', 'part_refunded');

    new_paid := least(
        charge_row.amount_due,
        greatest(0, charge_row.legacy_paid_amount + allocated_net)
    );

    settled := new_paid + charge_row.waived_amount;

    if charge_row.waived_amount > 0
       and settled >= charge_row.amount_due then
        new_status := 'waived';
    elsif new_paid >= charge_row.amount_due then
        new_status := 'paid';
    elsif new_paid > 0 then
        new_status := 'part_paid';
    elsif charge_row.due_date is not null
          and charge_row.due_date > current_date then
        new_status := 'not_due';
    else
        new_status := 'due';
    end if;

    update public.club_player_charges
    set amount_paid = new_paid,
        payment_status = new_status,
        paid_at = case
            when new_status = 'paid' then coalesce(paid_at, now())
            else null
        end,
        updated_at = now()
    where id = p_charge_id;
end;
$$;

create or replace function public.club_finance_reconcile_allocation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if tg_op = 'DELETE' then
        perform public.club_finance_recalculate_charge(old.charge_id);
        return old;
    end if;

    if tg_op = 'UPDATE' and old.charge_id <> new.charge_id then
        perform public.club_finance_recalculate_charge(old.charge_id);
    end if;

    perform public.club_finance_recalculate_charge(new.charge_id);
    return new;
end;
$$;

drop trigger if exists trg_club_finance_validate_allocation
    on public.club_finance_payment_allocations;
create trigger trg_club_finance_validate_allocation
before insert or update on public.club_finance_payment_allocations
for each row execute function public.club_finance_validate_allocation();

drop trigger if exists trg_club_finance_reconcile_allocation
    on public.club_finance_payment_allocations;
create trigger trg_club_finance_reconcile_allocation
after insert or update or delete on public.club_finance_payment_allocations
for each row execute function public.club_finance_reconcile_allocation_trigger();

-- When a payment changes status, every linked charge needs to be reconciled.
create or replace function public.club_finance_reconcile_payment_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    allocation_row record;
begin
    if tg_op = 'UPDATE' and old.status is not distinct from new.status then
        return new;
    end if;

    for allocation_row in
        select charge_id
        from public.club_finance_payment_allocations
        where payment_id = new.id
    loop
        perform public.club_finance_recalculate_charge(allocation_row.charge_id);
    end loop;

    return new;
end;
$$;

drop trigger if exists trg_club_finance_reconcile_payment
    on public.club_finance_payments;
create trigger trg_club_finance_reconcile_payment
after update of status on public.club_finance_payments
for each row execute function public.club_finance_reconcile_payment_trigger();

-- ---------------------------------------------------------------------------
-- 12. Automatic audit logging for material finance records
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    org_id uuid;
    row_id uuid;
    before_json jsonb;
    after_json jsonb;
begin
    if tg_op = 'INSERT' then
        after_json := to_jsonb(new);
        org_id := (after_json ->> 'organisation_id')::uuid;
        row_id := (after_json ->> 'id')::uuid;
    elsif tg_op = 'DELETE' then
        before_json := to_jsonb(old);
        org_id := (before_json ->> 'organisation_id')::uuid;
        row_id := (before_json ->> 'id')::uuid;
    else
        before_json := to_jsonb(old);
        after_json := to_jsonb(new);
        org_id := coalesce(
            (after_json ->> 'organisation_id')::uuid,
            (before_json ->> 'organisation_id')::uuid
        );
        row_id := coalesce(
            (after_json ->> 'id')::uuid,
            (before_json ->> 'id')::uuid
        );
    end if;

    insert into public.club_finance_audit_log (
        organisation_id,
        user_id,
        action,
        entity_type,
        entity_id,
        before_state,
        after_state
    )
    values (
        org_id,
        auth.uid(),
        lower(tg_op),
        tg_argv[0],
        row_id,
        before_json,
        after_json
    );

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

-- Audit core records. Payer contact records are deliberately excluded from
-- JSON audit snapshots to avoid duplicating personal contact data unnecessarily.
do $$
declare
    item text[];
    table_name text;
    entity_name text;
    trigger_name text;
begin
    foreach item slice 1 in array array[
        array['club_player_charges', 'charge'],
        array['club_finance_payments', 'payment'],
        array['club_finance_payment_allocations', 'payment_allocation'],
        array['club_finance_income', 'income'],
        array['club_finance_expenses', 'expense'],
        array['club_finance_budgets', 'budget'],
        array['club_finance_access', 'finance_access']
    ] loop
        table_name := item[1];
        entity_name := item[2];
        trigger_name := 'trg_' || table_name || '_finance_audit';
        execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
        execute format(
            'create trigger %I after insert or update or delete on public.%I for each row execute function public.club_finance_audit_trigger(%L)',
            trigger_name,
            table_name,
            entity_name
        );
    end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 13. Access helper functions
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.active = true
    );
$$;

create or replace function public.club_finance_is_org_super_admin(
    p_organisation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select exists (
        select 1
        from public.organisation_memberships om
        where om.organisation_id = p_organisation_id
          and om.user_id = auth.uid()
          and om.active = true
          and om.role = 'super_admin'
    );
$$;

create or replace function public.club_finance_has_full_access(
    p_organisation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        public.club_finance_is_platform_admin()
        or public.club_finance_is_org_super_admin(p_organisation_id)
        or exists (
            select 1
            from public.club_finance_access cfa
            where cfa.organisation_id = p_organisation_id
              and cfa.user_id = auth.uid()
              and cfa.active = true
              and cfa.role in ('treasurer', 'finance_admin')
        );
$$;

create or replace function public.club_finance_has_team_access(
    p_organisation_id uuid,
    p_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        public.club_finance_has_full_access(p_organisation_id)
        or exists (
            select 1
            from public.club_finance_access cfa
            where cfa.organisation_id = p_organisation_id
              and cfa.user_id = auth.uid()
              and cfa.active = true
              and cfa.role = 'team_manager'
              and cfa.team_id = p_team_id
        );
$$;

create or replace function public.club_finance_can_read_budget(
    p_organisation_id uuid,
    p_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        public.club_finance_has_full_access(p_organisation_id)
        or exists (
            select 1
            from public.club_finance_access cfa
            where cfa.organisation_id = p_organisation_id
              and cfa.user_id = auth.uid()
              and cfa.active = true
              and (
                  cfa.role = 'committee_viewer'
                  or (
                      cfa.role = 'team_manager'
                      and p_team_id is not null
                      and cfa.team_id = p_team_id
                  )
              )
        );
$$;

-- ---------------------------------------------------------------------------
-- 14. Seed useful default categories for existing club organisations
-- ---------------------------------------------------------------------------

insert into public.club_finance_income_categories (
    organisation_id, code, name, system_defined
)
select o.id, defaults.code, defaults.name, true
from public.organisations o
cross join (
    values
        ('sponsorship', 'Sponsorship'),
        ('grant', 'Grants'),
        ('fundraising', 'Fundraising'),
        ('donation', 'Donations'),
        ('club_shop', 'Club Shop'),
        ('event_income', 'Events & Tournaments'),
        ('other', 'Other Income')
) as defaults(code, name)
where o.organisation_type = 'club'
on conflict (organisation_id, code) do nothing;

insert into public.club_finance_expense_categories (
    organisation_id, code, name, system_defined
)
select o.id, defaults.code, defaults.name, true
from public.organisations o
cross join (
    values
        ('pitch_hire', 'Pitch & Facility Hire'),
        ('officials', 'Referees & Officials'),
        ('coaching', 'Coaching'),
        ('kit_equipment', 'Kit & Equipment'),
        ('travel', 'Travel'),
        ('insurance', 'Insurance'),
        ('league_fa_fees', 'League & Governing Body Fees'),
        ('tournament_entry', 'Tournament Entry Fees'),
        ('medical_welfare', 'Medical & Welfare'),
        ('administration', 'Administration'),
        ('media_technology', 'Media & Technology'),
        ('other', 'Other Expense')
) as defaults(code, name)
where o.organisation_type = 'club'
on conflict (organisation_id, code) do nothing;

insert into public.club_finance_charge_types (
    organisation_id,
    code,
    name,
    canonical_type,
    system_defined
)
select o.id, defaults.code, defaults.name, defaults.canonical_type, true
from public.organisations o
cross join (
    values
        ('sign_on', 'Signing-on Fee', 'sign_on'),
        ('monthly_fee', 'Monthly Fee', 'monthly_fee'),
        ('matchday_sub', 'Matchday Sub', 'matchday_sub'),
        ('yellow_card_fine', 'Yellow Card Fine', 'yellow_card_fine'),
        ('red_card_fine', 'Red Card Fine', 'red_card_fine')
) as defaults(code, name, canonical_type)
where o.organisation_type = 'club'
on conflict (organisation_id, code) do nothing;

-- Link existing charges to the matching system type where possible.
update public.club_player_charges c
set charge_type_id = ct.id
from public.club_finance_charge_types ct
where c.charge_type_id is null
  and ct.organisation_id = c.organisation_id
  and ct.canonical_type = c.charge_type
  and ct.system_defined = true;

-- ---------------------------------------------------------------------------
-- 15. RLS
-- ---------------------------------------------------------------------------

alter table public.club_finance_access enable row level security;
alter table public.club_finance_payers enable row level security;
alter table public.club_finance_payer_links enable row level security;
alter table public.club_finance_charge_types enable row level security;
alter table public.club_finance_payments enable row level security;
alter table public.club_finance_payment_allocations enable row level security;
alter table public.club_finance_income_categories enable row level security;
alter table public.club_finance_income enable row level security;
alter table public.club_finance_expense_categories enable row level security;
alter table public.club_finance_expenses enable row level security;
alter table public.club_finance_budgets enable row level security;
alter table public.club_finance_budget_lines enable row level security;
alter table public.club_finance_notifications enable row level security;
alter table public.club_finance_audit_log enable row level security;

-- Finance access: platform/super-admin manages assignments; users may see their own.
drop policy if exists club_finance_access_select on public.club_finance_access;
create policy club_finance_access_select
on public.club_finance_access
for select to authenticated
using (
    user_id = auth.uid()
    or public.club_finance_is_platform_admin()
    or public.club_finance_is_org_super_admin(organisation_id)
);

drop policy if exists club_finance_access_insert on public.club_finance_access;
create policy club_finance_access_insert
on public.club_finance_access
for insert to authenticated
with check (
    public.club_finance_is_platform_admin()
    or public.club_finance_is_org_super_admin(organisation_id)
);

drop policy if exists club_finance_access_update on public.club_finance_access;
create policy club_finance_access_update
on public.club_finance_access
for update to authenticated
using (
    public.club_finance_is_platform_admin()
    or public.club_finance_is_org_super_admin(organisation_id)
)
with check (
    public.club_finance_is_platform_admin()
    or public.club_finance_is_org_super_admin(organisation_id)
);

drop policy if exists club_finance_access_delete on public.club_finance_access;
create policy club_finance_access_delete
on public.club_finance_access
for delete to authenticated
using (
    public.club_finance_is_platform_admin()
    or public.club_finance_is_org_super_admin(organisation_id)
);

-- Payer/contact records are sensitive: full finance access only.
drop policy if exists club_finance_payers_full_access on public.club_finance_payers;
create policy club_finance_payers_full_access
on public.club_finance_payers
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

drop policy if exists club_finance_payer_links_full_access on public.club_finance_payer_links;
create policy club_finance_payer_links_full_access
on public.club_finance_payer_links
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

-- Charge definitions: full finance writes; team managers may read.
drop policy if exists club_finance_charge_types_select on public.club_finance_charge_types;
create policy club_finance_charge_types_select
on public.club_finance_charge_types
for select to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or exists (
        select 1 from public.club_finance_access cfa
        where cfa.organisation_id = club_finance_charge_types.organisation_id
          and cfa.user_id = auth.uid()
          and cfa.active = true
          and cfa.role = 'team_manager'
    )
);

drop policy if exists club_finance_charge_types_write on public.club_finance_charge_types;
create policy club_finance_charge_types_write
on public.club_finance_charge_types
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

-- Additive policies for existing charges. Existing policies remain untouched.
drop policy if exists club_player_charges_finance_select on public.club_player_charges;
create policy club_player_charges_finance_select
on public.club_player_charges
for select to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or public.club_finance_has_team_access(organisation_id, team_id)
);

drop policy if exists club_player_charges_finance_insert on public.club_player_charges;
create policy club_player_charges_finance_insert
on public.club_player_charges
for insert to authenticated
with check (
    public.club_finance_has_full_access(organisation_id)
    or public.club_finance_has_team_access(organisation_id, team_id)
);

drop policy if exists club_player_charges_finance_update on public.club_player_charges;
create policy club_player_charges_finance_update
on public.club_player_charges
for update to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or public.club_finance_has_team_access(organisation_id, team_id)
)
with check (
    public.club_finance_has_full_access(organisation_id)
    or public.club_finance_has_team_access(organisation_id, team_id)
);

-- Only full finance can delete a charge through the new finance model.
drop policy if exists club_player_charges_finance_delete on public.club_player_charges;
create policy club_player_charges_finance_delete
on public.club_player_charges
for delete to authenticated
using (public.club_finance_has_full_access(organisation_id));

-- Payments: full finance sees all; team managers only team-scoped payment records.
drop policy if exists club_finance_payments_select on public.club_finance_payments;
create policy club_finance_payments_select
on public.club_finance_payments
for select to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or (
        team_id is not null
        and public.club_finance_has_team_access(organisation_id, team_id)
    )
);

drop policy if exists club_finance_payments_insert on public.club_finance_payments;
create policy club_finance_payments_insert
on public.club_finance_payments
for insert to authenticated
with check (
    public.club_finance_has_full_access(organisation_id)
    or (
        team_id is not null
        and public.club_finance_has_team_access(organisation_id, team_id)
    )
);

drop policy if exists club_finance_payments_update on public.club_finance_payments;
create policy club_finance_payments_update
on public.club_finance_payments
for update to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or (
        team_id is not null
        and public.club_finance_has_team_access(organisation_id, team_id)
    )
)
with check (
    public.club_finance_has_full_access(organisation_id)
    or (
        team_id is not null
        and public.club_finance_has_team_access(organisation_id, team_id)
    )
);

drop policy if exists club_finance_payments_delete on public.club_finance_payments;
create policy club_finance_payments_delete
on public.club_finance_payments
for delete to authenticated
using (public.club_finance_has_full_access(organisation_id));

-- Allocations inherit access from the charge/team and payment context.
drop policy if exists club_finance_allocations_select on public.club_finance_payment_allocations;
create policy club_finance_allocations_select
on public.club_finance_payment_allocations
for select to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or exists (
        select 1
        from public.club_player_charges c
        where c.id = club_finance_payment_allocations.charge_id
          and public.club_finance_has_team_access(c.organisation_id, c.team_id)
    )
);

drop policy if exists club_finance_allocations_insert on public.club_finance_payment_allocations;
create policy club_finance_allocations_insert
on public.club_finance_payment_allocations
for insert to authenticated
with check (
    public.club_finance_has_full_access(organisation_id)
    or exists (
        select 1
        from public.club_player_charges c
        join public.club_finance_payments p
          on p.id = club_finance_payment_allocations.payment_id
        where c.id = club_finance_payment_allocations.charge_id
          and c.organisation_id = club_finance_payment_allocations.organisation_id
          and p.organisation_id = club_finance_payment_allocations.organisation_id
          and p.team_id = c.team_id
          and public.club_finance_has_team_access(c.organisation_id, c.team_id)
    )
);

drop policy if exists club_finance_allocations_update on public.club_finance_payment_allocations;
create policy club_finance_allocations_update
on public.club_finance_payment_allocations
for update to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or exists (
        select 1
        from public.club_player_charges c
        where c.id = club_finance_payment_allocations.charge_id
          and public.club_finance_has_team_access(c.organisation_id, c.team_id)
    )
)
with check (
    public.club_finance_has_full_access(organisation_id)
    or exists (
        select 1
        from public.club_player_charges c
        join public.club_finance_payments p
          on p.id = club_finance_payment_allocations.payment_id
        where c.id = club_finance_payment_allocations.charge_id
          and p.team_id = c.team_id
          and public.club_finance_has_team_access(c.organisation_id, c.team_id)
    )
);

drop policy if exists club_finance_allocations_delete on public.club_finance_payment_allocations;
create policy club_finance_allocations_delete
on public.club_finance_payment_allocations
for delete to authenticated
using (public.club_finance_has_full_access(organisation_id));

-- Categories, non-member income and expenses: full finance only.
do $$
declare
    table_name text;
    policy_name text;
begin
    foreach table_name in array array[
        'club_finance_income_categories',
        'club_finance_income',
        'club_finance_expense_categories',
        'club_finance_expenses',
        'club_finance_notifications',
        'club_finance_audit_log'
    ] loop
        policy_name := table_name || '_full_access';
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
        execute format(
            'create policy %I on public.%I for all to authenticated using (public.club_finance_has_full_access(organisation_id)) with check (public.club_finance_has_full_access(organisation_id))',
            policy_name,
            table_name
        );
    end loop;
end
$$;

-- Budgets: full finance writes; committee viewers/team managers may read scoped budgets.
drop policy if exists club_finance_budgets_select on public.club_finance_budgets;
create policy club_finance_budgets_select
on public.club_finance_budgets
for select to authenticated
using (public.club_finance_can_read_budget(organisation_id, team_id));

drop policy if exists club_finance_budgets_write on public.club_finance_budgets;
create policy club_finance_budgets_write
on public.club_finance_budgets
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

-- Budget lines inherit budget access.
drop policy if exists club_finance_budget_lines_select on public.club_finance_budget_lines;
create policy club_finance_budget_lines_select
on public.club_finance_budget_lines
for select to authenticated
using (
    exists (
        select 1
        from public.club_finance_budgets b
        where b.id = club_finance_budget_lines.budget_id
          and public.club_finance_can_read_budget(b.organisation_id, b.team_id)
    )
);

drop policy if exists club_finance_budget_lines_write on public.club_finance_budget_lines;
create policy club_finance_budget_lines_write
on public.club_finance_budget_lines
for all to authenticated
using (
    exists (
        select 1
        from public.club_finance_budgets b
        where b.id = club_finance_budget_lines.budget_id
          and public.club_finance_has_full_access(b.organisation_id)
    )
)
with check (
    exists (
        select 1
        from public.club_finance_budgets b
        where b.id = club_finance_budget_lines.budget_id
          and public.club_finance_has_full_access(b.organisation_id)
    )
);

-- Private receipt storage. Path convention: <organisation_id>/<expense_id>/<filename>
drop policy if exists club_finance_receipts_select on storage.objects;
create policy club_finance_receipts_select
on storage.objects
for select to authenticated
using (
    bucket_id = 'club-finance-receipts'
    and exists (
        select 1
        from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and public.club_finance_has_full_access(o.id)
    )
);

drop policy if exists club_finance_receipts_insert on storage.objects;
create policy club_finance_receipts_insert
on storage.objects
for insert to authenticated
with check (
    bucket_id = 'club-finance-receipts'
    and exists (
        select 1
        from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and public.club_finance_has_full_access(o.id)
    )
);

drop policy if exists club_finance_receipts_update on storage.objects;
create policy club_finance_receipts_update
on storage.objects
for update to authenticated
using (
    bucket_id = 'club-finance-receipts'
    and exists (
        select 1
        from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and public.club_finance_has_full_access(o.id)
    )
)
with check (
    bucket_id = 'club-finance-receipts'
    and exists (
        select 1
        from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and public.club_finance_has_full_access(o.id)
    )
);

drop policy if exists club_finance_receipts_delete on storage.objects;
create policy club_finance_receipts_delete
on storage.objects
for delete to authenticated
using (
    bucket_id = 'club-finance-receipts'
    and exists (
        select 1
        from public.organisations o
        where o.id::text = (storage.foldername(name))[1]
          and public.club_finance_has_full_access(o.id)
    )
);

commit;
