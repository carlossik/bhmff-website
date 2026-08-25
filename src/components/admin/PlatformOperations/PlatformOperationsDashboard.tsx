import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
    Activity,
    AlertTriangle,
    BadgePoundSterling,
    Building2,
    CheckCircle2,
    CircleAlert,
    Clock3,
    CreditCard,
    Database,
    RefreshCw,
    Search,
    ServerCog,
    ShieldCheck,
    Users,
    Webhook,
    XCircle,
} from 'lucide-react'

import {
    supabase,
} from '../../../lib/supabaseClient'
import {
    captureProductionIssue,
} from '../../../services/productionTelemetry'

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

type CustomerBilling = {
    environment: string
    interval: string | null
    stripeStatus: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    lastStripeEventId: string | null
    lastStripeEventAt: string | null
    updatedAt: string
}

type PlatformCustomer = {
    id: string
    name: string
    slug: string
    status: string
    organisationType: string
    subscriptionPlan: string
    subscriptionStatus: string
    trialEnd: string | null
    maxUsers: number
    maxCompetitions: number
    ownerName: string | null
    ownerEmail: string | null
    ownerPhone: string | null
    createdAt: string
    updatedAt: string
    activeMemberCount: number
    billing: CustomerBilling | null
}

type OperationsEvent = {
    id: string
    source: string
    category: string
    eventType: string
    severity: string
    processingStatus: string
    organisationId: string | null
    organisationName: string | null
    externalId: string | null
    correlationId: string | null
    message: string
    details: Record<string, unknown>
    durationMs: number | null
    occurredAt: string
    resolvedAt: string | null
}

type PlatformOverview = {
    totalOrganisations: number
    activeOrganisations: number
    clubs: number
    competitionOrganisers: number
    starter: number
    professional: number
    enterprise: number
    activeSubscriptions: number
    trialSubscriptions: number
    pastDue: number
    suspended: number
    scheduledCancellations: number
    activeAdministrators: number
    createdLast7Days: number
    createdLast30Days: number
    checkoutPending: number
}

type RevenueSummary = {
    available: boolean
    complete: boolean
    currency: string | null
    mrrMinor: number
    arrMinor: number
    atRiskMrrMinor: number
    atRiskComplete: boolean
    monthlySubscriptions: number
    annualSubscriptions: number
    liveBillingRecords: number
    legacyOrTestBillingRecords: number
}

type PlatformOperationsResponse = {
    generatedAt: string
    queryDurationMs: number
    overview: PlatformOverview
    revenue: RevenueSummary
    health: HealthItem[]
    diagnostics: Diagnostic[]
    customers: PlatformCustomer[]
    events: OperationsEvent[]
}

type OperationsApiResponse =
    PlatformOperationsResponse & {
        error?: unknown
    }

function formatNumber(
    value: number,
): string {
    return new Intl.NumberFormat(
        'en-GB',
    ).format(value)
}

function formatMoney(
    minor: number,
    currency: string | null,
): string {
    if (!currency) {
        return 'Unavailable'
    }

    return new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        },
    ).format(minor / 100)
}

function formatDateTime(
    value: string | null,
): string {
    if (!value) {
        return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    ).format(date)
}

function formatLabel(
    value: string,
): string {
    return value
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ')
}

function healthClasses(
    status: HealthStatus,
): string {
    if (status === 'healthy') {
        return 'border-lime-400/30 bg-lime-400/10 text-lime-200'
    }

    if (status === 'degraded') {
        return 'border-rose-400/30 bg-rose-400/10 text-rose-100'
    }

    if (status === 'warning') {
        return 'border-amber-400/30 bg-amber-400/10 text-amber-100'
    }

    return 'border-slate-500/30 bg-slate-500/10 text-slate-200'
}

