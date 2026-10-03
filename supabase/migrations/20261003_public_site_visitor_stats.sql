begin;
create table if not exists public.site_visitors (
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    visitor_id uuid not null,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    primary key (organisation_id, visitor_id)
);
create table if not exists public.site_page_views (
    organisation_id uuid not null references public.organisations(id) on delete cascade,
    event_id uuid not null,
    visitor_id uuid not null,
    path text not null check (length(path) between 1 and 240),
    created_at timestamptz not null default now(),
    primary key (organisation_id, event_id),
    foreign key (organisation_id, visitor_id) references public.site_visitors(organisation_id, visitor_id) on delete cascade
);
create index if not exists site_page_views_period on public.site_page_views (organisation_id, created_at);
create index if not exists site_page_views_visitor on public.site_page_views (organisation_id, visitor_id, created_at);
alter table public.site_visitors enable row level security;
alter table public.site_page_views enable row level security;
revoke all on public.site_visitors, public.site_page_views from anon, authenticated;

create or replace function public.record_public_site_visit(p_organisation_id uuid, p_visitor_id uuid, p_event_id uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_day timestamptz := date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London';
    v_path text := p_path;
    v_content_id uuid;
begin
    if p_visitor_id is null or p_event_id is null or p_path is null or length(p_path) > 240
       or p_path !~ '^/([A-Za-z0-9_-]+(/([A-Za-z0-9_-]+))*)?$' then
        raise exception 'Invalid page visit' using errcode = '22023';
    end if;
    if not exists (select 1 from public.organisations where id = p_organisation_id and status = 'active' and public_site_enabled) then return; end if;
    -- GUID and slug routes for the same content share one popularity total.
    if p_path ~ '^/articles/[^/]+$' then
        select id into v_content_id from public.articles where organisation_id = p_organisation_id
        and status = 'published' and (id::text = split_part(p_path, '/', 3) or slug = split_part(p_path, '/', 3)) limit 1;
        if v_content_id is not null then v_path := '/articles/' || v_content_id::text; end if;
    elsif p_path ~ '^/media/[^/]+$' then
        select id into v_content_id from public.media where organisation_id = p_organisation_id
        and status = 'published' and (id::text = split_part(p_path, '/', 3) or slug = split_part(p_path, '/', 3)) limit 1;
        if v_content_id is not null then v_path := '/media/' || v_content_id::text; end if;
    end if;
    -- Serialize this anonymous browser to deduplicate retries and enforce its daily ceiling.
    perform pg_advisory_xact_lock(hashtextextended(p_organisation_id::text || p_visitor_id::text, 0));
    if exists (select 1 from public.site_page_views where organisation_id = p_organisation_id and event_id = p_event_id) then return; end if;
    if (select count(*) from public.site_page_views where organisation_id = p_organisation_id and visitor_id = p_visitor_id and created_at >= v_day) >= 500 then return; end if;
    insert into public.site_visitors (organisation_id, visitor_id) values (p_organisation_id, p_visitor_id)
    on conflict (organisation_id, visitor_id) do update set last_seen = now();
    insert into public.site_page_views (organisation_id, visitor_id, event_id, path)
    values (p_organisation_id, p_visitor_id, p_event_id, v_path) on conflict do nothing;
end;
$$;

create or replace function public.get_public_visitor_count(p_organisation_id uuid)
returns bigint language sql stable security definer set search_path = public as $$
    select count(*) from public.site_visitors v
    where v.organisation_id = p_organisation_id and exists (
        select 1 from public.organisations o where o.id = p_organisation_id and o.status = 'active' and o.public_site_enabled
    );
$$;

create or replace function public.get_site_visitor_stats(p_organisation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
    v_day timestamptz := date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London';
    v_month timestamptz := date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London';
    v_popular jsonb;
begin
    if not (
        exists (select 1 from public.organisation_memberships m where m.organisation_id = p_organisation_id
                and m.user_id = (select auth.uid()) and m.active and m.role in ('super_admin', 'competition_manager'))
        or exists (select 1 from public.platform_admins p where p.user_id = (select auth.uid()) and p.active)
    ) then raise exception 'Administrator access required' using errcode = '42501'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('path', t.path, 'views', t.views, 'title',
        coalesce((select a.title from public.articles a where a.organisation_id = p_organisation_id and t.path like '/articles/%' and (a.id::text = split_part(t.path, '/', 3) or a.slug = split_part(t.path, '/', 3)) limit 1),
                 (select m.title from public.media m where m.organisation_id = p_organisation_id and t.path like '/media/%' and (m.id::text = split_part(t.path, '/', 3) or m.slug = split_part(t.path, '/', 3)) limit 1), t.path)) order by t.views desc, t.path), '[]'::jsonb)
    into v_popular from (
        select path, count(*) as views from public.site_page_views
        where organisation_id = p_organisation_id and created_at >= v_month and path ~ '^/(articles|media)/[^/]+$'
        group by path order by count(*) desc, path limit 10
    ) t;
    return jsonb_build_object(
        'visitors_today', (select count(distinct visitor_id) from public.site_page_views where organisation_id = p_organisation_id and created_at >= v_day),
        'visitors_month', (select count(distinct visitor_id) from public.site_page_views where organisation_id = p_organisation_id and created_at >= v_month),
        'visitors_total', (select count(*) from public.site_visitors where organisation_id = p_organisation_id),
        'views_today', (select count(*) from public.site_page_views where organisation_id = p_organisation_id and created_at >= v_day),
        'views_month', (select count(*) from public.site_page_views where organisation_id = p_organisation_id and created_at >= v_month),
        'views_total', (select count(*) from public.site_page_views where organisation_id = p_organisation_id),
        'started_at', (select min(first_seen) from public.site_visitors where organisation_id = p_organisation_id),
        'popular', v_popular
    );
end;
$$;
revoke all on function public.record_public_site_visit(uuid,uuid,uuid,text) from public;
revoke all on function public.get_public_visitor_count(uuid) from public;
revoke all on function public.get_site_visitor_stats(uuid) from public;
grant execute on function public.record_public_site_visit(uuid,uuid,uuid,text) to anon, authenticated;
grant execute on function public.get_public_visitor_count(uuid) to anon, authenticated;
grant execute on function public.get_site_visitor_stats(uuid) to authenticated;
commit;
