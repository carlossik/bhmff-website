import { useEffect } from 'react'
import { getCurrentUser } from './services/auth'
import { AdminLogin } from './components/AdminLogin'
import { useMemo, useState } from 'react'
import { Calendar, Camera, Handshake, Newspaper, Shield, Trophy, Users } from 'lucide-react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import { FixtureList } from './components/FixtureList'
import { TeamTable } from './components/TeamTable'
import { CkefaLink } from './components/CkefaLink'
import { CkefaLogo } from './components/CkefaLogo'
import { ArticlePage } from './components/ArticlePage'
import { AdminPortal } from './components/AdminPortal'
//import { Routes, Route, Navigate } from 'react-router-dom'
import { articles, fixtures, lastYearFinalVideo, sponsors, teams } from './data/festivalData'

const benefits = [
  ['Full Month Format', 'The festival spreads games across October instead of forcing several matches into one day.', Calendar],
  ['Player Welfare', 'Longer recovery windows help reduce fatigue, protect players and allow matches to be played properly.', Shield],
  ['Community Platform', 'The event brings together clubs, families, volunteers, sponsors and local businesses.', Users],
  ['CKEFA Media Coverage', 'Highlights, interviews, goals and match stories create a lasting digital archive.', Camera],
]

const timeline = [
  ['Weekend 1', 'Opening Weekend & Group Fixtures', 'Festival opening, team welcome, first fixtures and community activity.'],
  ['Weekend 2', 'Group Fixtures Continue', 'More group games, sponsor activity and matchday media coverage.'],
  ['Weekend 3', 'Quarter Finals', 'Knockout football begins with proper preparation and full match focus.'],
  ['Weekend 4', 'Semi Finals', 'The final four compete for a place in the final weekend.'],
  ['Final Weekend', 'Final, Awards & Celebration', 'Grand final, awards, media coverage, sponsor recognition and closing celebration.'],
]

function App() {
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    useEffect(() => {
        getCurrentUser().then((user) => {
            setIsAdminLoggedIn(Boolean(user))
            setIsCheckingSession(false)
        })
    }, [])
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const activeArticle = useMemo(() => articles.find((article) => article.id === activeArticleId), [activeArticleId])

  if (activeArticle) {
    return <ArticlePage article={activeArticle} onBack={() => setActiveArticleId(null)} />
  }
    if (isCheckingSession) {
        return <p className="container">Checking admin session...</p>
    }
  return (
    <>
      <Header />
      <Hero />
      <Section id="festival" title="The Festival Vision" intro="For years, the tournament was delivered in a compressed one-day format. The new model gives the event the space it deserves: better football, better welfare, stronger media coverage and a more meaningful Black History Month experience.">
        <div className="cardGrid four">{benefits.map(([title, text, Icon]) => <article className="card" key={title as string}><Icon className="icon" /><h3>{title as string}</h3><p>{text as string}</p></article>)}</div>
      </Section>
      <Section id="fixtures" title="October Festival Schedule" intro="A clean month-long structure that gives every stage of the tournament room to breathe.">
        <div className="timeline">{timeline.map(([week, title, detail]) => <article className="timelineItem" key={week}><div className="timelineIcon"><span>{week}</span></div><div className="timelineContent"><h3>{title}</h3><p>{detail}</p></div></article>)}</div>
        <h3 className="subheading">Sample Fixtures</h3><FixtureList fixtures={fixtures} />
      </Section>
      <Section id="teams" title="Teams & Tables" intro="The final list of clubs will be added when registrations are confirmed. The table below shows the structure that will later be powered by the admin portal."><TeamTable teams={teams} /></Section>
      <Section id="media" title="CKEFA Media Centre" intro="The festival will use video, photography and match storytelling to promote the players, clubs and community partners involved.">
        <div className="cardGrid three"><article className="videoCard featuredVideo"><iframe className="mediaIframe" src={lastYearFinalVideo.embedUrl} title={lastYearFinalVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /><h3>{lastYearFinalVideo.title}</h3><p>Featured match coverage powered by <CkefaLink />.</p></article><article className="videoCard"><div className="videoPlaceholder">Goal of the Week</div><h3>Goal Highlights</h3><p>Goals, saves and key moments from each weekend can be published here and linked to YouTube.</p></article><article className="videoCard"><div className="videoPlaceholder">Interview Hub</div><h3>Player & Coach Stories</h3><p>Short interviews can capture the people and stories behind the tournament.</p></article></div>
      </Section>
      <Section id="history" title="Black History Hub" intro="This hub connects the football festival to Black History Month through short articles, community stories and learning content. It celebrates national trailblazers while also giving space to local voices, businesses and volunteers.">
        <div className="cardGrid four">{articles.map((article) => <article className="card articleCard" key={article.id}><span className="badge">{article.category}</span><h3>{article.title}</h3><p>{article.summary}</p><button type="button" className="textButton" onClick={() => setActiveArticleId(article.id)}>Read article</button></article>)}</div>
      </Section>
      <Section id="sponsors" title="Sponsorship Opportunities" intro="Sponsors help make the festival safer, better organised and more visible. The month-long format creates repeated visibility across fixtures, highlights, interviews, final-day activity and community content.">
        <div className="cardGrid three">{sponsors.map((sponsor) => <article className="card sponsorCard" key={sponsor.id}><span className="badge">{sponsor.tier}</span><h3>{sponsor.name}</h3><p>{sponsor.description}</p><a className="btn primary small" href="mailto:info@ckefamedia.com">Enquire</a></article>)}</div>
      </Section>
        {isAdminLoggedIn ? (
            <AdminPortal />
        ) : (
            <AdminLogin
                onLoginSuccess={() => {
                    setIsAdminLoggedIn(true)
                }}
            />
        )}
      <footer className="footer"><div className="container footerGrid"><div><strong>Black History Month Football Festival</strong><p>Powered by <CkefaLink /></p><p>Celebrating Football. Celebrating Culture. Celebrating Community.</p></div><CkefaLogo className="footerCkefaLogo" /></div></footer>
    </>
  )
}
export default App
