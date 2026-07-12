import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, Camera, Shield, Users } from 'lucide-react'
import { PublicGroupStandings } from './components/public/PublicGroupStandings'
import { getCurrentUser } from './services/auth'
import { supabase } from './lib/supabaseClient'
import { ArticleCard } from './components/ArticleCard'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import {
    FixtureList,
    type PublicFixture,
} from './components/FixtureList'
import {
    ResultsList,
    type PublicResult,
} from './components/ResultsList'
import {
    GoldenBootTable,
    type PublicGoal,
} from './components/GoldenBootTable'

import { CkefaLink } from './components/CkefaLink'
import { CkefaLogo } from './components/CkefaLogo'
import { ArticlePage } from './components/ArticlePage'
import { TournamentCountdown } from './components/public/TournamentCountdown'
import { AdminPage } from './pages/AdminPage'
import { PublicSponsors } from './components/public/PublicSponsors'

import {
    calculateStandings,
    type StandingsTeam,
} from './utils/calculateStandings'

import { lastYearFinalVideo } from './data/festivalData'
import { usePublicArticles } from './hooks/usePublicArticles'

type PublicTeamRow = {
    id: string
    name: string
    manager_name: string | null
    logo_url: string | null
}

type RelatedTeam = {
    id: string
    name: string
}

type RelatedTeamValue =
    | RelatedTeam
    | RelatedTeam[]
    | null

type VenueDetails = {
    name: string
    address: string | null
    postcode: string | null
    notes: string | null
}

type RelatedVenue =
    | VenueDetails
    | VenueDetails[]
    | null

type PublicFixtureRelationRow = {
    id: string
    stage: string
    kickoff_time: string | null
    status: string | null
    home_team: RelatedTeamValue
    away_team: RelatedTeamValue
    venue: RelatedVenue
}

type ResultFixtureDetails = {
    id: string
    festival_id: string | null
    stage: string
    kickoff_time: string | null
    home_team: RelatedTeamValue
    away_team: RelatedTeamValue
}

type RelatedResultFixture =
    | ResultFixtureDetails
    | ResultFixtureDetails[]
    | null

type PublicResultRelationRow = {
    id: string
    fixture_id: string
    home_score: number
    away_score: number
    player_of_match: string | null
    match_report: string | null
    fixture: RelatedResultFixture
}

type GoalTeamRelation = {
    id: string
    name: string
    logo_url: string | null
}

type RelatedGoalTeam =
    | GoalTeamRelation
    | GoalTeamRelation[]
    | null

type PublicGoalRelationRow = {
    id: string
    fixture_id: string | null
    player_name: string
    minute: number | null
    video_timestamp: string | null
    team: RelatedGoalTeam
}

