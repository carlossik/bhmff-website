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

    const competitionTeamMap = new Map(
        teams.map((team) => [
            team.competition_team_id,
            team,
        ])
    )

    if (!goals.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <h3>No goals recorded</h3>

                <p>
                    Add scorers after a match result has
                    been confirmed.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)]">
            <table className="min-w-full text-left text-sm text-[var(--organisation-text)] [&_thead]:bg-[var(--organisation-background)] [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_td]:border-t [&_td]:border-[var(--organisation-border)] [&_td]:px-5 [&_td]:py-4">
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
                            competitionTeamMap.get(
                                fixture
                                    ?.home_competition_team_id ??
                                    ''
                            )?.name ??
                            'Home team TBC'

                        const awayTeam =
                            competitionTeamMap.get(
                                fixture
                                    ?.away_competition_team_id ??
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

                                <td className="font-semibold">
                                    <strong>
                                        {homeTeam} vs{' '}
                                        {awayTeam}
                                    </strong>

                                    <span className="text-slate-400">
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

                                <td className="whitespace-nowrap">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
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
                                            className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
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
