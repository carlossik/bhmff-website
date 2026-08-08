import {
    CheckCircle2,
    Sparkles,
    WandSparkles,
} from 'lucide-react'

import type { TournamentAnalysisRecommendation } from '../../../../types/tournamentAnalysis'
import type { TournamentDirectorReport } from '../types'
import { SectionHeader } from './SectionHeader'

type AIRecommendationsProps = {
    report: TournamentDirectorReport
}

function priorityClasses(
    priority: TournamentAnalysisRecommendation['priority']
): string {
    if (priority === 'high') {
        return 'border-red-400/25 bg-red-400/10 text-red-200'
    }

    if (priority === 'medium') {
        return 'border-amber-400/25 bg-amber-400/10 text-amber-200'
    }

    return 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 text-[var(--organisation-accent)]'
}

export function AIRecommendations({
    report,
}: AIRecommendationsProps) {
    return (
        <section className="rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeader
                    eyebrow="AI Advisory"
                    title="Executive recommendations"
                    description="Prioritised actions generated from the current tournament configuration and readiness profile."
                    icon={WandSparkles}
                    accent="violet"
                />

                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-xs font-semibold text-[color:var(--organisation-text)]/60">
                    <Sparkles className="h-4 w-4 text-violet-300" />
                    {report.recommendations.length} recommendation
                    {report.recommendations.length === 1 ? '' : 's'}
                </span>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {report.recommendations.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/[0.08] p-5 lg:col-span-2">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--organisation-accent)]" />
                            <div>
                                <p className="font-semibold text-[var(--organisation-accent)]">
                                    No recommendations required
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[color:var(--organisation-text)]/60">
                                    The current tournament configuration is aligned with the fixture-generation requirements evaluated by TournamentHQ.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {report.recommendations.map((recommendation) => (
                    <article
                        key={recommendation.id}
                        className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <span
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${priorityClasses(recommendation.priority)}`}
                            >
                                {recommendation.priority} priority
                            </span>

                            {recommendation.suggestedModule ? (
                                <span className="rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--organisation-text)]/45">
                                    {recommendation.suggestedModule}
                                </span>
                            ) : null}
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-[var(--organisation-text)]">
                            {recommendation.title}
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-[color:var(--organisation-text)]/60">
                            {recommendation.message}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    )
}