function getRelatedTeam(
    relation: RelatedTeamValue
): RelatedTeam | null {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

function getRelatedVenue(
    relation: RelatedVenue
) {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

function getRelatedResultFixture(
    relation: RelatedResultFixture
) {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

function getRelatedGoalTeam(
    relation: RelatedGoalTeam
) {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

const benefits = [
    [
        'Full Month Format',
        'The festival spreads games across October instead of forcing several matches into one day.',
        Calendar,
    ],
    [
        'Player Welfare',
        'Longer recovery windows help reduce fatigue, protect players and allow matches to be played properly.',
        Shield,
    ],
    [
        'Community Platform',
        'The event brings together clubs, families, volunteers, sponsors and local businesses.',
        Users,
    ],
    [
        'CKEFA Media Coverage',
        'Highlights, interviews, goals and match stories create a lasting digital archive.',
        Camera,
    ],
] as const

const timeline = [
    [
        'Weekend 1',
        'Opening Weekend & Group Fixtures',
        'Festival opening, team welcome, first group fixtures and community activity.',
    ],
    [
        'Weekend 2',
        'Group Fixtures Continue',
        'The second round of group matches, sponsor activity and matchday media coverage.',
    ],
    [
        'Weekend 3',
        'Semi Finals',
        'The four qualifying teams compete for places in the festival final.',
    ],
    [
        'Weekend 4',
        'Grand Final',
        'The two semi-final winners compete for the Black History Month Football Festival title.',
    ],
] as const

function App() {
    const location = useLocation()

    const [isCheckingSession, setIsCheckingSession] =
        useState(true)

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles()

    const [publicTeams, setPublicTeams] =
        useState<PublicTeamRow[]>([])

    const [publicFixtures, setPublicFixtures] =
        useState<PublicFixture[]>([])

    const [publicResults, setPublicResults] =
        useState<PublicResult[]>([])

    const [publicGoals, setPublicGoals] =
        useState<PublicGoal[]>([])

    useEffect(() => {
        getCurrentUser().finally(() => {
            setIsCheckingSession(false)
        })
    }, [])

    useEffect(() => {
        async function loadPublicTournamentData() {
            const {
                data: festival,
                error: festivalError,
            } = await supabase
                .from('festivals')
                .select('id')
                .eq('status', 'active')
                .order('year', {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle()

            if (festivalError) {
                console.error(
                    'Failed to load active festival:',
                    festivalError
                )
                return
            }

            if (!festival) {
                setPublicTeams([])
                setPublicFixtures([])
                setPublicResults([])
                setPublicGoals([])
                return
            }

            const [
                teamsResponse,
                fixturesResponse,
                resultsResponse,
            ] = await Promise.all([
                supabase
                    .from('teams')
                    .select(
                        'id, name, manager_name, logo_url'
                    )
                    .eq(
                        'festival_id',
                        festival.id
                    )
                    .order('name', {
                        ascending: true,
                    }),

                supabase
                    .from('fixtures')
                    .select(`
                        id,
                        stage,
                        kickoff_time,
                        status,
                        home_team:teams!fixtures_home_team_id_fkey (
                            id,
                            name
                        ),
                        away_team:teams!fixtures_away_team_id_fkey (
                            id,
                            name
                        ),
                        venue:venues!fixtures_venue_id_fkey (
                            name,
                            address,
                            postcode,
                            notes
                        )
                    `)
                    .eq(
                        'festival_id',
                        festival.id
                    )
                    .neq(
                        'status',
                        'cancelled'
                    )
                    .order(
                        'kickoff_time',
                        {
                            ascending: true,
                            nullsFirst: false,
                        }
                    ),

                supabase
                    .from('results')
                    .select(`
                        id,
                        fixture_id,
                        home_score,
                        away_score,
                        player_of_match,
                        match_report,
                        fixture:fixtures!results_fixture_id_fkey!inner (
                            id,
                            festival_id,
                            stage,
                            kickoff_time,
                            home_team:teams!fixtures_home_team_id_fkey (
                                id,
                                name
                            ),
                            away_team:teams!fixtures_away_team_id_fkey (
                                id,
                                name
                            )
                        )
                    `)
                    .eq('published', true)
                    .eq(
                        'fixture.festival_id',
                        festival.id
                    ),
            ])

            if (teamsResponse.error) {
                console.error(
                    'Failed to load public teams:',
                    teamsResponse.error
                )
                setPublicTeams([])
            } else {
                setPublicTeams(
                    (teamsResponse.data ??
                        []) as PublicTeamRow[]
                )
            }

            if (fixturesResponse.error) {
                console.error(
                    'Failed to load public fixtures:',
                    fixturesResponse.error
                )
                setPublicFixtures([])
            } else {
                const fixtureRows =
                    (fixturesResponse.data ??
                        []) as unknown as PublicFixtureRelationRow[]

                setPublicFixtures(
                    fixtureRows.map(
                        (fixture) => {
                            const homeTeam =
                                getRelatedTeam(
                                    fixture.home_team
                                )

                            const awayTeam =
                                getRelatedTeam(
                                    fixture.away_team
                                )

                            const venue =
                                getRelatedVenue(
                                    fixture.venue
                                )

                            return {
                                id: fixture.id,
                                stage:
                                fixture.stage,
                                kickoffTime:
                                fixture.kickoff_time,
                                status:
                                    fixture.status ??
                                    'scheduled',
                                homeTeam:
                                    homeTeam?.name.trim() ??
                                    'Home team TBC',
                                awayTeam:
                                    awayTeam?.name.trim() ??
                                    'Away team TBC',
                                venueName:
                                    venue?.name ??
                                    'Venue to be confirmed',
                                venueAddress:
                                    venue?.address ??
                                    '',
                                venuePostcode:
                                    venue?.postcode ??
                                    '',
                                venueNotes:
                                    venue?.notes ??
                                    '',
                            }
                        }
                    )
                )
            }

            let mappedResults: PublicResult[] = []

            if (resultsResponse.error) {
                console.error(
                    'Failed to load public results:',
                    resultsResponse.error
                )
                setPublicResults([])
            } else {
                const resultRows =
                    (resultsResponse.data ??
                        []) as unknown as PublicResultRelationRow[]

                mappedResults = resultRows
                    .map((result) => {
                        const fixture =
                            getRelatedResultFixture(
                                result.fixture
                            )

                        if (!fixture) {
                            return null
                        }

                        const homeTeam =
                            getRelatedTeam(
                                fixture.home_team
                            )

                        const awayTeam =
                            getRelatedTeam(
                                fixture.away_team
                            )

                        if (
                            !homeTeam ||
                            !awayTeam
                        ) {
                            return null
                        }

                        return {
                            id: result.id,
                            fixtureId:
                            result.fixture_id,
                            stage:
                            fixture.stage,
                            kickoffTime:
                            fixture.kickoff_time,
                            homeTeamId:
                            homeTeam.id,
                            awayTeamId:
                            awayTeam.id,
                            homeTeam:
                                homeTeam.name.trim(),
                            awayTeam:
                                awayTeam.name.trim(),
                            homeScore:
                            result.home_score,
                            awayScore:
                            result.away_score,
                            playerOfMatch:
                                result.player_of_match ??
                                '',
                            matchReport:
                                result.match_report ??
                                '',
                        }
                    })
                    .filter(
                        (
                            result
                        ): result is PublicResult =>
                            result !== null
                    )
                    .sort(
                        (
                            first,
                            second
                        ) => {
                            const firstTime =
                                first.kickoffTime
                                    ? new Date(
                                        first.kickoffTime
                                    ).getTime()
                                    : 0

                            const secondTime =
                                second.kickoffTime
                                    ? new Date(
                                        second.kickoffTime
                                    ).getTime()
                                    : 0

                            return (
                                secondTime -
                                firstTime
                            )
                        }
                    )

                setPublicResults(
                    mappedResults
                )
            }

            const publishedFixtureIds =
                mappedResults.map(
                    (result) =>
                        result.fixtureId
                )

            if (
                !publishedFixtureIds.length
            ) {
                setPublicGoals([])
                return
            }

            const {
                data: goalsData,
                error: goalsError,
            } = await supabase
                .from('goals')
                .select(`
                    id,
                    fixture_id,
                    player_name,
                    minute,
                    video_timestamp,
                    team:teams!goals_team_id_fkey (
                        id,
                        name,
                        logo_url
                    )
                `)
                .in(
                    'fixture_id',
                    publishedFixtureIds
                )
                .order('created_at', {
                    ascending: true,
                })

            if (goalsError) {
                console.error(
                    'Failed to load public goals:',
                    goalsError
                )
                setPublicGoals([])
                return
            }

            const goalRows =
                (goalsData ??
                    []) as unknown as PublicGoalRelationRow[]

            const mappedGoals = goalRows
                .map((goal) => {
                    const team =
                        getRelatedGoalTeam(
                            goal.team
                        )

                    if (
                        !team ||
                        !goal.fixture_id
                    ) {
                        return null
                    }

                    return {
                        id: goal.id,
                        fixtureId:
                        goal.fixture_id,
                        teamId: team.id,
                        teamName:
                            team.name.trim(),
                        teamLogoUrl:
                            team.logo_url ?? '',
                        playerName:
                            goal.player_name.trim(),
                        minute:
                        goal.minute,
                        videoTimestamp:
                            goal.video_timestamp ??
                            '',
                    }
                })
                .filter(
                    (
                        goal
                    ): goal is PublicGoal =>
                        goal !== null
                )

            setPublicGoals(mappedGoals)
        }

        loadPublicTournamentData()
    }, [])

    const activeArticle = useMemo(
        () =>
            publicArticles.find(
                (article) =>
                    article.id ===
                    activeArticleId
            ),
        [activeArticleId, publicArticles]
    )

    const standingsTeams =
        useMemo<StandingsTeam[]>(
            () =>
                publicTeams.map(
                    (team) => ({
                        id: team.id,
                        name:
                            team.name.trim(),
                        manager:
                            team.manager_name ??
                            'TBC',
                        logoUrl:
                            team.logo_url ??
                            '',
                    })
                ),
            [publicTeams]
        )

    const leagueStandings =
        useMemo(
            () =>
                calculateStandings(
                    standingsTeams,
                    publicResults.map(
                        (result) => ({
                            homeTeamId:
                            result.homeTeamId,
                            awayTeamId:
                            result.awayTeamId,
                            homeScore:
                            result.homeScore,
                            awayScore:
                            result.awayScore,
                        })
                    )
                ),
            [
                standingsTeams,
                publicResults,
            ]
        )

    if (activeArticle) {
        return (
            <ArticlePage
                article={activeArticle}
                onBack={() =>
                    setActiveArticleId(
                        null
                    )
                }
            />
        )
    }

    if (isCheckingSession) {
        return (
            <p
                className="container"
                style={{
                    padding: '2rem',
                    color: 'white',
                }}
            >
                Checking session...
            </p>
        )
    }

    if (
        location.pathname ===
        '/admin'
    ) {
        return <AdminPage />
    }

    return (
        <>
            <Header />
            <TournamentCountdown />
            <Hero />

            <Section
                id="festival"
                title="The Festival Vision"
                intro="A month-long football celebration built around player welfare, community pride, cultural legacy and professional media coverage."
            >
                <div className="cardGrid four">
                    {benefits.map(
                        ([
                             title,
                             text,
                             Icon,
                         ]) => (
                            <article
                                className="card"
                                key={title}
                            >
                                <Icon className="icon" />
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </article>
                        )
                    )}
                </div>
            </Section>

            <Section
                id="fixtures"
                title="October Festival Schedule"
                intro="The 2026 format gives every fixture proper focus while ensuring each team plays no more than once per weekend."
            >
                <div className="timeline">
                    {timeline.map(
                        ([
                             week,
                             title,
                             detail,
                         ]) => (
                            <article
                                className="timelineItem"
                                key={week}
                            >
                                <div className="timelineIcon">
                                    <span>
                                        {week}
                                    </span>
                                </div>

                                <div className="timelineContent">
                                    <h3>
                                        {title}
                                    </h3>

                                    <p>
                                        {detail}
                                    </p>
                                </div>
                            </article>
                        )
                    )}
                </div>

                <h3 className="subheading">
                    Confirmed Fixtures
                </h3>

                <FixtureList
                    fixtures={
                        publicFixtures
                    }
                />
            </Section>

            <Section
                id="results"
                title="Latest Results"
                intro="Confirmed and published match results from the Black History Month Football Festival."
            >
                <ResultsList
                    results={
                        publicResults
                    }
                />
            </Section>

            <Section
                id="teams"
                title="Teams & Group Standings"
                intro="Live group tables calculated automatically from published group-stage results. Knockout fixtures do not affect group standings."
            >
                <PublicGroupStandings />
            </Section>

            <Section
                id="golden-boot"
                title="Golden Boot"
                intro="The leading goalscorers from published Black History Month Football Festival matches."
            >
                <GoldenBootTable
                    goals={publicGoals}
                />
            </Section>

            <Section
                id="media"
                title="Official Media Coverage"
                intro="Featured matches are professionally filmed, with highlights, interviews and exclusive coverage produced by CKEFA Media throughout the festival."
            >
                <div className="cardGrid three">
                    <article className="videoCard featuredVideo">
                        <iframe
                            className="mediaIframe"
                            src={
                                lastYearFinalVideo.embedUrl
                            }
                            title={
                                lastYearFinalVideo.title
                            }
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />

                        <h3>
                            Festival Highlights
                        </h3>

                        <p>
                            Watch featured matches,
                            finals and tournament
                            highlights produced by
                            CKEFA Media.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">
                            Match Highlights
                        </div>

                        <h3>
                            Match Highlights
                        </h3>

                        <p>
                            Catch goals, saves,
                            celebrations and key
                            moments from featured
                            festival fixtures.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">
                            Interviews
                        </div>

                        <h3>
                            Live Coverage & Interviews
                        </h3>

                        <p>
                            Follow interviews,
                            post-match reactions,
                            player spotlights and
                            behind-the-scenes coverage.
                        </p>
                    </article>
                </div>
            </Section>

            <Section
                id="history"
                title="Black History Hub"
                intro="Connecting the football festival to Black History Month through articles, community stories and learning content."
            >
                {articlesLoading && (
                    <p>Loading articles...</p>
                )}

                {articlesError && (
                    <p className="formError">
                        {articlesError}
                    </p>
                )}

                {!articlesLoading && (
                    <div className="cardGrid four">
                        {publicArticles.map((article) => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                onRead={setActiveArticleId}
                            />
                        ))}
                    </div>
                )}
            </Section>

            <Section
                id="sponsors"
                title="Festival Partners"
                intro="The festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. Additional partners are welcome."
            >
                <PublicSponsors />
            </Section>
            <footer className="footer">
                <div className="container footerGrid">
                    <div>
                        <strong>
                            Black History Month
                            Football Festival
                        </strong>

                        <p>
                            Powered by{' '}
                            <CkefaLink />
                        </p>

                        <p>
                            Celebrating Football.
                            Celebrating Culture.
                            Celebrating Community.
                        </p>
                    </div>

                    <CkefaLogo
                        className="footerCkefaLogo"
                    />
                </div>
            </footer>
        </>
    )
}

export default App