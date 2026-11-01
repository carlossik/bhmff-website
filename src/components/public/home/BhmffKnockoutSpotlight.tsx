import { useEffect, useMemo, useState } from 'react'
import type { PublicFixture } from '../../FixtureList'
import type { PublicResult } from '../../ResultsList'
import type { PublicTeam } from '../PublicTeams'
import {
  ANNOUNCED_FINAL_KICKOFF,
  getBhmffFinalMatch,
  getBhmffSemifinals,
  getBhmffSpotlightMode,
  getBhmffThirdPlace,
} from './bhmffFinalists'

type Props = {
  fixtures: PublicFixture[]
  results: PublicResult[]
  teams: PublicTeam[]
  basePath: string
  surfaceColour: string
  accentColour: string
  textColour: string
}

function duration(now: number, target: number) {
  const seconds = Math.max(0, Math.floor((target - now) / 1000))
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
}
function dateLabel(date: string | null) {
  if (!date) return 'Date TBC'
  const value = new Date(date)
  return Number.isNaN(value.getTime()) ? 'Date TBC' : new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
  }).format(value)
}
function timeLabel(date: string | null) {
  if (!date) return 'Time TBC'
  const value = new Date(date)
  return Number.isNaN(value.getTime()) ? 'Time TBC' : new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London',
  }).format(value)
}
function badgeFor(teams: PublicTeam[], name: string) {
  return teams.find(team => team.name.trim().toLowerCase() === name.trim().toLowerCase())?.logo_url
}
function MatchBadge({ teams, name, large = false }: { teams: PublicTeam[]; name: string; large?: boolean }) {
  const badge = badgeFor(teams, name)
  return badge ? <img src={badge} alt="" className={`mx-auto mb-2 object-contain ${large ? 'h-20 w-20 sm:h-28 sm:w-28' : 'h-14 w-14 sm:h-16 sm:w-16'}`} />
    : <div aria-hidden="true" className={`mx-auto mb-2 flex items-center justify-center rounded-full border border-yellow-400/30 bg-white/10 text-xl ${large ? 'h-20 w-20 sm:h-28 sm:w-28' : 'h-14 w-14 sm:h-16 sm:w-16'}`}>⚽</div>
}

