import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    Check,
    CreditCard,
    Loader2,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'

import type {
    Organisation,
} from '../admin/Organisations/organisationTypes'
import {
    getOrganisation,
} from '../admin/Organisations/organisationService'
import {
    REQUESTED_PLAN_STORAGE_KEY,
    getSubscriptionPlan,
    isSelfServiceSubscriptionPlan,
    type BillingInterval,
    type SelfServiceSubscriptionPlan,
} from '../../config/subscriptionPlans'
import {
    billingService,
} from '../../services/billingService'
import {
    SetupWizardHeader,
} from '../../pages/onboarding/SetupWizardHeader'
import {
    SetupWizardNavigation,
} from '../../pages/onboarding/SetupWizardNavigation'

type BillingStepProps = {
    organisationId: string | null
    onBack: () => void
    onContinue: () => void
}

type Notice = {
    tone: 'success' | 'warning' | 'error'
    message: string
}

const starterPlan =
    getSubscriptionPlan('starter')
const professionalPlan =
    getSubscriptionPlan('professional')
const enterprisePlan =
    getSubscriptionPlan('enterprise')

function readRequestedPlan():
    SelfServiceSubscriptionPlan {
    if (typeof window === 'undefined') {
        return 'starter'
    }

    const stored =
        window.localStorage.getItem(
            REQUESTED_PLAN_STORAGE_KEY,
        )

    return isSelfServiceSubscriptionPlan(stored)
        ? stored
        : 'starter'
}

function clearRequestedPlan(): void {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.removeItem(
        REQUESTED_PLAN_STORAGE_KEY,
    )
}

function getBillingReturnState():
    | 'success'
    | 'cancelled'
    | null {
    if (typeof window === 'undefined') {
        return null
    }

    const value =
        new URLSearchParams(
            window.location.search,
        ).get('billing')

    return value === 'success' ||
        value === 'cancelled'
        ? value
        : null
}

function clearBillingReturnQuery(): void {
    if (typeof window === 'undefined') {
        return
    }

    const url = new URL(
        window.location.href,
    )

    url.searchParams.delete('billing')
    url.searchParams.delete('session_id')

    window.history.replaceState(
        {},
        '',
        `${url.pathname}${url.search}${url.hash}`,
    )
}

function planIsReady(
    organisation: Organisation | null,
    selectedPlan: SelfServiceSubscriptionPlan,
): boolean {
    if (!organisation) {
        return false
    }

    return (
        organisation.subscription_plan ===
            selectedPlan &&
        organisation.subscription_status ===
            'active'
    )
}

function planCardClassName(
    selected: boolean,
    featured: boolean,
): string {
    return [
        'relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border p-6 transition',
        selected
            ? 'border-lime-400 bg-lime-400/[0.08] shadow-lg shadow-lime-950/20'
            : featured
              ? 'border-lime-700/60 bg-[#0d1b0d]'
              : 'border-[color:var(--organisation-border)] bg-[var(--organisation-background)]',
    ].join(' ')
}

