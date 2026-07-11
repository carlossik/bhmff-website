import type {
    Result,
    ResultFixture,
    ResultTeam,
} from './resultTypes'

type ResultsTableProps = {
    results: Result[]
    fixtures: ResultFixture[]
    teams: ResultTeam[]
    onEdit: (result: Result) => void
    onDelete: (result: Result) => void
}

export function ResultsTable({
                                 results,
                                 fixtures,
                                 teams,
                                 onEdit,
                                 onDelete,
                             }: ResultsTableProps) {
    const teamNames = new Map(
        teams.map((team) => [team.id, team.name])
    )

    const fixtureMap = new Map(
        fixtures.map((fixture) => [fixture.id, fixture])
    )

    if (!results.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No results entered</h3>
                <p>
                    Enter a result after a fixture has been completed.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap adminTableWrap">
            <table className="adminTable">
                <thead>
                <tr>
                    <th>Fixture</th>
                    <th>Score</th>
                    <th>Player of Match</th>
                    <th>Published</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {results.map((result) => {
                    const fixture = fixtureMap.get(result.fixture_id)

                    const home =
                        teamNames.get(
                            fixture?.home_team_id ?? ''
                        ) ?? 'Home team TBC'

                    const away =
                        teamNames.get(
                            fixture?.away_team_id ?? ''
                        ) ?? 'Away team TBC'

                    return (
                        <tr key={result.id}>
                            <td>
                                <strong>
                                    {home} vs {away}
                                </strong>
                                <br />
                                <span className="muted">
                                        {fixture?.stage ?? 'Fixture'}
                                    </span>
                            </td>

                            <td>
                                <strong>
                                    {result.home_score} -{' '}
                                    {result.away_score}
                                </strong>
                            </td>

                            <td>
                                {result.player_of_match ?? '—'}
                            </td>

                            <td>
                                    <span className="badge">
                                        {result.published
                                            ? 'Published'
                                            : 'Draft'}
                                    </span>
                            </td>

                            <td>
                                <div className="tableActions">
                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() =>
                                            onEdit(result)
                                        }
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() =>
                                            onDelete(result)
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}