import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
    Calendar,
    Camera,
    Handshake,
    Scale,
    Shield,
    Trophy,
    UserCheck,
    Users,
} from 'lucide-react'
import { PublicGroupStandings } from './components/public/PublicGroupStandings'
import {
    PublicTeams,
    type PublicTeam,
} from './components/public/PublicTeams'
import { HomePage } from './pages/Home/HomePage'
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

import { ArticlePage } from './components/ArticlePage'
import { TournamentCountdown } from './components/public/TournamentCountdown'
import { AdminPage } from './pages/AdminPage'
import { PublicSponsors } from './components/public/PublicSponsors'
import { DemoRequestModal } from './components/public/DemoRequestModal'

import {
    calculateStandings,
    type StandingsTeam,
} from './utils/calculateStandings'

import { lastYearFinalVideo } from './data/festivalData'
import { usePublicArticles } from './hooks/usePublicArticles'
import { SetPasswordPage } from './pages/Auth/SetPasswordPage'
import { PublicOrganisationLayout } from './pages/public/PublicOrganisationLayout'

type RelatedTeam = {
    id: string
    name: string
}

type RelatedTeamValue =
    | RelatedTeam
    | RelatedTeam[]
    | null

type PublicTeamDetails = {
    id: string
    name: string
    manager_name: string | null
    logo_url: string | null
    published: boolean
    participation_status: string | null
}

type RelatedPublicTeam =
    | PublicTeamDetails
    | PublicTeamDetails[]
    | null

type CompetitionTeamRelation = {
    id: string
    team_id: string
    team: RelatedTeamValue
}

type RelatedCompetitionTeam =
    | CompetitionTeamRelation
    | CompetitionTeamRelation[]
    | null

type PublicCompetitionTeamRow = {
    id: string
    team_id: string
    team: RelatedPublicTeam
}

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
    home_competition_team: RelatedCompetitionTeam
    away_competition_team: RelatedCompetitionTeam
    venue: RelatedVenue
}

