import type { Fixture } from '../data/festivalData'
export function FixtureList({ fixtures }: { fixtures: Fixture[] }) {
  return <div className="fixtureGrid">{fixtures.map((fixture) => <article className="fixtureCard" key={fixture.id}><div><span className="badge">{fixture.stage}</span><h3>{fixture.homeTeam} vs {fixture.awayTeam}</h3><p className="muted">{fixture.date} • {fixture.time}</p><p className="muted">{fixture.venue}</p></div><div className="scoreBox"><strong>{fixture.score ?? 'TBC'}</strong><span>{fixture.status}</span></div></article>)}</div>
}
