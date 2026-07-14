import { supabase } from '../lib/supabaseClient'

export type AdminRole =
    | 'match_official'
    | 'competition_manager'
    | 'super_admin'

export type AdminProfile = {
    id: string
    full_name: string | null
    role: AdminRole
    active: boolean
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

const roleModules: Record<
    AdminRole,
    readonly AdminModule[]
> = {
    match_official: [
        'Dashboard',
        'Results',
        'Goals',
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
        'Media',
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

export async function getCurrentAdminProfile(): Promise<AdminProfile> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Your authenticated session could not be verified.'
        )
    }

    const { data, error } = await supabase
        .from('profiles')
        .select(
            'id, full_name, role, active'
        )
        .eq('id', user.id)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (!data) {
        throw new Error(
            'Your account does not have an administrator profile.'
        )
    }

    const profile =
        data as AdminProfile

    if (!profile.active) {
        throw new Error(
            'Your administrator account is inactive.'
        )
    }

    return profile
}