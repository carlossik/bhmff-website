import {
    Activity,
    BrainCircuit,
    Building2,
    CalendarDays,
    Sparkles,
} from 'lucide-react'

import type { TournamentDirectorReport } from '../types'

type DirectorHeroProps = {
    report: TournamentDirectorReport
}

export function DirectorHero({
    report,
}: DirectorHeroProps) {
    const { snapshot } = report
    const readyChecks = report.checks.filter(
        (check) => check.status === 'ready'
    ).length

    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-background)] p-6 shadow-[0_30px_100px_-45px_rgba(0,0,0,0.95)] sm:p-8 xl:p-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-[color:var(--organisation-accent)]/10 blur-3xl" />
                <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-[color:var(--organisation-primary)]/10 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--organisation-accent)]/50 to-transparent" />
            </div>

            <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--organisation-accent)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    TournamentHQ Executive Intelligence
                </div>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="shrink-0 rounded-3xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 p-4">
                        <BrainCircuit className="h-10 w-10 text-[var(--organisation-accent)]" />
                    </div>

                    <div>
                        <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-[var(--organisation-text)] sm:text-4xl xl:text-5xl">
                            AI Tournament Director
                        </h1>

                        <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--organisation-text)]/70">
                            Competition readiness, scheduling strategy and operational recommendations in one decision layer. TournamentHQ analyses the current tenant and competition before handing a validated plan to the fixture engine.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 text-sm text-[color:var(--organisation-text)]/70">
                        <Building2 className="h-4 w-4 text-[var(--organisation-accent)]" />
                        {snapshot.organisationName}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 text-sm text-[color:var(--organisation-text)]/70">
                        <CalendarDays className="h-4 w-4 text-sky-300" />
                        {snapshot.competitionName ?? 'No competition selected'}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-2 text-sm text-[color:var(--organisation-text)]/70">
                        <Activity className="h-4 w-4 text-violet-300" />
                        {readyChecks} of {report.checks.length} checks ready
                    </div>
                </div>
            </div>
        </section>
    )
}
