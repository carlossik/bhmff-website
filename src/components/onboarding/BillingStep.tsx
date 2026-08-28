import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Check,
    CircleDollarSign,
    ExternalLink,
    Loader2,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'

import {
    getOrganisation,
} from '../admin/Organisations/organisationService'
import type {
    Organisation,
} from '../admin/Organisations/organisationTypes'
import {
    supabase,
} from '../../lib/supabaseClient'
import {
    trackSaasAnalyticsEvent,
    trackSaasAnalyticsMilestone,
} from '../../lib/saasAnalytics'

type BillingStepProps = {
    organisationId: string | null
    onBack: () => void
    onContinue: () => void
}

type SelfServicePlan =
    | 'starter'
    | 'professional'

type BillingInterval =
    | 'monthly'
    | 'annual'

type CheckoutResponse = {
    url?: string
    error?: string
    trialEligible?: boolean
    trialDays?: number
}

type PlanDefinition = {
    id: SelfServicePlan
    eyebrow: string
    name: string
    description: string
    monthlyPrice: number
    annualPrice: number
    monthlyFeatures: readonly string[]
    featured: boolean
}

type BillingReturnState =
    | 'none'
    | 'success'
    | 'cancelled'

const TRIAL_DAYS = 14
const BILLING_SYNC_ATTEMPTS = 12
const BILLING_SYNC_DELAY_MS = 1000

const PLANS: readonly PlanDefinition[] = [
    {
        id: 'starter',
        eyebrow: 'Essential platform',
        name: 'Starter',
        description:
            'For a club or competition organiser getting started with core TournamentHQ operations.',
        monthlyPrice: 10,
        annualPrice: 100,
        monthlyFeatures: [
            'Up to 2 administrator accounts',
            '1 competition for organiser accounts',
            'Teams, players, fixtures and results',
            'Public club or competition website',
            'Core publishing and operational tools',
            '14-day free trial before first payment',
        ],
        featured: false,
    },
    {
        id: 'professional',
        eyebrow: 'Full platform',
        name: 'Professional',
        description:
            'For established clubs and competition organisers managing more teams, competitions, finance, communications and administrators.',
        monthlyPrice: 39,
        annualPrice: 390,
        monthlyFeatures: [
            'Everything in Starter',
            'Multi-team and multi-competition operations',
            'Up to 10 administrator accounts',
            'Match Centre and match-day operations',
            'Club Finance and player payment tracking',
            'Email communications and delivery tracking',
            'AI Tournament Director and advanced scheduling',
            'Sponsors, articles and media publishing',
            '14-day free trial before first payment',
        ],
        featured: true,
    },
]

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds)
    })
}

function readSelectedPlanFromSearch(): SelfServicePlan {
    if (typeof window === 'undefined') {
        return 'starter'
    }

    const plan = new URLSearchParams(
        window.location.search,
    ).get('plan')

    return plan === 'professional'
        ? 'professional'
        : 'starter'
}

function readBillingIntervalFromSearch(): BillingInterval {
    if (typeof window === 'undefined') {
        return 'monthly'
    }

    const billing = new URLSearchParams(
        window.location.search,
    ).get('billing')

    return billing === 'annual'
        ? 'annual'
        : 'monthly'
}

function readBillingReturnState(): BillingReturnState {
    if (typeof window === 'undefined') {
        return 'none'
    }

    const billing = new URLSearchParams(
        window.location.search,
    ).get('billing')

    if (billing === 'success') {
        return 'success'
    }

    if (billing === 'cancelled') {
        return 'cancelled'
    }

    return 'none'
}

function hasBillingEntitlement(
    organisation: Organisation,
): boolean {
    return (
        organisation.subscription_status ===
            'trial' ||
        organisation.subscription_status ===
            'active'
    )
}

function formatPlanName(
    plan: Organisation['subscription_plan'],
): string {
    if (plan === 'professional') {
        return 'Professional'
    }

    if (plan === 'enterprise') {
        return 'Enterprise'
    }

    return 'Starter'
}

