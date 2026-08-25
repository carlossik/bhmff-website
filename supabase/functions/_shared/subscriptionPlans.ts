export type ServerSubscriptionPlanId =
    | 'starter'
    | 'professional'

export type ServerBillingInterval =
    | 'monthly'
    | 'annual'

export type ServerPlanDefinition = {
    maxUsers: number
    maxCompetitions: number
    publicSiteEnabled: boolean
}

export const SUBSCRIPTION_TRIAL_DAYS = 14

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
    },
    professional: {
        maxUsers: 10,
        maxCompetitions: 10,
        publicSiteEnabled: true,
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
