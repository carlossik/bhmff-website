import type { Venue } from './venueTypes'

type VenuesTableProps = {
    venues: Venue[]
    onEdit: (venue: Venue) => void
    onDelete: (venue: Venue) => void
}

export function VenuesTable({
                                venues,
                                onEdit,
                                onDelete,
                            }: VenuesTableProps) {
    if (!venues.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No venues added</h3>
                <p>
                    Add the first venue so it becomes available when creating
                    fixtures.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap">
            <table className="adminTable">
                <thead>
                <tr>
                    <th>Venue</th>
                    <th>Address</th>
                    <th>Postcode</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {venues.map((venue) => (
                    <tr key={venue.id}>
                        <td>
                            <strong>{venue.name}</strong>
                        </td>
                        <td>{venue.address ?? '—'}</td>
                        <td>{venue.postcode ?? '—'}</td>
                        <td>{venue.notes ?? '—'}</td>
                        <td>
                            <div className="tableActions">
                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onEdit(venue)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() => onDelete(venue)}
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