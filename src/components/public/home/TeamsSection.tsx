import { PublicGroupStandings } from '../PublicGroupStandings'
import { PublicTeams, type PublicTeam } from '../PublicTeams'
import { Section } from '../../Section'

export type TeamsSectionProps = {
    isBhmff: boolean
    teams: PublicTeam[]
    competitionId: string | null
}

export function TeamsSection({
    isBhmff,
    teams,
    competitionId,
}: TeamsSectionProps) {
    return (
        <Section
            id="teams"
            title="Teams & Group Standings"
            intro="Meet the confirmed participating clubs and follow live group tables calculated automatically from published group-stage results."
        >
            <PublicTeams teams={teams} />

            <div className="mt-8">
                <PublicGroupStandings
                    competitionId={competitionId}
                />
            </div>

            {isBhmff && !competitionId ? (
                <p className="mt-4 text-sm opacity-70">
                    Select a published competition to view group standings.
                </p>
            ) : null}
        </Section>
    )
}
