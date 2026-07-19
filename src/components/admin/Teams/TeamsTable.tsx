import type {
    ClubOption,
    DbTeam,
    TeamParticipationStatus,
} from './teamTypes'

type TeamsTableProps = {
    teams: DbTeam[]
    clubs: ClubOption[]
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

function getClubName(
    team: DbTeam,
    clubs: ClubOption[]
) {
    return (
        clubs.find(
            (club) =>
                club.id === team.club_id
        )?.name ?? 'No club assigned'
    )
}

function getPublicVisibility(team: DbTeam) {
    if (
        team.published &&
        team.participation_status === 'confirmed'
    ) {
        return {
            label: 'Visible on public website',
            className:
                'teamVisibilityBadge teamVisibilityPublished',
            description:
                'The team is confirmed and published.',
        }
    }

    if (!team.published) {
        return {
            label: 'Hidden from public website',
            className:
                'teamVisibilityBadge teamVisibilityHidden',
            description:
                'Publish the team to make it eligible for public display.',
        }
    }

    return {
        label: 'Hidden from public website',
        className:
            'teamVisibilityBadge teamVisibilityHidden',
        description:
            `Status is ${formatParticipationStatus(
                team.participation_status
            )}. Only confirmed teams appear publicly.`,
    }
}

export function TeamsTable({
                               teams,
                               clubs,
                               onEdit,
                               onDelete,
                               onTogglePublished,
                           }: TeamsTableProps) {
    if (!teams.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No teams added</h3>

                <p>
                    Add the first team for one of
                    your clubs.
                </p>
            </div>
        )
    }

    return (
        <div>
            <div className="adminSuccessMessage">
                <strong>
                    Public website visibility rules
                </strong>

                <p>
                    A team appears publicly only
                    when its participation status is
                    <strong> Confirmed</strong> and
                    it is
                    <strong> Published</strong>.
                </p>
            </div>

            <div className="teamsAdminGrid">
                {teams.map((team) => {
                    const visibility =
                        getPublicVisibility(team)

                    return (
                        <article
                            className="teamAdminCard"
                            key={team.id}
                        >
                            <div className="teamAdminCardHeader">
                                <div className="teamAdminIdentity">
                                    {team.logo_url ? (
                                        <img
                                            className="teamAdminCardLogo"
                                            src={
                                                team.logo_url
                                            }
                                            alt={`${team.name} logo`}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="teamAdminCardInitials">
                                            {getInitials(
                                                team.name
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <h4>
                                            {team.name}
                                        </h4>

                                        <p className="muted">
                                            {getClubName(
                                                team,
                                                clubs
                                            )}
                                        </p>

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
                                                    ? 'Published'
                                                    : 'Unpublished'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="teamAdminDetails">
                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Public Visibility
                                    </span>

                                    <span
                                        className={
                                            visibility.className
                                        }
                                    >
                                        {visibility.label}
                                    </span>

                                    <small className="muted">
                                        {
                                            visibility.description
                                        }
                                    </small>
                                </div>

                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Age Group
                                    </span>

                                    <strong>
                                        {team.age_group ??
                                            'Not provided'}
                                    </strong>
                                </div>

                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Gender
                                    </span>

                                    <span>
                                        {team.gender ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Division
                                    </span>

                                    <span>
                                        {team.division ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Home Kit
                                    </span>

                                    <span>
                                        {team.home_kit_colour ??
                                            'Not provided'}
                                    </span>
                                </div>

                                <div>
                                    <span className="teamAdminFieldLabel">
                                        Away Kit
                                    </span>

                                    <span>
                                        {team.away_kit_colour ??
                                            'Not provided'}
                                    </span>
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
                                    onClick={() =>
                                        onEdit(team)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn secondary small"
                                    type="button"
                                    onClick={() =>
                                        onTogglePublished(
                                            team
                                        )
                                    }
                                >
                                    {team.published
                                        ? 'Unpublish'
                                        : 'Publish'}
                                </button>

                                <button
                                    className="btn secondary small dangerButton"
                                    type="button"
                                    onClick={() =>
                                        onDelete(team)
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}