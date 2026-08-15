import Stripe from 'npm:stripe@^22.0.0'

import {
    errorResponse,
    HttpError,
    jsonResponse,
    corsHeaders,
} from '../_shared/http.ts'
import {
    requireBillingAdmin,
} from '../_shared/auth.ts'
import {
    isServerBillingInterval,
    isServerSubscriptionPlanId,
    SERVER_SUBSCRIPTION_PLANS,
    type ServerBillingInterval,
} from '../_shared/subscriptionPlans.ts'

type CheckoutRequest = {
    organisationId: string
    plan: unknown
    billingInterval: unknown
}

type OrganisationRow = {
    id: string
    name: string
    owner_email: string | null
    subscription_plan: string
    subscription_status: string
}

type BillingRow = {
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
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
): CheckoutRequest {
    if (!isRecord(value)) {
        throw new HttpError(
            400,
            'Invalid billing request.',
        )
    }

    if (
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
        plan: value.plan,
        billingInterval:
            value.billingInterval,
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

function getPriceId(
    interval: ServerBillingInterval,
): string {
    return getRequiredEnvironment(
        interval === 'annual'
            ? 'STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID'
            : 'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID',
    )
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

        if (
            !isServerSubscriptionPlanId(
                body.plan,
            )
        ) {
            throw new HttpError(
                400,
                'Choose Starter or Professional.',
            )
        }

        if (
            !isServerBillingInterval(
                body.billingInterval,
            )
        ) {
            throw new HttpError(
                400,
                'Choose monthly or annual billing.',
            )
        }

        const { admin, user } =
            await requireBillingAdmin(
                request,
                body.organisationId,
            )

        const {
            data: organisationData,
            error: organisationError,
        } = await admin
            .from('organisations')
            .select(
                'id, name, owner_email, subscription_plan, subscription_status',
            )
            .eq('id', body.organisationId)
            .maybeSingle()

        if (organisationError) {
            throw new HttpError(
                500,
                organisationError.message,
            )
        }

        const organisation =
            organisationData as
                | OrganisationRow
                | null

        if (!organisation) {
            throw new HttpError(
                404,
                'Organisation not found.',
            )
        }

        const {
            data: billingData,
            error: billingError,
        } = await admin
            .from('organisation_billing')
            .select(
                'stripe_customer_id, stripe_subscription_id',
            )
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

        if (
            body.plan === 'starter'
        ) {
            if (
                billing
                    ?.stripe_subscription_id
            ) {
                throw new HttpError(
                    409,
                    'This organisation already has a Stripe subscription. Use billing management to change or cancel it.',
                )
            }

            const starter =
                SERVER_SUBSCRIPTION_PLANS.starter

            const { error: updateError } =
                await admin
                    .from('organisations')
                    .update({
                        subscription_plan:
                            'starter',
                        subscription_status:
                            'active',
                        trial_end: null,
                        max_users:
                            starter.maxUsers,
                        max_competitions:
                            starter.maxCompetitions,
                        public_site_enabled:
                            starter.publicSiteEnabled,
                    })
                    .eq(
                        'id',
                        body.organisationId,
                    )

            if (updateError) {
                throw new HttpError(
                    500,
                    updateError.message,
                )
            }

            const { error: billingUpsertError } =
                await admin
                    .from(
                        'organisation_billing',
                    )
                    .upsert(
                        {
                            organisation_id:
                                body.organisationId,
                            stripe_status:
                                'starter',
                            updated_at:
                                new Date().toISOString(),
                        },
                        {
                            onConflict:
                                'organisation_id',
                        },
                    )

            if (billingUpsertError) {
                throw new HttpError(
                    500,
                    billingUpsertError.message,
                )
            }

            return jsonResponse({
                kind: 'activated',
            })
        }

        if (
            organisation.subscription_plan ===
                'professional' &&
            organisation.subscription_status ===
                'active'
        ) {
            return jsonResponse({
                kind: 'activated',
            })
        }

        if (
            billing
                ?.stripe_subscription_id
        ) {
            throw new HttpError(
                409,
                'A Stripe subscription already exists for this organisation. Open billing management instead of creating another checkout.',
            )
        }

        const stripe = new Stripe(
            getRequiredEnvironment(
                'STRIPE_SECRET_KEY',
            ),
        )

        let customerId =
            billing?.stripe_customer_id ??
            null

        if (!customerId) {
            const customer =
                await stripe.customers.create({
                    email:
                        organisation.owner_email ??
                        user.email ??
                        undefined,
                    name: organisation.name,
                    metadata: {
                        organisation_id:
                            organisation.id,
                    },
                })

            customerId = customer.id
        }

        const priceId = getPriceId(
            body.billingInterval,
        )
        const appUrl = getAppUrl(request)

        const { error: billingUpsertError } =
            await admin
                .from('organisation_billing')
                .upsert(
                    {
                        organisation_id:
                            organisation.id,
                        stripe_customer_id:
                            customerId,
                        stripe_price_id:
                            priceId,
                        billing_interval:
                            body.billingInterval,
                        stripe_status:
                            'checkout_pending',
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict:
                            'organisation_id',
                    },
                )

        if (billingUpsertError) {
            throw new HttpError(
                500,
                billingUpsertError.message,
            )
        }

        const session =
            await stripe.checkout.sessions.create({
                mode: 'subscription',
                customer: customerId,
                client_reference_id:
                    organisation.id,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                allow_promotion_codes: true,
                success_url:
                    `${appUrl}/onboarding?billing=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url:
                    `${appUrl}/onboarding?billing=cancelled`,
                metadata: {
                    organisation_id:
                        organisation.id,
                    plan: 'professional',
                    billing_interval:
                        body.billingInterval,
                },
                subscription_data: {
                    metadata: {
                        organisation_id:
                            organisation.id,
                        plan: 'professional',
                        billing_interval:
                            body.billingInterval,
                    },
                },
            })

        if (!session.url) {
            throw new Error(
                'Stripe did not return a Checkout URL.',
            )
        }

        return jsonResponse({
            kind: 'checkout',
            url: session.url,
        })
    } catch (error) {
        return errorResponse(error)
    }
})
