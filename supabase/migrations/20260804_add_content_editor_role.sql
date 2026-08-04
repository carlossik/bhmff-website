-- Add the article-only Content Editor organisation role.
-- Safe to run repeatedly.

begin;

alter table public.organisation_memberships
drop constraint if exists organisation_memberships_role_check;

alter table public.organisation_memberships
    add constraint organisation_memberships_role_check
        check (
            role in (
                     'content_editor',
                     'match_official',
                     'competition_manager',
                     'super_admin'
                )
            );

commit;