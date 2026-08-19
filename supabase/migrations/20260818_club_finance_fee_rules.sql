-- TournamentHQ Club Finance Phase 3.4
-- Team/season fee rules and automatic obligation materialisation.
--
-- Design principles:
--   * A fee rule belongs to a team + season, not to an individual player.
--   * Player charges remain the member-level obligations generated from a rule.
--   * Payments remain actual money received and are matched to obligations separately.
--   * Existing club_team_seasons payment columns remain supported for compatibility.

begin;

create table if not exists public.club_finance_fee_rules (
    id uuid primary key default uuid_generate_v4(),
    organisation_id uuid not null
        references public.organisations(id) on delete cascade,
    season_id uuid not null
        references public.club_seasons(id) on delete cascade,
    team_id uuid not null
        references public.teams(id) on delete cascade,
    charge_type_id uuid not null
        references public.club_finance_charge_types(id) on delete restrict,

    canonical_type text not null
        check (canonical_type in ('sign_on', 'monthly_fee', 'matchday_sub', 'custom')),
    frequency text not null
        check (frequency in ('once_per_season', 'monthly', 'per_fixture')),
    amount numeric(12,2) not null
        check (amount > 0),
    due_day integer
        check (due_day is null or due_day between 1 and 28),

    name text not null,
    description text,
    active boolean not null default true,
    auto_apply boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint club_finance_fee_rules_org_season_team_type_key
        unique (organisation_id, season_id, team_id, charge_type_id),
    constraint club_finance_fee_rules_team_season_fkey
        foreign key (organisation_id, season_id, team_id)
        references public.club_team_seasons (
            organisation_id,
            season_id,
            team_id
        )
        on delete restrict,
    constraint club_finance_fee_rules_frequency_type_check
        check (
            (canonical_type = 'monthly_fee' and frequency = 'monthly')
            or (canonical_type = 'matchday_sub' and frequency = 'per_fixture')
            or (canonical_type = 'sign_on' and frequency = 'once_per_season')
            or canonical_type = 'custom'
        )
);

create index if not exists idx_club_finance_fee_rules_scope
    on public.club_finance_fee_rules (
        organisation_id,
        season_id,
        team_id,
        active
    );

create index if not exists idx_club_finance_fee_rules_type
    on public.club_finance_fee_rules (
        organisation_id,
        canonical_type,
        active
    );

alter table public.club_player_charges
    add column if not exists fee_rule_id uuid
        references public.club_finance_fee_rules(id) on delete set null;

create index if not exists idx_club_player_charges_fee_rule
    on public.club_player_charges (fee_rule_id)
    where fee_rule_id is not null;

-- A team/season signing-on obligation must not be generated more than once for
-- the same player. Monthly and matchday obligations already have partial unique
-- indexes from the existing finance engine.
create unique index if not exists club_player_charges_sign_on_unique
on public.club_player_charges (
    organisation_id,
    season_id,
    team_id,
    player_id
)
where charge_type = 'sign_on';

-- Reuse the shared updated-at implementation already introduced by club ops.
drop trigger if exists trg_club_finance_fee_rules_updated_at
    on public.club_finance_fee_rules;
create trigger trg_club_finance_fee_rules_updated_at
before update on public.club_finance_fee_rules
for each row
execute function public.club_operations_set_updated_at();

-- ---------------------------------------------------------------------------
-- Backfill fee rules from the existing team-season payment policy.
-- ---------------------------------------------------------------------------

insert into public.club_finance_fee_rules (
    organisation_id,
    season_id,
    team_id,
    charge_type_id,
    canonical_type,
    frequency,
    amount,
    due_day,
    name,
    description,
    active,
    auto_apply
)
select
    cts.organisation_id,
    cts.season_id,
    cts.team_id,
    ct.id,
    'monthly_fee',
    'monthly',
    cts.monthly_fee_amount,
    cts.monthly_due_day,
    'Monthly dues',
    'Monthly team dues',
    true,
    true
