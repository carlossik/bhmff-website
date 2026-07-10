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

            <p className="eyebrow">
              OFFICIAL TOURNAMENT WEBSITE • OCTOBER 2026
            </p>

            <h1>
              Black History Month
              <br />
              Football Festival
            </h1>

            <p className="powered">
              Powered by <CkefaLink />
            </p>

            <p className="heroText">
              Experience a month of competitive grassroots football,
              community celebration and professional media coverage as
              clubs compete for Black History Month Football Festival glory
              while inspiring the next generation of players.
            </p>

            <div className="ctaRow">
              <a className="btn primary" href="#teams">
                View Teams
              </a>

              <a className="btn secondary" href="#fixtures">
                <CalendarDays size={18} />
                Fixtures
              </a>

              <a className="btn secondary" href="#media">
                <Play size={18} />
                Watch Highlights
              </a>

              <a className="btn secondary" href="#sponsors">
                Become a Sponsor
              </a>
            </div>
          </div>

          <div className="heroVideoCard premiumVideoCard">
            <div className="featuredLabel">Featured Match</div>

            <iframe
                src={lastYearFinalVideo.embedUrl}
                title={lastYearFinalVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />

            <div className="heroVideoMeta premiumVideoMeta">
              <span>CKEFA Media Archive</span>
              <strong>{lastYearFinalVideo.title}</strong>
              <p>{lastYearFinalVideo.subtitle}</p>
            </div>

            <a
                className="watchLink"
                href={lastYearFinalVideo.youtubeUrl}
                target="_blank"
                rel="noreferrer"
            >
              Watch on YouTube →
            </a>
          </div>
        </div>
      </section>
  )
}