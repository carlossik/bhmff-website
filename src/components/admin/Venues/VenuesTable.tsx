import type { Venue } from './venueTypes'

type VenuesTableProps = {
    venues: Venue[]
    onEdit: (venue: Venue) => void
    onDelete: (venue: Venue) => void
}

function renderNotes(notes: string | null) {
    if (!notes) return '—'

    const urlPattern = /(https?:\/\/[^\s]+)/g
    const parts = notes.split(urlPattern)

    return parts.map((part, index) => {
        if (part.match(urlPattern)) {
            return (
                <a
                    key={`${part}-${index}`}
                    href={part}
                    target="_blank"
                    rel="noreferrer"
                    className="venueMapLink"
                >
                    View map
                </a>
            )
        }

        return <span key={`${part}-${index}`}>{part}</span>
    })
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
        <div className="tableWrap adminTableWrap">
            <table className="adminTable venuesAdminTable">
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

                        <td className="venueAddressCell">
                            {venue.address ?? '—'}
                        </td>

                        <td>{venue.postcode ?? '—'}</td>

                        <td className="venueNotesCell">
                            {renderNotes(venue.notes)}
                        </td>

                        <td className="venueActionsCell">
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