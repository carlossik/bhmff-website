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

                <GoldenBootTable
                    goals={goals}
                    surfaceColour={surfaceColour}
                    textColour={textColour}
                    accentColour={accentColour}
                />
            </div>
        </Section>
    )
}