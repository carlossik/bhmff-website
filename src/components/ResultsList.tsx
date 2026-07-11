export type PublicResult = {
    id: string
    fixtureId: string
    stage: string
    kickoffTime: string | null
    homeTeamId: string
    awayTeamId: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    playerOfMatch: string
    matchReport: string
}

type ResultsListProps = {
    results: PublicResult[]
}

function formatMatchDate(kickoffTime: string | null) {
    if (!kickoffTime) {
        return 'Match date to be confirmed'
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(kickoffTime))
}

export function ResultsList({ results }: ResultsListProps) {
    if (!results.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No published results yet</h3>
                <p>
                    Match results will appear here once they have been confirmed
                    and published by the organisers.
                </p>
            </div>
        )
    }

    return (
        <div className="publicResultsGrid">
            {results.map((result) => (
                <article className="publicResultCard" key={result.id}>
                    <div className="publicResultHeader">
                        <span className="badge">{result.stage}</span>

                        <span className="publicResultDate">
                            {formatMatchDate(result.kickoffTime)}
                        </span>
                    </div>

                    <div className="publicResultScore">
                        <div className="publicResultTeam">
                            <span>{result.homeTeam}</span>
                            <strong>{result.homeScore}</strong>
                        </div>

                        <div className="publicResultDivider">
                            <span>Full Time</span>
                        </div>

                        <div className="publicResultTeam away">
                            <strong>{result.awayScore}</strong>
                            <span>{result.awayTeam}</span>
                        </div>
                    </div>

                    {result.playerOfMatch && (
                        <div className="publicResultHighlight">
                            <span>Player of the Match</span>
                            <strong>{result.playerOfMatch}</strong>
                        </div>
                    )}

                    {result.matchReport && (
                        <div className="publicResultReport">
                            <h4>Match Report</h4>
                            <p>{result.matchReport}</p>
                        </div>
                    )}
                </article>
            ))}
        </div>
    )
}