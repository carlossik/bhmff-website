import Stripe from 'npm:stripe@^22.0.0'

import {
    corsHeaders,
    errorResponse,
    HttpError,
    jsonResponse,
} from '../_shared/http.ts'
import {
    requireBillingAdmin,
} from '../_shared/auth.ts'

type PortalRequest = {
    organisationId: string
}

type BillingRow = {
    stripe_customer_id: string | null
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
): PortalRequest {
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

function getRequiredEnvironment(
    name: string,
): string {
    const value = Deno.env.get(name)?.trim()

    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}`,
        )
    }

    return value
}

function getAppUrl(
    request: Request,
): string {
    const configured =
        Deno.env.get(
            'TOURNAMENTHQ_APP_URL',
        )?.trim()
    const origin =
        request.headers.get('origin')?.trim()
    const value = configured || origin

    if (!value) {
        throw new Error(
            'TOURNAMENTHQ_APP_URL is not configured.',
        )
    }

    return value.replace(/\/$/, '')
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
            data: billingData,
            error: billingError,
        } = await admin
            .from('organisation_billing')
            .select('stripe_customer_id')
            .eq(
                'organisation_id',
                body.organisationId,
            )
            .maybeSingle()

        if (billingError) {
            throw new HttpError(
                500,
                billingError.message,
            )
        }

        const billing =
            billingData as BillingRow | null

        if (!billing?.stripe_customer_id) {
            throw new HttpError(
                409,
                'This organisation does not have Stripe billing to manage yet.',
            )
        }

        const stripe = new Stripe(
            getRequiredEnvironment(
                'STRIPE_SECRET_KEY',
            ),
        )

        const session =
            await stripe.billingPortal.sessions.create(
                {
                    customer:
                        billing.stripe_customer_id,
                    return_url:
                        `${getAppUrl(request)}/admin`,
                },
            )

        return jsonResponse({
            url: session.url,
        })
    } catch (error) {
        return errorResponse(error)
    }
})
