-- TournamentHQ
-- Restore anonymous/public visibility for published Media in BOTH SaaS journeys.
-- Date: 2026-08-26
--
-- Regression fixed:
--   Published media was visible to authenticated administrators but disappeared
--   for anonymous visitors on club public sites (for example PettsWood Vets).
--
-- Root cause:
--   The legacy public Media policy assumed every organisation was a competition
--   organiser and required media.competition_id to point at an ACTIVE/published
--   competition. Standalone club organisations are first-class TournamentHQ
--   customers and may publish organisation-owned media without a competition.
--
-- Security rules retained:
--   * Only status='published' media is public.
--   * The parent organisation must be active and its public site enabled.
--   * Competition-organiser media must belong to an ACTIVE, published competition.
--   * Club media may be organisation-wide (competition_id NULL) or retain a legacy
--     competition_id, but that competition must belong to the same organisation.
--   * Draft/archived media remains private.

begin;

alter table public.media enable row level security;

drop policy if exists "Public can read published media"
    on public.media;

create policy "Public can read published media"
on public.media
for select
to anon, authenticated
using (
    status = 'published'
    and organisation_id is not null
    and exists (
        select 1
        from public.organisations o
        where o.id = media.organisation_id
          and o.status = 'active'
          and o.public_site_enabled = true
          and (
              (
                  o.organisation_type = 'club'
                  and (
                      media.competition_id is null
                      or exists (
                          select 1
                          from public.competitions c
                          where c.id = media.competition_id
                            and c.organisation_id = media.organisation_id
                      )
                  )
              )
              or
              (
                  o.organisation_type = 'competition_organiser'
                  and media.competition_id is not null
                  and exists (
                      select 1
                      from public.competitions c
                      where c.id = media.competition_id
                        and c.organisation_id = media.organisation_id
                        and c.published = true
                        and c.status = 'ACTIVE'
                  )
              )
          )
    )
);

-- Supabase normally grants these table privileges already. Keeping this explicit
-- makes the public contract resilient if a future permission migration tightens
-- table grants while RLS remains the actual row-level security boundary.
grant select on public.media to anon, authenticated;

comment on policy "Public can read published media" on public.media is
'TournamentHQ public media contract: published media is readable on active public sites; club media is organisation-owned, competition-organiser media requires an active published competition.';

commit;
