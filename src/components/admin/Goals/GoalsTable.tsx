import type {
    Goal,
    GoalFixture,
    GoalTeam,
} from './goalTypes'

type GoalsTableProps = {
    goals: Goal[]
    fixtures: GoalFixture[]
    teams: GoalTeam[]
    onEdit: (goal: Goal) => void
    onDelete: (goal: Goal) => void
}

export function GoalsTable({
                               goals,
                               fixtures,
                               teams,
                               onEdit,
                               onDelete,
                           }: GoalsTableProps) {
    const fixtureMap = new Map(
        fixtures.map((fixture) => [
            fixture.id,
            fixture,
        ])
    )

    const teamMap = new Map(
        teams.map((team) => [
            team.id,
            team,
        ])
    )

    if (!goals.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No goals recorded</h3>

                <p>
                    Add scorers after a match result has
                    been confirmed.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap adminTableWrap goalsTableWrap">
            <table className="adminTable goalsAdminTable">
                <thead>
                <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Fixture</th>
                    <th>Minute</th>
                    <th>Video Time</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {goals.map((goal) => {
                    const fixture =
                        fixtureMap.get(
                            goal.fixture_id ?? ''
                        )

                    const team =
                        teamMap.get(
                            goal.team_id ?? ''
                        )

                    const homeTeam =
                        teamMap.get(
                            fixture?.home_team_id ??
                            ''
                        )?.name ??
                        'Home team TBC'

                    const awayTeam =
                        teamMap.get(
                            fixture?.away_team_id ??
                            ''
                        )?.name ??
                        'Away team TBC'

                    return (
                        <tr key={goal.id}>
                            <td>
                                <strong>
                                    {
                                        goal.player_name
                                    }
                                </strong>
                            </td>

                            <td>
                                {team?.name ?? '—'}
                            </td>

                            <td className="goalFixtureCell">
                                <strong>
                                    {homeTeam} vs{' '}
                                    {awayTeam}
                                </strong>

                                <span className="muted">
                                        {fixture?.stage ??
                                            'Fixture'}
                                    </span>
                            </td>

                            <td>
                                {goal.minute
                                    ? `${goal.minute}'`
                                    : '—'}
                            </td>

                            <td>
                                {goal.video_timestamp ??
                                    '—'}
                            </td>

                            <td className="goalActionsCell">
                                <div className="tableActions">
                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() =>
                                            onEdit(
                                                goal
                                            )
                                        }
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() =>
                                            onDelete(
                                                goal
                                            )
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