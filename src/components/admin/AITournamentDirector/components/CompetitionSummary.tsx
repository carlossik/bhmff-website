import {
    CalendarDays,
    CircleAlert,
    Layers3,
    MapPin,
    Users,
} from 'lucide-react'

import type { TournamentDirectorReport } from '../types'
import { DirectorMetric } from './DirectorMetric'

type CompetitionSummaryProps = {
    report: TournamentDirectorReport
}

export function CompetitionSummary({
    report,
}: CompetitionSummaryProps) {
    const { snapshot } = report

    return (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DirectorMetric
                label="Competition Teams"
                value={snapshot.competitionTeamCount}
                icon={Users}
                helper="Teams available for scheduling"
                accent="violet"
            />
            <DirectorMetric
                label="Groups"
                value={snapshot.groupCount}
                icon={Layers3}
                helper="Configured competition groups"
            />
            <DirectorMetric
                label="Ungrouped Teams"
                value={snapshot.ungroupedTeamCount}
                icon={CircleAlert}
                helper="Teams requiring allocation"
                accent="amber"
            />
            <DirectorMetric
                label="Venues"
                value={snapshot.venueCount}
                icon={MapPin}
                helper="Registered delivery locations"
                accent="sky"
            />
            <DirectorMetric
                label="Fixtures"
                value={snapshot.fixtureCount}
                icon={CalendarDays}
                helper="Fixtures currently generated"
                accent="violet"
            />
        </section>
    )
}
