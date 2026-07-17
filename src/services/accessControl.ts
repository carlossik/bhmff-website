import { supabase } from '../lib/supabaseClient'

export type AdminRole =
    | 'match_official'
    | 'competition_manager'
    | 'super_admin'

export type Organisation = {
    id: string
    name: string
    slug: string
    status: 'active' | 'inactive' | 'suspended'
    logo_url: string | null
    primary_colour: string | null
    secondary_colour: string | null
}

export type OrganisationMembership = {
    id: string
    organisation_id: string
    user_id: string
    role: AdminRole
    active: boolean
    organisation: Organisation
}

export type AdminProfile = {
    id: string
    full_name: string | null
    email: string | null
    role: AdminRole
    active: boolean
    currentOrganisation: Organisation
    currentMembership: OrganisationMembership
}

export type AdminModule =
    | 'Dashboard'
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
        .select(`
            id,
            full_name,
            email,
            active,
            deleted_at
        `)
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

    if (profileData.deleted_at) {
        throw new Error(
            'Your administrator account has been removed.'
        )
    }

    if (!profileData.active) {
        throw new Error(
            'Your administrator account is inactive.'
        )
    }

    const {
        data: membershipData,
        error: membershipError,
    } = await supabase
        .from('organisation_memberships')
        .select(`
            id,
            organisation_id,
            user_id,
            role,
            active,
            organisation:organisations (
                id,
                name,
                slug,
                status,
                logo_url,
                primary_colour,
                secondary_colour
            )
        `)
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

    if (membershipError) {
        throw new Error(
            membershipError.message
        )
    }

    if (!membershipData) {
        throw new Error(
            'Your account does not belong to an active organisation.'
        )
    }

    const membership =
        membershipData as unknown as OrganisationMembership

    if (
        !membership.organisation ||
        membership.organisation.status !==
        'active'
    ) {
        throw new Error(
            'Your organisation is not currently active.'
        )
    }

    return {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        role: membership.role,
        active: profileData.active,
        currentOrganisation:
        membership.organisation,
        currentMembership: membership,
    }
}