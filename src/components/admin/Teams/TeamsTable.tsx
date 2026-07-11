import type { DbTeam } from './teamTypes'

type TeamsTableProps = {
    teams: DbTeam[]
    onEdit: (team: DbTeam) => void
    onDelete: (team: DbTeam) => void
}

function getInitials(teamName: string) {
    return teamName
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase()
}

export function TeamsTable({
                               teams,
                               onEdit,
                               onDelete,
                           }: TeamsTableProps) {
    if (!teams.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No teams added</h3>
                <p>Add the first participating team.</p>
            </div>
        )
    }

    return (
        <div className="tableWrap adminTableWrap teamsTableWrap">
            <table className="adminTable teamsAdminTable">
                <thead>
                <tr>
                    <th>Club</th>
                    <th>Manager</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {teams.map((team) => (
                    <tr key={team.id}>
                        <td className="teamsClubCell">
                            <div className="adminTeamIdentity">
                                {team.logo_url ? (
                                    <img
                                        className="adminTeamLogo"
                                        src={team.logo_url}
                                        alt={`${team.name} logo`}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="adminTeamInitials">
                                        {getInitials(team.name)}
                                    </div>
                                )}

                                <strong>{team.name}</strong>
                            </div>
                        </td>

                        <td className="teamsManagerCell">
                            {team.manager_name ?? '—'}
                        </td>

                        <td className="teamsEmailCell">
                            {team.contact_email ?? '—'}
                        </td>

                        <td className="teamsPhoneCell">
                            {team.contact_phone ?? '—'}
                        </td>

                        <td className="teamsActionsCell">
                            <div className="teamsActionButtons">
                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onEdit(team)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onDelete(team)}
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