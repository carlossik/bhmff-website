export type PublicTeam = {
    id: string
    name: string
    manager_name: string | null
    logo_url: string | null
}

type PublicTeamsProps = {
    teams: PublicTeam[]
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase()
}

export function PublicTeams({
                                teams,
                            }: PublicTeamsProps) {
    return (
        <div className="publicConfirmedTeams">
            <div className="publicGroupStandingHeader">
                <span className="eyebrow">
                    Participating Clubs
                </span>

                <h3>Confirmed Teams</h3>
            </div>

            {!teams.length ? (
                <div className="teamsEmptyState">
                    <h3>
                        Confirmed teams coming soon
                    </h3>

                    <p>
                        Participating clubs will appear
                        here once their registration has
                        been confirmed and published.
                    </p>
                </div>
            ) : (
                <div className="cardGrid three">
                    {teams.map((team) => (
                        <article
                            className="card publicTeamCard"
                            key={team.id}
                        >
                            <div className="adminTeamIdentity">
                                {team.logo_url ? (
                                    <img
                                        className="adminTeamLogo"
                                        src={team.logo_url}
                                        alt={`${team.name} logo`}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="adminTeamInitials">
                                        {getInitials(
                                            team.name
                                        )}
                                    </div>
                                )}

                                <div>
                                    <span className="badge">
                                        Confirmed
                                    </span>

                                    <h3>
                                        {team.name}
                                    </h3>

                                    <p className="muted">
                                        Manager:{' '}
                                        {team.manager_name ??
                                            'To be confirmed'}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}