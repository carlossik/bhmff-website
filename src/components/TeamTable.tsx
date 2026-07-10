import type { Team } from '../data/festivalData'

export function TeamTable({ teams }: { teams: Team[] }) {
    if (!teams.length) {
        return (
            <div className="teamsEmptyState">
                <h3>Teams coming soon</h3>
                <p>Confirmed participating clubs will appear here once registration is completed.</p>
            </div>
        )
    }

    return (
        <>
            <div className="publicTeamsGrid">
                {teams.map((team) => (
                    <article className="publicTeamCard" key={team.id}>
                        <div className="teamBadge">
                            {team.name
                                .split(' ')
                                .map((word) => word[0])
                                .join('')
                                .slice(0, 3)}
                        </div>

                        <div>
                            <span className="badge">Confirmed Team</span>
                            <h3>{team.name}</h3>
                            <p>Manager: {team.manager || 'TBC'}</p>
                        </div>
                    </article>
                ))}
            </div>

            <div className="leagueTableSection">
                <h3>Current League Table</h3>

                <div className="tableWrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Team</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                        </thead>

                        <tbody>
                        {teams.map((team) => (
                            <tr key={team.id}>
                                <td>{team.name}</td>
                                <td>{team.played}</td>
                                <td>{team.won}</td>
                                <td>{team.drawn}</td>
                                <td>{team.lost}</td>
                                <td>{team.goalDifference}</td>
                                <td><strong>{team.points}</strong></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}