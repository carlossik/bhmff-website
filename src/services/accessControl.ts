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

export type OrganisationType =
    | 'competition_organiser'
    | 'club'

export type SubscriptionPlan =
    | 'starter'
    | 'professional'
    | 'enterprise'

export type SubscriptionStatus =
    | 'trial'
    | 'active'
    | 'past_due'
    | 'suspended'
    | 'cancelled'

export type Organisation = {
    id: string
    name: string
    slug: string
    status: OrganisationStatus
    organisation_type: OrganisationType
    logo_url: string | null
    primary_colour: string | null
    secondary_colour: string | null
    accent_colour: string | null
    background_colour: string | null
    surface_colour: string | null
    text_colour: string | null
    subscription_plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    trial_end: string | null
    max_users: number
    max_competitions: number
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
    | 'Club Profile & Website'
    | 'Competitions'
    | 'Seasons'
    | 'Clubs'
    | 'Teams'
    | 'Competition Teams'
    | 'Groups'
    | 'AI Tournament Director'
    | 'Auto Fixture Generator'
    | 'Venues'
    | 'Sports Officials'
    | 'Fixtures'
    | 'Match Centre'
    | 'Results'
    | 'Goals'
    | 'Sponsors'
    | 'Articles'
    | 'Media'
    | 'Enquiries'
    | 'User Access'
    | 'Opponents'
    | 'Squad'
    | 'Trial Centre'
    | 'Statistics'
    | 'Club Finance'
    | 'Communications'
    | 'Platform Operations'

const organisationOwnerModules: readonly AdminModule[] = [
    'Dashboard',
    'Club Profile & Website',
    'Competitions',
    'Seasons',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'AI Tournament Director',
    'Auto Fixture Generator',
    'Venues',
    'Sports Officials',
    'Fixtures',
    'Match Centre',
    'Results',
    'Goals',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'User Access',
    'Opponents',
    'Squad',
    'Trial Centre',
    'Statistics',
    'Club Finance',
    'Communications',
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
        'Club Profile & Website',
        'Competitions',
        'Seasons',
        'Clubs',
        'Teams',
        'Competition Teams',
        'Groups',
        'AI Tournament Director',
        'Auto Fixture Generator',
        'Venues',
        'Sports Officials',
        'Fixtures',
        'Match Centre',
        'Results',
        'Goals',
        'Opponents',
        'Squad',
        'Trial Centre',
        'Statistics',
        'Club Finance',
        'Communications',
    ],

    super_admin:
    organisationOwnerModules,
}

export type OrganisationCapability =
    | 'competition_management'
    | 'season_management'
    | 'fixture_management'
    | 'club_management'
    | 'team_management'
    | 'opponent_management'
    | 'squad_management'
    | 'trial_management'
    | 'officials_management'
    | 'results_management'
    | 'statistics'
    | 'content'
    | 'media'
    | 'sponsors'
    | 'public_site'
    | 'user_access'
    | 'ai_scheduling'
    | 'club_finance'
    | 'communications'

const organisationTypeCapabilities: Record<
    OrganisationType,
    readonly OrganisationCapability[]
> = {
    competition_organiser: [
        'competition_management',
        'fixture_management',
        'club_management',
        'team_management',
        'officials_management',
        'results_management',
        'statistics',
        'content',
        'media',
        'sponsors',
        'public_site',
        'user_access',
        'ai_scheduling',
        'communications',
    ],
    club: [
        'season_management',
        'fixture_management',
        'team_management',
        'opponent_management',
        'squad_management',
        'trial_management',
        'officials_management',
        'results_management',
        'statistics',
        'content',
        'media',
        'sponsors',
        'public_site',
        'user_access',
        'club_finance',
        'communications',
    ],
}

const moduleCapabilities: Partial<
    Record<AdminModule, OrganisationCapability>
> = {
    'Club Profile & Website': 'public_site',
    Competitions: 'competition_management',
    Seasons: 'season_management',
    Clubs: 'club_management',
    Teams: 'team_management',
    'Competition Teams': 'competition_management',
    Groups: 'competition_management',
    'AI Tournament Director': 'ai_scheduling',
    'Auto Fixture Generator': 'ai_scheduling',
    Venues: 'fixture_management',
    'Sports Officials': 'officials_management',
    Fixtures: 'fixture_management',
    'Match Centre': 'squad_management',
    Results: 'results_management',
    Goals: 'statistics',
    Sponsors: 'sponsors',
    Articles: 'content',
    Media: 'media',
    'User Access': 'user_access',
    Opponents: 'opponent_management',
    Squad: 'squad_management',
    'Trial Centre': 'trial_management',
    Statistics: 'statistics',
    'Club Finance': 'club_finance',
    Communications: 'communications',
}

export function getOrganisationCapabilities(
    organisationType: OrganisationType,
): readonly OrganisationCapability[] {
    return organisationTypeCapabilities[
        organisationType
        ]
}

export function organisationHasCapability(
    organisationType: OrganisationType,
    capability: OrganisationCapability,
): boolean {
    return getOrganisationCapabilities(
        organisationType,
    ).includes(capability)
}


export function canAccessModule(
    role: AdminRole,
    module: AdminModule,
    isPlatformAdmin = false,
    organisationType: OrganisationType =
    'competition_organiser',
): boolean {
    if (
        module === 'Organisations' ||
        module === 'Platform Operations'
    ) {
        return isPlatformAdmin
    }

    if (!roleModules[role].includes(module)) {
        return false
    }

    const requiredCapability =
        moduleCapabilities[module]

    if (!requiredCapability) {
        return true
    }

    return organisationHasCapability(
        organisationType,
        requiredCapability,
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
            organisation_type,
            logo_url,
            primary_colour,
            secondary_colour,
            accent_colour,
            background_colour,
            surface_colour,
            text_colour,
            subscription_plan,
            subscription_status,
            trial_end,
            max_users,
            max_competitions,
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