export function BhmffKnockoutSpotlight({ fixtures, results, teams, basePath, surfaceColour, accentColour, textColour }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  // Updates the countdown and switches the main banner at UK midnight on 26 Oct.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const semifinals = useMemo(() => getBhmffSemifinals(fixtures), [fixtures])
  const resultsByFixtureId = useMemo(() => new Map(results.map(result => [result.fixtureId, result])), [results])
  const publishedSemiCount = semifinals.filter(fixture => resultsByFixtureId.has(fixture.id)).length
  const mode = getBhmffSpotlightMode(now, publishedSemiCount)
  const finalMatch = useMemo(() => getBhmffFinalMatch(fixtures, results), [fixtures, results])
  const thirdPlace = useMemo(() => getBhmffThirdPlace(fixtures), [fixtures])
  // BHMFF_2026_CHAMPIONS_RELEASE: verified one-off result pending structured penalties.
  const championsAnnounced = Boolean(
    finalMatch.fixture?.id === '38fc5a0c-34dc-463e-8c4b-dedf0566c521' &&
    finalMatch.publishedResult?.fixtureId === finalMatch.fixture?.id &&
    finalMatch.publishedResult?.homeScore === 3 &&
    finalMatch.publishedResult?.awayScore === 3 &&
    finalMatch.home.name.trim().toLowerCase() === 'erith park' &&
    finalMatch.away.name.trim().toLowerCase() === 'naija best'
  )
  const kickoff = finalMatch.fixture?.kickoffTime && Number.isFinite(Date.parse(finalMatch.fixture.kickoffTime))
    ? Date.parse(finalMatch.fixture.kickoffTime) : ANNOUNCED_FINAL_KICKOFF
  const finalKickoffTime = new Date(kickoff).toISOString()
  const [days, hours, minutes, seconds] = duration(now, kickoff)
  const finalVenue = finalMatch.fixture?.venueName && !/tbc|tbd|to be confirmed/i.test(finalMatch.fixture.venueName)
    ? finalMatch.fixture.venueName : 'Thamesmead Sporting Ground'
  const venueAddress = [finalMatch.fixture?.venueAddress, finalMatch.fixture?.venuePostcode].filter(Boolean).join(', ')

  const recent = useMemo(() => [...results]
    .sort((a, b) => (Date.parse(b.kickoffTime ?? '') || 0) - (Date.parse(a.kickoffTime ?? '') || 0))
    .slice(0, 12), [results])
  useEffect(() => {
    if (paused || recent.length < 2) return
    const id = window.setInterval(() => setSelected(value => (value + 1) % recent.length), 5000)
    return () => window.clearInterval(id)
  }, [paused, recent.length])
  useEffect(() => setSelected(0), [recent.length])
  const selectedResult = recent[selected]

  const spotlightStyle = {
    background: 'radial-gradient(ellipse at 50% 0%, #266A44 0%, #0C3926 47%, #082719 100%)',
    borderColor: '#DBAD46', color: '#fff',
  }

  return <section id="super-sunday" aria-label={championsAnnounced ? 'BHMFF 2026 champions' : mode === 'final-day' ? 'BHMFF Final Day fixtures' : 'Super Sunday semi-finals'} className="py-8 sm:py-12" style={{ color: textColour }}>
    <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6">
      {mode === 'final-day' ? <div id="bhmff-final" className="rounded-3xl border p-5 text-center shadow-2xl sm:p-8" style={spotlightStyle}>
        <p className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm" style={{ color: '#F4CA48' }}>Black History Month Football Festival 2026</p>
        <div className="mx-auto mt-4 w-fit rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2 text-xs font-black uppercase tracking-widest" style={{ color: '#F4CA48' }}>{championsAnnounced ? '🏆 CROWNED CHAMPIONS' : '🏆 Road to Glory'}</div>
        <h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">{championsAnnounced ? 'NAIJA BEST — 2026 CHAMPIONS!' : 'Final Day'}</h2>
        <p className="mt-2 text-xl font-black uppercase" style={{ color: '#F4CA48' }}>Saturday 31 October 2026</p>
        <p className="mt-1 font-semibold text-white/85">{championsAnnounced ? 'A spectacular tournament. A thrilling final. Our champions have been crowned!' : 'The championship is on the line'}</p>
        {championsAnnounced && <div className="relative mx-auto mt-6 max-w-3xl overflow-hidden rounded-2xl border border-yellow-400/60 bg-gradient-to-br from-yellow-500/25 via-green-700/30 to-black/30 px-5 py-8" aria-live="polite">
          <style>{`@keyframes bhmffChampionsEntrance {from {opacity:0;transform:translateY(20px) scale(.96)} to {opacity:1;transform:translateY(0) scale(1)}} @keyframes bhmffGoldRain {0% {transform:translateY(-20px) rotate(0);opacity:0} 20%{opacity:1} 100%{transform:translateY(180px) rotate(160deg);opacity:0}} @media (prefers-reduced-motion: no-preference) {.bhmff-champions-entrance{animation:bhmffChampionsEntrance 1s ease-out both}.bhmff-gold-rain{animation:bhmffGoldRain 3s ease-in-out 1 both}}`}</style>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex justify-around text-2xl text-yellow-300"><span className="bhmff-gold-rain">✦</span><span className="bhmff-gold-rain" style={{animationDelay:'0.3s'}}>✦</span><span className="bhmff-gold-rain" style={{animationDelay:'0.6s'}}>✦</span><span className="bhmff-gold-rain" style={{animationDelay:'0.9s'}}>✦</span><span className="bhmff-gold-rain" style={{animationDelay:'1.2s'}}>✦</span></div>
          <div className="bhmff-champions-entrance relative">
            <div className="text-5xl" aria-hidden="true">🏆</div>
            <h3 className="mt-3 text-3xl font-black uppercase tracking-wide text-yellow-300 sm:text-5xl">Naija Best FC</h3>
            <p className="mt-2 text-xl font-extrabold uppercase tracking-widest text-white sm:text-2xl">Black History Month Football Champions 2026</p>
            <div className="mx-auto mt-4 w-fit"><MatchBadge teams={teams} name={finalMatch.away.name} large /></div>
            <p className="mt-4 text-2xl font-black text-white">Erith Park 3–3 Naija Best</p>
            <p className="mt-2 text-xl font-black text-yellow-300">Naija Best win 5–4 on penalties</p>
            <p className="mt-4 text-sm font-semibold text-white/85">Football · Heritage · Culture · Community</p>
          </div>
        </div>}
        {now < kickoff && !finalMatch.publishedResult && <>
          <p className="mt-6 text-xs font-black uppercase tracking-wider text-white/80">Countdown to the Tournament Final</p>
          <div className="mx-auto mt-3 grid max-w-lg grid-cols-4 gap-2">
            {[days, hours, minutes, seconds].map((number, index) => <div key={index} className="rounded-xl border border-white/10 bg-white/10 p-2 sm:p-3">
              <div className="text-2xl font-black tabular-nums sm:text-3xl">{String(number).padStart(2, '0')}</div>
              <div className="text-xs uppercase">{['Days', 'Hours', 'Mins', 'Secs'][index]}</div>
            </div>)}
          </div>
        </>}
        <article className="mx-auto mt-6 max-w-4xl rounded-2xl border border-yellow-400/40 bg-black/20 p-4 shadow-lg sm:p-7">
          <p className="mb-5 text-sm font-black uppercase tracking-[0.22em]" style={{ color: '#F4CA48' }}>{championsAnnounced ? '🏆 OFFICIAL FINAL RESULT' : '🏆 Championship Final'}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
            <div className="min-w-0 text-center">
              <MatchBadge teams={teams} name={finalMatch.home.name} large />
              <p className="break-words text-sm font-black sm:text-2xl">{finalMatch.home.name}</p>
            </div>
            <div className="min-w-[65px] text-center">
              <p className="text-3xl font-black tabular-nums sm:text-5xl" style={{ color: '#F4CA48' }}>{finalMatch.publishedResult ? `${finalMatch.publishedResult.homeScore} – ${finalMatch.publishedResult.awayScore}` : 'VS'}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wider">{finalMatch.publishedResult ? 'FULL TIME' : timeLabel(finalKickoffTime)}</p>{championsAnnounced && <p className="mt-2 text-xs font-black text-yellow-300">Naija Best win 5–4 on penalties</p>}
            </div>
            <div className="min-w-0 text-center">
              <MatchBadge teams={teams} name={finalMatch.away.name} large />
              <p className="break-words text-sm font-black sm:text-2xl">{finalMatch.away.name}</p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/20 pt-4">
            <p className="text-base font-extrabold">{dateLabel(finalKickoffTime)} • {timeLabel(finalKickoffTime)} kick-off</p>
            <p className="mt-1 text-sm font-semibold text-white/85">📍 {finalVenue}</p>
            {venueAddress && <p className="mt-1 text-xs text-white/75">{venueAddress}</p>}
          </div>
          {!finalMatch.home.confirmed || !finalMatch.away.confirmed ? <p className="mt-4 text-sm text-white/75">Finalists will be confirmed from the published semi-final results or the official final fixture.</p> : null}
        </article>
        {thirdPlace && <article className="mx-auto mt-4 max-w-4xl rounded-2xl border border-white/20 bg-white/10 p-4">
          <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#F4CA48' }}>Third-place play-off</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
            <div className="min-w-0 text-center"><MatchBadge teams={teams} name={thirdPlace.homeTeam} /><p className="break-words font-bold">{thirdPlace.homeTeam}</p></div>
            <div className="text-sm font-black uppercase" style={{ color: '#F4CA48' }}>{timeLabel(thirdPlace.kickoffTime)}</div>
            <div className="min-w-0 text-center"><MatchBadge teams={teams} name={thirdPlace.awayTeam} /><p className="break-words font-bold">{thirdPlace.awayTeam}</p></div>
          </div>
          <p className="mt-3 text-xs text-white/80">{dateLabel(thirdPlace.kickoffTime)} • {thirdPlace.venueName}</p>
        </article>}
        <p className="mt-5 text-sm font-semibold text-white/85">{championsAnnounced ? 'Congratulations to Naija Best and Erith Park. Thank you to every player, official, supporter, organiser and sponsor.' : 'The semi-final results remain available in the Results section below.'}</p>
        <a href={`${basePath}/${championsAnnounced ? 'results' : 'fixtures'}`} className="mt-5 inline-block rounded-full bg-yellow-400 px-6 py-3 font-black text-green-950 hover:bg-yellow-300">{championsAnnounced ? 'View all results' : 'View final day fixtures'}</a>
      </div> : <div className="rounded-3xl border p-5 text-center shadow-xl sm:p-8" style={spotlightStyle}>
        <p className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm" style={{ color: '#F4CA48' }}>Black History Month Football Festival 2026</p>
        <h2 className="mt-3 text-4xl font-black uppercase sm:text-6xl">Super Sunday</h2>
        <p className="mt-2 text-xl font-black uppercase" style={{ color: '#F4CA48' }}>{mode === 'results' ? 'Semi-Final Results' : 'Semi-Final Fixtures'} • Sunday 25 October</p>
        {mode === 'results' && <p className="mt-4 text-sm font-bold uppercase tracking-widest text-white/85">Full-time scores • Road to the Final</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">{semifinals.map(fixture => {
          const result = resultsByFixtureId.get(fixture.id)
          const winnerName = result && result.homeScore !== result.awayScore ? (result.homeScore > result.awayScore ? fixture.homeTeam : fixture.awayTeam) : null
          return <article key={fixture.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-6">
            <p className="mb-4 text-xs font-black uppercase tracking-wider" style={{ color: '#F4CA48' }}>{result ? 'FULL TIME • SEMI-FINAL' : 'SEMI-FINAL'}</p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="min-w-0 text-center"><MatchBadge teams={teams} name={fixture.homeTeam} /><p className="break-words text-sm font-extrabold sm:text-lg">{fixture.homeTeam}</p></div>
              <div className="min-w-[60px] text-center"><p className="text-2xl font-black tabular-nums sm:text-3xl" style={{ color: '#F4CA48' }}>{result ? `${result.homeScore} – ${result.awayScore}` : 'VS'}</p><p className="mt-1 text-xs">{result ? 'FT' : timeLabel(fixture.kickoffTime)}</p></div>
              <div className="min-w-0 text-center"><MatchBadge teams={teams} name={fixture.awayTeam} /><p className="break-words text-sm font-extrabold sm:text-lg">{fixture.awayTeam}</p></div>
            </div>
            {winnerName && <p className="mt-4 rounded-lg bg-yellow-400/15 py-2 text-sm font-black" style={{ color: '#F4CA48' }}>🏆 {winnerName} — Through to the Final</p>}
            <p className="mt-3 text-xs text-white/80">{fixture.venueName} • {dateLabel(fixture.kickoffTime)}</p>
          </article>
        })}</div>
        {semifinals.length === 0 && <p className="mt-5">Semi-final results will appear here once the fixtures and published scores are available.</p>}
        <a href={`${basePath}/results`} className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-black text-green-950 hover:bg-yellow-300">View all results</a>
      </div>}
      {mode !== 'final-day' && <div className="grid items-start gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border p-5" style={{ background: surfaceColour, borderColor: `${accentColour}50` }}>
          <h3 className="text-2xl font-black">The Super Sunday celebration</h3>
          <p className="mt-2">Thank you to everyone who joined us at Birchmere Park for a fantastic day of football, community and culture.</p>
          <p className="mt-3 font-semibold">CKEFA Media coverage and highlights will be shared on the channel, subject to availability.</p>
          <div className="mt-5 rounded-xl border p-4" style={{ borderColor: `${accentColour}70` }}><h4 className="font-black uppercase">Knockout rules</h4><p className="mt-2">90 minutes of normal time. If level, 30 minutes of extra time. If still level, a penalty shootout decides the winner.</p></div>
        </article>
        <a href="/assets/bhmff-super-sunday-2026.png" target="_blank" rel="noreferrer" aria-label="View full Super Sunday flyer"><img className="mx-auto w-full max-w-sm rounded-2xl shadow-xl" src="/assets/bhmff-super-sunday-2026.png" alt="BHMFF Super Sunday semi-final flyer" loading="lazy" /></a>
      </div>}
      <div className="rounded-2xl border p-5" style={{ background: surfaceColour, borderColor: `${accentColour}50` }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        <h3 className="text-2xl font-black">Published Results</h3>
        {selectedResult ? <div className="mt-4 rounded-xl border p-5 text-center" style={{ borderColor: `${accentColour}35` }} aria-live="off">
          <p className="text-xs font-bold uppercase opacity-60">{dateLabel(selectedResult.kickoffTime)} • FULL TIME</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span className="font-extrabold">{selectedResult.homeTeam}</span><span className="text-2xl font-black tabular-nums">{selectedResult.homeScore} – {selectedResult.awayScore}</span><span className="font-extrabold">{selectedResult.awayTeam}</span></div>
          <div className="mt-4 flex justify-center gap-4"><button type="button" onClick={() => setSelected(value => (value - 1 + recent.length) % recent.length)} aria-label="Previous result" className="rounded-lg border px-3 py-1">‹</button><span className="text-sm">{selected + 1} / {recent.length}</span><button type="button" onClick={() => setSelected(value => (value + 1) % recent.length)} aria-label="Next result" className="rounded-lg border px-3 py-1">›</button></div>
        </div> : <p className="mt-4">Published match results will appear here once confirmed by the organisers.</p>}
      </div>
    </div>
  </section>
}
