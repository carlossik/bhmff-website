import { supabase } from '../lib/supabaseClient'

import type {
    BillingInterval,
    SelfServiceSubscriptionPlan,
} from '../config/subscriptionPlans'

type StartBillingInput = {
    organisationId: string
    plan: SelfServiceSubscriptionPlan
    billingInterval: BillingInterval
}

type ActivatedResponse = {
    kind: 'activated'
}

type CheckoutResponse = {
    kind: 'checkout'
    url: string
}

export type StartBillingResponse =
    | ActivatedResponse
    | CheckoutResponse

type BillingPortalResponse = {
    url: string
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function parseStartBillingResponse(
    value: unknown,
): StartBillingResponse {
    if (!isRecord(value)) {
        throw new Error(
            'TournamentHQ billing returned an invalid response.',
        )
    }

    if (value.kind === 'activated') {
        return {
            kind: 'activated',
        }
    }

    if (
        value.kind === 'checkout' &&
        typeof value.url === 'string' &&
        value.url.trim()
    ) {
        return {
            kind: 'checkout',
            url: value.url,
        }
    }

    throw new Error(
        'TournamentHQ billing returned an incomplete response.',
    )
}

function parsePortalResponse(
    value: unknown,
): BillingPortalResponse {
    if (
        !isRecord(value) ||
        typeof value.url !== 'string' ||
        !value.url.trim()
    ) {
        throw new Error(
            'Unable to open the billing portal.',
        )
    }

    return {
        url: value.url,
    }
}

export const billingService = {
    async startBilling(
        input: StartBillingInput,
    ): Promise<StartBillingResponse> {
        const { data, error } =
            await supabase.functions.invoke<unknown>(
                'create-checkout-session',
                {
                    body: input,
                },
            )

        if (error) {
            throw new Error(
                error.message ||
                    'Unable to start billing.',
            )
        }

        return parseStartBillingResponse(data)
    },

    async openBillingPortal(
        organisationId: string,
    ): Promise<void> {
        const { data, error } =
            await supabase.functions.invoke<unknown>(
                'create-billing-portal-session',
                {
                    body: {
                        organisationId,
                    },
                },
            )

        if (error) {
            throw new Error(
                error.message ||
                    'Unable to open billing management.',
            )
        }

        const response =
            parsePortalResponse(data)

        window.location.assign(response.url)
    },
}
