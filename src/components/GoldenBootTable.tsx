export type PublicGoal = {
    id: string
    fixtureId: string
    teamId: string
    teamName: string
    teamLogoUrl: string
    playerName: string
    minute: number | null
    videoTimestamp: string
}

type GoldenBootEntry = {
    key: string
    playerName: string
    teamId: string
    teamName: string
    teamLogoUrl: string
    goals: number
}

type GoldenBootTableProps = {
    goals: PublicGoal[]
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

export function GoldenBootTable({
                                    goals,
                                }: GoldenBootTableProps) {
    const scorerMap = new Map<
        string,
        GoldenBootEntry
    >()

    goals.forEach((goal) => {
        const normalisedName =
            goal.playerName
                .trim()
                .toLowerCase()

        const key = `${goal.teamId}:${normalisedName}`

        const existing =
            scorerMap.get(key)

        if (existing) {
            existing.goals += 1
            return
        }

        scorerMap.set(key, {
            key,
            playerName:
                goal.playerName.trim(),
            teamId: goal.teamId,
            teamName: goal.teamName,
            teamLogoUrl:
            goal.teamLogoUrl,
            goals: 1,
        })
    })

    const leaderboard =
        Array.from(
            scorerMap.values()
        ).sort((first, second) => {
            if (
                second.goals !== first.goals
            ) {
                return (
                    second.goals -
                    first.goals
                )
            }

            return first.playerName.localeCompare(
                second.playerName
            )
        })

    if (!leaderboard.length) {
        return (
            <div className="teamsEmptyState">
                <h3>
                    Golden Boot table coming soon
                </h3>

                <p>
                    Scorers from published match
                    results will appear here.
                </p>
            </div>
        )
    }

    return (
        <div className="tableWrap goldenBootWrap">
            <table className="goldenBootTable">
                <thead>
                <tr>
                    <th>Pos</th>
                    <th>Player</th>
                    <th>Club</th>
                    <th>Goals</th>
                </tr>
                </thead>

                <tbody>
                {leaderboard.map(
                    (entry, index) => (
                        <tr key={entry.key}>
                            <td>
                                    <span className="leaguePosition">
                                        {index + 1}
                                    </span>
                            </td>

                            <td>
                                <strong>
                                    {
                                        entry.playerName
                                    }
                                </strong>
                            </td>

                            <td>
                                <div className="goldenBootClub">
                                    <div className="leagueTeamLogo">
                                        {entry.teamLogoUrl ? (
                                            <img
                                                src={
                                                    entry.teamLogoUrl
                                                }
                                                alt={`${entry.teamName} logo`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            getInitials(
                                                entry.teamName
                                            )
                                        )}
                                    </div>

                                    <span>
                                            {
                                                entry.teamName
                                            }
                                        </span>
                                </div>
                            </td>

                            <td className="goldenBootGoals">
                                <strong>
                                    {entry.goals}
                                </strong>
                            </td>
                        </tr>
                    )
                )}
                </tbody>
            </table>
        </div>
    )
}