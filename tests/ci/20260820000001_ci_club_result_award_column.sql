-- CI ONLY: align an older committed July/August club_results definition with
-- the read-only deployed TournamentHQ column catalogue (2026-10-21).
-- The committed 20260812 migration defines player_of_match, while the
-- deployed schema and public.get_public_club_data() use player_of_the_match.
-- This historical gap is local to replay; DO NOT deploy this file to hosted Supabase.
-- Copy from tests/ci into the ephemeral migrations directory in GitHub Actions.
begin;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='club_results'
      and column_name='player_of_match'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='club_results'
      and column_name='player_of_the_match'
  ) then
    alter table public.club_results rename column player_of_match to player_of_the_match;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='club_results'
      and column_name='player_of_the_match'
  ) then
    raise exception 'CI schema parity: club_results.player_of_the_match is missing';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='club_results'
      and column_name='player_of_match'
  ) then
    raise exception 'CI schema parity: obsolete club_results.player_of_match still present';
  end if;
end $$;
commit;