from public.club_team_seasons cts
join lateral (
    select id
    from public.club_finance_charge_types ct0
    where ct0.organisation_id = cts.organisation_id
      and ct0.canonical_type = 'monthly_fee'
      and ct0.active = true
    order by ct0.system_defined desc, ct0.created_at
    limit 1
) ct on true
where cts.status <> 'archived'
  and cts.payment_model in ('monthly', 'hybrid')
  and cts.monthly_fee_amount > 0
on conflict (organisation_id, season_id, team_id, charge_type_id)
do update set
    amount = excluded.amount,
    due_day = excluded.due_day,
    active = true,
    updated_at = now();

insert into public.club_finance_fee_rules (
    organisation_id,
    season_id,
    team_id,
    charge_type_id,
    canonical_type,
    frequency,
    amount,
    due_day,
    name,
    description,
    active,
    auto_apply
)
select
    cts.organisation_id,
    cts.season_id,
    cts.team_id,
    ct.id,
    'matchday_sub',
    'per_fixture',
    cts.matchday_sub_amount,
    null,
    'Match subs',
    'Default matchday contribution',
    true,
    false
from public.club_team_seasons cts
join lateral (
    select id
    from public.club_finance_charge_types ct0
    where ct0.organisation_id = cts.organisation_id
      and ct0.canonical_type = 'matchday_sub'
      and ct0.active = true
    order by ct0.system_defined desc, ct0.created_at
    limit 1
) ct on true
where cts.status <> 'archived'
  and cts.payment_model in ('matchday', 'hybrid')
  and cts.matchday_sub_amount > 0
on conflict (organisation_id, season_id, team_id, charge_type_id)
do update set
    amount = excluded.amount,
    active = true,
    updated_at = now();

-- Safely infer a team-level signing-on rule only when all active members with a
-- configured positive legacy amount agree on the same amount. Mixed legacy
-- amounts are intentionally left untouched and can be normalised by an admin.
with sign_on_candidates as (
    select
        sm.organisation_id,
        sm.season_id,
        sm.team_id,
        min(sm.sign_on_fee_amount) as amount,
        max(sm.sign_on_fee_amount) as max_amount,
        count(*) filter (where sm.sign_on_fee_amount > 0) as configured_count
    from public.club_squad_members sm
    where sm.active = true
    group by sm.organisation_id, sm.season_id, sm.team_id
)
insert into public.club_finance_fee_rules (
    organisation_id,
    season_id,
    team_id,
    charge_type_id,
    canonical_type,
    frequency,
    amount,
    due_day,
    name,
    description,
    active,
    auto_apply
)
select
    c.organisation_id,
    c.season_id,
    c.team_id,
    ct.id,
    'sign_on',
    'once_per_season',
    c.amount,
    null,
    'Season / signing-on dues',
    'One-off seasonal dues',
    true,
    true
from sign_on_candidates c
join lateral (
    select id
    from public.club_finance_charge_types ct0
    where ct0.organisation_id = c.organisation_id
      and ct0.canonical_type = 'sign_on'
      and ct0.active = true
    order by ct0.system_defined desc, ct0.created_at
    limit 1
) ct on true
where c.configured_count > 0
  and c.amount > 0
  and c.amount = c.max_amount
on conflict (organisation_id, season_id, team_id, charge_type_id)
do nothing;

-- Link existing member obligations to the best matching team rule where that
-- relationship can be inferred safely. Payments stay normalised: they connect
-- to rules through payment allocations -> member charges, allowing one payment
-- to settle more than one type of due.
with preferred_rules as (
    select distinct on (
        organisation_id,
        season_id,
        team_id,
        canonical_type
    )
        id,
        organisation_id,
        season_id,
        team_id,
        canonical_type
    from public.club_finance_fee_rules
    where active = true
      and canonical_type in ('sign_on', 'monthly_fee', 'matchday_sub')
    order by
        organisation_id,
        season_id,
        team_id,
        canonical_type,
        created_at
)
update public.club_player_charges c
set fee_rule_id = r.id
from preferred_rules r
where c.fee_rule_id is null
  and c.organisation_id = r.organisation_id
  and c.season_id = r.season_id
  and c.team_id = r.team_id
  and c.charge_type = r.canonical_type;

