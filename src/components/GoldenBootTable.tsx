import { Medal } from 'lucide-react'

import { PublicEmptyState } from './public/home/PublicEmptyState'

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

export type GoldenBootTableProps = {
    goals: PublicGoal[]
    surfaceColour: string
    textColour: string
    accentColour: string
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
                                    surfaceColour,
                                    textColour,
                                    accentColour,
                                }: GoldenBootTableProps) {
    const scorerMap = new Map<string, GoldenBootEntry>()

    goals.forEach((goal) => {
        const normalisedName = goal.playerName.trim().toLowerCase()
        const key = `${goal.teamId}:${normalisedName}`
        const existing = scorerMap.get(key)

        if (existing) {
            existing.goals += 1
            return
        }

        scorerMap.set(key, {
            key,
            playerName: goal.playerName.trim(),
            teamId: goal.teamId,
            teamName: goal.teamName,
            teamLogoUrl: goal.teamLogoUrl,
            goals: 1,
        })
    })

    const leaderboard = Array.from(scorerMap.values()).sort(
        (first, second) => {
            if (second.goals !== first.goals) {
                return second.goals - first.goals
            }

            return first.playerName.localeCompare(second.playerName)
        },
    )

    if (!leaderboard.length) {
        return (
            <PublicEmptyState
                title="Golden Boot table coming soon"
                description="Scorers from published match results will appear here."
                icon={Medal}
                surfaceColour={surfaceColour}
                textColour={textColour}
                accentColour={accentColour}
            />
        )
    }

    return (
        <div
            className="overflow-hidden rounded-2xl border shadow-sm"
            style={{
                backgroundColor: surfaceColour,
                borderColor: `${accentColour}30`,
                color: textColour,
            }}
        >
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                    <thead
                        style={{
                            backgroundColor: `${accentColour}12`,
                        }}
                    >
                    <tr>
                        <th
                            className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] sm:px-5"
                            style={{ color: accentColour }}
                        >
                            Pos
                        </th>
                        <th
                            className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] sm:px-5"
                            style={{ color: accentColour }}
                        >
                            Player
                        </th>
                        <th
                            className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] sm:px-5"
                            style={{ color: accentColour }}
                        >
                            Club
                        </th>
                        <th
                            className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] sm:px-5"
                            style={{ color: accentColour }}
                        >
                            Goals
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {leaderboard.map((entry, index) => (
                        <tr
                            key={entry.key}
                            className="border-t"
                            style={{
                                borderColor: `${accentColour}20`,
                            }}
                        >
                            <td className="px-4 py-4 sm:px-5">
                                    <span
                                        className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black"
                                        style={{
                                            backgroundColor:
                                                index === 0
                                                    ? accentColour
                                                    : `${accentColour}18`,
                                            color:
                                                index === 0
                                                    ? '#ffffff'
                                                    : accentColour,
                                        }}
                                    >
                                        {index + 1}
                                    </span>
                            </td>

                            <td className="px-4 py-4 sm:px-5">
                                <strong className="font-black">
                                    {entry.playerName}
                                </strong>
                            </td>

                            <td className="px-4 py-4 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-black"
                                        style={{
                                            backgroundColor: `${accentColour}10`,
                                            borderColor: `${accentColour}30`,
                                            color: accentColour,
                                        }}
                                    >
                                        {entry.teamLogoUrl ? (
                                            <img
                                                src={entry.teamLogoUrl}
                                                alt={`${entry.teamName} logo`}
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            getInitials(entry.teamName)
                                        )}
                                    </div>

                                    <span className="truncate font-semibold">
                                            {entry.teamName}
                                        </span>
                                </div>
                            </td>

                            <td className="px-4 py-4 text-right sm:px-5">
                                <strong
                                    className="text-xl font-black"
                                    style={{ color: accentColour }}
                                >
                                    {entry.goals}
                                </strong>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}