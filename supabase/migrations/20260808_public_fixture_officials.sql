-- TournamentHQ
-- Public fixture appointments used by all public fixture surfaces.
-- Safe for Supabase SQL Editor.
--
-- The private officials table remains protected by RLS.
-- Only fixture id, official id, public display name and appointment role
-- are exposed for published fixtures.

create or replace function public.get_public_fixture_officials(
    p_organisation_id uuid
)
returns table (
    fixture_id uuid,
    official_id uuid,
    role text,
    display_name text
)
language sql
stable
security definer
set search_path = public
as $function$
    select
        assignment.fixture_id,
        official.id as official_id,
        assignment.role,
        coalesce(
            nullif(
                btrim(
                    official.full_name
                ),
                ''
            ),
            nullif(
                btrim(
                    concat_ws(
                        ' ',
                        official.first_name,
                        official.last_name
                    )
                ),
                ''
            ),
            'Match Official'
        ) as display_name
    from public.official_assignments as assignment
    inner join public.officials as official
        on official.id =
           assignment.official_id
       and official.organisation_id =
           assignment.organisation_id
    inner join public.fixtures as fixture
        on fixture.id =
           assignment.fixture_id
    inner join public.competitions as competition
        on competition.id =
           fixture.competition_id
       and competition.organisation_id =
           assignment.organisation_id
    where assignment.organisation_id =
          p_organisation_id
      and competition.organisation_id =
          p_organisation_id
      and assignment.fixture_id is not null
      and fixture.published = true
      and official.status = 'active'
      and assignment.status in (
          'proposed',
          'offered',
          'accepted',
          'confirmed',
          'completed'
      )
    order by
        fixture.kickoff_time nulls last,
        case assignment.role
            when 'referee' then 0
            when 'assistant_referee' then 1
            when 'fourth_official' then 2
            when 'match_commissioner' then 3
            when 'assessor' then 4
            when 'observer' then 5
            else 99
        end,
        display_name;
$function$;

revoke all
on function public.get_public_fixture_officials(uuid)
from public;

grant execute
on function public.get_public_fixture_officials(uuid)
to anon, authenticated;
