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
    const competitionTeamNames = new Map(
        teams.map((team) => [
            team.competition_team_id,
            team.name.trim(),
        ])
    )

    const fixtureMap = new Map(
        fixtures.map((fixture) => [fixture.id, fixture])
    )

    if (!results.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <h3>No results entered</h3>
                <p>
                    Enter a result after a fixture has been completed.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)]">
            <table className="min-w-full text-left text-sm text-[var(--organisation-text)] [&_thead]:bg-[var(--organisation-background)] [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_td]:border-t [&_td]:border-[var(--organisation-border)] [&_td]:px-5 [&_td]:py-4">
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
                    const fixture = fixtureMap.get(
                        result.fixture_id
                    )

                    const home =
                        competitionTeamNames.get(
                            fixture?.home_competition_team_id ?? ''
                        ) ?? 'Home team TBC'

                    const away =
                        competitionTeamNames.get(
                            fixture?.away_competition_team_id ?? ''
                        ) ?? 'Away team TBC'

                    return (
                        <tr key={result.id}>
                            <td className="font-semibold">
                                <strong>
                                    {home} vs {away}
                                </strong>

                                <span className="text-slate-400">
                                        {fixture?.stage ?? 'Fixture'}
                                    </span>
                            </td>

                            <td className="text-lg font-bold text-[var(--organisation-accent)]">
                                <strong>
                                    {result.home_score} -{' '}
                                    {result.away_score}
                                </strong>
                            </td>

                            <td>
                                {result.player_of_match ?? '—'}
                            </td>

                            <td>
                                    <span className="inline-flex rounded-full border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-2.5 py-1 text-xs font-semibold text-[var(--organisation-text)]">
                                        {result.published
                                            ? 'Published'
                                            : 'Draft'}
                                    </span>
                            </td>

                            <td className="whitespace-nowrap">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                                        type="button"
                                        onClick={() => onEdit(result)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                                        type="button"
                                        onClick={() => onDelete(result)}
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