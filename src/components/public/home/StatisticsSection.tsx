import { useMemo, useState } from 'react'
import {
    GoldenBootTable,
    type PublicGoal,
} from '../../GoldenBootTable'
import { Section } from '../../Section'

export type StatisticsSectionProps = {
    goals: PublicGoal[]
    organisationName: string
    isBhmff: boolean
    surfaceColour: string
    textColour: string
    accentColour: string
}

export function StatisticsSection({
                                      goals,
                                      organisationName,
                                      isBhmff,
                                      surfaceColour,
                                      textColour,
                                      accentColour,
                                  }: StatisticsSectionProps) {
    const competitionLabel = isBhmff ? 'tournament' : 'competition'
    const [showFullTable, setShowFullTable] = useState(false)
    const leaders = useMemo(() => {
        const scores = new Map<string, { playerName: string; teamName: string; teamLogoUrl: string; goals: number }>()
        for (const goal of goals) {
            const key = `${goal.teamId}::${goal.playerName.trim().toLocaleLowerCase()}`
            const current = scores.get(key)
            if (current) current.goals += 1
            else scores.set(key, {
                playerName: goal.playerName,
                teamName: goal.teamName,
                teamLogoUrl: goal.teamLogoUrl || '',
                goals: 1,
            })
        }
        const sorted = [...scores.values()].sort((a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName))
        const distinctRanks = [...new Set(sorted.map(player => player.goals))]
        return { visible: sorted.filter(player => distinctRanks.indexOf(player.goals) < 2), total: sorted.length }
    }, [goals])

    return (
        <Section
            id="statistics"
            title="Statistics Centre"
            intro={`Official ${competitionLabel} statistics calculated from published match data for ${organisationName}.`}
        >
            <div>
                <h3 className="text-xl font-black sm:text-2xl">
                    Top Scorers
                </h3>

                <p className="mb-5 mt-2 max-w-3xl text-sm leading-6 opacity-75 sm:text-base">
                    Live goalscoring leaderboard from confirmed {competitionLabel}{' '}
                    matches. The leading scorer at the end of the{' '}
                    {competitionLabel} will receive the Golden Boot Award.
                </p>

                {isBhmff && !showFullTable ? (
                    <div className="space-y-3" aria-label="Golden Boot leading scorers">
                        {leaders.visible.length === 0 ? (
                            <p className="rounded-xl border border-white/10 p-5 opacity-70">No published goal scorers yet.</p>
                        ) : leaders.visible.map(player => (
                            <div key={`${player.teamName}:${player.playerName}`} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4" style={{ background: surfaceColour }}>
                                <div className="flex min-w-0 items-center gap-3">
                                    {player.teamLogoUrl ? <img src={player.teamLogoUrl} alt="" className="h-10 w-10 shrink-0 object-contain" /> : null}
                                    <div className="min-w-0">
                                        <p className="font-bold">{player.playerName}</p>
                                        <p className="text-sm opacity-70">{player.teamName}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-2xl font-black" style={{ color: accentColour }}>{player.goals}</span>
                                    <p className="text-xs opacity-70">{player.goals === 1 ? 'goal' : 'goals'}</p>
                                </div>
                            </div>
                        ))}
                        <p className="text-sm opacity-75">All goals count towards the Golden Boot, including goals scored by players whose teams have been eliminated.</p>
                    </div>
                ) : (
                    <GoldenBootTable goals={goals} surfaceColour={surfaceColour} textColour={textColour} accentColour={accentColour} />
                )}
                {isBhmff && leaders.total > 0 ? (
                    <button type="button" onClick={() => setShowFullTable(previous => !previous)}
                        className="mt-4 rounded-xl border px-5 py-3 text-sm font-bold transition hover:opacity-80"
                        style={{ borderColor: accentColour, color: accentColour }}>
                        {showFullTable ? 'Show Golden Boot leaders' : `View full Golden Boot table (${leaders.total} players)`}
                    </button>
                ) : null}
            </div>
        </Section>
    )
}