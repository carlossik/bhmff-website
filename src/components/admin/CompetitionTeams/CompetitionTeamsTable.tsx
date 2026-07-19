import type {
    CompetitionTeam,
} from './competitionTeamTypes'

type CompetitionTeamsTableProps = {
    competitionTeams: CompetitionTeam[]
    onEdit: (team: CompetitionTeam) => void
    onDelete: (team: CompetitionTeam) => void
}

function getStatusColour(status: string) {
    switch (status) {
        case 'confirmed':
            return 'teamParticipation-confirmed'

        case 'withdrawn':
            return 'teamParticipation-withdrawn'

        default:
            return 'teamParticipation-invited'
    }
}

export function CompetitionTeamsTable({
                                          competitionTeams,
                                          onEdit,
                                          onDelete,
                                      }: CompetitionTeamsTableProps) {
    if (!competitionTeams.length) {
        return (
            <div className="teamsEmptyState">
                <h3>No Competition Teams</h3>

                <p>
                    Add teams to this competition.
                </p>
            </div>
        )
    }

    return (
        <div className="teamsAdminGrid">
            {competitionTeams.map(
                (competitionTeam) => (
                    <article
                        key={
                            competitionTeam.id
                        }
                        className="teamAdminCard"
                    >
                        <div className="teamAdminCardHeader">
                            <div className="teamAdminIdentity">
                                {competitionTeam
                                    .team
                                    ?.logo_url ? (
                                    <img
                                        src={
                                            competitionTeam
                                                .team
                                                ?.logo_url
                                        }
                                        className="teamAdminCardLogo"
                                        alt=""
                                    />
                                ) : (
                                    <div className="teamAdminCardInitials">
                                        {competitionTeam.team?.name
                                            ?.substring(
                                                0,
                                                2
                                            )
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <h4>
                                        {
                                            competitionTeam
                                                .team
                                                ?.name
                                        }
                                    </h4>

                                    <div className="teamAdminBadges">
                                        <span
                                            className={`teamParticipationBadge ${getStatusColour(
                                                competitionTeam.status
                                            )}`}
                                        >
                                            {
                                                competitionTeam.status
                                            }
                                        </span>

                                        <span
                                            className={
                                                competitionTeam.published
                                                    ? 'teamVisibilityBadge teamVisibilityPublished'
                                                    : 'teamVisibilityBadge teamVisibilityHidden'
                                            }
                                        >
                                            {competitionTeam.published
                                                ? 'Published'
                                                : 'Hidden'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="teamAdminDetails">
                            <div>
                                <span className="teamAdminFieldLabel">
                                    Group
                                </span>

                                <strong>
                                    {competitionTeam.group
                                            ?.name ??
                                        '-'}
                                </strong>
                            </div>

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Seed
                                </span>

                                <strong>
                                    {competitionTeam.seed ??
                                        '-'}
                                </strong>
                            </div>

                            <div>
                                <span className="teamAdminFieldLabel">
                                    Squad Number
                                </span>

                                <strong>
                                    {competitionTeam.squad_number ??
                                        '-'}
                                </strong>
                            </div>
                        </div>

                        <div className="teamAdminCardActions">
                            <button
                                className="btn secondary small"
                                onClick={() =>
                                    onEdit(
                                        competitionTeam
                                    )
                                }
                            >
                                Edit
                            </button>

                            <button
                                className="btn secondary small dangerButton"
                                onClick={() =>
                                    onDelete(
                                        competitionTeam
                                    )
                                }
                            >
                                Remove
                            </button>
                        </div>
                    </article>
                )
            )}
        </div>
    )
}