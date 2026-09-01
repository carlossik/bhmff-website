import Stripe from 'npm:stripe@^22.0.0'

import {
    createAdminClient,
} from '../_shared/auth.ts'
import {
    jsonResponse,
} from '../_shared/http.ts'
import {
    recordOperationsEvent,
    type OperationsEventSeverity,
} from '../_shared/operationsLog.ts'
import {
    getServerPlanModules,
    isServerSubscriptionPlanId,
    SERVER_SUBSCRIPTION_PLANS,
    type ServerBillingInterval,
    type ServerSubscriptionPlanId,
} from '../_shared/subscriptionPlans.ts'

type BillingLookupRow = {
    organisation_id: string
}

type OrganisationTypeLookupRow = {
    organisation_type: string | null
}

type AppSubscriptionStatus =
    | 'trial'
    | 'active'
    | 'past_due'
    | 'suspended'
    | 'cancelled'

type StripeEventContext = {
    eventId: string
    eventCreated: number
    livemode: boolean
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

function getOptionalEnvironment(
    name: string,
): string | null {
    return Deno.env.get(name)?.trim() || null
}

function getExpandableId(
    value:
        | string
        | { id: string }
        | null,
): string | null {
    if (typeof value === 'string') {
        return value
    }

    return value?.id ?? null
}

function toIso(
    unixSeconds:
        | number
        | null
        | undefined,
): string | null {
    if (
        typeof unixSeconds !== 'number' ||
        !Number.isFinite(unixSeconds)
    ) {
        return null
    }

    return new Date(
        unixSeconds * 1000,
    ).toISOString()
}

function mapSubscriptionStatus(
    stripeStatus: string,
): AppSubscriptionStatus {
    switch (stripeStatus) {
        case 'trialing':
            return 'trial'
        case 'active':
            return 'active'
        case 'past_due':
            return 'past_due'
        case 'canceled':
            return 'cancelled'
        case 'unpaid':
        case 'paused':
        case 'incomplete':
        case 'incomplete_expired':
        default:
            return 'suspended'
    }
}

function getInvoiceSubscriptionId(
    invoice: Stripe.Invoice,
): string | null {
    const parent = invoice.parent

    if (
        !parent ||
        parent.type !== 'subscription_details'
    ) {
        return null
    }

    return getExpandableId(
        parent.subscription_details?.subscription ??
            null,
    )
}

async function syncInvoiceSubscription(
    invoice: Stripe.Invoice,
    eventContext: StripeEventContext,
): Promise<string | null> {
    const subscriptionId =
        getInvoiceSubscriptionId(invoice)

    if (!subscriptionId) {
        return null
    }

    const subscription =
        await stripe.subscriptions.retrieve(
            subscriptionId,
        )

    return syncSubscription(
        subscription,
        eventContext,
    )
}

function resolveBillingInterval(
    subscription: Stripe.Subscription,
): ServerBillingInterval {
    if (
        subscription.metadata
            .billing_interval === 'annual'
    ) {
        return 'annual'
    }

    if (
        subscription.metadata
            .billing_interval === 'monthly'
    ) {
        return 'monthly'
    }

    const interval =
        subscription.items.data[0]
            ?.price.recurring?.interval

    return interval === 'year'
        ? 'annual'
        : 'monthly'
}

function resolveSubscriptionPlan(
    subscription: Stripe.Subscription,
): ServerSubscriptionPlanId {
    const metadataPlan =
        subscription.metadata.plan

    if (
        isServerSubscriptionPlanId(
            metadataPlan,
        )
    ) {
        return metadataPlan
    }

    const priceId =
        subscription.items.data[0]
            ?.price.id ?? null

    if (priceId) {
        const configuredPrices: Array<{
            priceId: string | null
            plan: ServerSubscriptionPlanId
        }> = [
            {
                priceId:
                    getOptionalEnvironment(
                        'STRIPE_STARTER_MONTHLY_PRICE_ID',
                    ),
                plan: 'starter',
            },
            {
                priceId:
                    getOptionalEnvironment(
                        'STRIPE_STARTER_ANNUAL_PRICE_ID',
                    ),
                plan: 'starter',
            },
            {
                priceId:
                    getOptionalEnvironment(
                        'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID',
                    ),
                plan: 'professional',
            },
            {
                priceId:
                    getOptionalEnvironment(
                        'STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID',
                    ),
                plan: 'professional',
            },
        ]

        const matched =
            configuredPrices.find(
                (candidate) =>
                    candidate.priceId ===
                    priceId,
            )

        if (matched) {
            return matched.plan
        }
    }

    throw new Error(
        `Stripe subscription ${subscription.id} does not contain a supported TournamentHQ plan.`,
    )
}

function shouldPublishPublicSite(
    status: AppSubscriptionStatus,
    plan: ServerSubscriptionPlanId,
): boolean {
    if (
        status === 'cancelled' ||
        status === 'suspended'
    ) {
        return false
    }

    return SERVER_SUBSCRIPTION_PLANS[
        plan
    ].publicSiteEnabled
}

async function findOrganisationId(
    subscription: Stripe.Subscription,
): Promise<string | null> {
    const metadataId =
        subscription.metadata
            .organisation_id?.trim()

    if (metadataId) {
        return metadataId
    }

    const admin = createAdminClient()
    const customerId =
        getExpandableId(
            subscription.customer,
        )

    let query = admin
        .from('organisation_billing')
        .select('organisation_id')

    if (subscription.id) {
        query = query.eq(
            'stripe_subscription_id',
            subscription.id,
        )
    } else if (customerId) {
        query = query.eq(
            'stripe_customer_id',
            customerId,
        )
    } else {
        return null
    }

    const { data, error } =
        await query.maybeSingle()

    if (error) {
        throw error
    }

    return (
        data as BillingLookupRow | null
    )?.organisation_id ?? null
}

async function syncSubscription(
    subscription: Stripe.Subscription,
    eventContext: StripeEventContext,
): Promise<string | null> {
    const organisationId =
        await findOrganisationId(
            subscription,
        )

    if (!organisationId) {
        console.warn(
            'Stripe subscription could not be matched to a TournamentHQ organisation:',
            subscription.id,
        )
        return null
    }

    const admin = createAdminClient()
    const customerId =
        getExpandableId(
            subscription.customer,
        )
    const item =
        subscription.items.data[0]
    const priceId =
        item?.price.id ?? null
    const billingInterval =
        resolveBillingInterval(
            subscription,
        )
    const plan =
        resolveSubscriptionPlan(
            subscription,
        )
    const appStatus =
        mapSubscriptionStatus(
            subscription.status,
        )
    const entitlementPlan =
        SERVER_SUBSCRIPTION_PLANS[plan]
    const cancellationScheduled =
        subscription.status !== 'canceled' &&
        (
            subscription.cancel_at_period_end ||
            typeof subscription.cancel_at === 'number'
        )

    const {
        data: organisationData,
        error: organisationLookupError,
    } = await admin
        .from('organisations')
        .select('organisation_type')
        .eq('id', organisationId)
        .maybeSingle()

    if (organisationLookupError) {
        throw organisationLookupError
    }

    const organisationType =
        (organisationData as OrganisationTypeLookupRow | null)
            ?.organisation_type ??
        'competition_organiser'

    const enabledModules =
        getServerPlanModules(
            plan,
            organisationType,
        )

    const {
        error: billingError,
    } = await admin
        .from('organisation_billing')
        .upsert(
            {
                organisation_id:
                    organisationId,
                stripe_customer_id:
                    customerId,
                stripe_subscription_id:
                    subscription.id,
                stripe_price_id:
                    priceId,
                billing_interval:
                    billingInterval,
                stripe_status:
                    subscription.status,
                current_period_start:
                    toIso(
                        item?.current_period_start,
                    ),
                current_period_end:
                    toIso(
                        item?.current_period_end,
                    ),
                cancel_at_period_end:
                    cancellationScheduled,
                stripe_livemode:
                    eventContext.livemode,
                last_stripe_event_id:
                    eventContext.eventId,
                last_stripe_event_at:
                    toIso(
                        eventContext.eventCreated,
                    ),
                updated_at:
                    new Date().toISOString(),
            },
            {
                onConflict:
                    'organisation_id',
            },
        )

    if (billingError) {
        throw billingError
    }

    const {
        error: organisationError,
    } = await admin
        .from('organisations')
        .update({
            subscription_plan:
                plan,
            subscription_status:
                appStatus,
            trial_end:
                toIso(
                    subscription.trial_end,
                ),
            max_users:
                entitlementPlan.maxUsers,
            max_competitions:
                entitlementPlan.maxCompetitions,
            public_site_enabled:
                shouldPublishPublicSite(
                    appStatus,
                    plan,
                ),
            enabled_modules:
                enabledModules,
        })
        .eq('id', organisationId)

    if (organisationError) {
        throw organisationError
    }

    return organisationId
}

function getEventSeverity(
    eventType: string,
    organisationId: string | null,
): OperationsEventSeverity {
    if (!organisationId) {
        return 'warning'
    }

    if (
        eventType === 'invoice.payment_failed' ||
        eventType ===
            'invoice.payment_action_required'
    ) {
        return 'warning'
    }

    return 'info'
}

function getEventMessage(
    eventType: string,
    organisationId: string | null,
): string {
    if (!organisationId) {
        return `Stripe event ${eventType} was processed but could not be matched to a TournamentHQ organisation.`
    }

    switch (eventType) {
        case 'checkout.session.completed':
            return 'Stripe Checkout completed and TournamentHQ billing was reconciled.'
        case 'customer.subscription.created':
            return 'Stripe subscription created and TournamentHQ entitlement was reconciled.'
        case 'customer.subscription.updated':
            return 'Stripe subscription changed and TournamentHQ entitlement was reconciled.'
        case 'customer.subscription.deleted':
            return 'Stripe subscription ended and TournamentHQ entitlement was reconciled.'
        case 'invoice.payment_failed':
            return 'Stripe reported a failed subscription payment attempt.'
        case 'invoice.payment_action_required':
            return 'Stripe reported that customer action is required to complete a subscription payment.'
        case 'invoice.paid':
            return 'Stripe invoice was paid and TournamentHQ billing was reconciled.'
        default:
            return `Stripe event ${eventType} was processed.`
    }
}

function getStripeObjectId(
    event: Stripe.Event,
): string | null {
    const value = event.data.object as unknown

    if (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof (
            value as { id?: unknown }
        ).id === 'string'
    ) {
        return (
            value as { id: string }
        ).id
    }

    return null
}

const stripe = new Stripe(
    getRequiredEnvironment(
        'STRIPE_SECRET_KEY',
    ),
)
const cryptoProvider =
    Stripe.createSubtleCryptoProvider()

Deno.serve(async (request) => {
    if (request.method !== 'POST') {
        return jsonResponse(
            { error: 'Method not allowed.' },
            405,
        )
    }

    const startedAt = Date.now()
    let event: Stripe.Event | null = null
    let organisationId: string | null = null

    try {
        const signature =
            request.headers.get(
                'Stripe-Signature',
            )

        if (!signature) {
            return jsonResponse(
                {
                    error:
                        'Missing Stripe signature.',
                },
                400,
            )
        }

        const payload =
            await request.text()
        event =
            await stripe.webhooks.constructEventAsync(
                payload,
                signature,
                getRequiredEnvironment(
                    'STRIPE_WEBHOOK_SECRET',
                ),
                undefined,
                cryptoProvider,
            )

        const eventContext: StripeEventContext = {
            eventId: event.id,
            eventCreated: event.created,
            livemode: event.livemode,
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session =
                    event.data.object as
                        Stripe.Checkout.Session
                const subscriptionId =
                    getExpandableId(
                        session.subscription,
                    )

                if (subscriptionId) {
                    const subscription =
                        await stripe.subscriptions.retrieve(
                            subscriptionId,
                        )
                    organisationId =
                        await syncSubscription(
                            subscription,
                            eventContext,
                        )
                }
                break
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const eventSubscription =
                    event.data.object as
                        Stripe.Subscription

                const currentSubscription =
                    await stripe.subscriptions.retrieve(
                        eventSubscription.id,
                    )

                organisationId =
                    await syncSubscription(
                        currentSubscription,
                        eventContext,
                    )
                break
            }

            case 'customer.subscription.deleted': {
                organisationId =
                    await syncSubscription(
                        event.data.object as
                            Stripe.Subscription,
                        eventContext,
                    )
                break
            }

            case 'invoice.payment_failed':
            case 'invoice.payment_action_required':
            case 'invoice.paid': {
                organisationId =
                    await syncInvoiceSubscription(
                        event.data.object as
                            Stripe.Invoice,
                        eventContext,
                    )
                break
            }

            default:
                break
        }

        await recordOperationsEvent({
            source: 'stripe_webhook',
            category: 'billing',
            eventType: event.type,
            severity:
                getEventSeverity(
                    event.type,
                    organisationId,
                ),
            processingStatus: 'processed',
            organisationId,
            externalId: event.id,
            message:
                getEventMessage(
                    event.type,
                    organisationId,
                ),
            durationMs:
                Date.now() - startedAt,
            occurredAt:
                toIso(event.created) ??
                new Date().toISOString(),
            details: {
                livemode: event.livemode,
                stripeObjectId:
                    getStripeObjectId(event),
            },
        })

        return jsonResponse({
            received: true,
        })
    } catch (error) {
        console.error(
            'Stripe webhook processing failed:',
            error,
        )

        if (event) {
            await recordOperationsEvent({
                source: 'stripe_webhook',
                category: 'billing',
                eventType: event.type,
                severity: 'error',
                processingStatus: 'failed',
                organisationId,
                externalId: event.id,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Stripe webhook processing failed.',
                durationMs:
                    Date.now() - startedAt,
                occurredAt:
                    toIso(event.created) ??
                    new Date().toISOString(),
                details: {
                    livemode:
                        event.livemode,
                    stripeObjectId:
                        getStripeObjectId(event),
                },
            })
        }

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Webhook processing failed.',
            },
            400,
        )
    }
})
