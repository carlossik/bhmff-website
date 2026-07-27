import {
    BrainCircuit,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Layers3,
    MapPin,
    Sparkles,
    Users,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'

type DirectorMetricProps = {
    label: string
    value: string | number
    icon: typeof Users
}

function DirectorMetric({
                            label,
                            value,
                            icon: Icon,
                        }: DirectorMetricProps) {
    return (
        <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-400">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                        {value}
                    </p>
                </div>

                <div className="rounded-xl bg-lime-400/10 p-3">
                    <Icon className="h-6 w-6 text-lime-400" />
                </div>
            </div>
        </div>
    )
}

export function AITournamentDirector() {
    const {
        currentOrganisation,
    } = useOrganisation()

    const {
        currentCompetition,
    } = useCompetition()

    const hasOrganisation =
        Boolean(currentOrganisation)

    const hasCompetition =
        Boolean(currentCompetition)

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-gradient-to-br from-[#1b2a15] via-[#14200f] to-[#0d140a] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-lime-400/10 p-3">
                            <BrainCircuit className="h-9 w-9 text-lime-400" />
                        </div>

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-400">
                                Intelligent tournament planning
                            </p>

                            <h2 className="mt-2 text-3xl font-bold text-white">
                                AI Tournament Director
                            </h2>

                            <p className="mt-3 max-w-3xl text-slate-300">
                                Analyse the selected competition, identify
                                missing setup and receive recommendations
                                before using the Auto Fixture Generator.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-lime-800/60 bg-black/20 px-5 py-4">
                        <p className="text-sm text-slate-400">
                            Current status
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                            {hasOrganisation &&
                            hasCompetition ? (
                                <>
                                    <Sparkles className="h-5 w-5 text-lime-400" />

                                    <span className="font-semibold text-white">
                                        Ready for analysis
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CircleAlert className="h-5 w-5 text-amber-400" />

                                    <span className="font-semibold text-white">
                                        Setup required
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DirectorMetric
                    label="Organisation"
                    value={
                        currentOrganisation?.name ??
                        'Not selected'
                    }
                    icon={Building2}
                />

                <DirectorMetric
                    label="Competition"
                    value={
                        currentCompetition?.name ??
                        'Not selected'
                    }
                    icon={CalendarDays}
                />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-lime-900/40 bg-[#121d0f] p-6">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-lime-400" />

                        <h3 className="text-xl font-semibold text-white">
                            Analysis scope
                        </h3>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-3 text-slate-300">
                            <Users className="h-5 w-5 text-lime-400" />
                            Registered competition teams
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <Layers3 className="h-5 w-5 text-lime-400" />
                            Group structure and allocations
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <MapPin className="h-5 w-5 text-lime-400" />
                            Venue and pitch availability
                        </div>

                        <div className="flex items-center gap-3 text-slate-300">
                            <CalendarDays className="h-5 w-5 text-lime-400" />
                            Existing fixtures and schedule coverage
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-lime-900/40 bg-[#121d0f] p-6">
                    <div className="flex items-center gap-3">
                        <CircleAlert className="h-6 w-6 text-amber-400" />

                        <h3 className="text-xl font-semibold text-white">
                            Director boundary
                        </h3>
                    </div>

                    <p className="mt-5 leading-7 text-slate-300">
                        The AI Tournament Director analyses the tournament
                        and recommends the best next action. The separate
                        Auto Fixture Generator remains responsible for
                        creating the actual fixtures.
                    </p>
                </section>
            </div>
        </div>
    )
}