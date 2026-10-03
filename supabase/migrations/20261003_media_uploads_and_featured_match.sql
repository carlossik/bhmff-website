begin;
alter table public.media add column if not exists image_urls text[] not null default '{}';

-- Selecting a published full match replaces the previous selection atomically.
-- Ordinary featured interviews/galleries keep their existing behaviour.
create or replace function public.select_homepage_full_match()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
    if new.featured and new.category = 'Full Match Replay' and new.status = 'published' then
        perform pg_advisory_xact_lock(hashtextextended(new.organisation_id::text, 0));
        update public.media set featured = false
        where organisation_id = new.organisation_id and id <> new.id
          and category = 'Full Match Replay' and featured;
    end if;
    return new;
end;
$$;
drop trigger if exists select_homepage_full_match on public.media;
create trigger select_homepage_full_match before insert or update of featured, status, category on public.media
for each row execute function public.select_homepage_full_match();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organisation-media', 'organisation-media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
allowed_mime_types = excluded.allowed_mime_types;

-- Public media assets are intentionally public, including files uploaded before
-- publication. Draft database records still follow existing media RLS.
-- Do not upload confidential files to this bucket.
drop policy if exists organisation_media_upload on storage.objects;
create policy organisation_media_upload on storage.objects for insert to authenticated
with check (
    bucket_id = 'organisation-media'
    and (
        exists (select 1 from public.organisation_memberships m
                where m.organisation_id::text = (storage.foldername(name))[1]
                  and m.user_id = (select auth.uid()) and m.active
                  and m.role in ('super_admin', 'competition_manager'))
        or exists (select 1 from public.platform_admins p
                   where p.user_id = (select auth.uid()) and p.active)
    )
);
commit;