-- ---------------------------------------------------------------------------
-- Keep legacy club_team_seasons payment fields compatible with fee rules.
-- Existing TeamPaymentSettings screens can continue to work while the Finance
-- UI transitions to fee rules.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_sync_legacy_payment_policy_to_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    monthly_type_id uuid;
    matchday_type_id uuid;
begin
    select id into monthly_type_id
    from public.club_finance_charge_types
    where organisation_id = new.organisation_id
      and canonical_type = 'monthly_fee'
      and active = true
    order by system_defined desc, created_at
    limit 1;

    select id into matchday_type_id
    from public.club_finance_charge_types
    where organisation_id = new.organisation_id
      and canonical_type = 'matchday_sub'
      and active = true
    order by system_defined desc, created_at
    limit 1;

    if monthly_type_id is not null then
        if new.payment_model in ('monthly', 'hybrid') and new.monthly_fee_amount > 0 then
            insert into public.club_finance_fee_rules (
                organisation_id,
                season_id,
                team_id,
                charge_type_id,
                canonical_type,
                frequency,
                amount,
                due_day,
                name,
                description,
                active,
                auto_apply,
                created_by
            ) values (
                new.organisation_id,
                new.season_id,
                new.team_id,
                monthly_type_id,
                'monthly_fee',
                'monthly',
                new.monthly_fee_amount,
                new.monthly_due_day,
                'Monthly dues',
                'Monthly team dues',
                true,
                true,
                auth.uid()
            )
            on conflict (organisation_id, season_id, team_id, charge_type_id)
            do update set
                amount = excluded.amount,
                due_day = excluded.due_day,
                active = true,
                updated_at = now();
        else
            update public.club_finance_fee_rules
            set active = false,
                updated_at = now()
            where organisation_id = new.organisation_id
              and season_id = new.season_id
              and team_id = new.team_id
              and charge_type_id = monthly_type_id;
        end if;
    end if;

    if matchday_type_id is not null then
        if new.payment_model in ('matchday', 'hybrid') and new.matchday_sub_amount > 0 then
            insert into public.club_finance_fee_rules (
                organisation_id,
                season_id,
                team_id,
                charge_type_id,
                canonical_type,
                frequency,
                amount,
                due_day,
                name,
                description,
                active,
                auto_apply,
                created_by
            ) values (
                new.organisation_id,
                new.season_id,
                new.team_id,
                matchday_type_id,
                'matchday_sub',
                'per_fixture',
                new.matchday_sub_amount,
                null,
                'Match subs',
                'Default matchday contribution',
                true,
                false,
                auth.uid()
            )
            on conflict (organisation_id, season_id, team_id, charge_type_id)
            do update set
                amount = excluded.amount,
                active = true,
                updated_at = now();
        else
            update public.club_finance_fee_rules
            set active = false,
                updated_at = now()
            where organisation_id = new.organisation_id
              and season_id = new.season_id
              and team_id = new.team_id
              and charge_type_id = matchday_type_id;
        end if;
    end if;

    return new;
end;
$$;

revoke all on function public.club_finance_sync_legacy_payment_policy_to_rules()
    from public, anon;
grant execute on function public.club_finance_sync_legacy_payment_policy_to_rules()
    to authenticated;

drop trigger if exists trg_club_team_seasons_finance_rule_sync
    on public.club_team_seasons;
create trigger trg_club_team_seasons_finance_rule_sync
after insert or update of payment_model, monthly_fee_amount, matchday_sub_amount, monthly_due_day
on public.club_team_seasons
for each row
execute function public.club_finance_sync_legacy_payment_policy_to_rules();

-- ---------------------------------------------------------------------------
-- Materialise member obligations from an active team rule.
-- Monthly/season rules are idempotent because of the partial unique indexes.
-- Matchday rules remain defaults until a fixture/player context is known.
-- ---------------------------------------------------------------------------

