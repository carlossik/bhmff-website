import type {
    DbTeam,
    TeamParticipationStatus,
} from './teamTypes'

type TeamsTableProps = {
    teams: DbTeam[]
    onEdit: (team: DbTeam) => void
    onDelete: (team: DbTeam) => void
    onTogglePublished: (team: DbTeam) => void
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

function formatParticipationStatus(
    status: TeamParticipationStatus
) {
    return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
    )
}

export function TeamsTable({
                               teams,
                               onEdit,
                               onDelete,
                               onTogglePublished,
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
        <div className="teamsAdminGrid">
            {teams.map((team) => (
                <article
                    className="teamAdminCard"
                    key={team.id}
                >
                    <div className="teamAdminCardHeader">
                        <div className="teamAdminIdentity">
                            {team.logo_url ? (
                                <img
                                    className="teamAdminCardLogo"
                                    src={team.logo_url}
                                    alt={`${team.name} logo`}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="teamAdminCardInitials">
                                    {getInitials(team.name)}
                                </div>
                            )}

                            <div>
                                <h4>{team.name}</h4>

                                <div className="teamAdminBadges">
                                    <span
                                        className={`teamParticipationBadge teamParticipation-${team.participation_status}`}
                                    >
                                        {formatParticipationStatus(
                                            team.participation_status
                                        )}
                                    </span>

                                    <span
                                        className={
                                            team.published
                                                ? 'teamVisibilityBadge teamVisibilityPublished'
                                                : 'teamVisibilityBadge teamVisibilityHidden'
                                        }
                                    >
                                        {team.published
                                            ? 'Public'
                                            : 'Hidden'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="teamAdminDetails">
                        <div>
                            <span className="teamAdminFieldLabel">
                                Manager
                            </span>

                            <strong>
                                {team.manager_name ?? 'Not provided'}
                            </strong>
                        </div>

                        <div>
                            <span className="teamAdminFieldLabel">
                                Email
                            </span>

                            {team.contact_email ? (
                                <a
                                    href={`mailto:${team.contact_email}`}
                                >
                                    {team.contact_email}
                                </a>
                            ) : (
                                <span>Not provided</span>
                            )}
                        </div>

                        <div>
                            <span className="teamAdminFieldLabel">
                                Phone
                            </span>

                            {team.contact_phone ? (
                                <a
                                    href={`tel:${team.contact_phone}`}
                                >
                                    {team.contact_phone}
                                </a>
                            ) : (
                                <span>Not provided</span>
                            )}
                        </div>

                        <div>
                            <span className="teamAdminFieldLabel">
                                Notes
                            </span>

                            <span>
                                {team.notes?.trim() ||
                                    'No notes added'}
                            </span>
                        </div>
                    </div>

                    <div className="teamAdminCardActions">
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
                            onClick={() =>
                                onTogglePublished(team)
                            }
                        >
                            {team.published
                                ? 'Unpublish'
                                : 'Publish'}
                        </button>

                        <button
                            className="btn secondary small dangerButton"
                            type="button"
                            onClick={() => onDelete(team)}
                        >
                            Delete
                        </button>
                    </div>
                </article>
            ))}
        </div>
    )
}