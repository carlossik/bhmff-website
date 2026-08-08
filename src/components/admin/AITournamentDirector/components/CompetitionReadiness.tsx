import {
    Activity,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Gauge,
    ShieldAlert,
} from 'lucide-react'

import type { TournamentAnalysisCheck } from '../../../../types/tournamentAnalysis'
import type { TournamentDirectorReport } from '../types'
import { SectionHeader } from './SectionHeader'

type CompetitionReadinessProps = {
    report: TournamentDirectorReport
}

function statusIcon(check: TournamentAnalysisCheck) {
    switch (check.status) {
        case 'ready':
            return (
                <CheckCircle2 className="h-4 w-4 text-[var(--organisation-accent)]" />
            )
        case 'warning':
            return (
                <CircleAlert className="h-4 w-4 text-amber-300" />
            )
        case 'blocked':
            return (
                <ShieldAlert className="h-4 w-4 text-red-300" />
            )
        default:
            return (
                <Clock3 className="h-4 w-4 text-sky-300" />
            )
    }
}

function statusShell(status: TournamentAnalysisCheck['status']): string {
    switch (status) {
        case 'ready':
            return 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10'
        case 'warning':
            return 'border-amber-400/20 bg-amber-400/10'
        case 'blocked':
            return 'border-red-400/20 bg-red-400/10'
        default:
            return 'border-sky-400/20 bg-sky-400/10'
    }
}

function scoreLabel(score: number): string {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Ready'
    if (score >= 70) return 'Good'
    return 'Needs attention'
}

export function CompetitionReadiness({
    report,
}: CompetitionReadinessProps) {
    const { summary } = report

    return (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:p-7">
                <SectionHeader
                    eyebrow="Competition Readiness"
                    title="Live configuration checks"
                    description="The existing Tournament Analysis checks remain the source of truth for readiness and fixture-generation prerequisites."
                    icon={Activity}
                />

                <div className="mt-7 space-y-3">
                    {report.checks.map((check) => (
                        <article
                            key={check.id}
                            className="flex items-start gap-4 rounded-2xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-background)]/35 p-4"
                        >
                            <div
                                className={`rounded-xl border p-2 ${statusShell(check.status)}`}
                            >
                                {statusIcon(check)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="font-semibold text-[var(--organisation-text)]">
                                        {check.title}
                                    </p>

                                    <span className="w-fit rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/50">
                                        {check.status}
                                    </span>
                                </div>

                                <p className="mt-2 text-sm leading-6 text-[color:var(--organisation-text)]/60">
                                    {check.description}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:p-7">
                <SectionHeader
                    eyebrow="Operational Health"
                    title="Readiness score"
                    description="A concise executive view of whether the selected competition can proceed safely into scheduling."
                    icon={Gauge}
                    accent="sky"
                />

                <div className="mt-8 rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-6">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-5xl font-black tracking-tight text-[var(--organisation-accent)]">
                                {summary.readinessScore}%
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[var(--organisation-text)]">
                                {scoreLabel(summary.readinessScore)}
                            </p>
                        </div>

                        <span className="rounded-full border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--organisation-accent)]">
                            {summary.readyToGenerateFixtures
                                ? 'Generation ready'
                                : 'Action required'}
                        </span>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/25">
                        <div
                            className="h-full rounded-full bg-[var(--organisation-accent)]"
                            style={{
                                width: `${Math.min(
                                    Math.max(summary.readinessScore, 0),
                                    100
                                )}%`,
                            }}
                        />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                                Blocking
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[var(--organisation-text)]">
                                {summary.blockingIssueCount}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                                Warnings
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[var(--organisation-text)]">
                                {summary.warningCount}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
