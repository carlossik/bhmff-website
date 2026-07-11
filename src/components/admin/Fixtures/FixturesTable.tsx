import type {
    Fixture,
    FixtureGroup,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type FixturesTableProps = {
    fixtures: Fixture[]
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    groups: FixtureGroup[]
    onEdit: (fixture: Fixture) => void
    onDelete: (fixture: Fixture) => void
}

export function FixturesTable({
                                  fixtures,
                                  teams,
                                  venues,
                                  groups,
                                  onEdit,
                                  onDelete,
                              }: FixturesTableProps) {
    const teamNames = new Map(
        teams.map((team) => [team.id, team.name])
    )

    const venueNames = new Map(
        venues.map((venue) => [venue.id, venue.name])
    )

    const groupNames = new Map(
        groups.map((group) => [group.id, group.name])
    )

    function formatKickoff(kickoffTime: string | null) {
        if (!kickoffTime) return 'Date and time TBC'

        return new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(kickoffTime))
    }

    if (!fixtures.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No fixtures created</h3>

                <p>
                    Add the first fixture when the competition schedule is
                    ready.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap adminTableWrap fixturesTableWrap">
            <table className="adminTable fixturesAdminTable">
                <thead>
                <tr>
                    <th>Stage</th>
                    <th>Group</th>
                    <th>Fixture</th>
                    <th>Kick-off</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {fixtures.map((fixture) => (
                    <tr key={fixture.id}>
                        <td>{fixture.stage}</td>

                        <td>
                            {fixture.group_id
                                ? groupNames.get(fixture.group_id) ??
                                'Unknown group'
                                : '—'}
                        </td>

                        <td className="fixtureAdminTeams">
                            <strong>
                                {teamNames.get(
                                    fixture.home_team_id ?? ''
                                ) ?? 'Home team TBC'}
                            </strong>

                            <span className="muted">
                                    vs{' '}
                                {teamNames.get(
                                    fixture.away_team_id ?? ''
                                ) ?? 'Away team TBC'}
                                </span>
                        </td>

                        <td>{formatKickoff(fixture.kickoff_time)}</td>

                        <td>
                            {venueNames.get(fixture.venue_id ?? '') ??
                                'Venue TBC'}
                        </td>

                        <td>
                                <span className="badge">
                                    {fixture.status}
                                </span>
                        </td>

                        <td className="fixtureActionsCell">
                            <div className="tableActions">
                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onEdit(fixture)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onDelete(fixture)}
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}