import type { DbClub } from './clubTypes'
import './ClubsTable.css'
type ClubsTableProps = {
    clubs: DbClub[]
    loading: boolean
    onEdit: (club: DbClub) => void
    onDelete: (club: DbClub) => void
}

export function ClubsTable({
                               clubs,
                               loading,
                               onEdit,
                               onDelete,
                           }: ClubsTableProps) {
    if (loading) {
        return (
            <div className="teamsEmptyState">
                <p>Loading clubs...</p>
            </div>
        )
    }

    if (!clubs.length) {
        return (
            <div className="teamsEmptyState">
                <h4>No clubs added yet</h4>

                <p>
                    Add the first club for this
                    competition.
                </p>
            </div>
        )
    }

    return (
        <div className="clubsTableWrapper">
            <table className="clubsTable">
                <thead>
                <tr>
                    <th>Club</th>
                    <th>Short Name</th>
                    <th>Contact</th>
                    <th>Manager</th>
                    <th>Founded</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {clubs.map((club) => (
                    <tr key={club.id}>
                        <td>
                            <div className="clubTableIdentity">
                                {club.badge_url ? (
                                    <img
                                        src={club.badge_url}
                                        alt={`${club.name} badge`}
                                        className="clubTableBadge"
                                    />
                                ) : (
                                    <div className="clubTableBadgePlaceholder">
                                        {club.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <strong>
                                        {club.name}
                                    </strong>

                                    {club.colours && (
                                        <span className="muted">
                                                {
                                                    club.colours
                                                }
                                            </span>
                                    )}
                                </div>
                            </div>
                        </td>

                        <td>
                            {club.short_name || '—'}
                        </td>

                        <td>
                            <div>
                                {club.email && (
                                    <div>
                                        {club.email}
                                    </div>
                                )}

                                {club.phone && (
                                    <div className="muted">
                                        {club.phone}
                                    </div>
                                )}

                                {!club.email &&
                                    !club.phone &&
                                    '—'}
                            </div>
                        </td>

                        <td>
                            {club.manager_name || '—'}
                        </td>

                        <td>
                            {club.founded_year || '—'}
                        </td>

                        <td>
                            <div className="clubsTableActions">
                                <button
                                    type="button"
                                    className="secondaryButton"
                                    onClick={() =>
                                        onEdit(club)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="dangerButton"
                                    onClick={() =>
                                        onDelete(club)
                                    }
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