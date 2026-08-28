import {
    CircleDot,
    ShieldCheck,
    Target,
    Trophy,
    Users,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { ArticlePage } from '../../components/ArticlePage'
import { ArticlesSection } from '../../components/public/home/ArticlesSection'
import {
    ClubNextMatchCountdown,
    ClubTeamCard,
    formatClubPublicDate,
    getClubFixtureKickoffTimestamp,
} from '../../components/public/club/ClubPublicComponents'
import { MediaSection } from '../../components/public/home/MediaSection'
import { SponsorsSection } from '../../components/public/home/SponsorsSection'
import { useOptionalPublicOrganisation } from '../../context/PublicOrganisationContext'
import { usePublicArticles } from '../../hooks/usePublicArticles'
import {
    clubPublicService,
    type ClubPublicData,
    type ClubPublicFixture,
    type ClubPublicResult,
    type ClubPublicTeam,
} from '../../services/public/clubPublicService'
import type {
    PublicArticle,
    PublicMediaItem,
    PublicSponsor,
} from '../../services/public/organisationPublicService'

type SeasonRecord = {
    played: number
    won: number
    drawn: number
    lost: number
    goalsFor: number
    goalsAgainst: number
}

export type ClubPublicHomePageProps = {
    organisationName: string
    organisationLogoUrl?: string | null
    backgroundColour: string
    surfaceColour: string
    textColour: string
    accentColour: string
    accentTextColour?: string
    basePath?: string
    selectedTeamId?: string | null
    articles?: PublicArticle[]
    media?: PublicMediaItem[]
    sponsors?: PublicSponsor[]
}

const emptyClubData: ClubPublicData = {
    season: null,
    teams: [],
    fixtures: [],
    results: [],
    squad: [],
    goals: [],
}

function teamMatchesFixture(
    fixture: ClubPublicFixture,
    teamId: string,
    teamCount: number,
): boolean {
    if (fixture.teamId === teamId) {
        return true
    }

    return fixture.teamId === null && teamCount === 1
}

function getTeamLabel(
    fixture: ClubPublicFixture,
    teamById: Map<string, ClubPublicTeam>,
    fallback: string,
): string {
    if (fixture.teamId) {
        return teamById.get(fixture.teamId)?.name ?? fallback
    }

    return fallback
}

function getFixtureTitle(
    fixture: ClubPublicFixture,
    teamById: Map<string, ClubPublicTeam>,
    fallbackTeamName: string,
): string {
    const teamName = getTeamLabel(
        fixture,
        teamById,
        fallbackTeamName,
    )
    const opponent = fixture.opponentName ?? 'TBC'

    return fixture.homeAway === 'away'
        ? `${opponent} vs ${teamName}`
        : `${teamName} vs ${opponent}`
}


function isCountdownEligibleFixture(
    fixture: ClubPublicFixture,
): boolean {
    return [
        'proposed',
        'scheduled',
        'confirmed',
    ].includes(fixture.status)
}

function getResultScore(
    fixture: ClubPublicFixture,
    result: ClubPublicResult,
): string {
    return fixture.homeAway === 'away'
        ? `${result.awayScore} - ${result.homeScore}`
        : `${result.homeScore} - ${result.awayScore}`
}

function calculateSeasonRecord(
    results: ClubPublicResult[],
    fixtureById: Map<string, ClubPublicFixture>,
): SeasonRecord {
    return results.reduce<SeasonRecord>(
        (record, result) => {
            const fixture = fixtureById.get(result.fixtureId)
            if (!fixture) {
                return record
            }

            const isAway = fixture.homeAway === 'away'
            const goalsFor = isAway
                ? result.awayScore
                : result.homeScore
            const goalsAgainst = isAway
                ? result.homeScore
                : result.awayScore

            record.played += 1
            record.goalsFor += goalsFor
            record.goalsAgainst += goalsAgainst

            if (goalsFor > goalsAgainst) {
                record.won += 1
            } else if (goalsFor < goalsAgainst) {
                record.lost += 1
            } else {
                record.drawn += 1
            }

            return record
        },
        {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
        },
    )
}

export function ClubPublicHomePage({
    organisationName,
    organisationLogoUrl,
    backgroundColour,
    surfaceColour,
    textColour,
    accentColour,
    accentTextColour = '#071006',
    basePath = '',
    selectedTeamId = null,
    articles = [],
    media = [],
}: ClubPublicHomePageProps) {
    const publicOrganisation = useOptionalPublicOrganisation()
    const organisationId = publicOrganisation?.organisationId ?? null

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles()

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)
    const [clubData, setClubData] =
        useState<ClubPublicData>(emptyClubData)
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)
    const [showAllFixtures, setShowAllFixtures] =
        useState(false)

    const activeArticle = useMemo(
        () =>
            publicArticles.find(
                (article) => article.id === activeArticleId,
            ) ?? null,
        [activeArticleId, publicArticles],
    )

    useEffect(() => {
        const resolvedOrganisationId = organisationId ?? ''

        if (!resolvedOrganisationId) {
            setClubData(emptyClubData)
            setLoading(false)
            return
        }

        let disposed = false

        async function loadClubData() {
            try {
                setLoading(true)
                setErrorMessage(null)

                const data = await clubPublicService.getClubPublicData(
                    resolvedOrganisationId,
                )

                if (!disposed) {
                    setClubData(data)
                }
            } catch (error) {
                if (disposed) {
                    return
                }

                console.error('Unable to load public club data:', error)
                setClubData(emptyClubData)
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'We could not load the club information right now.',
                )
            } finally {
                if (!disposed) {
                    setLoading(false)
                }
            }
        }

        void loadClubData()

        return () => {
            disposed = true
        }
    }, [organisationId])

    useEffect(() => {
        setShowAllFixtures(false)
    }, [organisationId, selectedTeamId])

    const teamById = useMemo(
        () => new Map(clubData.teams.map((team) => [team.id, team])),
        [clubData.teams],
    )

    const selectedTeam = useMemo(() => {
        if (selectedTeamId) {
            return teamById.get(selectedTeamId) ?? null
        }

        if (clubData.teams.length === 1) {
            return clubData.teams[0]
        }

        return null
    }, [clubData.teams, selectedTeamId, teamById])

    const scopedFixtures = useMemo(() => {
        if (!selectedTeam) {
            return clubData.fixtures
        }

        return clubData.fixtures.filter((fixture) =>
            teamMatchesFixture(
                fixture,
                selectedTeam.id,
                clubData.teams.length,
            ),
        )
    }, [clubData.fixtures, clubData.teams.length, selectedTeam])

    const scopedFixtureIds = useMemo(
        () => new Set(scopedFixtures.map((fixture) => fixture.id)),
        [scopedFixtures],
    )

    const scopedResults = useMemo(
        () =>
            clubData.results.filter((result) =>
                scopedFixtureIds.has(result.fixtureId),
            ),
        [clubData.results, scopedFixtureIds],
    )

    const scopedGoals = useMemo(
        () =>
            clubData.goals.filter((goal) =>
                scopedFixtureIds.has(goal.fixtureId),
            ),
        [clubData.goals, scopedFixtureIds],
    )

    const scopedSquad = useMemo(() => {
        if (!selectedTeam) {
            return clubData.squad
        }

        return clubData.squad.filter((member) =>
            member.teamId === selectedTeam.id ||
            (member.teamId === null && clubData.teams.length === 1),
        )
    }, [clubData.squad, clubData.teams.length, selectedTeam])

    const fixtureById = useMemo(
        () =>
            new Map(
                scopedFixtures.map((fixture) => [fixture.id, fixture]),
            ),
        [scopedFixtures],
    )

    const nextFixture = useMemo(() => {
        const now = Date.now()

        return (
            [...scopedFixtures]
                .filter(isCountdownEligibleFixture)
                .map((fixture) => ({
                    fixture,
                    timestamp: getClubFixtureKickoffTimestamp(fixture),
                }))
                .filter(
                    (entry) =>
                        entry.timestamp !== null && entry.timestamp >= now,
                )
                .sort(
                    (left, right) =>
                        (left.timestamp ?? Number.MAX_SAFE_INTEGER) -
                        (right.timestamp ?? Number.MAX_SAFE_INTEGER),
                )[0]?.fixture ?? null
        )
    }, [scopedFixtures])

    const recentResults = useMemo(
        () =>
            [...scopedResults]
                .sort((left, right) => {
                    const leftDate =
                        fixtureById.get(left.fixtureId)?.fixtureDate ?? ''
                    const rightDate =
                        fixtureById.get(right.fixtureId)?.fixtureDate ?? ''
                    return rightDate.localeCompare(leftDate)
                })
                .slice(0, 5),
        [fixtureById, scopedResults],
    )

    const displayedFixtures = useMemo(
        () =>
            showAllFixtures
                ? scopedFixtures
                : scopedFixtures.slice(0, 6),
        [scopedFixtures, showAllFixtures],
    )

    const seasonRecord = useMemo(
        () => calculateSeasonRecord(scopedResults, fixtureById),
        [fixtureById, scopedResults],
    )

    const topScorers = useMemo(() => {
        const totals = new Map<string, number>()

        scopedGoals.forEach((goal) => {
            totals.set(
                goal.playerName,
                (totals.get(goal.playerName) ?? 0) + 1,
            )
        })

        return [...totals.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 5)
    }, [scopedGoals])

    const teamSummaries = useMemo(
        () =>
            clubData.teams.map((team) => {
                const teamFixtures = clubData.fixtures.filter((fixture) =>
                    teamMatchesFixture(
                        fixture,
                        team.id,
                        clubData.teams.length,
                    ),
                )
                const now = Date.now()
                const teamNextFixture = [...teamFixtures]
                    .filter(isCountdownEligibleFixture)
                    .map((fixture) => ({
                        fixture,
                        timestamp: getClubFixtureKickoffTimestamp(fixture),
                    }))
                    .filter(
                        (entry) =>
                            entry.timestamp !== null && entry.timestamp >= now,
                    )
                    .sort(
                        (left, right) =>
                            (left.timestamp ?? Number.MAX_SAFE_INTEGER) -
                            (right.timestamp ?? Number.MAX_SAFE_INTEGER),
                    )[0]?.fixture

                const playerCount = clubData.squad.filter(
                    (member) =>
                        member.teamId === team.id ||
                        (member.teamId === null &&
                            clubData.teams.length === 1),
                ).length

                return {
                    team,
                    playerCount,
                    nextFixtureLabel: teamNextFixture
                        ? formatClubPublicDate(teamNextFixture.fixtureDate)
                        : null,
                }
            }),
        [clubData.fixtures, clubData.squad, clubData.teams],
    )

    const isSingleTeamClub = clubData.teams.length === 1
    const isExplicitTeamPage = Boolean(
        selectedTeamId && selectedTeam && !isSingleTeamClub,
    )

    const publicTeamById = useMemo(() => {
        const map = new Map(
            clubData.teams.map((team) => [team.id, team]),
        )

        if (isSingleTeamClub && clubData.teams[0]) {
            const onlyTeam = clubData.teams[0]
            map.set(onlyTeam.id, {
                ...onlyTeam,
                name: organisationName,
                logoUrl:
                    organisationLogoUrl ?? onlyTeam.logoUrl,
            })
        }

        return map
    }, [
        clubData.teams,
        isSingleTeamClub,
        organisationLogoUrl,
        organisationName,
    ])

    const currentContextName =
        isExplicitTeamPage && selectedTeam
            ? selectedTeam.name
            : organisationName

    const currentContextLogoUrl =
        isExplicitTeamPage && selectedTeam
            ? selectedTeam.logoUrl ?? organisationLogoUrl
            : organisationLogoUrl ?? selectedTeam?.logoUrl

    const isMultiTeamOverview =
        clubData.teams.length > 1 && selectedTeam === null

    const cardStyle = {
        background: surfaceColour,
        borderColor: `${accentColour}35`,
    }

    if (activeArticle) {
        return (
            <ArticlePage
                article={activeArticle}
                onBack={() => setActiveArticleId(null)}
            />
        )
    }

    return (
        <>
            <div
                className="club-public-site"
                style={{
                    background: backgroundColour,
                    color: textColour,
                }}
            >
                <style>{`
                    .club-public-site {
                        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    }

                    .club-public-site h1,
                    .club-public-site h2,
                    .club-public-site h3 {
                        font-family: "Space Grotesk", Inter, ui-sans-serif, system-ui, sans-serif;
                    }

                    .club-public-hero-card {
                        padding: clamp(1.5rem, 3vw, 2.5rem);
                    }

                    .club-public-hero-lockup {
                        display: grid;
                        grid-template-columns: minmax(8.5rem, 12rem) minmax(0, 1fr);
                        align-items: center;
                        gap: clamp(1.5rem, 3vw, 2.5rem);
                    }

                    .club-public-hero-badge {
                        width: clamp(8.5rem, 12vw, 12rem);
                        height: clamp(8.5rem, 12vw, 12rem);
                    }

                    .club-public-hero-title {
                        margin-top: 0.75rem;
                        font-size: clamp(2.35rem, 4.4vw, 4.45rem);
                        line-height: 0.96;
                        letter-spacing: -0.045em;
                        text-transform: none;
                    }

                    @media (max-width: 640px) {
                        .club-public-hero-lockup {
                            grid-template-columns: 1fr;
                            text-align: center;
                        }

                        .club-public-hero-badge {
                            justify-self: center;
                            width: clamp(7.25rem, 34vw, 9.5rem);
                            height: clamp(7.25rem, 34vw, 9.5rem);
                        }

                        .club-public-hero-title {
                            font-size: clamp(2.2rem, 11vw, 3.5rem);
                        }
                    }
                `}</style>

                <section
                    id="overview"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-8 pt-10"
                >
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                        <div
                            className="club-public-hero-card rounded-2xl border"
                            style={cardStyle}
                        >
                            <div className="club-public-hero-lockup">
                                {currentContextLogoUrl ? (
                                    <img
                                        src={currentContextLogoUrl}
                                        alt={`${currentContextName} badge`}
                                        className="club-public-hero-badge shrink-0 rounded-2xl object-contain"
                                    />
                                ) : null}

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="text-xs font-black uppercase tracking-[0.14em]"
                                        style={{ color: accentColour }}
                                    >
                                        {isExplicitTeamPage
                                            ? `Official ${organisationName} Team`
                                            : `Official ${organisationName} Club`}
                                    </p>

                                    <h1 className="club-public-hero-title max-w-4xl break-words font-black">
                                        {currentContextName}
                                    </h1>

                                    <p className="mt-4 max-w-2xl text-sm leading-7 opacity-70 sm:text-base">
                                        {isMultiTeamOverview
                                            ? 'Explore every team, fixture, result, squad and player statistic from one consistent club website.'
                                            : 'Fixtures, results, squad, player statistics, news and match media throughout the season.'}
                                    </p>

                                    {clubData.season && (
                                        <span
                                            className="mt-5 inline-flex rounded-full px-3 py-1 text-xs font-bold"
                                            style={{
                                                background: `${accentColour}16`,
                                                color: accentColour,
                                            }}
                                        >
                                            {clubData.season.seasonLabel} Season
                                        </span>
                                    )}

                                    {isExplicitTeamPage && clubData.teams.length > 1 && (
                                        <a
                                            href={`${basePath}/teams#teams`}
                                            className="ml-2 mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-bold no-underline"
                                            style={{
                                                borderColor: `${accentColour}45`,
                                                color: accentColour,
                                            }}
                                        >
                                            ← All teams
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="rounded-2xl border p-5 sm:p-6"
                            style={cardStyle}
                        >
                            {nextFixture ? (
                                <ClubNextMatchCountdown
                                    fixture={nextFixture}
                                    fixtureTitle={getFixtureTitle(
                                        nextFixture,
                                        publicTeamById,
                                        currentContextName,
                                    )}
                                    teamName={
                                        isMultiTeamOverview
                                            ? getTeamLabel(
                                                  nextFixture,
                                                  publicTeamById,
                                                  organisationName,
                                              )
                                            : null
                                    }
                                    accentColour={accentColour}
                                />
                            ) : (
                                <>
                                    <p
                                        className="text-xs font-black uppercase tracking-[0.14em]"
                                        style={{ color: accentColour }}
                                    >
                                        Next Match
                                    </p>
                                    <p className="mt-4 text-sm opacity-65">
                                        No upcoming published fixture.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {errorMessage && (
                    <div className="mx-auto max-w-7xl px-5 pb-4">
                        <p className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <section
                    id="teams"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Club Structure
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        Our Teams
                    </h2>

                    {loading ? (
                        <p className="mt-4 text-sm opacity-65">
                            Loading teams...
                        </p>
                    ) : clubData.teams.length > 0 ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {teamSummaries.map((summary) => {
                                const displayTeam =
                                    publicTeamById.get(summary.team.id) ??
                                    summary.team

                                return (
                                    <ClubTeamCard
                                        key={summary.team.id}
                                        team={displayTeam}
                                        href={`${basePath}/teams/${encodeURIComponent(
                                            summary.team.id,
                                        )}`}
                                        accentColour={accentColour}
                                        surfaceColour={surfaceColour}
                                        textColour={textColour}
                                        playerCount={summary.playerCount}
                                        nextFixtureLabel={summary.nextFixtureLabel}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <p
                            className="mt-4 rounded-2xl border p-5 text-sm opacity-70"
                            style={cardStyle}
                        >
                            No teams have been published yet.
                        </p>
                    )}
                </section>

                <section className="mx-auto max-w-7xl px-5 py-7">
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Season Overview
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        {isExplicitTeamPage ? 'Team at a glance' : 'Club at a glance'}
                    </h2>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {[
                            { label: 'Played', value: seasonRecord.played, icon: Trophy },
                            { label: 'Won', value: seasonRecord.won, icon: ShieldCheck },
                            { label: 'Drawn', value: seasonRecord.drawn, icon: CircleDot },
                            { label: 'Lost', value: seasonRecord.lost, icon: Target },
                            { label: 'Goals For', value: seasonRecord.goalsFor, icon: Target },
                            { label: 'Goals Against', value: seasonRecord.goalsAgainst, icon: ShieldCheck },
                        ].map((item) => {
                            const Icon = item.icon
                            return (
                                <article
                                    key={item.label}
                                    className="rounded-xl border p-4"
                                    style={cardStyle}
                                >
                                    <Icon className="h-4 w-4 opacity-55" />
                                    <strong className="mt-3 block text-2xl font-black">
                                        {item.value}
                                    </strong>
                                    <span className="mt-1 block text-xs font-bold opacity-60">
                                        {item.label}
                                    </span>
                                </article>
                            )
                        })}
                    </div>
                </section>

                <section
                    id="fixtures"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Match Centre
                    </p>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                            Fixtures
                        </h2>
                        {scopedFixtures.length > 6 && (
                            <button
                                type="button"
                                onClick={() => setShowAllFixtures((value) => !value)}
                                className="rounded-full px-4 py-2 text-xs font-black"
                                style={{
                                    background: showAllFixtures
                                        ? `${accentColour}16`
                                        : accentColour,
                                    color: showAllFixtures
                                        ? accentColour
                                        : accentTextColour,
                                }}
                            >
                                {showAllFixtures ? 'Show fewer' : 'View all fixtures'}
                            </button>
                        )}
                    </div>

                    <div className="mt-4 space-y-3">
                        {displayedFixtures.map((fixture) => (
                            <article
                                key={fixture.id}
                                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                                style={cardStyle}
                            >
                                <div>
                                    {isMultiTeamOverview && (
                                        <p
                                            className="mb-1 text-[11px] font-black uppercase tracking-wider"
                                            style={{ color: accentColour }}
                                        >
                                            {getTeamLabel(
                                                fixture,
                                                publicTeamById,
                                                organisationName,
                                            )}
                                        </p>
                                    )}
                                    <p className="font-black">
                                        {getFixtureTitle(
                                            fixture,
                                            publicTeamById,
                                            currentContextName,
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm opacity-65">
                                        {formatClubPublicDate(fixture.fixtureDate)}
                                        {fixture.kickoffTime
                                            ? ` • ${fixture.kickoffTime.slice(0, 5)}`
                                            : ''}
                                        {' • '}
                                        {fixture.venueName ??
                                            (fixture.homeAway === 'away'
                                                ? 'Away'
                                                : 'Home')}
                                    </p>
                                </div>
                                <span
                                    className="rounded-full px-3 py-1 text-[10px] font-black uppercase"
                                    style={{
                                        background: `${accentColour}12`,
                                        color: accentColour,
                                    }}
                                >
                                    {fixture.fixtureType}
                                </span>
                            </article>
                        ))}

                        {displayedFixtures.length === 0 && (
                            <p
                                className="rounded-xl border p-5 text-sm opacity-65"
                                style={cardStyle}
                            >
                                No published fixtures yet.
                            </p>
                        )}
                    </div>
                </section>

                <section
                    id="results"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Form & Results
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        Recent Results
                    </h2>

                    <div className="mt-4 space-y-3">
                        {recentResults.map((result) => {
                            const fixture = fixtureById.get(result.fixtureId)
                            if (!fixture) {
                                return null
                            }

                            return (
                                <article
                                    key={result.id}
                                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                                    style={cardStyle}
                                >
                                    <div>
                                        {isMultiTeamOverview && (
                                            <p
                                                className="mb-1 text-[11px] font-black uppercase tracking-wider"
                                                style={{ color: accentColour }}
                                            >
                                                {getTeamLabel(
                                                    fixture,
                                                    publicTeamById,
                                                    organisationName,
                                                )}
                                            </p>
                                        )}
                                        <p className="font-black">
                                            {getFixtureTitle(
                                                fixture,
                                                publicTeamById,
                                                currentContextName,
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs opacity-60">
                                            {formatClubPublicDate(fixture.fixtureDate)}
                                        </p>
                                    </div>
                                    <strong
                                        className="text-2xl font-black"
                                        style={{ color: accentColour }}
                                    >
                                        {getResultScore(fixture, result)}
                                    </strong>
                                </article>
                            )
                        })}

                        {recentResults.length === 0 && (
                            <p
                                className="rounded-xl border p-5 text-sm opacity-65"
                                style={cardStyle}
                            >
                                No published results yet.
                            </p>
                        )}
                    </div>
                </section>

                <section
                    id="squad"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Players
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        {isMultiTeamOverview ? 'Squads by team' : 'Squad'}
                    </h2>

                    {isMultiTeamOverview ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {teamSummaries.map((summary) => {
                                const displayTeam =
                                    publicTeamById.get(summary.team.id) ??
                                    summary.team

                                return (
                                    <ClubTeamCard
                                        key={`squad-${summary.team.id}`}
                                        team={displayTeam}
                                        href={`${basePath}/teams/${encodeURIComponent(
                                            summary.team.id,
                                        )}#squad`}
                                        accentColour={accentColour}
                                        surfaceColour={surfaceColour}
                                        textColour={textColour}
                                        playerCount={summary.playerCount}
                                        nextFixtureLabel={summary.nextFixtureLabel}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {scopedSquad.slice(0, 20).map((player) => (
                                <article
                                    key={player.id}
                                    className="rounded-xl border p-4"
                                    style={cardStyle}
                                >
                                    <span
                                        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-black"
                                        style={{
                                            background: `${accentColour}15`,
                                            color: accentColour,
                                        }}
                                    >
                                        {player.squadNumber ?? '—'}
                                    </span>
                                    <p className="mt-3 font-bold">
                                        {player.playerName}
                                    </p>
                                    <p className="mt-1 text-xs opacity-60">
                                        {player.position ?? 'Squad member'}
                                    </p>
                                </article>
                            ))}

                            {scopedSquad.length === 0 && (
                                <p
                                    className="col-span-full rounded-xl border p-5 text-sm opacity-65"
                                    style={cardStyle}
                                >
                                    No squad members have been published yet.
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section
                    id="statistics"
                    className="mx-auto max-w-7xl scroll-mt-28 px-5 py-7"
                >
                    <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: accentColour }}
                    >
                        Player Statistics
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        Top Scorers
                    </h2>

                    <div
                        className="mt-4 rounded-2xl border p-5"
                        style={cardStyle}
                    >
                        {topScorers.map(([name, count], index) => (
                            <div
                                key={name}
                                className="flex items-center justify-between border-b py-3 text-sm last:border-b-0"
                                style={{ borderColor: `${accentColour}18` }}
                            >
                                <span>
                                    {index + 1}. {name}
                                </span>
                                <strong>{count}</strong>
                            </div>
                        ))}

                        {topScorers.length === 0 && (
                            <p className="text-sm opacity-65">
                                No goals recorded yet.
                            </p>
                        )}
                    </div>
                </section>

                {!loading && clubData.teams.length > 1 && isExplicitTeamPage && (
                    <section className="mx-auto max-w-7xl px-5 py-7">
                        <a
                            href={`${basePath}/teams#teams`}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black no-underline"
                            style={{
                                background: accentColour,
                                color: accentTextColour,
                            }}
                        >
                            <Users className="h-4 w-4" />
                            Explore all {organisationName} teams
                        </a>
                    </section>
                )}
            </div>

            <MediaSection
                media={media}
                organisationName={organisationName}
                accentColour={accentColour}
                surfaceColour={surfaceColour}
                textColour={textColour}
            />

            <ArticlesSection
                isBhmff={false}
                organisationName={organisationName}
                basePath={basePath}
                articles={articles}
                publicArticles={publicArticles}
                articlesLoading={articlesLoading}
                articlesError={articlesError}
                onReadArticle={setActiveArticleId}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />

            <SponsorsSection
                organisationName={organisationName}
                isBhmff={false}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
                accentTextColour={accentTextColour}
            />
        </>
    )
}
