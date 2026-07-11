import { useState } from 'react'
import type {
    LeagueStanding,
} from '../utils/calculateStandings'

type TeamTableProps = {
    teams: LeagueStanding[]
}

function formatGoalDifference(value: number) {
    return value > 0 ? `+${value}` : String(value)
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

function TeamIdentity({
                          team,
                          size,
                      }: {
    team: LeagueStanding
    size: 'card' | 'table'
}) {
    const [imageFailed, setImageFailed] = useState(false)

    const className =
        size === 'card'
            ? 'teamBadge'
            : 'leagueTeamLogo'

    const shouldShowLogo =
        Boolean(team.logoUrl) && !imageFailed

    return (
        <div className={className}>
            {shouldShowLogo ? (
                <img
                    src={team.logoUrl}
                    alt={`${team.name} logo`}
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                getInitials(team.name)
            )}
        </div>
    )
}

export function TeamTable({
                              teams,
                          }: TeamTableProps) {
    if (!teams.length) {
        return (
            <div className="teamsEmptyState">
                <h3>Teams coming soon</h3>

                <p>
                    Confirmed participating clubs will appear here once
                    registration is completed.
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="publicTeamsGrid">
                {teams.map((team) => (
                    <article
                        className="publicTeamCard"
                        key={team.id}
                    >
                        <TeamIdentity
                            team={team}
                            size="card"
                        />

                        <div>
                            <span className="badge">
                                Confirmed Team
                            </span>

                            <h3>{team.name}</h3>

                            <p>
                                Manager: {team.manager || 'TBC'}
                            </p>
                        </div>

                        <div className="teamStatsMini">
                            <div>
                                <strong>{team.played}</strong>
                                <span>Played</span>
                            </div>

                            <div>
                                <strong>{team.points}</strong>
                                <span>Points</span>
                            </div>

                            <div>
                                <strong>
                                    {formatGoalDifference(
                                        team.goalDifference
                                    )}
                                </strong>
                                <span>GD</span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="leagueTableSection">
                <div className="leagueTableHeading">
                    <div>
                        <span className="eyebrow">
                            Live Standings
                        </span>

                        <h3>Current League Table</h3>
                    </div>

                    <p className="muted">
                        The table updates automatically from published
                        match results.
                    </p>
                </div>

                <div className="tableWrap leagueTableWrap">
                    <table className="leagueTable">
                        <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GF</th>
                            <th>GA</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                        </thead>

                        <tbody>
                        {teams.map((team) => (
                            <tr key={team.id}>
                                <td>
                                        <span className="leaguePosition">
                                            {team.position}
                                        </span>
                                </td>

                                <td className="leagueTeamName">
                                    <div className="leagueTeamIdentity">
                                        <TeamIdentity
                                            team={team}
                                            size="table"
                                        />

                                        <strong>{team.name}</strong>
                                    </div>
                                </td>

                                <td>{team.played}</td>
                                <td>{team.won}</td>
                                <td>{team.drawn}</td>
                                <td>{team.lost}</td>
                                <td>{team.goalsFor}</td>
                                <td>{team.goalsAgainst}</td>

                                <td>
                                    {formatGoalDifference(
                                        team.goalDifference
                                    )}
                                </td>

                                <td className="leaguePoints">
                                    <strong>{team.points}</strong>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <p className="leagueTableRules">
                    Teams are ranked by points, goal difference, goals
                    scored and then alphabetical order.
                </p>
            </div>
        </>
    )
}