function formatTrialEnd(
    value: string | null,
): string | null {
    if (!value) {
        return null
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

function getMarketingWebsiteUrl(): string {
    if (typeof window === 'undefined') {
        return 'https://tournamenthq.co.uk'
    }

    const hostname =
        window.location.hostname.toLowerCase()

    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
    ) {
        return 'http://localhost:5173'
    }

    return 'https://tournamenthq.co.uk'
}

function getPriceLabel(
    plan: PlanDefinition,
    interval: BillingInterval,
): {
    price: string
    cadence: string
    secondary: string
} {
    if (interval === 'annual') {
        return {
            price: `£${plan.annualPrice}`,
            cadence: '/year',
            secondary:
                plan.id === 'starter'
                    ? 'Equivalent to £8.33/month'
                    : 'Equivalent to £32.50/month',
        }
    }

    return {
        price: `£${plan.monthlyPrice}`,
        cadence: '/month',
        secondary:
            plan.id === 'starter'
                ? 'Or £100 annually'
                : 'Or £390 annually',
    }
}

export function BillingStep({
    organisationId,
    onBack,
    onContinue,
}: BillingStepProps) {
    const [selectedPlan, setSelectedPlan] =
        useState<SelfServicePlan>(
            readSelectedPlanFromSearch,
        )
    const [billingInterval, setBillingInterval] =
        useState<BillingInterval>(
            readBillingIntervalFromSearch,
        )
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [loadingOrganisation, setLoadingOrganisation] =
        useState(true)
    const [startingCheckout, setStartingCheckout] =
        useState(false)
    const [syncingBilling, setSyncingBilling] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState('')
    const [billingReturnState] =
        useState<BillingReturnState>(
            readBillingReturnState,
        )

    const marketingWebsiteUrl =
        useMemo(
            getMarketingWebsiteUrl,
            [],
        )

    const selectedDefinition =
        useMemo(
            () =>
                PLANS.find(
                    (plan) =>
                        plan.id === selectedPlan,
                ) ?? PLANS[0],
            [selectedPlan],
        )

    const loadOrganisation =
        useCallback(async (): Promise<Organisation | null> => {
            if (!organisationId) {
                setOrganisation(null)
                setLoadingOrganisation(false)
                return null
            }

            try {
                const currentOrganisation =
                    await getOrganisation(
                        organisationId,
                    )

                setOrganisation(
                    currentOrganisation,
                )

                if (
                    currentOrganisation &&
                    (
                        currentOrganisation.subscription_plan ===
                            'starter' ||
                        currentOrganisation.subscription_plan ===
                            'professional'
                    ) &&
                    hasBillingEntitlement(
                        currentOrganisation,
                    )
                ) {
                    setSelectedPlan(
                        currentOrganisation.subscription_plan,
                    )
                }

                return currentOrganisation
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'TournamentHQ could not load the organisation billing state.',
                )
                return null
            } finally {
                setLoadingOrganisation(false)
            }
        }, [organisationId])

    const synchroniseCheckout =
        useCallback(async () => {
            if (!organisationId) {
                return
            }

            setSyncingBilling(true)
            setErrorMessage('')

            try {
                for (
                    let attempt = 0;
                    attempt < BILLING_SYNC_ATTEMPTS;
                    attempt += 1
                ) {
                    const currentOrganisation =
                        await getOrganisation(
                            organisationId,
                        )

                    setOrganisation(
                        currentOrganisation,
                    )

                    if (
                        currentOrganisation &&
                        hasBillingEntitlement(
                            currentOrganisation,
                        )
                    ) {
                        if (
                            currentOrganisation.subscription_plan ===
                                'starter' ||
                            currentOrganisation.subscription_plan ===
                                'professional'
                        ) {
                            setSelectedPlan(
                                currentOrganisation.subscription_plan,
                            )
                        }

                        return
                    }

                    if (
                        attempt <
                        BILLING_SYNC_ATTEMPTS - 1
                    ) {
                        await delay(
                            BILLING_SYNC_DELAY_MS,
                        )
                    }
                }

                setErrorMessage(
                    'Stripe Checkout completed, but TournamentHQ is still confirming the subscription. Use “Check billing status” in a moment.',
                )
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'TournamentHQ could not confirm the subscription yet.',
                )
            } finally {
                setSyncingBilling(false)
            }
        }, [organisationId])

    useEffect(() => {
        void loadOrganisation()
    }, [loadOrganisation])

    useEffect(() => {
        if (billingReturnState === 'success') {
            void synchroniseCheckout()
        }
    }, [
        billingReturnState,
        synchroniseCheckout,
    ])

    useEffect(() => {
        if (!organisation) {
            return
        }

        if (
            organisation.subscription_status ===
            'trial'
        ) {
            trackSaasAnalyticsMilestone(
                `trial-start:${organisation.id}`,
                'trial_start',
                {
                    organisation_type:
                        organisation.organisation_type,
                    plan:
                        organisation.subscription_plan,
                },
            )
        }

        if (
            organisation.subscription_status ===
            'active'
        ) {
            trackSaasAnalyticsMilestone(
                `paid-subscription:${organisation.id}`,
                'paid_subscription_active',
                {
                    organisation_type:
                        organisation.organisation_type,
                    plan:
                        organisation.subscription_plan,
                },
            )
        }
    }, [organisation])

    async function startCheckout(): Promise<void> {
        if (
            !organisationId ||
            startingCheckout ||
            syncingBilling
        ) {
            return
        }

        setStartingCheckout(true)
        setErrorMessage('')

        try {
            const {
                data,
                error,
            } =
                await supabase.functions.invoke<CheckoutResponse>(
                    'create-checkout-session',
                    {
                        body: {
                            organisationId,
                            plan: selectedPlan,
                            billingInterval,
                        },
                    },
                )

            if (error) {
                throw error
            }

            const checkoutUrl =
                data?.url?.trim() ?? ''

            if (!checkoutUrl) {
                throw new Error(
                    data?.error ||
                        'TournamentHQ could not start Stripe Checkout.',
                )
            }

            trackSaasAnalyticsEvent(
                'begin_checkout',
                {
                    plan: selectedPlan,
                    billing_interval:
                        billingInterval,
                    organisation_type:
                        organisation?.organisation_type,
                },
            )

            window.location.assign(
                checkoutUrl,
            )
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'TournamentHQ could not start Stripe Checkout.',
            )
            setStartingCheckout(false)
        }
    }

    const billingReady =
        organisation !== null &&
        hasBillingEntitlement(
            organisation,
        )

    if (loadingOrganisation) {
        return (
            <div className="grid min-h-[24rem] place-items-center text-center">
                <div>
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--organisation-accent,#84cc16)]" />
                    <p className="mt-4 text-sm text-slate-400">
                        Loading TournamentHQ plans...
                    </p>
                </div>
            </div>
        )
    }

    if (!organisationId) {
        return (
            <div className="mx-auto max-w-2xl py-8 text-center">
                <div
                    role="heading"
                    aria-level={1}
                    className="font-black text-white"
                    style={{
                        fontSize: '1.5rem',
                        lineHeight: 1.15,
                    }}
                >
                    Create your organisation first
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                    TournamentHQ needs an organisation before a subscription can be started.
                </p>
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-white transition hover:border-lime-400/60"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
            </div>
        )
    }

    if (billingReady && organisation) {
        const trialEnd =
            formatTrialEnd(
                organisation.trial_end,
            )
        const isTrial =
            organisation.subscription_status ===
            'trial'

        return (
            <div className="space-y-6">
                <header>
                    <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lime-300">
                        <BadgeCheck className="h-4 w-4" />
                        Billing confirmed
                    </div>

                    <div
                        role="heading"
                        aria-level={1}
                        className="mt-4 font-black tracking-tight text-white"
                        style={{
                            fontSize: 'clamp(1.875rem, 4vw, 2.25rem)',
                            lineHeight: 1.08,
                        }}
                    >
                        Your TournamentHQ {formatPlanName(
                            organisation.subscription_plan,
                        )} workspace is ready
                    </div>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                        {isTrial
                            ? `Your ${TRIAL_DAYS}-day free trial is active. No subscription charge is due today.`
                            : 'Your TournamentHQ subscription is active.'}
                    </p>
                </header>

                <section className="rounded-2xl border border-lime-400/30 bg-lime-400/[0.07] p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-lime-300">
                                {formatPlanName(
                                    organisation.subscription_plan,
                                )} plan
                            </p>
                            <div
                                role="heading"
                                aria-level={2}
                                className="mt-2 font-black text-white"
                                style={{
                                    fontSize: '1.25rem',
                                    lineHeight: 1.2,
                                }}
                            >
                                {isTrial
                                    ? 'Free trial active'
                                    : 'Subscription active'}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {isTrial && trialEnd
                                    ? `Your trial runs until ${trialEnd}. Stripe will attempt the first subscription payment when the trial ends unless you cancel before then.`
                                    : isTrial
                                      ? 'Stripe will attempt the first subscription payment when the trial ends unless you cancel before then.'
                                      : 'Your workspace now has the entitlements for your selected subscription.'}
                            </p>
                        </div>

                        <ShieldCheck className="h-10 w-10 shrink-0 text-lime-300" />
                    </div>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100"
                    >
                        {errorMessage}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90"
                    >
                        Continue to branding
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-black/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--organisation-accent,#84cc16)]">
                    <Sparkles className="h-4 w-4" />
                    Plan &amp; billing
                </div>

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div
                            role="heading"
                            aria-level={1}
                            className="m-0 font-black tracking-tight text-white"
                            style={{
                                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                                lineHeight: 1.02,
                                maxWidth: '18ch',
                            }}
                        >
                            Choose the plan that fits
                        </div>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                            Try Starter or Professional free for {TRIAL_DAYS} days. Add your payment method securely with Stripe and pay nothing today. Billing starts only after the trial unless you cancel beforehand.
                        </p>
                    </div>

                    <div className="inline-flex w-full rounded-xl border border-white/10 bg-black/20 p-1 sm:w-auto">
                        <button
                            type="button"
                            onClick={() =>
                                setBillingInterval(
                                    'monthly',
                                )
                            }
                            className={[
                                'min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-black transition sm:flex-none',
                                billingInterval ===
                                'monthly'
                                    ? 'bg-lime-400 text-[#071006]'
                                    : 'text-slate-300 hover:bg-white/[0.05]',
                            ].join(' ')}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setBillingInterval(
                                    'annual',
                                )
                            }
                            className={[
                                'min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-black transition sm:flex-none',
                                billingInterval ===
                                'annual'
                                    ? 'bg-lime-400 text-[#071006]'
                                    : 'text-slate-300 hover:bg-white/[0.05]',
                            ].join(' ')}
                        >
                            Annual
                        </button>
                    </div>
                </div>
            </header>

            {billingReturnState ===
                'cancelled' && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
                    Stripe Checkout was cancelled. Nothing has been charged. Choose a plan when you are ready to continue.
                </div>
            )}

            {billingReturnState ===
                'success' &&
                !billingReady && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100">
                    <div className="flex items-center gap-3">
                        {syncingBilling && (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        )}
                        <span>
                            Stripe Checkout completed. TournamentHQ is confirming your subscription and trial status.
                        </span>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100"
                >
                    {errorMessage}
                </div>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
                {PLANS.map((plan) => {
                    const selected =
                        selectedPlan === plan.id
                    const price =
                        getPriceLabel(
                            plan,
                            billingInterval,
                        )

                    return (
                        <article
                            key={plan.id}
                            className={[
                                'relative min-w-0 flex min-h-full flex-col rounded-2xl border p-5 transition sm:p-6',
                                selected
                                    ? 'border-lime-400 bg-lime-400/[0.08] shadow-lg shadow-lime-950/20'
                                    : 'border-white/10 bg-black/15 hover:border-lime-700/60',
                            ].join(' ')}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#071006]">
                                    Most popular
                                </div>
                            )}

                            <div className="flex min-w-0 items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-lime-300">
                                        {plan.eyebrow}
                                    </p>
                                    <div
                                        role="heading"
                                        aria-level={2}
                                        className="mt-1 min-w-0 max-w-full font-black text-white"
                                        style={{
                                            fontSize: 'clamp(1.65rem, 1.8vw, 2rem)',
                                            lineHeight: 1.05,
                                            whiteSpace: 'normal',
                                        }}
                                    >
                                        {plan.name}
                                    </div>
                                </div>

                                <ShieldCheck className="h-6 w-6 text-lime-300" />
                            </div>

                            <div className="mt-6">
                                <div className="flex items-end gap-2">
                                    <strong className="text-4xl font-black tracking-tight text-white">
                                        {price.price}
                                    </strong>
                                    <span className="pb-1 text-sm font-semibold text-slate-400">
                                        {price.cadence}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs font-black text-lime-300">
                                    {price.secondary}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-sky-200">
                                    First {TRIAL_DAYS} days free
                                </p>
                            </div>

                            <p className="mt-5 text-sm leading-6 text-slate-400">
                                {plan.description}
                            </p>

                            <div className="mt-5 flex-1 space-y-3">
                                {plan.monthlyFeatures.map(
                                    (feature) => (
                                        <div
                                            key={feature}
                                            className="flex gap-3 text-sm leading-5 text-slate-200"
                                        >
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                                            <span>
                                                {feature}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={
                                    startingCheckout ||
                                    syncingBilling
                                }
                                onClick={() =>
                                    setSelectedPlan(
                                        plan.id,
                                    )
                                }
                                className={[
                                    'mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50',
                                    selected
                                        ? 'bg-lime-400 text-[#071006]'
                                        : 'border border-white/10 bg-white/[0.03] text-white hover:border-lime-400/50',
                                ].join(' ')}
                            >
                                {selected
                                    ? 'Selected'
                                    : `Select ${plan.name}`}
                            </button>
                        </article>
                    )
                })}

                <article className="min-w-0 flex min-h-full flex-col rounded-2xl border border-white/10 bg-black/15 p-5 sm:p-6">
                    <div className="flex min-w-0 items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                Tailored scale
                            </p>
                            <div
                                role="heading"
                                aria-level={2}
                                className="mt-1 min-w-0 max-w-full font-black text-white"
                                style={{
                                    fontSize: 'clamp(1.65rem, 1.8vw, 2rem)',
                                    lineHeight: 1.05,
                                    whiteSpace: 'normal',
                                }}
                            >
                                Enterprise
                            </div>
                        </div>

                        <CircleDollarSign className="h-6 w-6 text-slate-400" />
                    </div>

                    <div className="mt-6">
                        <strong className="text-4xl font-black tracking-tight text-white">
                            Custom
                        </strong>
                        <p className="mt-2 text-xs font-black text-slate-400">
                            Tailored commercial terms
                        </p>
                    </div>

                    <p className="mt-5 text-sm leading-6 text-slate-400">
                        For leagues, councils, universities, associations and larger sporting organisations requiring tailored scale, governance and implementation support.
                    </p>

                    <div className="mt-5 flex-1 space-y-3">
                        {[
                            'Everything in Professional',
                            'Multi-organisation architecture',
                            'Advanced permissions and governance',
                            'Bespoke branding, limits and workflows',
                            'Migration and implementation support',
                            'Tailored onboarding and support',
                        ].map((feature) => (
                            <div
                                key={feature}
                                className="flex gap-3 text-sm leading-5 text-slate-200"
                            >
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>

                    <a
                        href={`${marketingWebsiteUrl}/#contact`}
                        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-white no-underline transition hover:border-lime-400/50"
                    >
                        Discuss Enterprise
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </article>
            </div>

            <section className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                    <div>
                        <div
                            role="heading"
                            aria-level={3}
                            className="text-sm font-black text-white"
                        >
                            No subscription charge today
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                            Your {TRIAL_DAYS}-day trial starts when Stripe Checkout completes. Stripe securely stores the payment method and automatically attempts the first {selectedDefinition.name} payment after the trial unless you cancel beforehand.
                        </p>
                    </div>
                </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    disabled={
                        startingCheckout ||
                        syncingBilling
                    }
                    onClick={onBack}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <div className="flex flex-col gap-2 sm:items-end">
                    <button
                        type="button"
                        disabled={
                            startingCheckout ||
                            syncingBilling
                        }
                        onClick={() =>
                            void startCheckout()
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {startingCheckout ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Opening secure checkout...
                            </>
                        ) : (
                            <>
                                Start {selectedDefinition.name} trial
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    <span className="text-[11px] font-semibold text-slate-500">
                        {billingInterval === 'annual'
                            ? `${selectedDefinition.name} renews annually after the trial.`
                            : `${selectedDefinition.name} renews monthly after the trial.`}
                    </span>
                </div>
            </div>
        </div>
    )
}
