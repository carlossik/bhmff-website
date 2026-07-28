import type {
    SubscriptionPlan,
} from '../organisationTypes'

export type OrganisationModuleKey =
    | 'Dashboard'
    | 'Competitions'
    | 'Clubs'
    | 'Teams'
    | 'Competition Teams'
    | 'Groups'
    | 'Venues'
    | 'Fixtures'
    | 'Results'
    | 'Goals'
    | 'Articles'
    | 'Media'
    | 'Sponsors'
    | 'Enquiries'
    | 'AI Tournament Director'

export type OrganisationModuleDefinition = {
    key: OrganisationModuleKey
    label: string
    description: string
}

export type SubscriptionPlanDefinition = {
    key: SubscriptionPlan
    name: string
    description: string
    maxUsers: number
    maxCompetitions: number
    modules: OrganisationModuleKey[]
    featured?: boolean
}

export const ORGANISATION_MODULES:
    OrganisationModuleDefinition[] = [
    {
        key: 'Dashboard',
        label: 'Dashboard',
        description:
            'Organisation overview, activity and key statistics.',
    },
    {
        key: 'Competitions',
        label: 'Competitions',
        description:
            'Create and manage tournaments, leagues and competitions.',
    },
    {
        key: 'Clubs',
        label: 'Clubs',
        description:
            'Manage participating clubs and their branding.',
    },
    {
        key: 'Teams',
        label: 'Teams',
        description:
            'Create and manage teams within the organisation.',
    },
    {
        key: 'Competition Teams',
        label: 'Competition Teams',
        description:
            'Assign teams to individual competitions.',
    },
    {
        key: 'Groups',
        label: 'Groups',
        description:
            'Create competition groups and allocate teams.',
    },
    {
        key: 'Venues',
        label: 'Venues',
        description:
            'Manage grounds, pitches and match locations.',
    },
    {
        key: 'Fixtures',
        label: 'Fixtures',
        description:
            'Schedule and manage competition fixtures.',
    },
    {
        key: 'Results',
        label: 'Results',
        description:
            'Record scores and publish match results.',
    },
    {
        key: 'Goals',
        label: 'Goals',
        description:
            'Record scorers and detailed goal information.',
    },
    {
        key: 'Articles',
        label: 'Articles',
        description:
            'Publish news, announcements and competition updates.',
    },
    {
        key: 'Media',
        label: 'Media',
        description:
            'Manage photographs, videos and media content.',
    },
    {
        key: 'Sponsors',
        label: 'Sponsors',
        description:
            'Manage sponsor profiles and promotional visibility.',
    },
    {
        key: 'Enquiries',
        label: 'Enquiries',
        description:
            'Receive and manage public enquiries.',
    },
    {
        key: 'AI Tournament Director',
        label: 'AI Tournament Director',
        description:
            'Generate, validate and optimise tournament schedules.',
    },
]

const CORE_MODULES: OrganisationModuleKey[] = [
    'Dashboard',
    'Competitions',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'Venues',
    'Fixtures',
    'Results',
]

const PROFESSIONAL_MODULES:
    OrganisationModuleKey[] = [
    ...CORE_MODULES,
    'Goals',
    'Articles',
    'Media',
    'Sponsors',
    'Enquiries',
]

const ENTERPRISE_MODULES:
    OrganisationModuleKey[] = [
    ...PROFESSIONAL_MODULES,
    'AI Tournament Director',
]

export const SUBSCRIPTION_PLANS:
    SubscriptionPlanDefinition[] = [
    {
        key: 'starter',
        name: 'Starter',
        description:
            'Essential competition management for smaller organisations.',
        maxUsers: 5,
        maxCompetitions: 2,
        modules: CORE_MODULES,
    },
    {
        key: 'professional',
        name: 'Professional',
        description:
            'Advanced content, media and operational tools for growing organisations.',
        maxUsers: 20,
        maxCompetitions: 10,
        modules: PROFESSIONAL_MODULES,
        featured: true,
    },
    {
        key: 'enterprise',
        name: 'Enterprise',
        description:
            'Full TournamentHQ capability with AI-assisted tournament management.',
        maxUsers: 100,
        maxCompetitions: 100,
        modules: ENTERPRISE_MODULES,
    },
]

export function getSubscriptionPlan(
    plan: SubscriptionPlan
): SubscriptionPlanDefinition {
    return (
        SUBSCRIPTION_PLANS.find(
            (definition) =>
                definition.key === plan
        ) ?? SUBSCRIPTION_PLANS[0]
    )
}

export function getModulesForPlan(
    plan: SubscriptionPlan
): OrganisationModuleKey[] {
    return [
        ...getSubscriptionPlan(plan).modules,
    ]
}

export function isModuleEnabled(
    enabledModules: string[],
    moduleKey: OrganisationModuleKey
): boolean {
    return enabledModules.includes(moduleKey)
}