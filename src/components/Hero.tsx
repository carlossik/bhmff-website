import { Play, CalendarDays, Trophy, Users } from 'lucide-react'
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
              clubs battle to become the inaugural Black History Month
              Football Festival Champions.
            </p>

            <div className="heroHighlights">

              <div className="heroHighlight">
                <Trophy size={20} />
                <span>8 Invitational Teams</span>
              </div>

              <div className="heroHighlight">
                <CalendarDays size={20} />
                <span>October 2026</span>
              </div>

              <div className="heroHighlight">
                <Users size={20} />
                <span>Live Coverage</span>
              </div>

            </div>

            <div className="ctaRow">

              <a className="btn primary" href="#teams">
                <Users size={18} />
                View Teams
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

          <div className="heroVideoCard">

            <iframe
                src={lastYearFinalVideo.embedUrl}
                title={lastYearFinalVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />

            <div className="heroVideoMeta">
              <strong>{lastYearFinalVideo.title}</strong>
              <span>{lastYearFinalVideo.subtitle}</span>
            </div>

            <a
                className="watchLink"
                href={lastYearFinalVideo.youtubeUrl}
                target="_blank"
                rel="noreferrer"
            >
              Watch on YouTube
            </a>

          </div>

        </div>

      </section>
  )
}