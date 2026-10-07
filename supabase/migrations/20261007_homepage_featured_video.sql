begin;
alter table public.media add column if not exists homepage_featured boolean not null default false;

-- Retire the old category-coupled selection. Library featuring stays independent.
drop trigger if exists select_homepage_full_match on public.media;

-- Preserve one existing published full-match selection per organisation.
with previous as (
 select distinct on (organisation_id) id, organisation_id from public.media
 where featured and category = 'Full Match Replay' and status = 'published'
 order by organisation_id, published_at desc nulls last, id
)
update public.media m set homepage_featured = true from previous p
where m.id = p.id and not exists (
 select 1 from public.media current where current.organisation_id = p.organisation_id and current.homepage_featured
);

create or replace function public.select_homepage_video()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
 if new.homepage_featured and new.category = 'Photo Gallery' then
  raise exception 'Choose a video item for the homepage featured video.';
 end if;
 if new.homepage_featured and new.status = 'published' then
  perform pg_advisory_xact_lock(hashtextextended(new.organisation_id::text, 0));
  update public.media set homepage_featured = false
  where organisation_id = new.organisation_id and id <> new.id and homepage_featured and status = 'published';
 end if;
 return new;
end;
$$;
drop trigger if exists select_homepage_video on public.media;
create trigger select_homepage_video before insert or update of homepage_featured, status, category, organisation_id on public.media
for each row execute function public.select_homepage_video();
create unique index if not exists media_one_published_homepage_video
on public.media(organisation_id) where homepage_featured and status = 'published';
commit;
