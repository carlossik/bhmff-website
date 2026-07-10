import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, Camera, Shield, Users } from 'lucide-react'

import { getCurrentUser } from './services/auth'
import { supabase } from './lib/supabaseClient'

import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import {
    FixtureList,
    type PublicFixture,
} from './components/FixtureList'
import { TeamTable } from './components/TeamTable'
import { CkefaLink } from './components/CkefaLink'
import { CkefaLogo } from './components/CkefaLogo'
import { ArticlePage } from './components/ArticlePage'
import { TournamentCountdown } from './components/public/TournamentCountdown'
import { AdminPage } from './pages/AdminPage'

import {
    articles,
    lastYearFinalVideo,
    sponsors,
} from './data/festivalData'

type PublicTeamRow = {
    id: string
    name: string
    manager_name: string | null
}

type PublicVenueRow = {
    id: string
    name: string
    address: string | null
    postcode: string | null
    notes: string | null
}

type PublicFixtureRow = {
    id: string
    stage: string
    kickoff_time: string | null
    status: string | null
    home_team_id: string | null
    away_team_id: string | null
    venue_id: string | null
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

    const [isCheckingSession, setIsCheckingSession] = useState(true)

    const [activeArticleId, setActiveArticleId] =
        useState<string | null>(null)

    const [publicTeams, setPublicTeams] =
        useState<PublicTeamRow[]>([])

    const [publicFixtures, setPublicFixtures] =
        useState<PublicFixture[]>([])

    useEffect(() => {
        getCurrentUser().finally(() => {
            setIsCheckingSession(false)
        })
    }, [])

    useEffect(() => {
        async function loadPublicTournamentData() {
            const { data: festival, error: festivalError } =
                await supabase
                    .from('festivals')
                    .select('id')
                    .eq('status', 'active')
                    .order('year', { ascending: false })
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
                return
            }

            const [
                teamsResponse,
                venuesResponse,
                fixturesResponse,
            ] = await Promise.all([
                supabase
                    .from('teams')
                    .select('id, name, manager_name')
                    .eq('festival_id', festival.id)
                    .order('name', { ascending: true }),

                supabase
                    .from('venues')
                    .select('id, name, address, postcode, notes')
                    .eq('festival_id', festival.id)
                    .order('name', { ascending: true }),

                supabase
                    .from('fixtures')
                    .select(
                        `
                        id,
                        stage,
                        kickoff_time,
                        status,
                        home_team_id,
                        away_team_id,
                        venue_id
                        `
                    )
                    .eq('festival_id', festival.id)
                    .neq('status', 'cancelled')
                    .order('kickoff_time', {
                        ascending: true,
                        nullsFirst: false,
                    }),
            ])

            if (teamsResponse.error) {
                console.error(
                    'Failed to load public teams:',
                    teamsResponse.error
                )
                return
            }

            if (venuesResponse.error) {
                console.error(
                    'Failed to load public venues:',
                    venuesResponse.error
                )
                return
            }

            if (fixturesResponse.error) {
                console.error(
                    'Failed to load public fixtures:',
                    fixturesResponse.error
                )
                return
            }

            const teams =
                (teamsResponse.data ?? []) as PublicTeamRow[]

            const venues =
                (venuesResponse.data ?? []) as PublicVenueRow[]

            const fixtureRows =
                (fixturesResponse.data ?? []) as PublicFixtureRow[]

            const teamNames = new Map(
                teams.map((team) => [team.id, team.name])
            )

            const venueDetails = new Map(
                venues.map((venue) => [venue.id, venue])
            )

            setPublicTeams(teams)

            setPublicFixtures(
                fixtureRows.map((fixture) => {
                    const venue = venueDetails.get(
                        fixture.venue_id ?? ''
                    )

                    return {
                        id: fixture.id,
                        stage: fixture.stage,
                        kickoffTime: fixture.kickoff_time,
                        status: fixture.status ?? 'scheduled',
                        homeTeam:
                            teamNames.get(
                                fixture.home_team_id ?? ''
                            ) ?? 'Home team TBC',
                        awayTeam:
                            teamNames.get(
                                fixture.away_team_id ?? ''
                            ) ?? 'Away team TBC',
                        venueName:
                            venue?.name ?? 'Venue to be confirmed',
                        venueAddress: venue?.address ?? '',
                        venuePostcode: venue?.postcode ?? '',
                        venueNotes: venue?.notes ?? '',
                    }
                })
            )
        }

        loadPublicTournamentData()
    }, [])

    const activeArticle = useMemo(
        () =>
            articles.find(
                (article) => article.id === activeArticleId
            ),
        [activeArticleId]
    )

    if (activeArticle) {
        return (
            <ArticlePage
                article={activeArticle}
                onBack={() => setActiveArticleId(null)}
            />
        )
    }

    if (isCheckingSession) {
        return (
            <p
                className="container"
                style={{ padding: '2rem', color: 'white' }}
            >
                Checking session...
            </p>
        )
    }

    if (location.pathname === '/admin') {
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
                    {benefits.map(([title, text, Icon]) => (
                        <article className="card" key={title}>
                            <Icon className="icon" />
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </Section>

            <Section
                id="fixtures"
                title="October Festival Schedule"
                intro="The 2026 format gives every fixture proper focus while ensuring each team plays no more than once per weekend."
            >
                <div className="timeline">
                    {timeline.map(([week, title, detail]) => (
                        <article
                            className="timelineItem"
                            key={week}
                        >
                            <div className="timelineIcon">
                                <span>{week}</span>
                            </div>

                            <div className="timelineContent">
                                <h3>{title}</h3>
                                <p>{detail}</p>
                            </div>
                        </article>
                    ))}
                </div>

                <h3 className="subheading">
                    Confirmed Fixtures
                </h3>

                <FixtureList fixtures={publicFixtures} />
            </Section>

            <Section
                id="teams"
                title="Teams & Tables"
                intro="Confirmed participating teams for the Black History Month Football Festival."
            >
                <TeamTable
                    teams={publicTeams.map((team, index) => ({
                        id: index + 1,
                        name: team.name,
                        manager: team.manager_name ?? 'TBC',
                        played: 0,
                        won: 0,
                        drawn: 0,
                        lost: 0,
                        goalDifference: 0,
                        points: 0,
                    }))}
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
                            src={lastYearFinalVideo.embedUrl}
                            title={lastYearFinalVideo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />

                        <h3>Festival Highlights</h3>

                        <p>
                            Watch featured matches, finals and
                            tournament highlights produced by CKEFA
                            Media.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">
                            Match Highlights
                        </div>

                        <h3>Match Highlights</h3>

                        <p>
                            Catch goals, saves, celebrations and key
                            moments from featured festival fixtures.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">
                            Interviews
                        </div>

                        <h3>Live Coverage & Interviews</h3>

                        <p>
                            Follow interviews, post-match reactions,
                            player spotlights and behind-the-scenes
                            coverage.
                        </p>
                    </article>
                </div>
            </Section>

            <Section
                id="history"
                title="Black History Hub"
                intro="Connecting the football festival to Black History Month through articles, community stories and learning content."
            >
                <div className="cardGrid four">
                    {articles.map((article) => (
                        <article
                            className="card articleCard"
                            key={article.id}
                        >
                            <span className="badge">
                                {article.category}
                            </span>

                            <h3>{article.title}</h3>
                            <p>{article.summary}</p>

                            <button
                                type="button"
                                className="textButton"
                                onClick={() =>
                                    setActiveArticleId(article.id)
                                }
                            >
                                Read article
                            </button>
                        </article>
                    ))}
                </div>
            </Section>

            <Section
                id="sponsors"
                title="Festival Partners"
                intro="The festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. Additional partners are welcome."
            >
                <div className="cardGrid three">
                    {sponsors.map((sponsor) => (
                        <article
                            className="card sponsorCard"
                            key={sponsor.id}
                        >
                            <span className="badge">
                                {sponsor.tier}
                            </span>

                            <h3>{sponsor.name}</h3>
                            <p>{sponsor.description}</p>

                            <a
                                className="btn primary small"
                                href="mailto:info@ckefamedia.com?subject=Festival Partnership Enquiry"
                            >
                                Contact Us
                            </a>
                        </article>
                    ))}
                </div>
            </Section>

            <footer className="footer">
                <div className="container footerGrid">
                    <div>
                        <strong>
                            Black History Month Football Festival
                        </strong>

                        <p>
                            Powered by <CkefaLink />
                        </p>

                        <p>
                            Celebrating Football. Celebrating Culture.
                            Celebrating Community.
                        </p>
                    </div>

                    <CkefaLogo className="footerCkefaLogo" />
                </div>
            </footer>
        </>
    )
}

export default App