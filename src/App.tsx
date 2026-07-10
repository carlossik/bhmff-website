import { useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from './services/auth'
import { Calendar, Camera, Shield, Users } from 'lucide-react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import { FixtureList } from './components/FixtureList'
import { TeamTable } from './components/TeamTable'
import { CkefaLink } from './components/CkefaLink'
import { CkefaLogo } from './components/CkefaLogo'
import { ArticlePage } from './components/ArticlePage'
import { useLocation } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { articles, fixtures, lastYearFinalVideo, sponsors } from './data/festivalData'
import { supabase } from './lib/supabaseClient'
import { TournamentCountdown } from './components/public/TournamentCountdown'

const benefits = [
    ['Full Month Format', 'The festival spreads games across October instead of forcing several matches into one day.', Calendar],
    ['Player Welfare', 'Longer recovery windows help reduce fatigue, protect players and allow matches to be played properly.', Shield],
    ['Community Platform', 'The event brings together clubs, families, volunteers, sponsors and local businesses.', Users],
    ['CKEFA Media Coverage', 'Highlights, interviews, goals and match stories create a lasting digital archive.', Camera],
]

const timeline = [
    ['Weekend 1', 'Opening Weekend & Group Fixtures', 'Festival opening, team welcome, first fixtures and community activity.'],
    ['Weekend 2', 'Group Fixtures Continue', 'More group games, sponsor activity and matchday media coverage.'],
    ['Weekend 3', 'Semi Finals', 'The final four compete for a place in the final weekend.'],
    ['Weekend 4', 'Grand Final', 'The finalists compete for the festival title.'],
]

function App() {
    const location = useLocation()
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
    const [publicTeams, setPublicTeams] = useState<any[]>([])

    useEffect(() => {
        getCurrentUser().finally(() => {
            setIsCheckingSession(false)
        })
    }, [])

    useEffect(() => {
        async function loadPublicTeams() {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('name', { ascending: true })

            if (error) {
                console.error('Failed to load public teams:', error)
                return
            }

            setPublicTeams(data ?? [])
        }

        loadPublicTeams()
    }, [])

    const activeArticle = useMemo(
        () => articles.find((article) => article.id === activeArticleId),
        [activeArticleId]
    )

    if (activeArticle) {
        return <ArticlePage article={activeArticle} onBack={() => setActiveArticleId(null)} />
    }

    if (isCheckingSession) {
        return (
            <p className="container" style={{ padding: '2rem', color: 'white' }}>
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
                        <article className="card" key={title as string}>
                            <Icon className="icon" />
                            <h3>{title as string}</h3>
                            <p>{text as string}</p>
                        </article>
                    ))}
                </div>
            </Section>

            <Section
                id="fixtures"
                title="October Festival Schedule"
                intro="The 2026 format is designed to give every fixture proper focus while keeping each team to one match per weekend."
            >
                <div className="timeline">
                    {timeline.map(([week, title, detail]) => (
                        <article className="timelineItem" key={week}>
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

                <h3 className="subheading">Sample Fixtures</h3>
                <FixtureList fixtures={fixtures} />
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
                intro="Every featured match is professionally filmed, with highlights, interviews and exclusive coverage produced by CKEFA Media throughout the festival."
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
                            Watch featured matches, finals and tournament highlights produced by CKEFA Media,
                            bringing the best moments of the festival to supporters everywhere.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">Match Highlights</div>
                        <h3>Match Highlights</h3>
                        <p>
                            Catch goals, saves, celebrations and key moments from featured fixtures, filmed
                            and published by CKEFA Media.
                        </p>
                    </article>

                    <article className="videoCard">
                        <div className="videoPlaceholder">Interviews</div>
                        <h3>Live Coverage & Interviews</h3>
                        <p>
                            Follow interviews, post-match reactions, player spotlights and behind-the-scenes
                            coverage throughout the festival.
                        </p>
                    </article>
                </div>
            </Section>

            <Section
                id="history"
                title="Black History Hub"
                intro="This hub connects the football festival to Black History Month through short articles, community stories and learning content."
            >
                <div className="cardGrid four">
                    {articles.map((article) => (
                        <article className="card articleCard" key={article.id}>
                            <span className="badge">{article.category}</span>
                            <h3>{article.title}</h3>
                            <p>{article.summary}</p>
                            <button
                                type="button"
                                className="textButton"
                                onClick={() => setActiveArticleId(article.id)}
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
                intro="The Black History Month Football Festival is supported by organisations committed to grassroots football, community development and creating opportunities for young people. We are actively welcoming additional partners who would like to be part of this growing community event."
            >
                <div className="cardGrid three">
                    {sponsors.map((sponsor) => (
                        <article className="card sponsorCard" key={sponsor.id}>
                            <span className="badge">{sponsor.tier}</span>
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
                        <strong>Black History Month Football Festival</strong>
                        <p>Powered by <CkefaLink /></p>
                        <p>Celebrating Football. Celebrating Culture. Celebrating Community.</p>
                    </div>
                    <CkefaLogo className="footerCkefaLogo" />
                </div>
            </footer>
        </>
    )
}

export default App