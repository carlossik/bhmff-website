import {
    CalendarDays,
    Edit3,
    MapPin,
    Shield,
    Trash2,
} from 'lucide-react'
import type {
    Fixture,
    FixtureGroup,
    FixtureStatus,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type FixturesTableProps = {
    fixtures: Fixture[]
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    groups: FixtureGroup[]
    onEdit: (fixture: Fixture) => void
    onDelete: (fixture: Fixture) => void
}

function formatTeamDisplayName(
    team: FixtureTeam | undefined,
    fallback: string
) {
    if (!team) return fallback

    return team.club_name
        ? `${team.club_name} — ${team.team_name}`
        : team.team_name || fallback
}

function getStatusClasses(
    status: FixtureStatus
) {
    switch (status) {
        case 'completed':
            return 'border-[var(--organisation-accent)] bg-[var(--organisation-surface)] text-[var(--organisation-accent)]'
        case 'postponed':
            return 'border-amber-700/50 bg-amber-500/10 text-amber-300'
        case 'cancelled':
            return 'border-red-700/50 bg-red-500/10 text-red-300'
        default:
            return 'border-sky-700/50 bg-sky-500/10 text-sky-300'
    }
}

export function FixturesTable({
                                  fixtures,
                                  teams,
                                  venues,
                                  groups,
                                  onEdit,
                                  onDelete,
                              }: FixturesTableProps) {
    const teamMap = new Map(
        teams.map((team) => [
            team.competition_team_id,
            team,
        ])
    )

    const venueNames = new Map(
        venues.map((venue) => [
            venue.id,
            venue.name,
        ])
    )

    const groupNames = new Map(
        groups.map((group) => [
            group.id,
            group.name,
        ])
    )

    function formatKickoff(
        kickoffTime: string | null
    ) {
        if (!kickoffTime) {
            return 'Date and time TBC'
        }

        const date = new Date(kickoffTime)

        if (Number.isNaN(date.getTime())) {
            return 'Date and time TBC'
        }

        return new Intl.DateTimeFormat(
            'en-GB',
            {
                dateStyle: 'medium',
                timeStyle: 'short',
            }
        ).format(date)
    }

    if (!fixtures.length) {
        return (
            <section className="rounded-3xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center font-sans">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--organisation-surface)]">
                    <CalendarDays className="h-7 w-7 text-[var(--organisation-accent)]" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-white">
                    No fixtures created
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Add the first fixture when the competition schedule is ready.
                </p>
            </section>
        )
    }

    return (
        <div className="space-y-4 font-sans">
            {fixtures.map((fixture) => {
                const homeTeam =
                    teamMap.get(
                        fixture.home_competition_team_id ??
                        ''
                    )

                const awayTeam =
                    teamMap.get(
                        fixture.away_competition_team_id ??
                        ''
                    )

                return (
                    <article
                        key={fixture.id}
                        className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 shadow-sm transition hover:border-[var(--organisation-accent)]"
                    >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-3 py-1 text-xs font-bold text-[var(--organisation-accent)]">
                                        {fixture.stage}
                                    </span>

                                    {fixture.group_id && (
                                        <span className="rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 text-xs font-semibold text-slate-300">
                                            {groupNames.get(
                                                    fixture.group_id
                                                ) ??
                                                'Unknown group'}
                                        </span>
                                    )}

                                    <span
                                        className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClasses(
                                            fixture.status
                                        )}`}
                                    >
                                        {fixture.status}
                                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                    <div className="rounded-xl border border-[var(--organisation-border)] bg-black/20 p-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                            Home
                                        </p>

                                        <p className="mt-2 text-base font-bold leading-6 text-white">
                                            {formatTeamDisplayName(
                                                homeTeam,
                                                'Home team TBC'
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-center text-sm font-bold uppercase tracking-[0.2em] text-[var(--organisation-accent)]">
                                        vs
                                    </div>

                                    <div className="rounded-xl border border-[var(--organisation-border)] bg-black/20 p-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                            Away
                                        </p>

                                        <p className="mt-2 text-base font-bold leading-6 text-white">
                                            {formatTeamDisplayName(
                                                awayTeam,
                                                'Away team TBC'
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-2">
                                    <div className="flex items-center gap-3 rounded-xl border border-[var(--organisation-border)] bg-black/10 px-4 py-3">
                                        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                                        <span>
                                            {formatKickoff(
                                                fixture.kickoff_time
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-xl border border-[var(--organisation-border)] bg-black/10 px-4 py-3">
                                        <MapPin className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                                        <span>
                                            {venueNames.get(
                                                    fixture.venue_id ??
                                                    ''
                                                ) ??
                                                'Venue TBC'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-row gap-3 lg:flex-col">
                                <button
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-4 py-2.5 text-sm font-bold text-[var(--organisation-accent)] transition hover:bg-[var(--organisation-surface)] lg:flex-none"
                                    type="button"
                                    onClick={() =>
                                        onEdit(fixture)
                                    }
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Edit
                                </button>

                                <button
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-800/60 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/15 lg:flex-none"
                                    type="button"
                                    onClick={() =>
                                        onDelete(fixture)
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}