export function BillingStep({
    organisationId,
    onBack,
    onContinue,
}: BillingStepProps) {
    const [organisation, setOrganisation] =
        useState<Organisation | null>(null)
    const [selectedPlan, setSelectedPlan] =
        useState<SelfServiceSubscriptionPlan>(
            readRequestedPlan,
        )
    const [billingInterval, setBillingInterval] =
        useState<BillingInterval>('monthly')
    const [loading, setLoading] =
        useState(true)
    const [submitting, setSubmitting] =
        useState(false)
    const [notice, setNotice] =
        useState<Notice | null>(null)

    const ready = useMemo(
        () =>
            planIsReady(
                organisation,
                selectedPlan,
            ),
        [organisation, selectedPlan],
    )

    useEffect(() => {
        let mounted = true

        async function loadBillingState() {
            if (!organisationId) {
                if (mounted) {
                    setNotice({
                        tone: 'error',
                        message:
                            'Create your organisation before choosing a TournamentHQ plan.',
                    })
                    setLoading(false)
                }
                return
            }

            setLoading(true)

            try {
                const returnState =
                    getBillingReturnState()

                if (
                    returnState ===
                    'cancelled'
                ) {
                    setNotice({
                        tone: 'warning',
                        message:
                            'Checkout was cancelled. No paid subscription has been activated.',
                    })
                }

                const attempts =
                    returnState === 'success'
                        ? 8
                        : 1

                let latestOrganisation:
                    Organisation | null = null

                for (
                    let attempt = 0;
                    attempt < attempts;
                    attempt += 1
                ) {
                    latestOrganisation =
                        await getOrganisation(
                            organisationId,
                        )

                    if (
                        !mounted ||
                        !latestOrganisation
                    ) {
                        break
                    }

                    if (
                        latestOrganisation.subscription_plan ===
                            'professional' &&
                        latestOrganisation.subscription_status ===
                            'active'
                    ) {
                        break
                    }

                    if (
                        returnState ===
                            'success' &&
                        attempt < attempts - 1
                    ) {
                        await new Promise<void>(
                            (resolve) => {
                                window.setTimeout(
                                    resolve,
                                    900,
                                )
                            },
                        )
                    }
                }

                if (!mounted) {
                    return
                }

                setOrganisation(
                    latestOrganisation,
                )

                if (
                    latestOrganisation
                        ?.subscription_plan ===
                        'professional'
                ) {
                    setSelectedPlan(
                        'professional',
                    )
                } else if (
                    latestOrganisation
                        ?.subscription_plan ===
                        'starter'
                ) {
                    setSelectedPlan(
                        readRequestedPlan(),
                    )
                }

                if (
                    returnState === 'success'
                ) {
                    if (
                        latestOrganisation
                            ?.subscription_plan ===
                            'professional' &&
                        latestOrganisation
                            .subscription_status ===
                            'active'
                    ) {
                        clearRequestedPlan()
                        setNotice({
                            tone: 'success',
                            message:
                                'Professional is active. Your TournamentHQ billing setup is complete.',
                        })
                    } else {
                        setNotice({
                            tone: 'warning',
                            message:
                                'Payment was received and TournamentHQ is still confirming the subscription. Refresh this step in a few seconds if it does not update automatically.',
                        })
                    }
                }

                if (returnState) {
                    clearBillingReturnQuery()
                }
            } catch (error) {
                if (!mounted) {
                    return
                }

                setNotice({
                    tone: 'error',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unable to load billing information.',
                })
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        void loadBillingState()

        return () => {
            mounted = false
        }
    }, [organisationId])

    async function startSelectedPlan() {
        if (!organisationId) {
            return
        }

        setSubmitting(true)
        setNotice(null)

        try {
            const response =
                await billingService.startBilling({
                    organisationId,
                    plan: selectedPlan,
                    billingInterval,
                })

            if (response.kind === 'checkout') {
                window.location.assign(
                    response.url,
                )
                return
            }

            const updated =
                await getOrganisation(
                    organisationId,
                )

            setOrganisation(updated)
            clearRequestedPlan()
            setNotice({
                tone: 'success',
                message:
                    'Starter is active. Continue with your TournamentHQ setup whenever you are ready.',
            })
        } catch (error) {
            setNotice({
                tone: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unable to activate the selected plan.',
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="grid min-h-[20rem] place-items-center text-center">
                <div>
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--organisation-accent,#84cc16)]" />
                    <p className="mt-4 text-sm text-[var(--organisation-muted)]">
                        Loading plans and billing...
                    </p>
                </div>
            </div>
        )
    }

    const activePlan =
        organisation?.subscription_plan
    const activeStatus =
        organisation?.subscription_status

    return (
        <div>
            <SetupWizardHeader
                title="Choose your TournamentHQ plan"
                description="Start free or unlock the Professional workspace. Paid subscriptions are completed securely through Stripe."
            />

            {notice && (
                <div
                    role={
                        notice.tone === 'error'
                            ? 'alert'
                            : 'status'
                    }
                    className={[
                        'mt-6 rounded-2xl border px-5 py-4 text-sm font-semibold',
                        notice.tone === 'success'
                            ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-200'
                            : notice.tone === 'warning'
                              ? 'border-amber-700/50 bg-amber-500/10 text-amber-100'
                              : 'border-red-800/50 bg-red-500/10 text-red-200',
                    ].join(' ')}
                >
                    {notice.message}
                </div>
            )}

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
                <article
                    className={planCardClassName(
                        selectedPlan === 'starter',
                        starterPlan.featured,
                    )}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-400">
                                Start free
                            </p>
                            <h2 className="mt-2 break-words !text-[28px] font-black !leading-[1.05] tracking-[-0.02em] text-white">
                                {starterPlan.name}
                            </h2>
                        </div>

                        <ShieldCheck className="h-6 w-6 text-lime-400" />
                    </div>

                    <div className="mt-5">
                        <strong className="text-4xl font-black text-white">
                            £0
                        </strong>
                        <span className="ml-2 text-sm text-slate-400">
                            forever
                        </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        {starterPlan.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                        {starterPlan.features.map(
                            (feature) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-2 text-sm text-slate-200"
                                >
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                                    <span>{feature}</span>
                                </div>
                            ),
                        )}
                    </div>

                    <button
                        type="button"
                        disabled={
                            submitting ||
                            activePlan ===
                                'professional'
                        }
                        onClick={() =>
                            setSelectedPlan(
                                'starter',
                            )
                        }
                        className="mt-auto pt-7 text-left text-sm font-black text-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {selectedPlan === 'starter'
                            ? '✓ Selected'
                            : 'Select Starter'}
                    </button>
                </article>

                <article
                    className={planCardClassName(
                        selectedPlan ===
                            'professional',
                        professionalPlan.featured,
                    )}
                >
                    <div className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-lime-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#071006]">
                        Most popular
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-400">
                                Full platform
                            </p>
                            <h2 className="mt-2 break-words !text-[28px] font-black !leading-[1.05] tracking-[-0.02em] text-white">
                                {professionalPlan.name}
                            </h2>
                        </div>

                        <Sparkles className="h-6 w-6 text-lime-400" />
                    </div>

                    <div className="mt-5">
                        <strong className="text-4xl font-black text-white">
                            £39
                        </strong>
                        <span className="ml-2 text-sm text-slate-400">
                            / month
                        </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-lime-300">
                        Or £390 annually
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        {professionalPlan.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                        {professionalPlan.features.map(
                            (feature) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-2 text-sm text-slate-200"
                                >
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                                    <span>{feature}</span>
                                </div>
                            ),
                        )}
                    </div>

                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                            setSelectedPlan(
                                'professional',
                            )
                        }
                        className="mt-auto pt-7 text-left text-sm font-black text-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {selectedPlan ===
                        'professional'
                            ? '✓ Selected'
                            : 'Select Professional'}
                    </button>
                </article>

                <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                Tailored scale
                            </p>
                            <h2 className="mt-2 break-words !text-[28px] font-black !leading-[1.05] tracking-[-0.02em] text-white">
                                {enterprisePlan.name}
                            </h2>
                        </div>

                        <CreditCard className="h-6 w-6 text-slate-400" />
                    </div>

                    <div className="mt-5">
                        <strong className="text-3xl font-black text-white">
                            Custom
                        </strong>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        {enterprisePlan.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                        {enterprisePlan.features.map(
                            (feature) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-2 text-sm text-slate-200"
                                >
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <span>{feature}</span>
                                </div>
                            ),
                        )}
                    </div>

                    <a
                        href="mailto:hello@tournamenthq.co.uk?subject=TournamentHQ%20Enterprise"
                        className="mt-auto pt-7 text-sm font-black text-lime-300 no-underline"
                    >
                        Discuss Enterprise →
                    </a>
                </article>
            </div>

            {selectedPlan === 'professional' &&
                !(
                    activePlan ===
                        'professional' &&
                    activeStatus === 'active'
                ) && (
                    <section className="mt-6 rounded-2xl border border-[color:var(--organisation-border)] bg-black/20 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-400">
                            Billing frequency
                        </p>

                        <div className="mt-4 inline-flex rounded-xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-1">
                            {(
                                [
                                    'monthly',
                                    'annual',
                                ] as const
                            ).map(
                                (interval) => (
                                    <button
                                        key={interval}
                                        type="button"
                                        disabled={submitting}
                                        onClick={() =>
                                            setBillingInterval(
                                                interval,
                                            )
                                        }
                                        className={[
                                            'rounded-lg px-4 py-2 text-sm font-black capitalize transition',
                                            billingInterval ===
                                            interval
                                                ? 'bg-lime-400 text-[#071006]'
                                                : 'text-slate-300 hover:text-white',
                                        ].join(' ')}
                                    >
                                        {interval}
                                    </button>
                                ),
                            )}
                        </div>

                        {billingInterval ===
                            'annual' && (
                            <p className="mt-3 text-sm font-semibold text-emerald-300">
                                £390/year — save £78 compared with monthly billing.
                            </p>
                        )}
                    </section>
                )}

            {!ready && (
                <div className="mt-6">
                    <button
                        type="button"
                        disabled={
                            submitting ||
                            !organisationId
                        }
                        onClick={() =>
                            void startSelectedPlan()
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-sm font-black text-[#071006] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}

                        {selectedPlan ===
                        'professional'
                            ? 'Continue to secure checkout'
                            : 'Activate Starter'}
                    </button>
                </div>
            )}

            {ready && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-700/40 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-200">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    <span>
                        {activePlan ===
                        'professional'
                            ? 'Professional is active for this organisation.'
                            : 'Starter is active for this organisation.'}
                    </span>
                </div>
            )}

            <div className="mt-8">
                {ready ? (
                    <SetupWizardNavigation
                        canGoBack
                        canGoForward
                        onBack={onBack}
                        onNext={onContinue}
                        nextLabel="Continue to branding"
                    />
                ) : (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onBack}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-black/10 px-5 py-2.5 text-sm font-black text-slate-200 transition hover:border-lime-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ← Back
                    </button>
                )}
            </div>
        </div>
    )
}
