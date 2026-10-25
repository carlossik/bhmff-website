import { useEffect, useMemo, useState } from 'react'
import type { PublicFixture } from '../../FixtureList'
import type { PublicResult } from '../../ResultsList'
import type { PublicTeam } from '../PublicTeams'

type Props = {
  fixtures: PublicFixture[]
  results: PublicResult[]
  teams: PublicTeam[]
  basePath: string
  surfaceColour: string
  accentColour: string
  textColour: string
}

const FIRST_SEMI = new Date('2026-10-25T10:00:00+00:00').getTime()
function duration(now: number, target: number) {
  const total = Math.max(0, Math.floor((target - now) / 1000))
  return [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60]
}
function dateLabel(date: string | null) {
  if (!date) return 'Date TBC'
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? 'Date TBC' : new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(d)
}
function sameFixture(a: string, b: string) {return a.trim().toLowerCase() === b.trim().toLowerCase()}
export function BhmffKnockoutSpotlight({fixtures, results, teams, basePath, surfaceColour, accentColour, textColour}: Props) {
  const [now,setNow] = useState(() => Date.now())
  const [selected,setSelected] = useState(0)
  const [paused,setPaused] = useState(false)
  useEffect(() => {const id = window.setInterval(()=>setNow(Date.now()),1000); return ()=>window.clearInterval(id)}, [])
  // The carousel must include published semi-final results after kick-off;
  // the FIRST_SEMI timestamp is solely for the countdown, not a result cutoff.
  const recent = useMemo(() => [...results]
    .sort((a,b)=>(Date.parse(b.kickoffTime ?? '') || 0)-(Date.parse(a.kickoffTime ?? '') || 0)).slice(0,12),[results])
  const resultsByFixtureId = useMemo(() => new Map(results.map(r => [r.fixtureId, r])), [results])
  useEffect(() => {
    if(paused || recent.length < 2) return
    const id = window.setInterval(()=>setSelected(s=>(s+1)%recent.length),5000)
    return ()=>window.clearInterval(id)
  },[paused,recent.length])
  useEffect(()=>setSelected(0),[recent.length])
  const scores = recent[selected]
  const semifinalFixtures = fixtures.filter(f => {
    const teams = [f.homeTeam.toLowerCase(), f.awayTeam.toLowerCase()]
    const namesMatch = (teams.includes('thamesmead warriors') && teams.includes('erith park')) ||
      (teams.includes('meridian fc') && teams.includes('naija best'))
    return namesMatch && f.kickoffTime && new Date(f.kickoffTime).toISOString().startsWith('2026-10-25')
  }).sort((a,b)=>(Date.parse(a.kickoffTime || '')||0)-(Date.parse(b.kickoffTime || '')||0))
  const badge = (name: string) => teams.find(t => sameFixture(t.name,name))?.logo_url
  const [days,hours,minutes,seconds] = duration(now,FIRST_SEMI)
  return <section id="super-sunday" aria-label="Super Sunday semi-finals" className="py-8 sm:py-12" style={{color:textColour}}>
    <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6">
      <div className="rounded-3xl border p-5 text-center shadow-lg sm:p-8" style={{background:'linear-gradient(125deg,#082415,#184522,#082415)',borderColor:'#D5A93E',color:'#fff'}}>
        <p className="text-sm font-black uppercase tracking-[0.2em]" style={{color:'#F4CA48'}}>Black History Month Football Festival 2026</p>
        <h2 className="mt-2 text-4xl font-black uppercase sm:text-6xl">Super Sunday</h2>
        <p className="mt-2 text-xl font-extrabold" style={{color:'#F4CA48'}}>SEMI-FINALS • SUNDAY 25 OCTOBER</p>
        {now < FIRST_SEMI ? <><p className="mt-6 text-sm font-bold uppercase">Countdown to first kick-off</p>
          <div className="mx-auto mt-3 grid max-w-lg grid-cols-4 gap-2">{[days,hours,minutes,seconds].map((n,i)=><div key={i} className="rounded-xl bg-white/10 p-2 sm:p-3"><div className="text-2xl font-black tabular-nums sm:text-4xl">{String(n).padStart(2,'0')}</div><div className="text-xs uppercase">{['Days','Hours','Mins','Secs'][i]}</div></div>)}</div></> :
          <p className="mt-4 text-lg font-bold">Semi-final matchday has arrived — see fixtures and published results below.</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{semifinalFixtures.map(f => {
          const publishedScore = resultsByFixtureId.get(f.id)
          return <article key={f.id} className="rounded-xl border border-white/20 bg-white/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="w-2/5 text-center">{badge(f.homeTeam) && <img src={badge(f.homeTeam)} alt="" className="mx-auto mb-2 h-14 w-14 object-contain"/>}<p className="font-bold">{f.homeTeam}</p></div>
              <div className="text-center">
                <span className="text-lg font-black tabular-nums" style={{color:'#F4CA48'}}>
                  {publishedScore ? `${publishedScore.homeScore} – ${publishedScore.awayScore}` : dateLabel(f.kickoffTime).split(',').pop()?.trim()}
                </span>
                <div className="text-xs">{publishedScore ? 'FULL TIME' : 'VS'}</div>
              </div>
              <div className="w-2/5 text-center">{badge(f.awayTeam) && <img src={badge(f.awayTeam)} alt="" className="mx-auto mb-2 h-14 w-14 object-contain"/>}<p className="font-bold">{f.awayTeam}</p></div>
            </div>
            <p className="mt-3 text-sm">{f.venueName || 'Birchmere Park'} • Southwood Road, London SE28 8GB</p>
          </article>
        })}</div>
        {semifinalFixtures.length===0 && <p className="mt-5">Visit Fixtures for confirmed kick-off times and venue details.</p>}
        <a href={`${basePath}/fixtures`} className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-black text-green-950">View semi-final fixtures</a>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border p-5" style={{background:surfaceColour,borderColor:`${accentColour}50`}}>
          <h3 className="text-2xl font-black">The Super Sunday celebration</h3>
          <p className="mt-2">Join us at Birchmere Park, Southwood Road, London SE28 8GB. Food, drinks and music on sale, with refreshments for the teams. Come support the football and celebrate our community and culture.</p>
          <p className="mt-3 font-semibold">CKEFA Media plans to record and livestream both games on its YouTube channel, subject to connectivity.</p>
          <blockquote className="mt-4 border-l-4 pl-4 text-lg font-extrabold italic" style={{borderColor:accentColour}}>“It always seems impossible until it’s done.”<span className="mt-1 block text-sm not-italic">— Nelson Mandela</span></blockquote>
          <div className="mt-5 rounded-xl border p-4" style={{borderColor:`${accentColour}70`}}><h4 className="font-black uppercase">Knockout rules</h4><p className="mt-2">90 minutes of normal time. If level, 30 minutes of extra time. If still level, a penalty shootout decides the winner.</p></div>
        </article>
        <a href="/assets/bhmff-super-sunday-2026.png" target="_blank" rel="noreferrer" aria-label="View full Super Sunday flyer"><img className="mx-auto w-full max-w-sm rounded-2xl shadow-xl" src="/assets/bhmff-super-sunday-2026.png" alt="BHMFF Super Sunday semi-final flyer featuring both matches, 25 October 2026" loading="lazy"/></a>
      </div>
      <div className="rounded-2xl border p-5" style={{background:surfaceColour,borderColor:`${accentColour}50`}} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-2xl font-black">Published Results</h3></div>
        {scores ? <div className="mt-4 rounded-xl border p-5 text-center" style={{borderColor:`${accentColour}35`}} aria-live="off">
          <p className="text-xs font-bold uppercase opacity-60">{dateLabel(scores.kickoffTime)} • FULL TIME</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><span className="font-extrabold">{scores.homeTeam}</span><span className="text-2xl font-black tabular-nums">{scores.homeScore} – {scores.awayScore}</span><span className="font-extrabold">{scores.awayTeam}</span></div>
          <div className="mt-4 flex justify-center gap-4"><button type="button" onClick={()=>setSelected(v=>(v-1+recent.length)%recent.length)} aria-label="Previous result" className="rounded-lg border px-3 py-1">‹</button><span className="text-sm">{selected+1} / {recent.length}</span><button type="button" onClick={()=>setSelected(v=>(v+1)%recent.length)} aria-label="Next result" className="rounded-lg border px-3 py-1">›</button></div>
        </div>:<p className="mt-4">Published match results will appear here once confirmed by the organisers.</p>}
      </div>
    </div>
  </section>
}
