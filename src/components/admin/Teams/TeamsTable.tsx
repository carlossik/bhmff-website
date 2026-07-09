import type { DbTeam } from './teamTypes'

type TeamsTableProps = {
    teams: DbTeam[]
    onEdit: (team: DbTeam) => void
    onDelete: (team: DbTeam) => void
}

export function TeamsTable({ teams, onEdit, onDelete }: TeamsTableProps) {
    return (
        <table className="adminTable">
            <thead>
            <tr>
                <th>Team</th>
                <th>Manager</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
            </tr>
            </thead>

            <tbody>
            {teams.map((team) => (
                <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.manager_name ?? '-'}</td>
                    <td>{team.contact_email ?? '-'}</td>
                    <td>{team.contact_phone ?? '-'}</td>
                    <td>
                        <div className="tableActions">
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
    )
}