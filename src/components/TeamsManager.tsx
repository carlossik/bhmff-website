type DbTeam = {
    id: string
    name: string
    manager_name: string | null
    contact_email: string | null
    contact_phone: string | null
    notes: string | null
}

type TeamsManagerProps = {
    teams: DbTeam[]
}

export function TeamsManager({ teams }: TeamsManagerProps) {
    return (
        <div>
            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Teams</h3>
                    <p className="muted">
                        Manage participating clubs for the Black History Month Football Festival.
                    </p>
                </div>

                <button className="btn primary" type="button">
                    + Add Team
                </button>
            </div>

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
                            <button className="btn secondary small">
                                Edit
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}