type ResultFixtureDetails = {
    id: string
    competition_id: string | null
    stage: string
    kickoff_time: string | null
    home_competition_team: RelatedCompetitionTeam
    away_competition_team: RelatedCompetitionTeam
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

function getRelatedPublicTeam(
    relation: RelatedPublicTeam
): PublicTeamDetails | null {
    if (!relation) {
        return null
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

function getRelatedCompetitionTeam(
    relation: RelatedCompetitionTeam
): CompetitionTeamRelation | null {
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

const PUBLIC_COMPETITION_NAME =
    (
        import.meta.env
            .VITE_PUBLIC_COMPETITION_NAME as
            | string
            | undefined
    )?.trim() ||
    'Black History Month Football Tournament'

const benefits = [
    [
        'Competition Format',
        'The tournament begins with group-stage football, where every team plays every other team in their group once. Group winners and runners-up qualify for the semi-finals, with the winners progressing to the Championship Final.',
        Trophy,
    ],
    [
        'Tournament Rules',
        'Every fixture is played under the Laws of the Game and the published tournament regulations. Player eligibility, substitutions, disciplinary procedures, scheduling and competition decisions are applied consistently.',
        Scale,
    ],
    [
        'Match Officials',
        'Qualified referees and supporting match officials will be appointed to fixtures. Officials will record match reports, disciplinary incidents and key match events through TournamentHQ.',
        UserCheck,
    ],
    [
        'Respect & Code of Conduct',
        'We operate a zero-tolerance policy towards racism, discrimination, referee abuse, violence, intimidation and unsporting behaviour. Players, coaches and supporters must uphold the highest standards of respect.',
        Shield,
    ],
    [
        'Player Welfare',
        'Fixtures are scheduled to provide sensible recovery time, reduce unnecessary congestion and create the safest possible competitive environment for every player.',
        Calendar,
    ],
    [
        'Professional Media Coverage',
        'Match filming, highlights, interviews, reports and digital storytelling will showcase players, clubs, partners and the wider community throughout the tournament.',
        Camera,
    ],
    [
        'Community Legacy',
        'The festival promotes education, Black History Month, community cohesion and opportunities for young people while building lasting relationships with businesses and public organisations.',
        Users,
    ],
    [
        'Partnership & Investment',
        'The tournament offers a credible platform for sponsors and strategic partners to support grassroots football, youth development, inclusion and measurable community impact.',
        Handshake,
    ],
] as const

const timeline = [
    [
        'Group Stage',
        'Opening Fixtures',
        'Teams begin their group-stage campaigns, with each side playing every other team in its group once.',
    ],
    [
        'Group Stage',
        'Qualification Decided',
        'The remaining group fixtures determine the group winners and runners-up who progress to the semi-finals.',
    ],
    [
        'Semi Finals',
        'Final Places at Stake',
        'The four qualifying teams compete in two semi-finals, with both winners progressing to the Championship Final.',
    ],
    [
        'Finals',
        'Final & Third-Place Match',
        'The semi-final winners compete for the Black History Month Football Festival title, while the remaining teams contest the third-place match before presentations and awards.',
    ],
] as const

const ckefaEcosystem = [
    {
        name: 'FCFS Events',
        description:
            'Create, discover and manage events, registrations and attendance through the FCFS platform.',
        action: 'Explore FCFS',
        url: 'https://fcfs.app',
    },
    {
        name: 'CKEFA Media',
        description:
            'Grassroots football livestreams, match highlights, interviews and community sports coverage.',
        action: 'Watch CKEFA Media',
        url: 'https://www.youtube.com/@CKEFAMedia',
    },
    {
        name: 'CKEFA Software Solutions',
        description:
            'Software development, quality engineering, AI consultancy, governance and digital transformation.',
        action: 'Visit CKEFA',
        url: 'https://www.ckefa.co.uk',
    },
    {
        name: 'TournamentHQ',
        description:
            'Professional tournament management software for leagues, cups, tournaments and community sports competitions.',
        action: 'Request a Demo',
        requestDemo: true,
    },
] satisfies ReadonlyArray<{
    name: string
    description: string
    action: string
    url?: string
    requestDemo?: boolean
}>

function App() {
    const location = useLocation()

    const [isCheckingSession, setIsCheckingSession] =
        useState(true)

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)

    const [showDemoRequest, setShowDemoRequest] =
        useState(false)

    const {
        articles: publicArticles,
        loading: articlesLoading,
        error: articlesError,
    } = usePublicArticles()

    const [publicTeams, setPublicTeams] =
        useState<PublicTeam[]>([])

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
        let requestVersion = 0
        let isDisposed = false

        async function loadPublicTournamentData() {
            const currentRequest =
                ++requestVersion

            const {
                data: competition,
                error: competitionError,
            } = await supabase
                .from('competitions')
                .select('id')
                .eq(
                    'name',
                    PUBLIC_COMPETITION_NAME
                )
                .eq('status', 'ACTIVE')
                .eq('published', true)
                .order('start_date', {
                    ascending: false,
                    nullsFirst: false,
                })
                .order('created_at', {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle()

            if (
                isDisposed ||
                currentRequest !==
                requestVersion
            ) {
                return
            }

            if (competitionError) {
                console.error(
                    'Failed to load the published public competition:',
                    competitionError
                )
                return
            }

            if (!competition) {
                console.warn(
                    `No active published competition was found for "${PUBLIC_COMPETITION_NAME}".`
                )
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
                    .from('competition_teams')
                    .select(`
                        id,
                        team_id,
                        team:teams!competition_teams_team_id_fkey (
                            id,
                            name,
                            manager_name,
                            logo_url,
                            published,
                            participation_status
                        )
                    `)
                    .eq('competition_id', competition.id)
                    .order('team_id', {
                        ascending: true,
                    }),

                supabase
                    .from('fixtures')
                    .select(`
                        id,
                        stage,
                        kickoff_time,
                        status,
                        home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                            id,
                            team_id,
                            team:teams!competition_teams_team_id_fkey (
                                id,
                                name
                            )
                        ),
                        away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                            id,
                            team_id,
                            team:teams!competition_teams_team_id_fkey (
                                id,
                                name
                            )
                        ),
                        venue:venues!fixtures_venue_id_fkey (
                            name,
                            address,
                            postcode,
                            notes
                        )
                    `)
                    .eq('competition_id', competition.id)
                    .neq('status', 'cancelled')
                    .order('kickoff_time', {
                        ascending: true,
                        nullsFirst: false,
                    }),

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
                            competition_id,
                            stage,
                            kickoff_time,
                            home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                                id,
                                team_id,
                                team:teams!competition_teams_team_id_fkey (
                                    id,
                                    name
                                )
                            ),
                            away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                                id,
                                team_id,
                                team:teams!competition_teams_team_id_fkey (
                                    id,
                                    name
                                )
                            )
                        )
                    `)
                    .eq('published', true)
                    .eq(
                        'fixture.competition_id',
                        competition.id
                    ),
            ])

            if (
                isDisposed ||
                currentRequest !==
                requestVersion
            ) {
                return
            }

            if (teamsResponse.error) {
                console.error(
                    'Failed to load public teams:',
                    teamsResponse.error
                )
                setPublicTeams([])
            } else {
                const competitionTeamRows =
                    (teamsResponse.data ??
                        []) as unknown as PublicCompetitionTeamRow[]

                const mappedTeams = competitionTeamRows
                    .map((row) => {
                        const team =
                            getRelatedPublicTeam(
                                row.team
                            )

                        if (
                            !team ||
                            !team.published ||
                            team.participation_status !==
                            'confirmed'
                        ) {
                            return null
                        }

                        return {
                            id: team.id,
                            name: team.name,
                            manager_name:
                            team.manager_name,
                            logo_url:
                            team.logo_url,
                        }
                    })
                    .filter(
                        (
                            team
                        ): team is PublicTeam =>
                            team !== null
                    )
                    .sort((first, second) =>
                        first.name.localeCompare(
                            second.name
                        )
                    )

                setPublicTeams(mappedTeams)
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
                    fixtureRows.map((fixture) => {
                        const homeCompetitionTeam =
                            getRelatedCompetitionTeam(
                                fixture.home_competition_team
                            )

                        const awayCompetitionTeam =
                            getRelatedCompetitionTeam(
                                fixture.away_competition_team
                            )

                        const homeTeam =
                            getRelatedTeam(
                                homeCompetitionTeam?.team ??
                                null
                            )

                        const awayTeam =
                            getRelatedTeam(
                                awayCompetitionTeam?.team ??
                                null
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
                    })
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

                        const homeCompetitionTeam =
                            getRelatedCompetitionTeam(
                                fixture.home_competition_team
                            )

                        const awayCompetitionTeam =
                            getRelatedCompetitionTeam(
                                fixture.away_competition_team
                            )

                        const homeTeam =
                            getRelatedTeam(
                                homeCompetitionTeam?.team ??
                                null
                            )

                        const awayTeam =
                            getRelatedTeam(
                                awayCompetitionTeam?.team ??
                                null
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

            if (
                isDisposed ||
                currentRequest !==
                requestVersion
            ) {
                return
            }

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

        function refreshWhenVisible() {
            if (
                document.visibilityState ===
                'visible'
            ) {
                void loadPublicTournamentData()
            }
        }

        void loadPublicTournamentData()

        window.addEventListener(
            'focus',
            refreshWhenVisible
        )

        document.addEventListener(
            'visibilitychange',
            refreshWhenVisible
        )

        return () => {
            isDisposed = true
            requestVersion += 1

            window.removeEventListener(
                'focus',
                refreshWhenVisible
            )

            document.removeEventListener(
                'visibilitychange',
                refreshWhenVisible
            )
        }
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
        location.pathname.startsWith('/o/')
    ) {
        return <PublicOrganisationLayout />
    }

    if (
        location.pathname ===
        '/admin/set-password'
    ) {
        return <SetPasswordPage />
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
                title="Tournament Standards & Governance"
                intro="A professionally organised tournament with a clear competitive pathway, qualified match officials, strong safeguarding standards, zero tolerance for discrimination and a platform designed to attract credible partners and long-term investment."
            >
                <div className="cardGrid four tournamentStandardsGrid">
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
                title="Tournament Pathway"
                intro="The competition progresses from a single round-robin group stage to the semi-finals, followed by the final and third-place match, with fixtures scheduled to give every game proper focus."
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
                intro="Meet the confirmed participating clubs and follow live group tables calculated automatically from published group-stage results."
            >
                <PublicTeams
                    teams={publicTeams}
                />

                <PublicGroupStandings />
            </Section>

            <Section
                id="statistics"
                title="Statistics Centre"
                intro="Official tournament statistics calculated from published match data."
            >
                <h3 className="subheading">
                    Top Scorers
                </h3>

                <p
                    style={{
                        marginTop: '-0.35rem',
                        marginBottom: '1.25rem',
                        opacity: 0.78,
                    }}
                >
                    Live goalscoring leaderboard from confirmed tournament matches. The leading scorer at the end of the competition will receive the Golden Boot Award.
                </p>

                <GoldenBootTable
                    goals={publicGoals}
                />
            </Section>

            <Section
                id="media"
                title="Official Media Coverage"
                intro="Featured matches are professionally filmed, with highlights, interviews and exclusive coverage presented through the official TournamentHQ-powered competition website."
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
            {showDemoRequest && (
                <DemoRequestModal
                    onClose={() =>
                        setShowDemoRequest(false)
                    }
                />
            )}

            <footer
                className="footer"
                style={{
                    padding: '1.15rem 0',
                    minHeight: 'auto',
                }}
            >
                <div
                    className="container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'minmax(220px, 1fr) auto',
                        alignItems: 'center',
                        gap: '1.5rem',
                    }}
                >
                    <div>
                        <a
                            href="https://tournamenthq.co.uk"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            <img
                                src="/assets/tournamenthq-logo.png"
                                alt="TournamentHQ"
                                style={{
                                    display: 'block',
                                    width: '190px',
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '52px',
                                    objectFit: 'contain',
                                }}
                            />
                        </a>

                        <p
                            style={{
                                margin: '0.4rem 0 0',
                                maxWidth: '540px',
                                fontSize: '0.82rem',
                                lineHeight: 1.45,
                                opacity: 0.76,
                            }}
                        >
                            Official competition website powered by TournamentHQ, a CKEFA Software Solutions platform.
                        </p>
                    </div>

                    <div
                        aria-label="CKEFA group companies"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.65rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        {[
                            {
                                label: 'FCFS',
                                href: 'https://fcfs.app',
                                accent: '#3b82f6',
                            },
                            {
                                label: 'CKEFA Media',
                                href: 'https://www.youtube.com/@CKEFAMedia',
                                accent: '#ef4444',
                            },
                            {
                                label: 'CKEFA Software',
                                href: 'https://www.ckefa.co.uk',
                                accent: '#f59e0b',
                            },
                        ].map((brand) => (
                            <a
                                key={brand.label}
                                href={brand.href}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    minHeight: '34px',
                                    padding: '0.45rem 0.7rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${brand.accent}70`,
                                    color: 'inherit',
                                    background: `${brand.accent}12`,
                                    textDecoration: 'none',
                                    fontSize: '0.72rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.03em',
                                }}
                            >
                                {brand.label}
                            </a>
                        ))}

                        <button
                            type="button"
                            onClick={() =>
                                setShowDemoRequest(true)
                            }
                            style={{
                                minHeight: '34px',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(132, 204, 22, 0.55)',
                                color: '#b8ff7a',
                                background: 'rgba(132, 204, 22, 0.12)',
                                font: 'inherit',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                            }}
                        >
                            Request a Demo
                        </button>
                    </div>
                </div>
            </footer>        </>
    )
}

export default App