create or replace function public.club_finance_apply_fee_rule(
    p_rule_id uuid,
    p_period date default null
)
returns integer
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    rule_row public.club_finance_fee_rules%rowtype;
    season_row public.club_seasons%rowtype;
    effective_period date;
    effective_due_date date;
    inserted_count integer := 0;
begin
    select * into rule_row
    from public.club_finance_fee_rules
    where id = p_rule_id
      and active = true;

    if not found then
        raise exception 'The selected fee rule is not active.';
    end if;

    perform public.club_finance_assert_team_access(
        rule_row.organisation_id,
        rule_row.team_id
    );

    if rule_row.frequency = 'per_fixture' then
        return 0;
    end if;

    select * into season_row
    from public.club_seasons
    where id = rule_row.season_id
      and organisation_id = rule_row.organisation_id;

    if not found then
        raise exception 'The selected season could not be found.';
    end if;

    if rule_row.frequency = 'monthly' then
        effective_period := date_trunc('month', coalesce(p_period, current_date))::date;
        effective_due_date := make_date(
            extract(year from effective_period)::integer,
            extract(month from effective_period)::integer,
            coalesce(rule_row.due_day, 1)
        );

        insert into public.club_player_charges (
            organisation_id,
            season_id,
            team_id,
            player_id,
            squad_member_id,
            fee_rule_id,
            charge_type_id,
            charge_type,
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
            rule_row.id,
            rule_row.charge_type_id,
            rule_row.canonical_type,
            effective_period,
            rule_row.name || ' - ' || to_char(effective_period, 'FMMonth YYYY'),
            rule_row.amount,
            0,
            case when effective_due_date > current_date then 'not_due' else 'due' end,
            effective_due_date,
            coalesce(nullif(o.currency, ''), 'GBP'),
            auth.uid()
        from public.club_squad_members sm
        join public.organisations o on o.id = sm.organisation_id
        where sm.organisation_id = rule_row.organisation_id
          and sm.season_id = rule_row.season_id
          and sm.team_id = rule_row.team_id
          and sm.active = true
        on conflict do nothing;

        get diagnostics inserted_count = row_count;
        return inserted_count;
    end if;

    effective_period := coalesce(season_row.start_date, current_date);
    effective_due_date := effective_period;

    insert into public.club_player_charges (
        organisation_id,
        season_id,
        team_id,
        player_id,
        squad_member_id,
        fee_rule_id,
        charge_type_id,
        charge_type,
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
        rule_row.id,
        rule_row.charge_type_id,
        rule_row.canonical_type,
        effective_period,
        rule_row.name || ' - ' || coalesce(season_row.season_label, season_row.name),
        rule_row.amount,
        0,
        case when effective_due_date > current_date then 'not_due' else 'due' end,
        effective_due_date,
        coalesce(nullif(o.currency, ''), 'GBP'),
        auth.uid()
    from public.club_squad_members sm
    join public.organisations o on o.id = sm.organisation_id
    where sm.organisation_id = rule_row.organisation_id
      and sm.season_id = rule_row.season_id
      and sm.team_id = rule_row.team_id
      and sm.active = true
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke all on function public.club_finance_apply_fee_rule(uuid, date)
    from public, anon;
grant execute on function public.club_finance_apply_fee_rule(uuid, date)
    to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: fee rules are readable by authorised finance/team users and writable
-- only by full finance roles. Member obligations generated from them retain
-- the existing charge RLS policies.
-- ---------------------------------------------------------------------------

alter table public.club_finance_fee_rules enable row level security;

drop policy if exists club_finance_fee_rules_select
    on public.club_finance_fee_rules;
create policy club_finance_fee_rules_select
on public.club_finance_fee_rules
for select to authenticated
using (
    public.club_finance_has_full_access(organisation_id)
    or public.club_finance_has_team_access(organisation_id, team_id)
);

drop policy if exists club_finance_fee_rules_write
    on public.club_finance_fee_rules;
create policy club_finance_fee_rules_write
on public.club_finance_fee_rules
for all to authenticated
using (public.club_finance_has_full_access(organisation_id))
with check (public.club_finance_has_full_access(organisation_id));

commit;
