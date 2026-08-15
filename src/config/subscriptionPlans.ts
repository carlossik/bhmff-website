export type SubscriptionPlanId =
    | 'starter'
    | 'professional'
    | 'enterprise'

export type SelfServiceSubscriptionPlan =
    | 'starter'
    | 'professional'

export type BillingInterval =
    | 'monthly'
    | 'annual'

export type SubscriptionEntitlements = {
    maxUsers: number | null
    maxCompetitions: number | null
    maxTeams: number | null
    publicSiteEnabled: boolean
    thirdPartyAdvertising: boolean
    advancedAi: boolean
    whiteLabel: boolean
}

export type SubscriptionPlanDefinition = {
    id: SubscriptionPlanId
    name: string
    description: string
    monthlyPricePence: number | null
    annualPricePence: number | null
    currency: 'GBP'
    featured: boolean
    selfService: boolean
    features: readonly string[]
    entitlements: SubscriptionEntitlements
}

export const REQUESTED_PLAN_STORAGE_KEY =
    'tournamenthq-requested-plan'

export const subscriptionPlans: Readonly<
    Record<
        SubscriptionPlanId,
        SubscriptionPlanDefinition
    >
> = {
    starter: {
        id: 'starter',
        name: 'Starter',
        description:
            'For a club, team or organiser getting started with core TournamentHQ operations.',
        monthlyPricePence: 0,
        annualPricePence: 0,
        currency: 'GBP',
        featured: false,
        selfService: true,
        features: [
            '1 competition or club team',
            '2 administrator accounts',
            'Fixtures, results and standings',
            'TournamentHQ-powered public website',
            'Core content and publishing tools',
            'TournamentHQ branding and advertising',
        ],
        entitlements: {
            maxUsers: 2,
            maxCompetitions: 1,
            maxTeams: 1,
            publicSiteEnabled: true,
            thirdPartyAdvertising: true,
            advancedAi: false,
            whiteLabel: false,
        },
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        description:
            'For established clubs and competition organisers managing multiple teams, competitions and administrators.',
        monthlyPricePence: 3900,
        annualPricePence: 39000,
        currency: 'GBP',
        featured: true,
        selfService: true,
        features: [
            'Everything in Starter',
            'Multi-team and multi-competition operations',
            'Up to 10 administrator accounts',
            'Sponsors, media and article publishing',
            'AI Tournament Director and advanced scheduling',
            'Ad-free public website',
            'Priority platform support',
        ],
        entitlements: {
            maxUsers: 10,
            maxCompetitions: 10,
            maxTeams: 25,
            publicSiteEnabled: true,
            thirdPartyAdvertising: false,
            advancedAi: true,
            whiteLabel: false,
        },
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description:
            'For leagues, councils, universities, associations and larger sporting organisations requiring tailored scale and governance.',
        monthlyPricePence: null,
        annualPricePence: null,
        currency: 'GBP',
        featured: false,
        selfService: false,
        features: [
            'Everything in Professional',
            'Multi-organisation architecture',
            'Advanced permissions and governance',
            'Custom domains and white-label options',
            'Data migration and implementation support',
            'Tailored limits, workflows and support',
        ],
        entitlements: {
            maxUsers: null,
            maxCompetitions: null,
            maxTeams: null,
            publicSiteEnabled: true,
            thirdPartyAdvertising: false,
            advancedAi: true,
            whiteLabel: true,
        },
    },
}

export function getSubscriptionPlan(
    planId: SubscriptionPlanId,
): SubscriptionPlanDefinition {
    return subscriptionPlans[planId]
}

export function isSubscriptionPlanId(
    value: unknown,
): value is SubscriptionPlanId {
    return (
        value === 'starter' ||
        value === 'professional' ||
        value === 'enterprise'
    )
}

export function isSelfServiceSubscriptionPlan(
    value: unknown,
): value is SelfServiceSubscriptionPlan {
    return (
        value === 'starter' ||
        value === 'professional'
    )
}

export function getRequestedPlanFromSearch(
    search: string,
): SelfServiceSubscriptionPlan | null {
    const requestedPlan =
        new URLSearchParams(search).get('plan')

    return isSelfServiceSubscriptionPlan(
        requestedPlan,
    )
        ? requestedPlan
        : null
}

export function buildSignupUrl(
    baseUrl: string,
    plan: SelfServiceSubscriptionPlan,
): string {
    const separator = baseUrl.includes('?')
        ? '&'
        : '?'

    return `${baseUrl}${separator}plan=${plan}`
}

export function formatPlanPrice(
    pricePence: number,
): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
    }).format(pricePence / 100)
}
