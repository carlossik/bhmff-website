export type ServerSubscriptionPlanId =
    | 'starter'
    | 'professional'

export type ServerBillingInterval =
    | 'monthly'
    | 'annual'

export type ServerOrganisationType =
    | 'competition_organiser'
    | 'club'

export type ServerPlanDefinition = {
    maxUsers: number
    maxCompetitions: number
    publicSiteEnabled: boolean
    modules: Readonly<
        Record<ServerOrganisationType, readonly string[]>
    >
}

export const SUBSCRIPTION_TRIAL_DAYS = 14

const STARTER_COMPETITION_MODULES = [
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
] as const

const STARTER_CLUB_MODULES = [
    'Dashboard',
    'Club Profile & Website',
    'Seasons',
    'Teams',
    'Opponents',
    'Squad',
    'Fixtures',
    'Results',
    'User Access',
] as const

const PROFESSIONAL_COMPETITION_MODULES = [
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
] as const

const PROFESSIONAL_CLUB_MODULES = [
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
] as const

export const SERVER_SUBSCRIPTION_PLANS: Readonly<
    Record<
        ServerSubscriptionPlanId,
        ServerPlanDefinition
    >
> = {
    starter: {
        maxUsers: 2,
        maxCompetitions: 1,
        publicSiteEnabled: true,
        modules: {
            competition_organiser:
                STARTER_COMPETITION_MODULES,
            club: STARTER_CLUB_MODULES,
        },
    },
    professional: {
        maxUsers: 10,
        maxCompetitions: 10,
        publicSiteEnabled: true,
        modules: {
            competition_organiser:
                PROFESSIONAL_COMPETITION_MODULES,
            club: PROFESSIONAL_CLUB_MODULES,
        },
    },
}

export function isServerSubscriptionPlanId(
    value: unknown,
): value is ServerSubscriptionPlanId {
    return (
        value === 'starter' ||
        value === 'professional'
    )
}

export function isServerBillingInterval(
    value: unknown,
): value is ServerBillingInterval {
    return (
        value === 'monthly' ||
        value === 'annual'
    )
}

export function getServerPlanModules(
    plan: ServerSubscriptionPlanId,
    organisationType: string | null | undefined,
): string[] {
    const resolvedOrganisationType: ServerOrganisationType =
        organisationType === 'club'
            ? 'club'
            : 'competition_organiser'

    return [
        ...SERVER_SUBSCRIPTION_PLANS[plan]
            .modules[resolvedOrganisationType],
    ]
}
