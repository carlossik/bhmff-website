import Stripe from 'npm:stripe@^22.0.0'

import {
    corsHeaders,
    errorResponse,
    jsonResponse,
} from '../_shared/http.ts'
import {
    requirePlatformAdmin,
} from '../_shared/auth.ts'

type OrganisationRow = {
    id: string
    name: string
    slug: string
    status: string
    organisation_type: string
    subscription_plan: string
    subscription_status: string
    trial_end: string | null
    max_users: number
    max_competitions: number
    owner_name: string | null
    owner_email: string | null
    owner_phone: string | null
    created_at: string
    updated_at: string
}

type BillingRow = {
    organisation_id: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    stripe_price_id: string | null
    billing_interval: string | null
    stripe_status: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    stripe_livemode: boolean | null
    last_stripe_event_id: string | null
    last_stripe_event_at: string | null
    created_at: string
    updated_at: string
}

type MembershipRow = {
    organisation_id: string
    user_id: string
    role: string
    active: boolean
}

type OperationsEventRow = {
    id: string
    source: string
    category: string
    event_type: string
    severity: string
    processing_status: string
    organisation_id: string | null
    user_id: string | null
    external_id: string | null
    correlation_id: string | null
    message: string
    details: Record<string, unknown>
    duration_ms: number | null
    occurred_at: string
    resolved_at: string | null
}

type HealthStatus =
    | 'healthy'
    | 'degraded'
    | 'warning'
    | 'unknown'

type HealthItem = {
    id: string
    label: string
    status: HealthStatus
    message: string
    checkedAt: string
}

type DiagnosticSeverity =
    | 'info'
    | 'warning'
    | 'critical'

type Diagnostic = {
    id: string
    severity: DiagnosticSeverity
    code: string
    organisationId: string | null
    organisationName: string | null
    message: string
}

type BillingPlan = 'starter' | 'professional'
type BillingInterval = 'monthly' | 'annual'

type PriceSnapshot = {
    id: string
    unitAmount: number | null
    currency: string | null
    plan: BillingPlan
    interval: BillingInterval
}

type PriceConfig = {
    environmentName: string
    plan: BillingPlan
    interval: BillingInterval
}

const priceConfigs: readonly PriceConfig[] = [
    { environmentName: 'STRIPE_STARTER_MONTHLY_PRICE_ID', plan: 'starter', interval: 'monthly' },
    { environmentName: 'STRIPE_STARTER_ANNUAL_PRICE_ID', plan: 'starter', interval: 'annual' },
    { environmentName: 'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID', plan: 'professional', interval: 'monthly' },
    { environmentName: 'STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID', plan: 'professional', interval: 'annual' },
]

function optionalEnvironment(
    name: string,
): string | null {
    return Deno.env.get(name)?.trim() || null
}

function toTimestamp(
    value: string | null,
): number | null {
    if (!value) {
        return null
    }

    const timestamp =
        new Date(value).getTime()

    return Number.isFinite(timestamp)
        ? timestamp
        : null
}

function isWithinDays(
    value: string,
    days: number,
    now: number,
): boolean {
    const timestamp = toTimestamp(value)

    return (
        timestamp !== null &&
        timestamp >=
            now - days * 24 * 60 * 60 * 1000
    )
}

function isActiveStripeStatus(
    status: string | null,
): boolean {
    return (
        status === 'active' ||
        status === 'trialing'
    )
}

function isAtRiskStripeStatus(
    status: string | null,
): boolean {
    return (
        status === 'past_due' ||
        status === 'unpaid' ||
        status === 'incomplete'
    )
}

function isProductionBilling(
    billing: BillingRow,
    productionPriceIds: ReadonlySet<string>,
): boolean {
    if (billing.stripe_livemode === true) {
        return true
    }

    return Boolean(
        billing.stripe_price_id &&
        productionPriceIds.has(
            billing.stripe_price_id,
        ),
    )
}

function addCount(
    target: Record<string, number>,
    key: string,
): void {
    target[key] = (target[key] ?? 0) + 1
}

async function loadPriceSnapshot(
    stripe: Stripe,
    config: PriceConfig,
    priceId: string,
): Promise<PriceSnapshot> {
    const price =
        await stripe.prices.retrieve(priceId)

    return {
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency
            ? price.currency.toUpperCase()
            : null,
        plan: config.plan,
        interval: config.interval,
    }
}

