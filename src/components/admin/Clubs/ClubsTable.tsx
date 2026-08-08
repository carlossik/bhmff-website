import type { DbClub } from './clubTypes'

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
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <p>Loading clubs...</p>
            </div>
        )
    }

    if (!clubs.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                <h4>No clubs added yet</h4>

                <p>
                    Add the first club for this
                    competition.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)]">
            <table className="min-w-full divide-y divide-[var(--organisation-border)] text-left text-sm text-[var(--organisation-text)] [&_thead]:bg-[var(--organisation-background)] [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_td]:px-5 [&_td]:py-4 [&_tbody_tr]:border-t [&_tbody_tr]:border-[var(--organisation-border)]">
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
                            <div className="flex items-center gap-3">
                                {club.badge_url ? (
                                    <img
                                        src={club.badge_url}
                                        alt={`${club.name} badge`}
                                        className="h-11 w-11 rounded-xl border border-[var(--organisation-border)] object-contain"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--organisation-accent)] font-bold text-[var(--organisation-on-accent)]">
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
                                        <span className="text-slate-400">
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
                                    <div className="text-slate-400">
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
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-lg border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-3 py-2 text-sm font-semibold text-[var(--organisation-text)] hover:border-[var(--organisation-accent)]"
                                    onClick={() =>
                                        onEdit(club)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-lg border border-red-700/60 bg-red-950/20 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/40"
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