function severityClasses(
    severity: string,
): string {
    if (
        severity === 'critical' ||
        severity === 'error'
    ) {
        return 'border-rose-400/30 bg-rose-400/10 text-rose-100'
    }

    if (severity === 'warning') {
        return 'border-amber-400/30 bg-amber-400/10 text-amber-100'
    }

    return 'border-sky-400/30 bg-sky-400/10 text-sky-100'
}

function planClasses(
    plan: string,
): string {
    if (plan === 'professional') {
        return 'border-lime-400/30 bg-lime-400/10 text-lime-200'
    }

    if (plan === 'enterprise') {
        return 'border-violet-400/30 bg-violet-400/10 text-violet-200'
    }

    return 'border-slate-500/30 bg-slate-500/10 text-slate-200'
}

function StatCard({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string
    value: string
    detail?: string
    icon: LucideIcon
}) {
    return (
        <article className="rounded-2xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/10">
                    <Icon className="h-5 w-5 text-lime-300" />
                </div>
                <strong className="text-3xl font-black text-white">
                    {value}
                </strong>
            </div>
            <h4 className="mt-5 text-sm font-black text-white">
                {label}
            </h4>
            {detail && (
                <p className="mt-2 text-xs leading-5 text-slate-400">
                    {detail}
                </p>
            )}
        </article>
    )
}

