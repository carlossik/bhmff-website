import type {
    OrganisationType,
    SubscriptionPlan,
} from '../components/admin/Organisations/organisationTypes'

export type PlanModuleKey =
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

export type PlanModuleDefinition = {
    key: PlanModuleKey
    label: string
    description: string
}

export type PlanLimits = {
    maxUsers: number
    maxCompetitions: number
}

const STARTER_COMPETITION_MODULES: readonly PlanModuleKey[] = [
    'Dashboard',
    'Competitions',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'Venues',
    'Fixtures',
    'Results',
    'User Access',
]

const STARTER_CLUB_MODULES: readonly PlanModuleKey[] = [
    'Dashboard',
    'Club Profile & Website',
    'Seasons',
    'Teams',
    'Opponents',
    'Squad',
    'Fixtures',
    'Results',
    'User Access',
]

const PROFESSIONAL_COMPETITION_MODULES: readonly PlanModuleKey[] = [
    ...STARTER_COMPETITION_MODULES,
    'Sports Officials',
    'Match Centre',
    'Goals',
    'Statistics',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'Communications',
    'AI Tournament Director',
    'Auto Fixture Generator',
]

const PROFESSIONAL_CLUB_MODULES: readonly PlanModuleKey[] = [
    ...STARTER_CLUB_MODULES,
    'Sports Officials',
    'Trial Centre',
    'Match Centre',
    'Goals',
    'Statistics',
    'Club Finance',
    'Communications',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
]

export const PLAN_MODULE_DEFINITIONS: readonly PlanModuleDefinition[] = [
    {
        key: 'Dashboard',
        label: 'Dashboard',
        description: 'Workspace overview, activity and key statistics.',
    },
    {
        key: 'Organisations',
        label: 'Organisations',
        description: 'Platform-level organisation administration.',
    },
    {
        key: 'Club Profile & Website',
        label: 'Club Profile & Website',
        description: 'Manage club branding, profile and public website settings.',
    },
    {
        key: 'Competitions',
        label: 'Competitions',
        description: 'Create and manage tournaments, leagues and competitions.',
    },
    {
        key: 'Seasons',
        label: 'Seasons',
        description: 'Manage club seasons and team-season structure.',
    },
    {
        key: 'Clubs',
        label: 'Clubs',
        description: 'Manage participating clubs and their branding.',
    },
    {
        key: 'Teams',
        label: 'Teams',
        description: 'Create and manage teams within the workspace.',
    },
    {
        key: 'Competition Teams',
        label: 'Competition Teams',
        description: 'Assign teams to individual competitions.',
    },
    {
        key: 'Groups',
        label: 'Groups',
        description: 'Create competition groups and allocate teams.',
    },
    {
        key: 'AI Tournament Director',
        label: 'AI Tournament Director',
        description: 'Generate, validate and optimise tournament schedules.',
    },
    {
        key: 'Auto Fixture Generator',
        label: 'Auto Fixture Generator',
        description: 'Generate fixture schedules from competition settings.',
    },
    {
        key: 'Venues',
        label: 'Venues',
        description: 'Manage grounds, pitches and match locations.',
    },
    {
        key: 'Sports Officials',
        label: 'Sports Officials',
        description: 'Manage officials, availability, assignments and payments.',
    },
    {
        key: 'Fixtures',
        label: 'Fixtures',
        description: 'Schedule and manage fixtures.',
    },
    {
        key: 'Match Centre',
        label: 'Match Centre',
        description: 'Run match-day operations, selection, attendance and reporting.',
    },
    {
        key: 'Results',
        label: 'Results',
        description: 'Record scores and publish match results.',
    },
    {
        key: 'Goals',
        label: 'Goals',
        description: 'Record scorers and detailed goal information.',
    },
    {
        key: 'Sponsors',
        label: 'Sponsors',
        description: 'Manage sponsor profiles and promotional visibility.',
    },
    {
        key: 'Articles',
        label: 'Articles',
        description: 'Publish news, announcements and updates.',
    },
    {
        key: 'Media',
        label: 'Media',
        description: 'Manage photographs, videos and media content.',
    },
    {
        key: 'Enquiries',
        label: 'Enquiries',
        description: 'Receive and manage public enquiries.',
    },
    {
        key: 'User Access',
        label: 'User Access',
        description: 'Invite and manage workspace administrators.',
    },
    {
        key: 'Opponents',
        label: 'Opponents',
        description: 'Manage opponent teams for club fixtures.',
    },
    {
        key: 'Squad',
        label: 'Squad',
        description: 'Manage player registration and squad records.',
    },
    {
        key: 'Trial Centre',
        label: 'Trial Centre',
        description: 'Manage trialists, trial sessions and progression.',
    },
    {
        key: 'Statistics',
        label: 'Statistics',
        description: 'Track player and team performance statistics.',
    },
    {
        key: 'Club Finance',
        label: 'Club Finance',
        description: 'Track player payments, matchday subs, monthly fees and finances.',
    },
    {
        key: 'Communications',
        label: 'Communications',
        description: 'Send branded emails and track delivery status.',
    },
]

const PLAN_LIMITS: Readonly<Record<SubscriptionPlan, PlanLimits>> = {
    starter: {
        maxUsers: 2,
        maxCompetitions: 1,
    },
    professional: {
        maxUsers: 10,
        maxCompetitions: 10,
    },
    enterprise: {
        maxUsers: 100,
        maxCompetitions: 100,
    },
}

function modulesForType(
    plan: SubscriptionPlan,
    organisationType: OrganisationType,
): readonly PlanModuleKey[] {
    if (organisationType === 'club') {
        return plan === 'starter'
            ? STARTER_CLUB_MODULES
            : PROFESSIONAL_CLUB_MODULES
    }

    return plan === 'starter'
        ? STARTER_COMPETITION_MODULES
        : PROFESSIONAL_COMPETITION_MODULES
}

export function normaliseSubscriptionPlan(
    value: string | null | undefined,
): SubscriptionPlan {
    if (value === 'professional') {
        return 'professional'
    }

    if (value === 'enterprise') {
        return 'enterprise'
    }

    return 'starter'
}

export function getPlanLimits(
    plan: SubscriptionPlan,
): PlanLimits {
    return PLAN_LIMITS[plan]
}

export function getPlanModules(
    plan: SubscriptionPlan,
    organisationType: OrganisationType,
): string[] {
    return [
        ...new Set(
            modulesForType(
                plan,
                organisationType,
            ),
        ),
    ]
}

export function getPlanModuleDefinitions(
    plan: SubscriptionPlan,
    organisationType: OrganisationType,
): PlanModuleDefinition[] {
    const modules = new Set(
        getPlanModules(
            plan,
            organisationType,
        ),
    )

    return PLAN_MODULE_DEFINITIONS.filter(
        (definition) =>
            modules.has(definition.key),
    )
}

export function isModuleEntitledForPlan(
    plan: SubscriptionPlan,
    organisationType: OrganisationType,
    module: string,
): boolean {
    if (
        module === 'Dashboard' ||
        module === 'Platform Operations' ||
        module === 'Organisations'
    ) {
        return true
    }

    return getPlanModules(
        plan,
        organisationType,
    ).includes(module)
}
