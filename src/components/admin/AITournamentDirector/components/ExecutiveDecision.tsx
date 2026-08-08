import {
    ArrowRight,
    CheckCircle2,
    CircleAlert,
} from 'lucide-react'

import type { TournamentDirectorReport } from '../types'

type ExecutiveDecisionProps = {
    report: TournamentDirectorReport
    onGenerate: () => void
    navigationError: string | null
}

export function ExecutiveDecision({
    report,
    onGenerate,
    navigationError,
}: ExecutiveDecisionProps) {
    const { summary, recommendedGeneratorConfig } = report
    const ready =
        summary.readyToGenerateFixtures &&
        recommendedGeneratorConfig.recommendationStatus === 'validated'

    return (
        <section
            className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 ${
                ready
                    ? 'border-[color:var(--organisation-border)] bg-[var(--organisation-surface)]'
                    : 'border-amber-400/25 bg-[var(--organisation-surface)]'
            }`}
        >
            <div className="pointer-events-none absolute inset-0">
                <div
                    className={`absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl ${
                        ready
                            ? 'bg-[color:var(--organisation-accent)]/10'
                            : 'bg-amber-400/10'
                    }`}
                />
            </div>

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                    <div
                        className={`rounded-2xl border p-3 ${
                            ready
                                ? 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10'
                                : 'border-amber-400/20 bg-amber-400/10'
                        }`}
                    >
                        {ready ? (
                            <CheckCircle2 className="h-6 w-6 text-[var(--organisation-accent)]" />
                        ) : (
                            <CircleAlert className="h-6 w-6 text-amber-300" />
                        )}
                    </div>

                    <div>
                        <p
                            className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                                ready
                                    ? 'text-[var(--organisation-accent)]'
                                    : 'text-amber-300'
                            }`}
                        >
                            Executive Decision
                        </p>

                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--organisation-text)] sm:text-3xl">
                            {summary.headline}
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--organisation-text)]/70 sm:text-base">
                            {summary.summary}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-1.5 text-xs text-[color:var(--organisation-text)]/60">
                                Rounds: {recommendedGeneratorConfig.daysBetweenRounds} days
                            </span>
                            <span className="rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-1.5 text-xs text-[color:var(--organisation-text)]/60">
                                Venues: {recommendedGeneratorConfig.venueAssignmentMode}
                            </span>
                            <span className="rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-1.5 text-xs text-[color:var(--organisation-text)]/60">
                                Rules: {recommendedGeneratorConfig.rulesProfileId}
                            </span>
                        </div>

                        {navigationError ? (
                            <p className="mt-4 text-sm font-medium text-amber-200">
                                {navigationError}
                            </p>
                        ) : null}
                    </div>
                </div>

                <button
                    type="button"
                    disabled={!ready}
                    onClick={onGenerate}
                    className={`inline-flex min-w-fit items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition duration-300 ${
                        ready
                            ? 'bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)] hover:-translate-y-0.5 hover:opacity-90'
                            : 'cursor-not-allowed border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] text-[color:var(--organisation-text)]/35'
                    }`}
                >
                    <span>
                        {ready
                            ? 'Generate Intelligent Fixture Schedule'
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
    )
}
