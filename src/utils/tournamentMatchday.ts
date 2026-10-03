export type MatchdayFixture = {
    id: string
    kickoff_time: string | null
    status: string
    homeTeam: string
    awayTeam: string
    venue: string
}
export type MatchdayResult = {
    fixture_id: string
    home_score: number | null
    away_score: number | null
    published: boolean
}

export function londonDay(value: Date | string | number): string {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date)
    const get = (type: string) => parts.find(part => part.type === type)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
}

export function getMatchday(fixtures: MatchdayFixture[], results: MatchdayResult[], now = Date.now()) {
    const today = londonDay(now)
    const validResults = new Map(results.filter(result =>
        result.published && Number.isInteger(result.home_score) && Number.isInteger(result.away_score) &&
        result.home_score! >= 0 && result.away_score! >= 0,
    ).map(result => [result.fixture_id, result]))
    return fixtures.filter(fixture => fixture.kickoff_time && londonDay(fixture.kickoff_time) === today)
        .sort((a, b) => Date.parse(a.kickoff_time!) - Date.parse(b.kickoff_time!))
        .map(fixture => {
            const result = fixture.status === 'cancelled' || fixture.status === 'postponed'
                ? null : validResults.get(fixture.id) ?? null
            const label = result ? 'Full time' : fixture.status === 'cancelled' ? 'Cancelled'
                : fixture.status === 'postponed' ? 'Postponed'
                : fixture.status === 'live' || fixture.status === 'in_progress' ? 'In progress · result pending'
                : Date.parse(fixture.kickoff_time!) > now ? 'Scheduled' : 'Result pending'
            return { ...fixture, result, label }
        })
}
