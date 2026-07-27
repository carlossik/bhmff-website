import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    Activity,
    ArrowRight,
    BrainCircuit,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Gauge,
    Layers3,
    Loader2,
    MapPin,
    ShieldAlert,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    WandSparkles,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'

import { TournamentAnalysisService } from '../../../services/tournamentAnalysisService'

import type {
    TournamentAnalysisCheck,
    TournamentAnalysisRecommendation,
    TournamentAnalysisReport,
    TournamentAnalysisWarning,
} from '../../../types/tournamentAnalysis'

type IconComponent = typeof Users

type DirectorMetricProps = {
    label: string
    value: string | number
    icon: IconComponent
    helper?: string
    accent?: 'lime' | 'sky' | 'violet' | 'amber'
}

type StatusIconProps = {
    status: TournamentAnalysisCheck['status']
}

type SectionHeaderProps = {
    eyebrow: string
    title: string
    description?: string
    icon: IconComponent
    accent?: 'lime' | 'sky' | 'violet' | 'red'
}

type PriorityStyle = {
    badge: string
    dot: string
}

const metricAccentStyles = {
    lime: {
        glow: 'from-lime-400/20 via-lime-400/5 to-transparent',
        iconShell: 'border-lime-400/20 bg-lime-400/10',
        icon: 'text-lime-300',
    },
    sky: {
        glow: 'from-sky-400/20 via-sky-400/5 to-transparent',
        iconShell: 'border-sky-400/20 bg-sky-400/10',
        icon: 'text-sky-300',
    },
    violet: {
        glow: 'from-violet-400/20 via-violet-400/5 to-transparent',
        iconShell: 'border-violet-400/20 bg-violet-400/10',
        icon: 'text-violet-300',
    },
    amber: {
        glow: 'from-amber-400/20 via-amber-400/5 to-transparent',
        iconShell: 'border-amber-400/20 bg-amber-400/10',
        icon: 'text-amber-300',
    },
}

const sectionAccentStyles = {
    lime: {
        iconShell: 'border-lime-400/20 bg-lime-400/10',
        icon: 'text-lime-300',
        eyebrow: 'text-lime-300',
    },
    sky: {
        iconShell: 'border-sky-400/20 bg-sky-400/10',
        icon: 'text-sky-300',
        eyebrow: 'text-sky-300',
    },
    violet: {
        iconShell: 'border-violet-400/20 bg-violet-400/10',
        icon: 'text-violet-300',
        eyebrow: 'text-violet-300',
    },
    red: {
        iconShell: 'border-red-400/20 bg-red-400/10',
        icon: 'text-red-300',
        eyebrow: 'text-red-300',
    },
}

