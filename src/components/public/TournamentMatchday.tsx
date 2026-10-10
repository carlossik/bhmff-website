import { useEffect, useState } from 'react'
import { useOptionalPublicOrganisation } from '../../context/PublicOrganisationContext'
import { supabase } from '../../lib/supabaseClient'
import { getMatchday, londonDay, type MatchdayFixture, type MatchdayResult } from '../../utils/tournamentMatchday'

function record(value: unknown): Record<string, unknown> {
    if (Array.isArray(value)) return record(value[0])
    return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}
function teamName(value: unknown, fallback: string) {
    const team = record(record(value).team)
    return typeof team.name === 'string' && team.name.trim() ? team.name : fallback
}

export function TournamentMatchday() {
    const context = useOptionalPublicOrganisation()
    const organisationId = context?.organisationId
    const competitionIds = context?.publicData.competitions.map(competition => competition.id).sort().join(',') ?? ''
    const basePath = context?.basePath ?? ''
    const [fixtures, setFixtures] = useState<MatchdayFixture[]>([])
    const [results, setResults] = useState<MatchdayResult[]>([])
    const [now, setNow] = useState(Date.now)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [loadedDay, setLoadedDay] = useState('')

    useEffect(() => {
        let disposed = false
        let running = false
        async function refresh() {
            if (running || document.hidden) return
            running = true
            const requestedAt = Date.now()
            if (!organisationId || !competitionIds) {
                if (!disposed) { setFixtures([]); setResults([]); setLoading(false); setLoadedDay(londonDay(requestedAt)) }
                running = false
                return
            }
            try {
                const response = await supabase.from('fixtures').select(`
                    id, kickoff_time, status,
                    home_competition_team:competition_teams!fixtures_home_competition_team_fkey (
                        team:teams!competition_teams_team_id_fkey (name)
                    ),
                    away_competition_team:competition_teams!fixtures_away_competition_team_fkey (
                        team:teams!competition_teams_team_id_fkey (name)
                    ),
                    venue:venues!fixtures_venue_id_fkey (name)
                `).eq('published', true)
                    .in('competition_id', competitionIds.split(',')).order('kickoff_time')
                if (response.error) throw response.error
                const todayFixtures = (response.data ?? []).map(value => {
                    const row = record(value)
                    return {
                        id: String(row.id), kickoff_time: typeof row.kickoff_time === 'string' ? row.kickoff_time : null,
                        status: String(row.status ?? 'scheduled'),
                        homeTeam: teamName(row.home_competition_team, 'Home team TBC'),
                        awayTeam: teamName(row.away_competition_team, 'Away team TBC'),
                        venue: String(record(row.venue).name ?? 'Venue to be confirmed'),
                    }
                }).filter(fixture => fixture.kickoff_time && londonDay(fixture.kickoff_time) === londonDay(requestedAt))
                let todayResults: MatchdayResult[] = []
                if (todayFixtures.length) {
                    const resultResponse = await supabase.from('public_results')
                        .select('fixture_id, home_score, away_score, published').eq('published', true)
                        .in('fixture_id', todayFixtures.map(fixture => fixture.id))
                    if (resultResponse.error) throw resultResponse.error
                    todayResults = (resultResponse.data ?? []) as MatchdayResult[]
                }
                if (!disposed) {
                    setFixtures(todayFixtures); setResults(todayResults); setNow(Date.now())
                    setLoadedDay(londonDay(requestedAt)); setError(''); setLoading(false)
                }
            } catch (reason) {
                console.error('Unable to refresh today’s matches:', reason)
                if (!disposed) { setError('Today’s match updates are temporarily unavailable.'); setLoading(false) }
            } finally { running = false }
        }
        void refresh()
        const tick = window.setInterval(() => setNow(Date.now()), 1000)
        const poll = window.setInterval(() => void refresh(), 15000)
        const onFocus = () => void refresh()
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onFocus)
        return () => {
            disposed = true
            window.clearInterval(tick); window.clearInterval(poll)
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onFocus)
        }
    }, [organisationId, competitionIds])

    const today = londonDay(now)
    const matches = getMatchday(fixtures, results, now)
    const resultCount = matches.filter(match => match.result).length
    const heading = matches.length && resultCount === matches.length ? 'Today’s Results'
        : resultCount ? 'Today’s Fixtures & Results' : 'Today’s Fixtures'
    const waiting = loading || (loadedDay !== today && !error)
    return <section className="bhmffMatchday" aria-label="Today’s tournament matches">
        <div className="bhmffMatchdayInner">
            <p className="eyebrow">Black History Month Football Festival</p>
            <h2>{waiting ? 'Today’s Matches' : heading}</h2>
            <p>{new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}</p>
            {error && <p role="status">{error} {loadedDay === today && matches.length > 0 ? 'Showing the last successful update.' : ''}</p>}
            {waiting ? <p>Loading today’s matches…</p> : matches.length ? <div className="bhmffMatchdayGrid">
                {matches.map(match => <article className="bhmffMatchdayCard" key={match.id}>
                    <p className="bhmffMatchdayStatus">{match.label}</p>
                    <div className="bhmffMatchdayScore">
                        <strong>{match.homeTeam}</strong>
                        <span>{match.result ? `${match.result.home_score} – ${match.result.away_score}` : 'vs'}</span>
                        <strong>{match.awayTeam}</strong>
                    </div>
                    <p>Kick-off {new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(match.kickoff_time!))} · {match.venue}</p>
                </article>)}
            </div> : !error && <p>No fixtures scheduled for today.</p>}
            <a className="btn secondary" href={`${basePath}#fixtures`}>All fixtures</a>
            <a className="btn secondary" href={`${basePath}#results`}>All results</a>
        </div>
    </section>
}
