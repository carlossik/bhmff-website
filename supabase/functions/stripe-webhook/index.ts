import Stripe from 'npm:stripe@^22.0.0'

import {
    createAdminClient,
} from '../_shared/auth.ts'
import {
    jsonResponse,
} from '../_shared/http.ts'
import {
    SERVER_SUBSCRIPTION_PLANS,
    type ServerBillingInterval,
} from '../_shared/subscriptionPlans.ts'

type BillingLookupRow = {
    organisation_id: string
}

type AppSubscriptionStatus =
    | 'trial'
    | 'active'
    | 'past_due'
    | 'suspended'
    | 'cancelled'

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
): Promise<void> {
    const subscriptionId =
        getInvoiceSubscriptionId(invoice)

    if (!subscriptionId) {
        return
    }

    const subscription =
        await stripe.subscriptions.retrieve(
            subscriptionId,
        )

    await syncSubscription(subscription)
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
): Promise<void> {
    const organisationId =
        await findOrganisationId(
            subscription,
        )

    if (!organisationId) {
        console.warn(
            'Stripe subscription could not be matched to a TournamentHQ organisation:',
            subscription.id,
        )
        return
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
    const appStatus =
        mapSubscriptionStatus(
            subscription.status,
        )
    const cancellationScheduled =
        subscription.status !== 'canceled' &&
        (
            subscription.cancel_at_period_end ||
            typeof subscription.cancel_at === 'number'
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

    const subscriptionEnded =
        subscription.status === 'canceled'

    const entitlementPlan =
        subscriptionEnded
            ? SERVER_SUBSCRIPTION_PLANS.starter
            : SERVER_SUBSCRIPTION_PLANS.professional

    const {
        error: organisationError,
    } = await admin
        .from('organisations')
        .update(
            subscriptionEnded
                ? {
                      subscription_plan:
                          'starter',
                      subscription_status:
                          'active',
                      trial_end:
                          null,
                      max_users:
                          entitlementPlan.maxUsers,
                      max_competitions:
                          entitlementPlan.maxCompetitions,
                      public_site_enabled:
                          entitlementPlan.publicSiteEnabled,
                  }
                : {
                      subscription_plan:
                          'professional',
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
                          entitlementPlan.publicSiteEnabled,
                  },
        )
        .eq('id', organisationId)

    if (organisationError) {
        throw organisationError
    }
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
        const event =
            await stripe.webhooks.constructEventAsync(
                payload,
                signature,
                getRequiredEnvironment(
                    'STRIPE_WEBHOOK_SECRET',
                ),
                undefined,
                cryptoProvider,
            )

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
                    await syncSubscription(
                        subscription,
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

                await syncSubscription(
                    currentSubscription,
                )
                break
            }

            case 'customer.subscription.deleted': {
                await syncSubscription(
                    event.data.object as
                        Stripe.Subscription,
                )
                break
            }

            case 'invoice.payment_failed':
            case 'invoice.payment_action_required':
            case 'invoice.paid': {
                await syncInvoiceSubscription(
                    event.data.object as
                        Stripe.Invoice,
                )
                break
            }

            default:
                break
        }

        return jsonResponse({
            received: true,
        })
    } catch (error) {
        console.error(
            'Stripe webhook processing failed:',
            error,
        )

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
