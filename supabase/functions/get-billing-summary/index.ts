import {
    corsHeaders,
    errorResponse,
    HttpError,
    jsonResponse,
} from '../_shared/http.ts'
import {
    requireBillingAdmin,
} from '../_shared/auth.ts'

type BillingSummaryRequest = {
    organisationId: string
}

type BillingInterval =
    | 'monthly'
    | 'annual'

type BillingRow = {
    stripe_customer_id: string | null
    billing_interval: BillingInterval | null
    stripe_status: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function parseRequest(
    value: unknown,
): BillingSummaryRequest {
    if (
        !isRecord(value) ||
        typeof value.organisationId !==
            'string' ||
        !value.organisationId.trim()
    ) {
        throw new HttpError(
            400,
            'Organisation ID is required.',
        )
    }

    return {
        organisationId:
            value.organisationId.trim(),
    }
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders,
        })
    }

    if (request.method !== 'POST') {
        return jsonResponse(
            { error: 'Method not allowed.' },
            405,
        )
    }

    try {
        const body = parseRequest(
            await request.json(),
        )

        const { admin } =
            await requireBillingAdmin(
                request,
                body.organisationId,
            )

        const {
            data,
            error,
        } = await admin
            .from('organisation_billing')
            .select(`
                stripe_customer_id,
                billing_interval,
                stripe_status,
                current_period_start,
                current_period_end,
                cancel_at_period_end
            `)
            .eq(
                'organisation_id',
                body.organisationId,
            )
            .maybeSingle()

        if (error) {
            throw new HttpError(
                500,
                error.message,
            )
        }

        const billing =
            data as BillingRow | null

        if (!billing) {
            return jsonResponse({
                billing: null,
            })
        }

        return jsonResponse({
            billing: {
                hasBillingCustomer:
                    Boolean(
                        billing.stripe_customer_id,
                    ),
                billingInterval:
                    billing.billing_interval,
                stripeStatus:
                    billing.stripe_status,
                currentPeriodStart:
                    billing.current_period_start,
                currentPeriodEnd:
                    billing.current_period_end,
                cancelAtPeriodEnd:
                    billing.cancel_at_period_end,
            },
        })
    } catch (error) {
        return errorResponse(error)
    }
})