export function PlatformOperationsDashboard() {
    const [snapshot, setSnapshot] =
        useState<PlatformOperationsResponse | null>(null)
    const [loading, setLoading] =
        useState(true)
    const [error, setError] =
        useState('')
    const [searchTerm, setSearchTerm] =
        useState('')
    const [customerPlan, setCustomerPlan] =
        useState('all')
    const [eventsMode, setEventsMode] =
        useState<'all' | 'failures' | 'stripe' | 'client'>(
            'failures',
        )
    const [selectedCustomerId, setSelectedCustomerId] =
        useState<string | null>(null)

    const loadSnapshot =
        useCallback(async () => {
            setLoading(true)
            setError('')

            try {
                const {
                    data,
                    error: invokeError,
                } = await supabase.functions.invoke<OperationsApiResponse>(
                    'get-platform-operations',
                    {
                        body: {},
                    },
                )

                if (invokeError) {
                    throw invokeError
                }

                if (!data) {
                    throw new Error(
                        'TournamentHQ returned no Platform Operations data.',
                    )
                }

                if (
                    typeof data.error === 'string' &&
                    data.error.trim()
                ) {
                    throw new Error(
                        data.error.trim(),
                    )
                }

                setSnapshot(data)
            } catch (loadError) {
                console.error(
                    'Failed to load Platform Operations:',
                    loadError,
                )
                void captureProductionIssue(
                    'Failed to load Platform Operations',
                    loadError,
                    {
                        module:
                            'Platform Operations',
                    },
                )
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'TournamentHQ could not load Platform Operations.',
                )
            } finally {
                setLoading(false)
            }
        }, [])

    useEffect(() => {
        void loadSnapshot()

        const interval = window.setInterval(
            () => {
                void loadSnapshot()
            },
            60_000,
        )

        return () => {
            window.clearInterval(interval)
        }
    }, [loadSnapshot])

    const filteredCustomers =
        useMemo(() => {
            if (!snapshot) {
                return []
            }

            const query =
                searchTerm.trim().toLowerCase()

            return snapshot.customers.filter(
                (customer) => {
                    if (
                        customerPlan !== 'all' &&
                        customer.subscriptionPlan !==
                            customerPlan
                    ) {
                        return false
                    }

                    if (!query) {
                        return true
                    }

                    return [
                        customer.name,
                        customer.slug,
                        customer.ownerName ?? '',
                        customer.ownerEmail ?? '',
                        customer.organisationType,
                        customer.subscriptionPlan,
                        customer.subscriptionStatus,
                        customer.billing?.stripeStatus ?? '',
                    ].some((value) =>
                        value
                            .toLowerCase()
                            .includes(query),
                    )
                },
            )
        }, [
            customerPlan,
            searchTerm,
            snapshot,
        ])

    const filteredEvents =
        useMemo(() => {
            if (!snapshot) {
                return []
            }

            if (eventsMode === 'failures') {
                return snapshot.events.filter(
                    (event) =>
                        event.processingStatus ===
                            'failed' ||
                        event.severity === 'error' ||
                        event.severity ===
                            'critical' ||
                        event.severity ===
                            'warning',
                )
            }

            if (eventsMode === 'stripe') {
                return snapshot.events.filter(
                    (event) =>
                        event.source ===
                        'stripe_webhook',
                )
            }

            if (eventsMode === 'client') {
                return snapshot.events.filter(
                    (event) =>
                        event.source === 'client',
                )
            }

            return snapshot.events
        }, [eventsMode, snapshot])

    const selectedCustomer =
        useMemo(
            () =>
                snapshot?.customers.find(
                    (customer) =>
                        customer.id ===
                        selectedCustomerId,
                ) ?? null,
            [
                selectedCustomerId,
                snapshot,
            ],
        )

    if (loading && !snapshot) {
        return (
            <section className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] px-6 py-14 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-lime-300" />
                <h3 className="mt-4 text-lg font-black text-white">
                    Loading Platform Operations
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                    Checking customers, billing, Stripe health and production telemetry.
                </p>
            </section>
        )
    }

    if (!snapshot) {
        return (
            <section className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6 text-rose-100">
                <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <h3 className="font-black">
                            Platform Operations unavailable
                        </h3>
                        <p className="mt-2 text-sm">
                            {error ||
                                'The operations snapshot could not be loaded.'}
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                void loadSnapshot()
                            }
                            className="mt-4 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-black"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </section>
        )
    }

    const {
        overview,
        revenue,
    } = snapshot

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-6 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">
                        TournamentHQ Internal Operations
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                        Platform Operations
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Platform-wide customer, revenue, billing-health and production-diagnostics console. This view is restricted to TournamentHQ platform administrators.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        Snapshot {formatDateTime(snapshot.generatedAt)} · API {snapshot.queryDurationMs} ms · auto-refreshes every 60 seconds
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void loadSnapshot()
                    }
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-[#071006] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${
                            loading
                                ? 'animate-spin'
                                : ''
                        }`}
                    />
                    Refresh
                </button>
            </header>

            {error && (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Last refresh warning: {error}
                </div>
            )}

            <section>
                <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-lime-300" />
                    <h3 className="text-lg font-black text-white">
                        Live Overview
                    </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={Building2}
                        label="Customers"
                        value={formatNumber(
                            overview.totalOrganisations,
                        )}
                        detail={`${overview.clubs} clubs · ${overview.competitionOrganisers} competition organisers`}
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Live subscriptions"
                        value={formatNumber(
                            overview.activeSubscriptions,
                        )}
                        detail={`${overview.starter} Starter · ${overview.professional} Professional · ${overview.trialSubscriptions} trial(s) · ${overview.scheduledCancellations} cancellation(s) scheduled`}
                    />
                    <StatCard
                        icon={Users}
                        label="Active administrators"
                        value={formatNumber(
                            overview.activeAdministrators,
                        )}
                        detail={`${overview.createdLast7Days} workspace(s) created in the last 7 days`}
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Billing attention"
                        value={formatNumber(
                            overview.pastDue +
                                overview.suspended +
                                overview.checkoutPending,
                        )}
                        detail={`${overview.pastDue} past due · ${overview.suspended} suspended · ${overview.checkoutPending} checkout pending`}
                    />
                </div>
            </section>

            <section>
                <div className="mb-3 flex items-center gap-2">
                    <BadgePoundSterling className="h-5 w-5 text-lime-300" />
                    <h3 className="text-lg font-black text-white">
                        Subscription Revenue
                    </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={BadgePoundSterling}
                        label="MRR"
                        value={
                            revenue.available
                                ? formatMoney(
                                      revenue.mrrMinor,
                                      revenue.currency,
                                  )
                                : 'Unavailable'
                        }
                        detail={
                            revenue.complete
                                ? 'Production recurring run-rate only.'
                                : 'Some live billing records use an unrecognised price and are excluded.'
                        }
                    />
                    <StatCard
                        icon={BadgePoundSterling}
                        label="ARR"
                        value={
                            revenue.available
                                ? formatMoney(
                                      revenue.arrMinor,
                                      revenue.currency,
                                  )
                                : 'Unavailable'
                        }
                        detail={`${revenue.monthlySubscriptions} monthly · ${revenue.annualSubscriptions} annual subscriptions`}
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="At-risk MRR"
                        value={
                            revenue.available
                                ? formatMoney(
                                      revenue.atRiskMrrMinor,
                                      revenue.currency,
                                  )
                                : 'Unavailable'
                        }
                        detail="Recurring revenue currently associated with past-due or incomplete live billing."
                    />
                    <StatCard
                        icon={ServerCog}
                        label="Billing records"
                        value={formatNumber(
                            revenue.liveBillingRecords,
                        )}
                        detail={`${revenue.legacyOrTestBillingRecords} legacy/test record(s) excluded from production revenue · Starter and Professional live prices included`}
                    />
                </div>
            </section>

            <section>
                <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-lime-300" />
                    <h3 className="text-lg font-black text-white">
                        System Health
                    </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {snapshot.health.map(
                        (item) => {
                            const Icon =
                                item.id === 'database' ||
                                item.id === 'storage'
                                    ? Database
                                    : item.id ===
                                        'stripe-webhook'
                                      ? Webhook
                                      : item.id ===
                                          'stripe'
                                        ? CreditCard
                                        : item.id === 'auth'
                                          ? ShieldCheck
                                          : item.id ===
                                              'edge-functions'
                                            ? ServerCog
                                            : Activity

                            return (
                                <article
                                    key={item.id}
                                    className={`rounded-2xl border p-5 ${healthClasses(
                                        item.status,
                                    )}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <Icon className="h-5 w-5" />
                                        <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                            {item.status}
                                        </span>
                                    </div>
                                    <h4 className="mt-4 font-black">
                                        {item.label}
                                    </h4>
                                    <p className="mt-2 text-xs leading-5 opacity-80">
                                        {item.message}
                                    </p>
                                </article>
                            )
                        },
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white">
                            Reconciliation & Diagnostics
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Automated checks for subscription mismatches, payment problems, legacy/test billing and stale checkout states.
                        </p>
                    </div>
                    <span className="rounded-full border border-[color:var(--thq-admin-border)] bg-black/20 px-3 py-1.5 text-xs font-black text-slate-300">
                        {snapshot.diagnostics.length} finding(s)
                    </span>
                </div>

                {snapshot.diagnostics.length === 0 ? (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-4 text-lime-100">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="text-sm font-semibold">
                            No entitlement or billing reconciliation issues detected.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {snapshot.diagnostics.map(
                            (diagnostic) => (
                                <article
                                    key={diagnostic.id}
                                    className={`rounded-2xl border p-4 ${severityClasses(
                                        diagnostic.severity,
                                    )}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {diagnostic.severity ===
                                        'critical' ? (
                                            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                        ) : (
                                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                        )}
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
                                                {diagnostic.code}
                                            </p>
                                            <h4 className="mt-1 font-black">
                                                {diagnostic.organisationName ??
                                                    'Platform'}
                                            </h4>
                                            <p className="mt-1 text-sm leading-5 opacity-85">
                                                {diagnostic.message}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white">
                            Customer Diagnostics
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Find a customer and inspect entitlement, billing environment, limits and last Stripe reconciliation event.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative min-w-0 sm:w-80">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.currentTarget.value,
                                    )
                                }
                                placeholder="Search customer, owner or status..."
                                className="min-h-11 w-full rounded-xl border border-[color:var(--thq-admin-border)] bg-black/20 py-2 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-lime-400/50"
                            />
                        </label>
                        <select
                            value={customerPlan}
                            onChange={(event) =>
                                setCustomerPlan(
                                    event.currentTarget.value,
                                )
                            }
                            className="min-h-11 rounded-xl border border-[color:var(--thq-admin-border)] bg-[#071006] px-3 text-sm font-semibold text-white"
                        >
                            <option value="all">
                                All plans
                            </option>
                            <option value="starter">
                                Starter
                            </option>
                            <option value="professional">
                                Professional
                            </option>
                            <option value="enterprise">
                                Enterprise
                            </option>
                        </select>
                    </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-[color:var(--thq-admin-border)]">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-black/25 text-xs uppercase tracking-[0.1em] text-slate-500">
                            <tr>
                                <th className="px-4 py-3">
                                    Customer
                                </th>
                                <th className="px-4 py-3">
                                    Type
                                </th>
                                <th className="px-4 py-3">
                                    Plan
                                </th>
                                <th className="px-4 py-3">
                                    Billing
                                </th>
                                <th className="px-4 py-3">
                                    Admins
                                </th>
                                <th className="px-4 py-3">
                                    Last update
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-lime-900/30">
                            {filteredCustomers.map(
                                (customer) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() =>
                                            setSelectedCustomerId(
                                                customer.id,
                                            )
                                        }
                                        className="cursor-pointer bg-black/5 text-slate-300 transition hover:bg-lime-400/5"
                                    >
                                        <td className="px-4 py-4">
                                            <strong className="block text-white">
                                                {customer.name}
                                            </strong>
                                            <span className="mt-1 block text-xs text-slate-500">
                                                {customer.ownerEmail ??
                                                    customer.slug}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {formatLabel(
                                                customer.organisationType,
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${planClasses(
                                                        customer.subscriptionPlan,
                                                    )}`}
                                                >
                                                    {customer.subscriptionPlan}
                                                </span>
                                                <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                                                    {customer.subscriptionStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {customer.billing ? (
                                                <>
                                                    <strong className="block text-white">
                                                        {customer.billing.stripeStatus ??
                                                            'Unknown'}
                                                    </strong>
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        {customer.billing.environment} · {customer.billing.interval ??
                                                            '—'}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-500">
                                                    No billing record
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-white">
                                            {customer.activeMemberCount}
                                        </td>
                                        <td className="px-4 py-4 text-xs text-slate-400">
                                            {formatDateTime(
                                                customer.billing?.updatedAt ??
                                                    customer.updatedAt,
                                            )}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredCustomers.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                        No customers match the current filters.
                    </p>
                )}

                {selectedCustomer && (
                    <div className="mt-5 rounded-2xl border border-lime-400/20 bg-black/20 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-300">
                                    Customer diagnostic
                                </p>
                                <h4 className="mt-1 text-xl font-black text-white">
                                    {selectedCustomer.name}
                                </h4>
                                <p className="mt-1 text-sm text-slate-400">
                                    {selectedCustomer.ownerName ??
                                        'Owner name unavailable'} · {selectedCustomer.ownerEmail ??
                                        'Owner email unavailable'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedCustomerId(
                                        null,
                                    )
                                }
                                className="text-sm font-bold text-slate-400 hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                [
                                    'Workspace',
                                    `${formatLabel(
                                        selectedCustomer.organisationType,
                                    )} · ${formatLabel(
                                        selectedCustomer.status,
                                    )}`,
                                ],
                                [
                                    'Entitlement',
                                    `${formatLabel(
                                        selectedCustomer.subscriptionPlan,
                                    )} · ${formatLabel(
                                        selectedCustomer.subscriptionStatus,
                                    )}`,
                                ],
                                [
                                    'Limits',
                                    `${selectedCustomer.maxUsers} users · ${selectedCustomer.maxCompetitions} competitions`,
                                ],
                                [
                                    'Trial ends',
                                    formatDateTime(
                                        selectedCustomer.trialEnd,
                                    ),
                                ],
                                [
                                    'Created',
                                    formatDateTime(
                                        selectedCustomer.createdAt,
                                    ),
                                ],
                                [
                                    'Stripe environment',
                                    selectedCustomer.billing?.environment ??
                                        'No billing',
                                ],
                                [
                                    'Billing period ends',
                                    formatDateTime(
                                        selectedCustomer.billing?.currentPeriodEnd ??
                                            null,
                                    ),
                                ],
                                [
                                    'Cancellation scheduled',
                                    selectedCustomer.billing?.cancelAtPeriodEnd
                                        ? 'Yes'
                                        : 'No',
                                ],
                                [
                                    'Last Stripe event',
                                    selectedCustomer.billing?.lastStripeEventId ??
                                        'Not recorded yet',
                                ],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-lime-900/30 bg-[#071006] p-4"
                                >
                                    <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                                        {label}
                                    </dt>
                                    <dd className="mt-2 break-words text-sm font-bold text-white">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-[color:var(--thq-admin-border)] bg-[var(--thq-admin-surface)] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white">
                            Production Logs & Failures
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Sanitised Stripe webhook and customer-browser telemetry for investigating live incidents reported by customers.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                ['failures', 'Attention'],
                                ['stripe', 'Stripe'],
                                ['client', 'Client'],
                                ['all', 'All'],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    setEventsMode(value)
                                }
                                className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                                    eventsMode === value
                                        ? 'border-lime-400 bg-lime-400 text-[#071006]'
                                        : 'border-[color:var(--thq-admin-border)] bg-black/20 text-slate-300 hover:border-lime-400/40'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {filteredEvents
                        .slice(0, 75)
                        .map((event) => (
                            <article
                                key={event.id}
                                className="rounded-2xl border border-lime-900/30 bg-black/15 p-4"
                            >
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${severityClasses(
                                                    event.severity,
                                                )}`}
                                            >
                                                {event.severity}
                                            </span>
                                            <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                                                {event.source}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {event.eventType}
                                            </span>
                                        </div>
                                        <h4 className="mt-3 font-black text-white">
                                            {event.organisationName ??
                                                'Platform / unmatched event'}
                                        </h4>
                                        <p className="mt-1 text-sm leading-6 text-slate-300">
                                            {event.message}
                                        </p>
                                        {(event.correlationId ||
                                            event.externalId) && (
                                            <p className="mt-2 break-all font-mono text-[11px] text-slate-600">
                                                {event.correlationId
                                                    ? `Correlation ${event.correlationId}`
                                                    : `External ${event.externalId}`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right text-xs text-slate-500">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            {formatDateTime(
                                                event.occurredAt,
                                            )}
                                        </div>
                                        {event.durationMs !==
                                            null && (
                                            <p className="mt-1">
                                                {event.durationMs} ms
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {Object.keys(event.details).length > 0 && (
                                    <details className="mt-3 rounded-xl border border-slate-700/40 bg-black/20 px-3 py-2">
                                        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.1em] text-slate-500 hover:text-slate-300">
                                            Technical details
                                        </summary>
                                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-400">
                                            {JSON.stringify(
                                                event.details,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </details>
                                )}
                            </article>
                        ))}

                    {filteredEvents.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-lime-900/40 px-5 py-10 text-center">
                            <CheckCircle2 className="mx-auto h-7 w-7 text-lime-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-300">
                                No operational events match this filter.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-sky-400/20 bg-sky-400/5 p-5">
                <div className="flex items-start gap-3">
                    <ServerCog className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                    <div>
                        <h3 className="font-black text-sky-100">
                            Onboarding telemetry foundation
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-sky-100/75">
                            This release establishes the production event store used by Platform Operations. Historical pricing-page views and abandoned signup steps cannot be reconstructed reliably. The next instrumentation layer can record plan selection, signup start, organisation creation, billing reached, checkout start and paid conversion from this point forward.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
