-- TournamentHQ Club Finance Phase 3.4 verification
-- Run after applying 20260818_club_finance_fee_rules.sql.

select
    to_regclass('public.club_finance_fee_rules') as fee_rules_table,
    to_regprocedure('public.club_finance_apply_fee_rule(uuid,date)') as apply_rule_function;

select
    column_name,
    data_type,
    is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'club_finance_fee_rules'
order by ordinal_position;

select
    table_name,
    column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'club_player_charges'
  and column_name = 'fee_rule_id';

select
    r.organisation_id,
    r.season_id,
    r.team_id,
    r.canonical_type,
    r.frequency,
    r.amount,
    r.due_day,
    r.active,
    r.auto_apply,
    count(c.id) as generated_member_obligations
from public.club_finance_fee_rules r
left join public.club_player_charges c
  on c.fee_rule_id = r.id
group by
    r.organisation_id,
    r.season_id,
    r.team_id,
    r.canonical_type,
    r.frequency,
    r.amount,
    r.due_day,
    r.active,
    r.auto_apply
order by r.season_id, r.team_id, r.canonical_type;

select
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'club_finance_fee_rules'
order by policyname;
