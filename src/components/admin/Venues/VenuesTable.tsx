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
                    className="text-[var(--organisation-accent)] underline-offset-4 hover:underline"
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
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <h3>No venues added</h3>
                <p>
                    Add the first venue so it becomes available when creating
                    fixtures.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)]">
            <table className="min-w-full text-left text-sm text-[var(--organisation-text)] [&_thead]:bg-[var(--organisation-background)] [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_td]:border-t [&_td]:border-[var(--organisation-border)] [&_td]:px-5 [&_td]:py-4">
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

                        <td className="max-w-xs">
                            {venue.address ?? '—'}
                        </td>

                        <td>{venue.postcode ?? '—'}</td>

                        <td className="max-w-sm text-slate-400">
                            {renderNotes(venue.notes)}
                        </td>

                        <td className="whitespace-nowrap">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                                    type="button"
                                    onClick={() => onEdit(venue)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
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