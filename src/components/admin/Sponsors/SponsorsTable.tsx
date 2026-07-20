import type {
    Sponsor,
} from './sponsorTypes'

type SponsorsTableProps = {
    sponsors: Sponsor[]
    onEdit: (sponsor: Sponsor) => void
    onDelete: (sponsor: Sponsor) => void
}

export function SponsorsTable({
                                  sponsors,
                                  onEdit,
                                  onDelete,
                              }: SponsorsTableProps) {
    if (!sponsors.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No sponsors added</h3>

                <p>
                    <p>
                        Add confirmed sponsors and partners
                        when agreements are in place.
                    </p>
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap adminTableWrap sponsorsTableWrap">
            <table className="adminTable sponsorsAdminTable">
                <thead>
                <tr>
                    <th>Sponsor</th>
                    <th>Partnership</th>
                    <th>Website</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {sponsors.map((sponsor) => (
                    <tr key={sponsor.id}>
                        <td>
                            <div className="adminSponsorIdentity">
                                {sponsor.logo_url ? (
                                    <img
                                        src={sponsor.logo_url}
                                        alt={`${sponsor.name} logo`}
                                    />
                                ) : (
                                    <span>
                                            {sponsor.name
                                                .split(' ')
                                                .filter(Boolean)
                                                .map(
                                                    (word) =>
                                                        word[0]
                                                )
                                                .join('')
                                                .slice(0, 3)
                                                .toUpperCase()}
                                        </span>
                                )}

                                <strong>
                                    {sponsor.name}
                                </strong>
                            </div>
                        </td>

                        <td>
                            {sponsor.tier ??
                                'Partner'}
                        </td>

                        <td className="sponsorWebsiteCell">
                            {sponsor.website_url ? (
                                <a
                                    href={
                                        sponsor.website_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Visit website
                                </a>
                            ) : (
                                '—'
                            )}
                        </td>

                        <td>
                                <span className="badge">
                                    {sponsor.active
                                        ? 'Active'
                                        : 'Hidden'}
                                </span>
                        </td>

                        <td>
                            <div className="tableActions">
                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() =>
                                        onEdit(sponsor)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() =>
                                        onDelete(
                                            sponsor
                                        )
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