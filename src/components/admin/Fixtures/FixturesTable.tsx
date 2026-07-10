import type {
    Fixture,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type FixturesTableProps = {
    fixtures: Fixture[]
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    onEdit: (fixture: Fixture) => void
    onDelete: (fixture: Fixture) => void
}

export function FixturesTable({
                                  fixtures,
                                  teams,
                                  venues,
                                  onEdit,
                                  onDelete,
                              }: FixturesTableProps) {
    function getTeamName(teamId: string | null) {
        return (
            teams.find((team) => team.id === teamId)?.name ??
            'Team to be confirmed'
        )
    }

    function getVenueName(venueId: string | null) {
        return (
            venues.find((venue) => venue.id === venueId)?.name ??
            'Venue TBC'
        )
    }

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
                    Add the first fixture when the tournament schedule is ready.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap">
            <table className="adminTable">
                <thead>
                <tr>
                    <th>Stage</th>
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
                            <strong>
                                {getTeamName(fixture.home_team_id)}
                            </strong>
                            <br />
                            <span className="muted">
                                    vs {getTeamName(fixture.away_team_id)}
                                </span>
                        </td>
                        <td>{formatKickoff(fixture.kickoff_time)}</td>
                        <td>{getVenueName(fixture.venue_id)}</td>
                        <td>
                                <span className="badge">
                                    {fixture.status}
                                </span>
                        </td>
                        <td>
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