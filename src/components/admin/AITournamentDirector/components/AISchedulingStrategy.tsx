import {
    CalendarDays,
    Clock3,
    MapPin,
    Target,
    Users,
} from 'lucide-react'

import type { RecommendedGeneratorConfig } from '../types'
import { SectionHeader } from './SectionHeader'

type AISchedulingStrategyProps = {
    recommendation: RecommendedGeneratorConfig
}

function humaniseStrategy(
    value: RecommendedGeneratorConfig['preferredSchedulingStrategy']
): string {
    switch (value) {
        case 'venue-efficient':
            return 'Venue efficient'
        case 'compact':
            return 'Compact'
        default:
            return 'Balanced'
    }
}

export function AISchedulingStrategy({
    recommendation,
}: AISchedulingStrategyProps) {
    return (
        <section className="rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:p-8">
            <SectionHeader
                eyebrow="AI Scheduling Strategy"
                title="Recommended fixture-generation policy"
                description="These values come directly from TournamentAnalysisService and are handed to the fixture generator as the recommended operating plan."
                icon={Target}
                accent="violet"
            />

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5">
                    <CalendarDays className="h-5 w-5 text-sky-300" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                        Round interval
                    </p>
                    <p className="mt-2 font-semibold text-[var(--organisation-text)]">
                        {recommendation.daysBetweenRounds} days
                    </p>
                </div>

                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5">
                    <Clock3 className="h-5 w-5 text-violet-300" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                        Safe venue interval
                    </p>
                    <p className="mt-2 font-semibold text-[var(--organisation-text)]">
                        {recommendation.minimumSafeFixtureIntervalMinutes} mins
                    </p>
                </div>

                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5">
                    <MapPin className="h-5 w-5 text-amber-300" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                        Venue handling
                    </p>
                    <p className="mt-2 font-semibold text-[var(--organisation-text)]">
                        {recommendation.venueAssignmentMode === 'automatic'
                            ? 'Automatic'
                            : 'Manual'}
                    </p>
                </div>

                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5">
                    <Users className="h-5 w-5 text-[var(--organisation-accent)]" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                        Team eligibility
                    </p>
                    <p className="mt-2 font-semibold text-[var(--organisation-text)]">
                        {recommendation.confirmedTeamsOnly
                            ? 'Confirmed only'
                            : 'All active teams'}
                    </p>
                </div>

                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]/35 p-5">
                    <Target className="h-5 w-5 text-sky-300" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--organisation-text)]/45">
                        Strategy
                    </p>
                    <p className="mt-2 font-semibold text-[var(--organisation-text)]">
                        {humaniseStrategy(
                            recommendation.preferredSchedulingStrategy
                        )}
                    </p>
                </div>
            </div>

            {recommendation.validationMessages.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <p className="text-sm font-semibold text-amber-200">
                        Scheduling validation
                    </p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-[color:var(--organisation-text)]/65">
                        {recommendation.validationMessages.map((message) => (
                            <li key={message}>• {message}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    )
}
