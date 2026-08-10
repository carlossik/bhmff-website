-- TournamentHQ Sprint 2
-- Secure self-service organisation bootstrap.
--
-- Purpose:
-- A newly authenticated customer has no organisation membership yet, so
-- normal tenant RLS must not allow a direct organisations INSERT.
-- This SECURITY DEFINER RPC performs the first-tenant bootstrap atomically:
--   1. validate the authenticated user and payload
--   2. create the organisation
--   3. activate/upsert the owner profile
--   4. create the owner's super_admin membership
--   5. return the organisation
--
-- Existing organisation RLS remains unchanged.

begin;

create or replace function public.create_onboarding_organisation(
    p_organisation jsonb,
    p_provisional_id uuid default null
)
returns public.organisations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text := lower(
        coalesce(
            auth.jwt() ->> 'email',
            ''
        )
    );
    v_full_name text;
    v_name text;
    v_slug text;
    v_existing_membership boolean;
    v_is_platform_admin boolean;
    v_organisation public.organisations%rowtype;
begin
    if v_user_id is null then
        raise exception
            'Authentication is required to create an organisation.'
            using errcode = '42501';
    end if;

    if p_organisation is null
       or jsonb_typeof(p_organisation) <> 'object' then
        raise exception
            'Organisation details are required.'
            using errcode = '22023';
    end if;

    v_name := btrim(
        coalesce(
            p_organisation ->> 'name',
            ''
        )
    );

    v_slug := lower(
        btrim(
            coalesce(
                p_organisation ->> 'slug',
                ''
            )
        )
    );

    if v_name = '' then
        raise exception
            'Organisation name is required.'
            using errcode = '22023';
    end if;

    if v_slug = '' then
        raise exception
            'Organisation slug is required.'
            using errcode = '22023';
    end if;

    if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
        raise exception
            'Organisation slug must contain only lowercase letters, numbers and hyphens.'
            using errcode = '22023';
    end if;

    select exists (
        select 1
        from public.platform_admins platform_admin
        where platform_admin.user_id = v_user_id
          and platform_admin.active = true
    )
    into v_is_platform_admin;

    select exists (
        select 1
        from public.organisation_memberships membership
        where membership.user_id = v_user_id
          and membership.active = true
    )
    into v_existing_membership;

    /*
     * Self-service bootstrap is deliberately one-time for normal users.
     * Platform administrators retain their existing ability to provision
     * additional organisations from the administration portal.
     */
    if v_existing_membership
       and not v_is_platform_admin then
        raise exception
            'Your account is already assigned to an active organisation.'
            using errcode = '42501';
    end if;

    if exists (
        select 1
        from public.organisations organisation
        where lower(organisation.slug) = v_slug
    ) then
        raise exception
            'Organisation slug already exists.'
            using errcode = '23505';
    end if;

    v_full_name := nullif(
        btrim(
            coalesce(
                p_organisation ->> 'owner_name',
                auth.jwt()
                    -> 'user_metadata'
                    ->> 'full_name',
                ''
            )
        ),
        ''
    );

    insert into public.organisations (
        id,
        name,
        slug,
        primary_colour,
        secondary_colour,
        accent_colour,
        background_colour,
        surface_colour,
        text_colour,
        logo_url,
        status,
        subscription_plan,
        subscription_status,
        trial_end,
        max_users,
        max_competitions,
        public_site_enabled,
        owner_name,
        owner_email,
        owner_phone,
        enabled_modules
    )
    values (
        coalesce(
            p_provisional_id,
            gen_random_uuid()
        ),
        v_name,
        v_slug,
        coalesce(
            nullif(
                p_organisation ->> 'primary_colour',
                ''
            ),
            '#0f766e'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'secondary_colour',
                ''
            ),
            '#0f172a'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'accent_colour',
                ''
            ),
            '#84cc16'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'background_colour',
                ''
            ),
            '#071006'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'surface_colour',
                ''
            ),
            '#10190f'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'text_colour',
                ''
            ),
            '#ffffff'
        ),
        nullif(
            btrim(
                coalesce(
                    p_organisation ->> 'logo_url',
                    ''
                )
            ),
            ''
        ),
        coalesce(
            nullif(
                p_organisation ->> 'status',
                ''
            ),
            'active'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'subscription_plan',
                ''
            ),
            'starter'
        ),
        coalesce(
            nullif(
                p_organisation ->> 'subscription_status',
                ''
            ),
            'trial'
        ),
        case
            when nullif(
                p_organisation ->> 'trial_end',
                ''
            ) is null
            then null
            else (
                p_organisation ->> 'trial_end'
            )::timestamptz
        end,
        coalesce(
            nullif(
                p_organisation ->> 'max_users',
                ''
            )::integer,
            5
        ),
        coalesce(
            nullif(
                p_organisation ->> 'max_competitions',
                ''
            )::integer,
            2
        ),
        coalesce(
            (
                p_organisation
                    ->> 'public_site_enabled'
            )::boolean,
            true
        ),
        nullif(
            btrim(
                coalesce(
                    p_organisation ->> 'owner_name',
                    ''
                )
            ),
            ''
        ),
        coalesce(
            nullif(
                lower(
                    btrim(
                        coalesce(
                            p_organisation
                                ->> 'owner_email',
                            ''
                        )
                    )
                ),
                ''
            ),
            nullif(v_email, '')
        ),
        nullif(
            btrim(
                coalesce(
                    p_organisation ->> 'owner_phone',
                    ''
                )
            ),
            ''
        ),
        coalesce(
            (
                select array_agg(module_name)
                from jsonb_array_elements_text(
                    coalesce(
                        p_organisation
                            -> 'enabled_modules',
                        '[]'::jsonb
                    )
                ) as module_name
            ),
            array[]::text[]
        )
    )
    returning *
    into v_organisation;

    /*
     * Signup historically created an inactive match_official profile.
     * The owner completing self-service onboarding becomes the active
     * Organisation Admin for the organisation they have just created.
     */
    insert into public.profiles (
        id,
        full_name,
        email,
        role,
        active
    )
    values (
        v_user_id,
        v_full_name,
        nullif(v_email, ''),
        'super_admin',
        true
    )
    on conflict (id)
    do update set
        full_name = coalesce(
            excluded.full_name,
            public.profiles.full_name
        ),
        email = coalesce(
            excluded.email,
            public.profiles.email
        ),
        role = 'super_admin',
        active = true,
        updated_at = now();

    insert into public.organisation_memberships (
        organisation_id,
        user_id,
        role,
        active
    )
    values (
        v_organisation.id,
        v_user_id,
        'super_admin',
        true
    )
    on conflict do nothing;

    return v_organisation;

exception
    when unique_violation then
        raise exception
            'Organisation slug already exists.'
            using errcode = '23505';
end;
$$;

revoke all
on function public.create_onboarding_organisation(
    jsonb,
    uuid
)
from public;

revoke all
on function public.create_onboarding_organisation(
    jsonb,
    uuid
)
from anon;

grant execute
on function public.create_onboarding_organisation(
    jsonb,
    uuid
)
to authenticated;

commit;