function DirectorMetric({
                            label,
                            value,
                            icon: Icon,
                            helper,
                            accent = 'lime',
                        }: DirectorMetricProps) {
    const accentStyle = metricAccentStyles[accent]

    return (
        <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]">
            <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accentStyle.glow}`}
            />

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {label}
                    </p>

                    <p className="mt-3 break-words text-2xl font-bold tracking-tight text-white">
                        {value}
                    </p>

                    {helper && (
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            {helper}
                        </p>
                    )}
                </div>

                <div
                    className={`shrink-0 rounded-2xl border p-3 ${accentStyle.iconShell}`}
                >
                    <Icon className={`h-5 w-5 ${accentStyle.icon}`} />
                </div>
            </div>
        </article>
    )
}

function SectionHeader({
                           eyebrow,
                           title,
                           description,
                           icon: Icon,
                           accent = 'lime',
                       }: SectionHeaderProps) {
    const accentStyle = sectionAccentStyles[accent]

    return (
        <div className="flex items-start gap-4">
            <div
                className={`rounded-2xl border p-3 ${accentStyle.iconShell}`}
            >
                <Icon className={`h-5 w-5 ${accentStyle.icon}`} />
            </div>

            <div>
                <p
                    className={`text-xs font-semibold uppercase tracking-[0.2em] ${accentStyle.eyebrow}`}
                >
                    {eyebrow}
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    {title}
                </h2>

                {description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                        {description}
                    </p>
                )}
            </div>
        </div>
    )
}

function scoreColour(score: number) {
    if (score >= 90) {
        return {
            ring: 'border-lime-400/40',
            text: 'text-lime-300',
            bg: 'from-lime-400/15 via-lime-400/5 to-transparent',
            progress: 'bg-lime-400',
            badge: 'border-lime-400/25 bg-lime-400/10 text-lime-200',
        }
    }

    if (score >= 70) {
        return {
            ring: 'border-amber-400/40',
            text: 'text-amber-300',
            bg: 'from-amber-400/15 via-amber-400/5 to-transparent',
            progress: 'bg-amber-400',
            badge: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
        }
    }

    return {
        ring: 'border-red-400/40',
        text: 'text-red-300',
        bg: 'from-red-400/15 via-red-400/5 to-transparent',
        progress: 'bg-red-400',
        badge: 'border-red-400/25 bg-red-400/10 text-red-200',
    }
}

function recommendationPriorityStyle(
    priority: TournamentAnalysisRecommendation['priority']
): PriorityStyle {
    if (priority === 'high') {
        return {
            badge: 'border-red-400/25 bg-red-400/10 text-red-200',
            dot: 'bg-red-400',
        }
    }

    if (priority === 'medium') {
        return {
            badge: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
            dot: 'bg-amber-400',
        }
    }

    return {
        badge: 'border-lime-400/25 bg-lime-400/10 text-lime-200',
        dot: 'bg-lime-400',
    }
}

function StatusIcon({
                        status,
                    }: StatusIconProps) {
    switch (status) {
        case 'ready':
            return (
                <div className="rounded-xl border border-lime-400/20 bg-lime-400/10 p-2">
                    <CheckCircle2 className="h-4 w-4 text-lime-300" />
                </div>
            )

        case 'warning':
            return (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2">
                    <CircleAlert className="h-4 w-4 text-amber-300" />
                </div>
            )

        case 'blocked':
            return (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-2">
                    <ShieldAlert className="h-4 w-4 text-red-300" />
                </div>
            )

        default:
            return (
                <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2">
                    <Clock3 className="h-4 w-4 text-sky-300" />
                </div>
            )
    }
}

function openAdminModule(moduleName: string) {
    const normalise = (value: string | null) =>
        value
            ?.replace(/\s+/g, ' ')
            .trim()
            .toLowerCase() ?? ''

    const targetName =
        normalise(moduleName)

    const targetButton =
        Array.from(
            document.querySelectorAll<HTMLButtonElement>(
                'button'
            )
        ).find(
            (button) =>
                normalise(button.textContent) ===
                targetName
        )

    if (!targetButton) {
        console.error(
            `Admin module button not found: ${moduleName}`
        )
        return
    }

    targetButton.focus()
    targetButton.click()

    window.requestAnimationFrame(() => {
        document
            .querySelector('.adminWorkspace')
            ?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
    })
}

export function AITournamentDirector() {
    const { currentOrganisation } =
        useOrganisation()

    const { currentCompetition } =
        useCompetition()

    const [loading, setLoading] =
        useState(false)

    const [report, setReport] =
        useState<TournamentAnalysisReport | null>(
            null
        )

    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        if (!currentOrganisation) {
            return
        }

        const load = async () => {
            setLoading(true)
            setError(null)

            try {
                const analysis =
                    await TournamentAnalysisService.analyseTournament(
                        {
                            organisationId:
                            currentOrganisation.id,
                            organisationName:
                            currentOrganisation.name,
                            competitionId:
                                currentCompetition?.id ??
                                null,
                        }
                    )

                setReport(analysis)
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Unable to analyse tournament.'
                )
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [
        currentOrganisation,
        currentCompetition,
    ])

    const scoreStyle = useMemo(
        () =>
            scoreColour(
                report?.summary.readinessScore ??
                0
            ),
        [report]
    )

    if (loading) {
        return (
            <div className="relative flex min-h-[620px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#07100a]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
                    <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:36px_36px]" />
                </div>

                <div className="relative flex max-w-md flex-col items-center px-6 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-lime-400/20 blur-2xl" />

                        <div className="relative rounded-3xl border border-lime-400/20 bg-lime-400/10 p-5 shadow-2xl">
                            <Loader2 className="h-12 w-12 animate-spin text-lime-300" />
                        </div>
                    </div>

                    <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-lime-300">
                        AI Analysis In Progress
                    </p>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                        Analysing tournament readiness
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-slate-400">
                        Reviewing competition structure, team allocation,
                        venue coverage and fixture-generation dependencies.
                    </p>

                    <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-lime-400 via-emerald-300 to-lime-400" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="relative overflow-hidden rounded-[2rem] border border-red-400/20 bg-[#13090b] p-8 shadow-[0_24px_80px_-40px_rgba(239,68,68,0.55)]">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

                <div className="relative flex items-start gap-4">
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
                        <ShieldAlert className="h-6 w-6 text-red-300" />
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                            Analysis Failed
                        </p>

                        <h2 className="mt-1 text-xl font-semibold text-white">
                            Tournament intelligence is unavailable
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-7 text-red-100/80">
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!report) {
        return null
    }

    const summary = report.summary
    const snapshot = report.snapshot

    const readyChecks = report.checks.filter(
        (check) => check.status === 'ready'
    ).length

    const totalChecks = report.checks.length

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07100a] p-6 shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)] sm:p-8 xl:p-10">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
                    <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/50 to-transparent" />
                </div>

                <div className="relative">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Intelligent Tournament Planning
                        </div>

                        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="shrink-0 rounded-3xl border border-lime-400/20 bg-gradient-to-br from-lime-400/15 to-emerald-400/5 p-4 shadow-[0_18px_50px_-25px_rgba(163,230,53,0.7)]">
                                <BrainCircuit className="h-10 w-10 text-lime-300" />
                            </div>

                            <div>
                                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl">
                                    AI Tournament Director
                                </h1>

                                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                                    Executive intelligence for tournament
                                    readiness, operational risk and fixture
                                    generation. Review the current configuration,
                                    prioritise corrective actions and move into
                                    scheduling with confidence.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                                <Building2 className="h-4 w-4 text-lime-300" />
                                {snapshot.organisationName}
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                                <CalendarDays className="h-4 w-4 text-sky-300" />
                                {snapshot.competitionName ?? 'No competition selected'}
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
                                <Activity className="h-4 w-4 text-violet-300" />
                                {readyChecks} of {totalChecks} checks ready
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DirectorMetric
                    label="Organisation"
                    value={snapshot.organisationName}
                    icon={Building2}
                    helper="Active tenant context"
                    accent="lime"
                />

                <DirectorMetric
                    label="Competition"
                    value={
                        snapshot.competitionName ??
                        'Not Selected'
                    }
                    icon={CalendarDays}
                    helper="Current planning scope"
                    accent="sky"
                />

                <DirectorMetric
                    label="Competition Teams"
                    value={snapshot.competitionTeamCount}
                    icon={Users}
                    helper="Teams available for scheduling"
                    accent="violet"
                />

                <DirectorMetric
                    label="Venues"
                    value={snapshot.venueCount}
                    icon={MapPin}
                    helper="Registered delivery locations"
                    accent="amber"
                />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                <div className="rounded-[2rem] border border-white/10 bg-[#0a120d] p-6 shadow-[0_24px_80px_-45px_rgba(0,0,0,0.95)] sm:p-7">
                    <SectionHeader
                        eyebrow="Operational Intelligence"
                        title="Live Analysis"
                        description="Real-time validation of the tournament configuration and fixture-generation prerequisites."
                        icon={Activity}
                        accent="lime"
                    />

                    <div className="mt-7 space-y-3">
                        {report.checks.map((check) => (
                            <article
                                key={check.id}
                                className="group flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 transition duration-300 hover:border-white/15 hover:bg-white/[0.055]"
                            >
                                <StatusIcon
                                    status={check.status}
                                />

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="font-semibold text-white">
                                            {check.title}
                                        </p>

                                        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            {check.status}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        {check.description}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-red-400/15 bg-[#100c0d] p-6 shadow-[0_24px_80px_-45px_rgba(239,68,68,0.35)] sm:p-7">
                    <SectionHeader
                        eyebrow="Risk Register"
                        title="Blocking Issues"
                        description="Critical conditions that must be resolved before automated scheduling can proceed."
                        icon={ShieldAlert}
                        accent="red"
                    />

                    <div className="mt-7 space-y-3">
                        {report.warnings.length === 0 && (
                            <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.08] p-5">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />

                                    <div>
                                        <p className="font-semibold text-lime-200">
                                            No blocking issues detected
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-lime-100/60">
                                            The current configuration has no
                                            critical blockers.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {report.warnings.map(
                            (
                                warning: TournamentAnalysisWarning
                            ) => (
                                <article
                                    key={warning.id}
                                    className="rounded-2xl border border-red-400/15 bg-red-400/[0.055] p-5"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-xl border border-red-400/20 bg-red-400/10 p-2">
                                            <ShieldAlert className="h-4 w-4 text-red-300" />
                                        </div>

                                        <div>
                                            <p className="font-semibold text-red-200">
                                                {warning.title}
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-slate-300">
                                                {warning.message}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            )
                        )}

                        <article
                            className={`rounded-2xl border ${scoreStyle.ring} bg-gradient-to-br ${scoreStyle.bg} p-5`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                                        <Gauge className={`h-5 w-5 ${scoreStyle.text}`} />
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Tournament Readiness
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Current operational health
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className={`text-3xl font-black tracking-tight ${scoreStyle.text}`}>
                                        {summary.readinessScore}%
                                    </p>

                                    <span
                                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${scoreStyle.badge}`}
                                    >
                                        {summary.readyToGenerateFixtures
                                            ? 'Ready'
                                            : 'Action required'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/30">
                                <div
                                    className={`h-full rounded-full ${scoreStyle.progress}`}
                                    style={{
                                        width: `${Math.min(
                                            Math.max(
                                                summary.readinessScore,
                                                0
                                            ),
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                        Blocking
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-white">
                                        {summary.blockingIssueCount}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                        Fixtures
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-white">
                                        {snapshot.fixtureCount}
                                    </p>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#0a120d] p-6 shadow-[0_24px_80px_-45px_rgba(0,0,0,0.95)] sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeader
                        eyebrow="AI Advisory"
                        title="Executive Recommendations"
                        description="Prioritised actions generated from the current tournament configuration and readiness profile."
                        icon={WandSparkles}
                        accent="violet"
                    />

                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-400">
                        <TrendingUp className="h-4 w-4 text-violet-300" />
                        {report.recommendations.length} recommendation
                        {report.recommendations.length === 1 ? '' : 's'}
                    </div>
                </div>

                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                    {report.recommendations.length === 0 && (
                        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.08] p-5 lg:col-span-2">
                            <div className="flex items-start gap-3">
                                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />

                                <div>
                                    <p className="font-semibold text-lime-200">
                                        No recommendations required
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-lime-100/60">
                                        Your tournament configuration is currently
                                        aligned with the fixture-generation
                                        requirements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {report.recommendations.map(
                        (
                            recommendation: TournamentAnalysisRecommendation
                        ) => {
                            const priorityStyle =
                                recommendationPriorityStyle(
                                    recommendation.priority
                                )

                            return (
                                <article
                                    key={recommendation.id}
                                    className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.055]"
                                >
                                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-400/5 blur-2xl" />

                                    <div className="relative">
                                        <div className="flex items-start justify-between gap-4">
                                            <span
                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${priorityStyle.badge}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`}
                                                />
                                                {recommendation.priority} priority
                                            </span>

                                            {recommendation.suggestedModule && (
                                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                    {
                                                        recommendation.suggestedModule
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mt-5 text-lg font-semibold text-white">
                                            {recommendation.title}
                                        </h3>

                                        <p className="mt-3 text-sm leading-7 text-slate-400">
                                            {recommendation.message}
                                        </p>
                                    </div>
                                </article>
                            )
                        }
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DirectorMetric
                    label="Groups"
                    value={snapshot.groupCount}
                    icon={Layers3}
                    helper="Configured competition groups"
                    accent="lime"
                />

                <DirectorMetric
                    label="Grouped Teams"
                    value={snapshot.groupedTeamCount}
                    icon={Users}
                    helper="Teams allocated to groups"
                    accent="sky"
                />

                <DirectorMetric
                    label="Ungrouped Teams"
                    value={snapshot.ungroupedTeamCount}
                    icon={CircleAlert}
                    helper="Teams requiring allocation"
                    accent="amber"
                />

                <DirectorMetric
                    label="Fixtures"
                    value={snapshot.fixtureCount}
                    icon={CalendarDays}
                    helper="Fixtures currently generated"
                    accent="violet"
                />
            </section>

            <section
                className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_90px_-45px_rgba(0,0,0,0.95)] sm:p-8 ${
                    summary.readyToGenerateFixtures
                        ? 'border-lime-400/25 bg-[#0b160d]'
                        : 'border-amber-400/25 bg-[#171309]'
                }`}
            >
                <div className="pointer-events-none absolute inset-0">
                    <div
                        className={`absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl ${
                            summary.readyToGenerateFixtures
                                ? 'bg-lime-400/10'
                                : 'bg-amber-400/10'
                        }`}
                    />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div
                            className={`rounded-2xl border p-3 ${
                                summary.readyToGenerateFixtures
                                    ? 'border-lime-400/20 bg-lime-400/10'
                                    : 'border-amber-400/20 bg-amber-400/10'
                            }`}
                        >
                            {summary.readyToGenerateFixtures ? (
                                <CheckCircle2 className="h-6 w-6 text-lime-300" />
                            ) : (
                                <CircleAlert className="h-6 w-6 text-amber-300" />
                            )}
                        </div>

                        <div>
                            <p
                                className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                                    summary.readyToGenerateFixtures
                                        ? 'text-lime-300'
                                        : 'text-amber-300'
                                }`}
                            >
                                Executive Decision
                            </p>

                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                {summary.headline}
                            </h2>

                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                                {summary.summary}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!summary.readyToGenerateFixtures}
                        onClick={() =>
                            openAdminModule(
                                'Auto Fixture Generator'
                            )
                        }
                        className={`inline-flex min-w-fit items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition duration-300 ${
                            summary.readyToGenerateFixtures
                                ? 'bg-lime-400 text-[#07100a] shadow-[0_18px_45px_-20px_rgba(163,230,53,0.9)] hover:-translate-y-0.5 hover:bg-lime-300'
                                : 'cursor-not-allowed border border-white/10 bg-white/[0.05] text-slate-500'
                        }`}
                    >
                        <span>
                            {summary.readyToGenerateFixtures
                                ? 'Launch Auto Fixture Generator'
                                : `Resolve ${summary.blockingIssueCount} Blocking Issue${
                                    summary.blockingIssueCount === 1
                                        ? ''
                                        : 's'
                                }`}
                        </span>

                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </section>
        </div>
    )
}