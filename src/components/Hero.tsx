import { Play, CalendarDays } from 'lucide-react'
import { lastYearFinalVideo } from '../data/festivalData'
import { CkefaLink } from './CkefaLink'
import { CkefaLogo } from './CkefaLogo'

export function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container heroGrid">
        <div className="heroCopy">
          <CkefaLogo className="heroLogo" />
          <p className="eyebrow">October 2026 • Grassroots Football • Community Celebration</p>
          <h1>Black History Month Football Festival</h1>
          <p className="powered">Powered by <CkefaLink /></p>
          <p className="heroText">A month-long community football festival created to give players full match experiences, improve player welfare, celebrate Black History Month and showcase grassroots talent through CKEFA Media coverage.</p>
          <div className="ctaRow">
            <a className="btn primary" href="#fixtures"><CalendarDays size={18} /> View Fixtures</a>
            <a className="btn secondary" href="#media"><Play size={18} /> Watch Highlights</a>
            <a className="btn secondary" href="#sponsors">Become a Sponsor</a>
          </div>
        </div>
        <div className="heroVideoCard">
          <iframe src={lastYearFinalVideo.embedUrl} title={lastYearFinalVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          <div className="heroVideoMeta"><strong>{lastYearFinalVideo.title}</strong><span>{lastYearFinalVideo.subtitle}</span></div>
          <a className="watchLink" href={lastYearFinalVideo.youtubeUrl} target="_blank" rel="noreferrer">Watch on YouTube</a>
        </div>
      </div>
    </section>
  )
}