function moneyContribution(
    billing: BillingRow,
    pricesById: ReadonlyMap<string, PriceSnapshot>,
): {
    annualMinor: number
    known: boolean
} {
    if (!billing.stripe_price_id) {
        return { annualMinor: 0, known: false }
    }

    const price = pricesById.get(
        billing.stripe_price_id,
    )

    if (!price || price.unitAmount === null) {
        return { annualMinor: 0, known: false }
    }

    return {
        annualMinor:
            price.interval === 'monthly'
                ? price.unitAmount * 12
                : price.unitAmount,
        known: true,
    }
}

function paidPlanLabel(
    value: string,
): string {
    if (value === 'starter') return 'Starter'
    if (value === 'professional') return 'Professional'
    return value
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

    const startedAt = Date.now()

    try {
        const {
            admin,
        } = await requirePlatformAdmin(request)

        const generatedAt =
            new Date().toISOString()
        const now = Date.now()

        const authHealth: HealthItem = {
            id: 'auth',
            label: 'Supabase Auth',
            status: 'healthy',
            message:
                'Platform administrator authentication and authorisation completed successfully.',
            checkedAt: generatedAt,
        }

        let storageHealth: HealthItem

        try {
            const { error: storageError } =
                await admin.storage.listBuckets()

            storageHealth = storageError
                ? {
                      id: 'storage',
                      label: 'Supabase Storage',
                      status: 'degraded',
                      message: storageError.message,
                      checkedAt: generatedAt,
                  }
                : {
                      id: 'storage',
                      label: 'Supabase Storage',
                      status: 'healthy',
                      message:
                          'Supabase Storage is reachable from the production service role.',
                      checkedAt: generatedAt,
                  }
        } catch (storageError) {
            storageHealth = {
                id: 'storage',
                label: 'Supabase Storage',
                status: 'degraded',
                message:
                    storageError instanceof Error
                        ? storageError.message
                        : 'Supabase Storage health check failed.',
                checkedAt: generatedAt,
            }
        }

        const [
            organisationsResponse,
            billingResponse,
            membershipsResponse,
            eventsResponse,
        ] = await Promise.all([
            admin
                .from('organisations')
                .select(`
                    id,
                    name,
                    slug,
                    status,
                    organisation_type,
                    subscription_plan,
                    subscription_status,
                    trial_end,
                    max_users,
                    max_competitions,
                    owner_name,
                    owner_email,
                    owner_phone,
                    created_at,
                    updated_at
                `)
                .order('created_at', {
                    ascending: false,
                }),
            admin
                .from('organisation_billing')
                .select(`
                    organisation_id,
                    stripe_customer_id,
                    stripe_subscription_id,
                    stripe_price_id,
                    billing_interval,
                    stripe_status,
                    current_period_start,
                    current_period_end,
                    cancel_at_period_end,
                    stripe_livemode,
                    last_stripe_event_id,
                    last_stripe_event_at,
                    created_at,
                    updated_at
                `),
            admin
                .from('organisation_memberships')
                .select(`
                    organisation_id,
                    user_id,
                    role,
                    active
                `)
                .eq('active', true),
            admin
                .from('platform_operations_events')
                .select(`
                    id,
                    source,
                    category,
                    event_type,
                    severity,
                    processing_status,
                    organisation_id,
                    user_id,
                    external_id,
                    correlation_id,
                    message,
                    details,
                    duration_ms,
                    occurred_at,
                    resolved_at
                `)
                .order('occurred_at', {
                    ascending: false,
                })
                .limit(200),
        ])

        if (organisationsResponse.error) {
            throw organisationsResponse.error
        }
        if (billingResponse.error) {
            throw billingResponse.error
        }
        if (membershipsResponse.error) {
            throw membershipsResponse.error
        }
        if (eventsResponse.error) {
            throw eventsResponse.error
        }

        const organisations =
            (organisationsResponse.data ?? []) as
                OrganisationRow[]
        const billingRows =
            (billingResponse.data ?? []) as
                BillingRow[]
        const memberships =
            (membershipsResponse.data ?? []) as
                MembershipRow[]
        const events =
            (eventsResponse.data ?? []) as
                OperationsEventRow[]

        const organisationById =
            new Map(
                organisations.map(
                    (organisation) => [
                        organisation.id,
                        organisation,
                    ],
                ),
            )
        const billingByOrganisation =
            new Map(
                billingRows.map(
                    (billing) => [
                        billing.organisation_id,
                        billing,
                    ],
                ),
            )

        const memberCountByOrganisation =
            new Map<string, number>()
        const uniqueActiveUsers =
            new Set<string>()

        memberships.forEach(
            (membership) => {
                uniqueActiveUsers.add(
                    membership.user_id,
                )
                memberCountByOrganisation.set(
                    membership.organisation_id,
                    (
                        memberCountByOrganisation.get(
                            membership.organisation_id,
                        ) ?? 0
                    ) + 1,
                )
            },
        )

        const planCounts: Record<string, number> = {}
        const statusCounts: Record<string, number> = {}
        const typeCounts: Record<string, number> = {}

        organisations.forEach(
            (organisation) => {
                addCount(
                    planCounts,
                    organisation.subscription_plan,
                )
                addCount(
                    statusCounts,
                    organisation.subscription_status,
                )
                addCount(
                    typeCounts,
                    organisation.organisation_type,
                )
            },
        )

        const configuredPriceEntries =
            priceConfigs.map((config) => ({
                config,
                priceId:
                    optionalEnvironment(
                        config.environmentName,
                    ),
            }))
        const configuredPriceIds =
            new Set(
                configuredPriceEntries
                    .map((entry) => entry.priceId)
                    .filter(
                        (value): value is string =>
                            Boolean(value),
                    ),
            )
        const stripeSecretKey =
            optionalEnvironment(
                'STRIPE_SECRET_KEY',
            )

        let stripeHealth: HealthItem = {
            id: 'stripe',
            label: 'Stripe Billing',
            status: 'unknown',
            message:
                'Stripe billing health has not been checked.',
            checkedAt: generatedAt,
        }
        let configuredPrices: PriceSnapshot[] = []

        const missingPriceNames =
            configuredPriceEntries
                .filter((entry) => !entry.priceId)
                .map(
                    (entry) =>
                        entry.config.environmentName,
                )

        if (
            stripeSecretKey &&
            missingPriceNames.length === 0
        ) {
            try {
                const stripe =
                    new Stripe(stripeSecretKey)

                configuredPrices =
                    await Promise.all(
                        configuredPriceEntries.map(
                            (entry) =>
                                loadPriceSnapshot(
                                    stripe,
                                    entry.config,
                                    entry.priceId as string,
                                ),
                        ),
                    )

                stripeHealth = {
                    id: 'stripe',
                    label: 'Stripe Billing',
                    status: 'healthy',
                    message:
                        'Live Stripe credentials and Starter/Professional prices are reachable.',
                    checkedAt: generatedAt,
                }
            } catch (error) {
                stripeHealth = {
                    id: 'stripe',
                    label: 'Stripe Billing',
                    status: 'degraded',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Stripe could not be reached.',
                    checkedAt: generatedAt,
                }
            }
        } else {
            stripeHealth = {
                id: 'stripe',
                label: 'Stripe Billing',
                status: 'degraded',
                message: !stripeSecretKey
                    ? 'STRIPE_SECRET_KEY is not configured.'
                    : `Missing live billing price configuration: ${missingPriceNames.join(', ')}.`,
                checkedAt: generatedAt,
            }
        }

        const pricesById =
            new Map(
                configuredPrices.map(
                    (price) => [price.id, price],
                ),
            )

        const productionBillingRows =
            billingRows.filter(
                (billing) =>
                    isProductionBilling(
                        billing,
                        configuredPriceIds,
                    ),
            )

        const activeBillingRows =
            productionBillingRows.filter(
                (billing) =>
                    isActiveStripeStatus(
                        billing.stripe_status,
                    ),
            )
        const atRiskBillingRows =
            productionBillingRows.filter(
                (billing) =>
                    isAtRiskStripeStatus(
                        billing.stripe_status,
                    ),
            )

        let activeAnnualMinor = 0
        let atRiskAnnualMinor = 0
        let activeRevenueComplete = true
        let atRiskRevenueComplete = true

        activeBillingRows.forEach(
            (billing) => {
                const contribution =
                    moneyContribution(
                        billing,
                        pricesById,
                    )
                activeAnnualMinor +=
                    contribution.annualMinor
                if (!contribution.known) {
                    activeRevenueComplete = false
                }
            },
        )

        atRiskBillingRows.forEach(
            (billing) => {
                const contribution =
                    moneyContribution(
                        billing,
                        pricesById,
                    )
                atRiskAnnualMinor +=
                    contribution.annualMinor
                if (!contribution.known) {
                    atRiskRevenueComplete = false
                }
            },
        )

        const currencies = configuredPrices
            .map((price) => price.currency)
            .filter(
            (value): value is string =>
                Boolean(value),
        )
        const currency =
            currencies.length > 0 &&
            currencies.every(
                (value) =>
                    value === currencies[0],
            )
                ? currencies[0]
                : null

        const diagnostics: Diagnostic[] = []

        organisations.forEach(
            (organisation) => {
                const billing =
                    billingByOrganisation.get(
                        organisation.id,
                    ) ?? null
                const productionBilling =
                    billing &&
                    isProductionBilling(
                        billing,
                        configuredPriceIds,
                    )
                const isSelfServicePaidPlan =
                    organisation.subscription_plan === 'starter' ||
                    organisation.subscription_plan === 'professional'

                if (
                    organisation.subscription_plan ===
                        'professional' &&
                    !billing
                ) {
                    diagnostics.push({
                        id: `professional-no-billing-${organisation.id}`,
                        severity: 'critical',
                        code: 'professional_without_billing',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            'Professional entitlement exists without an organisation_billing record.',
                    })
                } else if (
                    organisation.subscription_plan ===
                        'starter' &&
                    !billing
                ) {
                    diagnostics.push({
                        id: `starter-no-billing-${organisation.id}`,
                        severity: 'warning',
                        code: 'starter_without_billing',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            'Starter workspace has no billing record. This may be a pre-paid-Starter legacy workspace or an incomplete billing journey and should be reviewed.',
                    })
                } else if (
                    isSelfServicePaidPlan &&
                    billing &&
                    !productionBilling
                ) {
                    diagnostics.push({
                        id: `paid-plan-non-live-${organisation.id}`,
                        severity: 'warning',
                        code: 'paid_plan_non_live_billing',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            `${paidPlanLabel(organisation.subscription_plan)} entitlement is linked to a non-live or legacy Stripe billing record.`,
                    })
                }

                if (
                    billing &&
                    productionBilling &&
                    isActiveStripeStatus(
                        billing.stripe_status,
                    )
                ) {
                    const configuredPrice =
                        billing.stripe_price_id
                            ? pricesById.get(
                                  billing.stripe_price_id,
                              ) ?? null
                            : null

                    if (
                        configuredPrice &&
                        organisation.subscription_plan !==
                            configuredPrice.plan
                    ) {
                        diagnostics.push({
                            id: `paid-plan-mismatch-${organisation.id}`,
                            severity: 'critical',
                            code: 'active_stripe_plan_mismatch',
                            organisationId: organisation.id,
                            organisationName: organisation.name,
                            message:
                                `Stripe price resolves to ${paidPlanLabel(configuredPrice.plan)} but TournamentHQ entitlement is ${paidPlanLabel(organisation.subscription_plan)}.`,
                        })
                    } else if (!configuredPrice) {
                        diagnostics.push({
                            id: `unrecognised-live-price-${organisation.id}`,
                            severity: 'warning',
                            code: 'unrecognised_live_price',
                            organisationId: organisation.id,
                            organisationName: organisation.name,
                            message:
                                'Live Stripe billing uses a price that is not one of the configured Starter/Professional prices.',
                        })
                    }
                }

                if (
                    billing?.cancel_at_period_end &&
                    productionBilling
                ) {
                    diagnostics.push({
                        id: `scheduled-cancellation-${organisation.id}`,
                        severity: 'warning',
                        code: 'scheduled_cancellation',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            `${paidPlanLabel(organisation.subscription_plan)} subscription is scheduled to end at the current billing-period boundary.`,
                    })
                }

                if (
                    billing &&
                    productionBilling &&
                    isAtRiskStripeStatus(
                        billing.stripe_status,
                    )
                ) {
                    diagnostics.push({
                        id: `billing-at-risk-${organisation.id}`,
                        severity: 'critical',
                        code: 'billing_at_risk',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            `Stripe billing status is ${billing.stripe_status ?? 'unknown'}.`,
                    })
                }

                const billingCreatedAt =
                    billing
                        ? toTimestamp(
                              billing.created_at,
                          )
                        : null

                if (
                    billing?.stripe_status ===
                        'checkout_pending' &&
                    billingCreatedAt !== null &&
                    now - billingCreatedAt >
                        2 * 60 * 60 * 1000
                ) {
                    diagnostics.push({
                        id: `stale-checkout-${organisation.id}`,
                        severity: 'warning',
                        code: 'stale_checkout_pending',
                        organisationId: organisation.id,
                        organisationName: organisation.name,
                        message:
                            'Checkout has remained pending for more than two hours.',
                    })
                }
            },
        )

        const webhookEvents =
            events.filter(
                (event) =>
                    event.source ===
                    'stripe_webhook',
            )
        const webhookEvents24h =
            webhookEvents.filter(
                (event) =>
                    isWithinDays(
                        event.occurred_at,
                        1,
                        now,
                    ),
            )
        const webhookFailures24h =
            webhookEvents24h.filter(
                (event) =>
                    event.processing_status ===
                        'failed' ||
                    event.severity === 'error' ||
                    event.severity === 'critical',
            )
        const clientErrors24h =
            events.filter(
                (event) =>
                    event.source === 'client' &&
                    isWithinDays(
                        event.occurred_at,
                        1,
                        now,
                    ),
            )

        const webhookHealth: HealthItem =
            webhookFailures24h.length > 0
                ? {
                      id: 'stripe-webhook',
                      label:
                          'Stripe Webhook',
                      status: 'degraded',
                      message:
                          `${webhookFailures24h.length} failed or error webhook event(s) recorded in the last 24 hours.`,
                      checkedAt: generatedAt,
                  }
                : webhookEvents24h.length > 0
                  ? {
                        id: 'stripe-webhook',
                        label:
                            'Stripe Webhook',
                        status: 'healthy',
                        message:
                            `${webhookEvents24h.length} webhook event(s) processed with no recorded failures in the last 24 hours.`,
                        checkedAt: generatedAt,
                    }
                  : {
                        id: 'stripe-webhook',
                        label:
                            'Stripe Webhook',
                        status: 'unknown',
                        message:
                            'No webhook telemetry has been recorded in the last 24 hours.',
                        checkedAt: generatedAt,
                    }

        const telemetryHealth: HealthItem =
            clientErrors24h.length > 0
                ? {
                      id: 'client-telemetry',
                      label:
                          'Customer UI Telemetry',
                      status: 'warning',
                      message:
                          `${clientErrors24h.length} production client error(s) recorded in the last 24 hours.`,
                      checkedAt: generatedAt,
                  }
                : {
                      id: 'client-telemetry',
                      label:
                          'Customer UI Telemetry',
                      status: 'healthy',
                      message:
                          'No production client errors recorded in the last 24 hours.',
                      checkedAt: generatedAt,
                  }

        const databaseHealth: HealthItem = {
            id: 'database',
            label: 'Supabase Database',
            status: 'healthy',
            message:
                'Platform Operations queries completed successfully.',
            checkedAt: generatedAt,
        }

        const customerRows =
            organisations.map(
                (organisation) => {
                    const billing =
                        billingByOrganisation.get(
                            organisation.id,
                        ) ?? null
                    const productionBilling =
                        billing
                            ? isProductionBilling(
                                  billing,
                                  configuredPriceIds,
                              )
                            : false

                    return {
                        id: organisation.id,
                        name: organisation.name,
                        slug: organisation.slug,
                        status:
                            organisation.status,
                        organisationType:
                            organisation.organisation_type,
                        subscriptionPlan:
                            organisation.subscription_plan,
                        subscriptionStatus:
                            organisation.subscription_status,
                        trialEnd:
                            organisation.trial_end,
                        maxUsers:
                            organisation.max_users,
                        maxCompetitions:
                            organisation.max_competitions,
                        ownerName:
                            organisation.owner_name,
                        ownerEmail:
                            organisation.owner_email,
                        ownerPhone:
                            organisation.owner_phone,
                        createdAt:
                            organisation.created_at,
                        updatedAt:
                            organisation.updated_at,
                        activeMemberCount:
                            memberCountByOrganisation.get(
                                organisation.id,
                            ) ?? 0,
                        billing: billing
                            ? {
                                  environment:
                                      productionBilling
                                          ? 'live'
                                          : billing.stripe_livemode ===
                                              false
                                            ? 'test'
                                            : 'legacy',
                                  interval:
                                      billing.billing_interval,
                                  stripeStatus:
                                      billing.stripe_status,
                                  currentPeriodStart:
                                      billing.current_period_start,
                                  currentPeriodEnd:
                                      billing.current_period_end,
                                  cancelAtPeriodEnd:
                                      billing.cancel_at_period_end,
                                  lastStripeEventId:
                                      billing.last_stripe_event_id,
                                  lastStripeEventAt:
                                      billing.last_stripe_event_at,
                                  updatedAt:
                                      billing.updated_at,
                              }
                            : null,
                    }
                },
            )

        const operationalEvents =
            events.map(
                (event) => ({
                    id: event.id,
                    source: event.source,
                    category: event.category,
                    eventType:
                        event.event_type,
                    severity: event.severity,
                    processingStatus:
                        event.processing_status,
                    organisationId:
                        event.organisation_id,
                    organisationName:
                        event.organisation_id
                            ? organisationById.get(
                                  event.organisation_id,
                              )?.name ?? null
                            : null,
                    externalId:
                        event.external_id,
                    correlationId:
                        event.correlation_id,
                    message: event.message,
                    details: event.details,
                    durationMs:
                        event.duration_ms,
                    occurredAt:
                        event.occurred_at,
                    resolvedAt:
                        event.resolved_at,
                }),
            )

        const monthlySubscriptions =
            activeBillingRows.filter(
                (billing) =>
                    billing.billing_interval ===
                    'monthly',
            ).length
        const annualSubscriptions =
            activeBillingRows.filter(
                (billing) =>
                    billing.billing_interval ===
                    'annual',
            ).length

        const response = {
            generatedAt,
            queryDurationMs:
                Date.now() - startedAt,
            overview: {
                totalOrganisations:
                    organisations.length,
                activeOrganisations:
                    organisations.filter(
                        (organisation) =>
                            organisation.status ===
                            'active',
                    ).length,
                clubs:
                    typeCounts.club ?? 0,
                competitionOrganisers:
                    typeCounts.competition_organiser ??
                    0,
                starter:
                    planCounts.starter ?? 0,
                professional:
                    planCounts.professional ?? 0,
                enterprise:
                    planCounts.enterprise ?? 0,
                activeSubscriptions:
                    activeBillingRows.length,
                trialSubscriptions:
                    statusCounts.trial ?? 0,
                pastDue:
                    statusCounts.past_due ?? 0,
                suspended:
                    statusCounts.suspended ?? 0,
                scheduledCancellations:
                    productionBillingRows.filter(
                        (billing) =>
                            billing.cancel_at_period_end,
                    ).length,
                activeAdministrators:
                    uniqueActiveUsers.size,
                createdLast7Days:
                    organisations.filter(
                        (organisation) =>
                            isWithinDays(
                                organisation.created_at,
                                7,
                                now,
                            ),
                    ).length,
                createdLast30Days:
                    organisations.filter(
                        (organisation) =>
                            isWithinDays(
                                organisation.created_at,
                                30,
                                now,
                            ),
                    ).length,
                checkoutPending:
                    billingRows.filter(
                        (billing) =>
                            billing.stripe_status ===
                            'checkout_pending',
                    ).length,
            },
            revenue: {
                available:
                    Boolean(
                        configuredPrices.length === priceConfigs.length &&
                        currency,
                    ),
                complete:
                    activeRevenueComplete,
                currency,
                mrrMinor:
                    Math.round(
                        activeAnnualMinor / 12,
                    ),
                arrMinor:
                    activeAnnualMinor,
                atRiskMrrMinor:
                    Math.round(
                        atRiskAnnualMinor / 12,
                    ),
                atRiskComplete:
                    atRiskRevenueComplete,
                monthlySubscriptions,
                annualSubscriptions,
                liveBillingRecords:
                    productionBillingRows.length,
                legacyOrTestBillingRecords:
                    billingRows.length -
                    productionBillingRows.length,
            },
            health: [
                databaseHealth,
                authHealth,
                storageHealth,
                stripeHealth,
                webhookHealth,
                telemetryHealth,
                {
                    id: 'edge-functions',
                    label: 'Edge Functions',
                    status: 'healthy',
                    message:
                        'The Platform Operations Edge Function executed successfully.',
                    checkedAt: generatedAt,
                },
            ],
            diagnostics:
                diagnostics.sort(
                    (left, right) => {
                        const rank: Record<
                            DiagnosticSeverity,
                            number
                        > = {
                            critical: 0,
                            warning: 1,
                            info: 2,
                        }

                        return (
                            rank[left.severity] -
                            rank[right.severity]
                        )
                    },
                ),
            customers: customerRows,
            events: operationalEvents,
        }

        return jsonResponse(response)
    } catch (error) {
        return errorResponse(error)
    }
})
