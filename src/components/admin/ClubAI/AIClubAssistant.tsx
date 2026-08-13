import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    AlertTriangle,
    Bot,
    CalendarClock,
    CheckCircle2,
    Sparkles,
    Users,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { supabase } from '../../../lib/supabaseClient'

type Season = {
    id: string
    name: string
    season_label: string | null
}

type Fixture = {
    id: string
    fixture_date: string
    status: string
    published: boolean
}

type SquadMember = {
    id: string
    active: boolean
}

type ResultRow = {
    id: string
    fixture_id: string
}

type Insight = {
    title: string
    detail: string
    priority: 'high' | 'medium' | 'good'
}

export function AIClubAssistant() {
    const { currentOrganisation } =
        useOrganisation()

    const [season, setSeason] =
        useState<Season | null>(null)
    const [fixtures, setFixtures] =
        useState<Fixture[]>([])
    const [squad, setSquad] =
        useState<SquadMember[]>([])
    const [results, setResults] =
        useState<ResultRow[]>([])
    const [loading, setLoading] =
        useState(true)
    const [error, setError] =
        useState('')

    useEffect(() => {
        let disposed = false

        async function load() {
            setLoading(true)
            setError('')

            const {
                data: seasonData,
                error: seasonError,
            } = await supabase
                .from('club_seasons')
                .select('id,name,season_label')
                .eq(
                    'organisation_id',
                    currentOrganisation.id,
                )
                .eq('status', 'active')
                .order('start_date', {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle()

            if (disposed) return

            if (seasonError) {
                setError(seasonError.message)
                setLoading(false)
                return
            }

            const activeSeason =
                (seasonData as Season | null) ??
                null

            setSeason(activeSeason)

            if (!activeSeason) {
                setFixtures([])
                setSquad([])
                setResults([])
                setLoading(false)
                return
            }

            const [
                fixtureResponse,
                squadResponse,
                resultResponse,
            ] = await Promise.all([
                supabase
                    .from('club_fixtures')
                    .select(
                        'id,fixture_date,status,published',
                    )
                    .eq(
                        'organisation_id',
                        currentOrganisation.id,
                    )
                    .eq(
                        'season_id',
                        activeSeason.id,
                    ),
                supabase
                    .from(
                        'club_squad_members',
                    )
                    .select('id,active')
                    .eq(
                        'organisation_id',
                        currentOrganisation.id,
                    )
                    .eq(
                        'season_id',
                        activeSeason.id,
                    ),
                supabase
                    .from('club_results')
                    .select('id,fixture_id')
                    .eq(
                        'organisation_id',
                        currentOrganisation.id,
                    )
                    .eq(
                        'season_id',
                        activeSeason.id,
                    ),
            ])

            if (disposed) return

            const firstError =
                fixtureResponse.error ??
                squadResponse.error ??
                resultResponse.error

            if (firstError) {
                setError(firstError.message)
            }

            setFixtures(
                (fixtureResponse.data ??
                    []) as Fixture[],
            )
            setSquad(
                (squadResponse.data ??
                    []) as SquadMember[],
            )
            setResults(
                (resultResponse.data ??
                    []) as ResultRow[],
            )
            setLoading(false)
        }

        void load()

        return () => {
            disposed = true
        }
    }, [currentOrganisation.id])

    const insights =
        useMemo<Insight[]>(() => {
            if (!season) {
                return [
                    {
                        title:
                            'Create an active season',
                        detail:
                            'An active season unlocks fixture, squad and match-readiness analysis.',
                        priority: 'high',
                    },
                ]
            }

            const today =
                new Date()
                    .toISOString()
                    .slice(0, 10)

            const upcoming =
                fixtures
                    .filter(
                        (fixture) =>
                            fixture.fixture_date >=
                                today &&
                            fixture.status !==
                                'cancelled',
                    )
                    .sort(
                        (left, right) =>
                            left.fixture_date.localeCompare(
                                right.fixture_date,
                            ),
                    )

            const unpublished =
                upcoming.filter(
                    (fixture) =>
                        !fixture.published,
                )

            const missingResults =
                fixtures.filter(
                    (fixture) =>
                        fixture.fixture_date <
                            today &&
                        !results.some(
                            (result) =>
                                result.fixture_id ===
                                fixture.id,
                        ),
                )

            const activeSquad =
                squad.filter(
                    (member) =>
                        member.active,
                )

            const generated: Insight[] = []

            generated.push(
                upcoming.length > 0
                    ? {
                          title: `${upcoming.length} upcoming fixture${upcoming.length === 1 ? '' : 's'} detected`,
                          detail: `Next match: ${upcoming[0].fixture_date}. The public countdown will advance automatically through published fixtures.`,
                          priority: 'good',
                      }
                    : {
                          title:
                              'No future fixture is scheduled',
                          detail:
                              'Add or publish the next match so players and supporters see the automatic match countdown.',
                          priority: 'high',
                      },
            )

            if (unpublished.length > 0) {
                generated.push({
                    title: `${unpublished.length} upcoming fixture${unpublished.length === 1 ? '' : 's'} not published`,
                    detail:
                        'Review these before matchday so the public website remains the reliable source of club information.',
                    priority: 'medium',
                })
            }

            if (missingResults.length > 0) {
                generated.push({
                    title: `${missingResults.length} past fixture${missingResults.length === 1 ? '' : 's'} missing a result`,
                    detail:
                        'Completing these results improves the club record, recent-results feed and statistics.',
                    priority: 'medium',
                })
            }

            generated.push(
                activeSquad.length > 0
                    ? {
                          title: `${activeSquad.length} active squad member${activeSquad.length === 1 ? '' : 's'}`,
                          detail:
                              'The active squad is available for match operations and player statistics.',
                          priority: 'good',
                      }
                    : {
                          title:
                              'Squad registration is empty',
                          detail:
                              'Import or add the season squad so match operations can use registered players.',
                          priority: 'high',
                      },
            )

            return generated.slice(0, 5)
        }, [
            fixtures,
            results,
            season,
            squad,
        ])

    if (
        currentOrganisation.organisation_type !==
        'club'
    ) {
        return null
    }

    return (
        <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)]">
                        <Bot className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black">
                                AI Club Assistant
                            </h3>
                            <span className="rounded-full border border-[var(--organisation-border)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--organisation-muted)]">
                                Club intelligence
                            </span>
                        </div>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--organisation-muted)]">
                            Live operational analysis of the active season, focused on the issues that need the club administrator&apos;s attention.
                        </p>
                    </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--organisation-border)] px-3 py-2 text-xs font-bold text-[var(--organisation-muted)]">
                    <Sparkles className="h-4 w-4" />
                    {season?.season_label ??
                        season?.name ??
                        'No active season'}
                </span>
            </div>

            {loading ? (
                <p className="mt-5 text-sm text-[var(--organisation-muted)]">
                    Analysing club data...
                </p>
            ) : error ? (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                    {error}
                </div>
            ) : (
                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {insights.map((insight) => {
                        const Icon =
                            insight.priority ===
                            'high'
                                ? AlertTriangle
                                : insight.priority ===
                                    'medium'
                                  ? CalendarClock
                                  : CheckCircle2

                        return (
                            <article
                                key={insight.title}
                                className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--organisation-accent)]" />
                                    <div>
                                        <h4 className="text-sm font-black">
                                            {insight.title}
                                        </h4>
                                        <p className="mt-1 text-xs leading-5 text-[var(--organisation-muted)]">
                                            {insight.detail}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            <div className="mt-5 flex items-center gap-2 text-xs text-[var(--organisation-muted)]">
                <Users className="h-4 w-4" />
                Fixture readiness · squad readiness · results completeness
            </div>
        </section>
    )
}
