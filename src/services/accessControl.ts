import { supabase } from '../lib/supabaseClient'

export type AdminRole =
    | 'content_editor'
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
    accent_colour: string | null
    background_colour: string | null
    surface_colour: string | null
    text_colour: string | null
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

export type OrganisationAccess = {
    organisation: Organisation
    membership: OrganisationMembership
}

export type AdminProfile = {
    id: string
    full_name: string | null
    role: AdminRole
    active: boolean
    email: string | null
    isPlatformAdmin: boolean
    currentOrganisation: Organisation
    currentMembership: OrganisationMembership
    organisationAccess: OrganisationAccess[]
}

export type AdminModule =
    | 'Dashboard'
    | 'Organisations'
    | 'Competitions'
    | 'Clubs'
    | 'Teams'
    | 'Competition Teams'
    | 'Groups'
    | 'AI Tournament Director'
    | 'Auto Fixture Generator'
    | 'Venues'
    | 'Sports Officials'
    | 'Fixtures'
    | 'Results'
    | 'Goals'
    | 'Sponsors'
    | 'Articles'
    | 'Media'
    | 'Enquiries'
    | 'User Access'

const organisationOwnerModules: readonly AdminModule[] = [
    'Dashboard',
    'Competitions',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'AI Tournament Director',
    'Auto Fixture Generator',
    'Venues',
    'Sports Officials',
    'Fixtures',
    'Results',
    'Goals',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'User Access',
]

const roleModules: Record<
    AdminRole,
    readonly AdminModule[]
> = {
    content_editor: [
        'Dashboard',
        'Articles',
    ],

    match_official: [
        'Dashboard',
        'Results',
        'Goals',
        'Media',
    ],

    competition_manager: [
        'Dashboard',
        'Competitions',
        'Clubs',
        'Teams',
        'Competition Teams',
        'Groups',
        'AI Tournament Director',
        'Auto Fixture Generator',
        'Venues',
        'Sports Officials',
        'Fixtures',
        'Results',
        'Goals',
    ],

    super_admin:
    organisationOwnerModules,
}

export function canAccessModule(
    role: AdminRole,
    module: AdminModule,
    isPlatformAdmin = false,
): boolean {
    if (
        module === 'Organisations'
    ) {
        return isPlatformAdmin
    }

    return roleModules[role].includes(
        module,
    )
}

export function formatAdminRole(
    role: AdminRole,
    isPlatformAdmin = false,
): string {
    if (isPlatformAdmin) {
        return 'Platform Administrator'
    }

    if (role === 'content_editor') {
        return 'Content Editor'
    }

    return role
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
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

type PlatformAdminRow = {
    user_id: string
    active: boolean
}

function getStoredOrganisationId():
    string | null {
    try {
        return window.localStorage.getItem(
            'tournamenthq-current-organisation',
        )
    } catch {
        return null
    }
}

async function getPlatformAdminStatus(
    userId: string,
): Promise<boolean> {
    const {
        data,
        error,
    } = await supabase
        .from('platform_admins')
        .select('user_id, active')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    return Boolean(
        data as PlatformAdminRow | null,
    )
}

async function getActiveMemberships(
    userId: string,
    isPlatformAdmin: boolean,
): Promise<OrganisationMembership[]> {
    let query = supabase
        .from('organisation_memberships')
        .select(`
            id,
            organisation_id,
            user_id,
            role,
            active,
            created_at,
            updated_at
        `)
        .eq('active', true)
        .order('created_at', {
            ascending: true,
        })

    if (!isPlatformAdmin) {
        query = query.eq(
            'user_id',
            userId,
        )
    }

    const {
        data,
        error,
    } = await query

    if (error) {
        throw new Error(error.message)
    }

    if (!isPlatformAdmin) {
        return (
            data ?? []
        ) as OrganisationMembership[]
    }

    const memberships =
        (
            data ?? []
        ) as OrganisationMembership[]

    const membershipsByOrganisation =
        new Map<
            string,
            OrganisationMembership
        >()

    memberships.forEach(
        (membership) => {
            const existing =
                membershipsByOrganisation.get(
                    membership.organisation_id,
                )

            if (
                !existing ||
                membership.user_id ===
                userId
            ) {
                membershipsByOrganisation.set(
                    membership.organisation_id,
                    membership,
                )
            }
        },
    )

    return [
        ...membershipsByOrganisation.values(),
    ]
}

export async function getCurrentAdminProfile():
    Promise<AdminProfile> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error(
            'Your authenticated session could not be verified.',
        )
    }

    const {
        data: profileData,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(
            'id, full_name, email, role, active',
        )
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        throw new Error(
            profileError.message,
        )
    }

    if (!profileData) {
        throw new Error(
            'Your account does not have an administrator profile.',
        )
    }

    const profile =
        profileData as ProfileRow

    if (!profile.active) {
        throw new Error(
            'Your administrator account is inactive.',
        )
    }

    const isPlatformAdmin =
        await getPlatformAdminStatus(
            user.id,
        )

    const memberships =
        await getActiveMemberships(
            user.id,
            isPlatformAdmin,
        )

    if (!memberships.length) {
        throw new Error(
            'Your account is not assigned to an active organisation.',
        )
    }

    const organisationIds = [
        ...new Set(
            memberships.map(
                (membership) =>
                    membership.organisation_id,
            ),
        ),
    ]

    const {
        data: organisationData,
        error: organisationError,
    } = await supabase
        .from('organisations')
        .select(`
            id,
            name,
            slug,
            status,
            logo_url,
            primary_colour,
            secondary_colour,
            accent_colour,
            background_colour,
            surface_colour,
            text_colour,
            created_at,
            updated_at
        `)
        .in('id', organisationIds)
        .order('name')

    if (organisationError) {
        throw new Error(
            organisationError.message,
        )
    }

    const organisations =
        (
            organisationData ?? []
        ) as Organisation[]

    const organisationsById =
        new Map(
            organisations.map(
                (organisation) => [
                    organisation.id,
                    organisation,
                ],
            ),
        )

    const organisationAccess:
        OrganisationAccess[] = memberships
        .map((membership) => {
            const organisation =
                organisationsById.get(
                    membership.organisation_id,
                )

            if (
                !organisation ||
                organisation.status !==
                'active'
            ) {
                return null
            }

            return {
                organisation,
                membership,
            }
        })
        .filter(
            (
                access,
            ): access is OrganisationAccess =>
                access !== null,
        )

    if (!organisationAccess.length) {
        throw new Error(
            'Your account is not assigned to an active organisation.',
        )
    }

    const storedOrganisationId =
        getStoredOrganisationId()

    const selectedAccess =
        organisationAccess.find(
            (access) =>
                access.organisation.id ===
                storedOrganisationId,
        ) ?? organisationAccess[0]

    const selectedRole =
        isPlatformAdmin
            ? 'super_admin'
            : selectedAccess.membership.role

    return {
        id: profile.id,
        full_name:
        profile.full_name,
        email:
            profile.email ??
            user.email ??
            null,
        role:
        selectedRole,
        active:
        profile.active,
        isPlatformAdmin,
        currentOrganisation:
        selectedAccess.organisation,
        currentMembership: {
            ...selectedAccess.membership,
            role:
            selectedRole,
        },
        organisationAccess,
    }
}