-- BHMFF is an adult competition, explicitly confirmed by its administrator.
-- Preserve all scores, goal rows, fixtures and safeguards for other competitions.
begin;

create or replace function public.apply_bhmff_adult_name_visibility()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
    if new.competition_id = '6b1a086e-f342-45d5-8f51-1c85141d26ae'::uuid then
        new.public_names_enabled := true;
    end if;
    return new;
end;
$$;

drop trigger if exists bhmff_adult_goal_names on public.goals;
create trigger bhmff_adult_goal_names
before insert or update on public.goals
for each row execute function public.apply_bhmff_adult_name_visibility();

drop trigger if exists bhmff_adult_result_names on public.results;
create trigger bhmff_adult_result_names
before insert or update on public.results
for each row execute function public.apply_bhmff_adult_name_visibility();

update public.goals
set public_names_enabled = true
where competition_id = '6b1a086e-f342-45d5-8f51-1c85141d26ae'
  and public_names_enabled is distinct from true;

update public.results
set public_names_enabled = true
where competition_id = '6b1a086e-f342-45d5-8f51-1c85141d26ae'
  and public_names_enabled is distinct from true;

grant select on public.public_goals to anon, authenticated;
notify pgrst, 'reload schema';
commit;
