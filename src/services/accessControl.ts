import { supabase } from '../lib/supabaseClient'

export type AdminRole =
    | 'match_official'
    | 'competition_manager'
    | 'super_admin'

export type OrganisationStatus =
    | 'active'
    | 'inactive'
    | 'suspended'

export type Organisation = {
    id: string
    name: string
    slug: string
    status: OrganisationStatus
    logo_url: string | null
    primary_colour: string | null
    secondary_colour: string | null
    created_at: string
    updated_at: string
}

export type OrganisationMembership = {
    id: string
    organisation_id: string
    user_id: string
    role: AdminRole
    active: boolean
    created_at: string
    updated_at: string
}

export type AdminProfile = {
    id: string
    full_name: string | null
    role: AdminRole
    active: boolean
    email: string | null
    currentOrganisation: Organisation
    currentMembership: OrganisationMembership
}

export type AdminModule =
    | 'Dashboard'
    | 'Clubs'
    | 'Teams'
    | 'Groups'
    | 'Auto Fixture Generator'
    | 'Venues'
    | 'Fixtures'
    | 'Results'
    | 'Goals'
    | 'Sponsors'
    | 'Articles'
    | 'Media'
    | 'Enquiries'
    | 'User Access'

const roleModules: Record<
    AdminRole,
    readonly AdminModule[]
> = {
    match_official: [
        'Dashboard',
        'Results',
        'Goals',
        'Media',
    ],

    competition_manager: [
        'Dashboard',
        'Clubs',
        'Teams',
        'Groups',
        'Auto Fixture Generator',
        'Venues',
        'Fixtures',
        'Results',
        'Goals',
    ],

    super_admin: [
        'Dashboard',
        'Clubs',
        'Teams',
        'Groups',
        'Auto Fixture Generator',
        'Venues',
        'Fixtures',
        'Results',
        'Goals',
        'Sponsors',
        'Articles',
        'Media',
        'Enquiries',
        'User Access',
    ],
}

export function canAccessModule(
    role: AdminRole,
    module: AdminModule
) {
    return roleModules[role].includes(module)
}

export function formatAdminRole(
    role: AdminRole
) {
    return role
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(' ')
}

type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
    role: AdminRole
    active: boolean
}

export async function getCurrentAdminProfile():
    Promise<AdminProfile> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Your authenticated session could not be verified.'
        )
    }

    const {
        data: profileData,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'id, full_name, email, role, active'
        )
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        throw new Error(profileError.message)
    }

    if (!profileData) {
        throw new Error(
            'Your account does not have an administrator profile.'
        )
    }

    const profile =
        profileData as ProfileRow

    if (!profile.active) {
        throw new Error(
            'Your administrator account is inactive.'
        )
    }

    const {
        data: membershipData,
        error: membershipError,
    } = await supabase
        .from('organisation_memberships')
        .select(
            `
                id,
                organisation_id,
                user_id,
                role,
                active,
                created_at,
                updated_at
            `
        )
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', {
            ascending: true,
        })
        .limit(1)
        .maybeSingle()

    if (membershipError) {
        throw new Error(
            membershipError.message
        )
    }

    if (!membershipData) {
        throw new Error(
            'Your account is not assigned to an active organisation.'
        )
    }

    const currentMembership =
        membershipData as OrganisationMembership

    const {
        data: organisationData,
        error: organisationError,
    } = await supabase
        .from('organisations')
        .select(
            `
                id,
                name,
                slug,
                status,
                logo_url,
                primary_colour,
                secondary_colour,
                created_at,
                updated_at
            `
        )
        .eq(
            'id',
            currentMembership.organisation_id
        )
        .maybeSingle()

    if (organisationError) {
        throw new Error(
            organisationError.message
        )
    }

    if (!organisationData) {
        throw new Error(
            'The organisation assigned to your account could not be found.'
        )
    }

    const currentOrganisation =
        organisationData as Organisation

    if (
        currentOrganisation.status !==
        'active'
    ) {
        throw new Error(
            'Your organisation is not currently active.'
        )
    }

    return {
        id: profile.id,
        full_name: profile.full_name,
        email:
            profile.email ??
            user.email ??
            null,
        role: currentMembership.role,
        active: profile.active,
        currentOrganisation,
        currentMembership,
    }
}