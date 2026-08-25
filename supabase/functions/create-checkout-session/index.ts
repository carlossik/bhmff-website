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
import {
    isServerBillingInterval,
    isServerSubscriptionPlanId,
    SUBSCRIPTION_TRIAL_DAYS,
    type ServerBillingInterval,
    type ServerSubscriptionPlanId,
} from '../_shared/subscriptionPlans.ts'

type CheckoutRequest = {
    organisationId: string
    plan: ServerSubscriptionPlanId
    billingInterval: ServerBillingInterval
}

type BillingRow = {
    stripe_customer_id: string | null
}

type OrganisationRow = {
    id: string
    name: string
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

    const organisationId =
        typeof value.organisationId === 'string'
            ? value.organisationId.trim()
            : ''
    const plan = value.plan
    const billingInterval =
        value.billingInterval ?? value.billing

    if (!organisationId) {
        throw new HttpError(
            400,
            'Organisation ID is required.',
        )
    }

    if (!isServerSubscriptionPlanId(plan)) {
        throw new HttpError(
            400,
            'A supported TournamentHQ subscription plan is required.',
        )
    }

    if (!isServerBillingInterval(billingInterval)) {
        throw new HttpError(
            400,
            'A supported billing interval is required.',
        )
    }

    return {
        organisationId,
        plan,
        billingInterval,
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

function normaliseOrigin(
    value: string,
): string | null {
    try {
        const url = new URL(value)

        if (
            url.protocol !== 'http:' &&
            url.protocol !== 'https:'
        ) {
            return null
        }

        return url.origin
    } catch {
        return null
    }
}

function isLocalDevelopmentOrigin(
    origin: string,
): boolean {
    try {
        const hostname =
            new URL(origin).hostname.toLowerCase()

        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '[::1]' ||
            hostname === '::1'
        )
    } catch {
        return false
    }
}

function getAppUrl(
    request: Request,
): string {
    const configuredValue =
        Deno.env.get(
            'TOURNAMENTHQ_APP_URL',
        )?.trim() ?? ''
    const configuredOrigin =
        configuredValue
            ? normaliseOrigin(
                  configuredValue,
              )
            : null
    const requestOriginValue =
        request.headers.get('origin')?.trim() ?? ''
    const requestOrigin =
        requestOriginValue
            ? normaliseOrigin(
                  requestOriginValue,
              )
            : null

    /*
     * Stripe must return the browser to the same SaaS origin that
     * started Checkout. This matters during local development because
     * Supabase auth/session storage is origin-scoped: returning a local
     * customer to the production hostname makes them appear signed out.
     *
     * Never accept an arbitrary caller-controlled redirect origin. We
     * only allow the configured production app origin or loopback hosts
     * used for local development.
     */
    if (requestOrigin) {
        if (
            configuredOrigin &&
            requestOrigin === configuredOrigin
        ) {
            return requestOrigin
        }

        if (
            isLocalDevelopmentOrigin(
                requestOrigin,
            )
        ) {
            return requestOrigin
        }
    }

    if (configuredOrigin) {
        return configuredOrigin
    }

    throw new Error(
        'TOURNAMENTHQ_APP_URL is not configured and no safe request origin was supplied.',
    )
}

function getPriceId(
    plan: ServerSubscriptionPlanId,
    billingInterval: ServerBillingInterval,
): string {
    const environmentName =
        plan === 'starter'
            ? billingInterval === 'annual'
                ? 'STRIPE_STARTER_ANNUAL_PRICE_ID'
                : 'STRIPE_STARTER_MONTHLY_PRICE_ID'
            : billingInterval === 'annual'
              ? 'STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID'
              : 'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID'

    return getRequiredEnvironment(
        environmentName,
    )
}

function isCurrentSubscription(
    subscription: Stripe.Subscription,
): boolean {
    return (
        subscription.status !== 'canceled' &&
        subscription.status !== 'incomplete_expired'
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
        const {
            admin,
            user,
        } = await requireBillingAdmin(
            request,
            body.organisationId,
        )

        const {
            data: organisationData,
            error: organisationError,
        } = await admin
            .from('organisations')
            .select('id, name')
            .eq('id', body.organisationId)
            .maybeSingle()

        if (organisationError) {
            throw new HttpError(
                500,
                organisationError.message,
            )
        }

        const organisation =
            organisationData as OrganisationRow | null

        if (!organisation) {
            throw new HttpError(
                404,
                'TournamentHQ organisation not found.',
            )
        }

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

        const stripe = new Stripe(
            getRequiredEnvironment(
                'STRIPE_SECRET_KEY',
            ),
        )
        const billing =
            billingData as BillingRow | null

        let customerId =
            billing?.stripe_customer_id ?? null

        if (!customerId) {
            const customer =
                await stripe.customers.create({
                    email:
                        user.email ?? undefined,
                    name:
                        organisation.name,
                    metadata: {
                        organisation_id:
                            body.organisationId,
                    },
                })

            customerId = customer.id

            const {
                error: customerSaveError,
            } = await admin
                .from('organisation_billing')
                .upsert(
                    {
                        organisation_id:
                            body.organisationId,
                        stripe_customer_id:
                            customerId,
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict:
                            'organisation_id',
                    },
                )

            if (customerSaveError) {
                throw new HttpError(
                    500,
                    customerSaveError.message,
                )
            }
        }

        const previousSubscriptions =
            await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 100,
            })

        const currentSubscription =
            previousSubscriptions.data.find(
                isCurrentSubscription,
            )

        if (currentSubscription) {
            throw new HttpError(
                409,
                'This organisation already has a current TournamentHQ subscription. Use Manage Billing instead of starting another checkout.',
            )
        }

        const trialEligible =
            previousSubscriptions.data.length === 0
        const priceId = getPriceId(
            body.plan,
            body.billingInterval,
        )
        const appUrl = getAppUrl(request)
        const metadata = {
            organisation_id:
                body.organisationId,
            plan:
                body.plan,
            billing_interval:
                body.billingInterval,
        }

        const subscriptionData:
            Stripe.Checkout.SessionCreateParams.SubscriptionData = {
                metadata,
            }

        if (trialEligible) {
            subscriptionData.trial_period_days =
                SUBSCRIPTION_TRIAL_DAYS
            subscriptionData.trial_settings = {
                end_behavior: {
                    missing_payment_method:
                        'cancel',
                },
            }
        }

        const session =
            await stripe.checkout.sessions.create({
                mode: 'subscription',
                customer: customerId,
                client_reference_id:
                    body.organisationId,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                allow_promotion_codes: true,
                payment_method_collection:
                    'always',
                success_url:
                    `${appUrl}/onboarding?billing=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url:
                    `${appUrl}/onboarding?billing=cancelled`,
                metadata,
                subscription_data:
                    subscriptionData,
            })

        if (!session.url) {
            throw new HttpError(
                500,
                'Stripe did not return a checkout URL.',
            )
        }

        return jsonResponse({
            url: session.url,
            trialEligible,
            trialDays:
                trialEligible
                    ? SUBSCRIPTION_TRIAL_DAYS
                    : 0,
        })
    } catch (error) {
        return errorResponse(error)
    }
})
