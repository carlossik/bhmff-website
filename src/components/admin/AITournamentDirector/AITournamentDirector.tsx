import {
    useEffect,
    useState,
} from 'react'

import {
    Loader2,
    ShieldAlert,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { TournamentAnalysisService } from '../../../services/tournamentAnalysisService'

import { AIRecommendations } from './components/AIRecommendations'
import { AISchedulingStrategy } from './components/AISchedulingStrategy'
import { CompetitionReadiness } from './components/CompetitionReadiness'
import { CompetitionSummary } from './components/CompetitionSummary'
import { DirectorHero } from './components/DirectorHero'
import { ExecutiveDecision } from './components/ExecutiveDecision'
import { RiskRegister } from './components/RiskRegister'
import { openFixtureGenerator } from './directorNavigation'
import type { TournamentDirectorReport } from './types'

export function AITournamentDirector() {
    const { currentOrganisation } = useOrganisation()
    const { currentCompetition } = useCompetition()

    const [loading, setLoading] = useState(false)
    const [report, setReport] =
        useState<TournamentDirectorReport | null>(null)
    const [error, setError] =
        useState<string | null>(null)
    const [navigationError, setNavigationError] =
        useState<string | null>(null)

    useEffect(() => {
        if (!currentOrganisation) {
            setReport(null)
            setError(null)
            return
        }

        let active = true

        async function loadAnalysis() {
            setLoading(true)
            setError(null)
            setNavigationError(null)

            try {
                const analysis =
                    await TournamentAnalysisService.analyseTournament({
                        organisationId: currentOrganisation.id,
                        organisationName: currentOrganisation.name,
                        competitionId:
                            currentCompetition?.id ?? null,
                    })

                if (active) {
                    setReport(analysis)
                }
            } catch (caughtError) {
                if (active) {
                    setReport(null)
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : 'Unable to analyse tournament.'
                    )
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadAnalysis()

        return () => {
            active = false
        }
    }, [
        currentCompetition?.id,
        currentOrganisation,
    ])

    function handleGenerate() {
        setNavigationError(null)

        if (!openFixtureGenerator()) {
            setNavigationError(
                'The fixture generator could not be opened. Confirm that the generator module is enabled in the admin portal.'
            )
        }
    }

    if (loading) {
        return (
            <div className="relative flex min-h-[620px] items-center justify-center overflow-hidden rounded-[2rem] border border-[color:var(--organisation-border)] bg-[var(--organisation-background)]">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <div className="rounded-3xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 p-5">
                        <Loader2 className="h-12 w-12 animate-spin text-[var(--organisation-accent)]" />
                    </div>
                    <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--organisation-accent)]">
                        AI Analysis In Progress
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--organisation-text)]">
                        Analysing tournament readiness
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[color:var(--organisation-text)]/60">
                        Reviewing competition structure, team allocation, venue coverage and fixture-generation dependencies.
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-[2rem] border border-red-400/20 bg-[var(--organisation-surface)] p-8">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
                        <ShieldAlert className="h-6 w-6 text-red-300" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                            Analysis Failed
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-[var(--organisation-text)]">
                            Tournament intelligence is unavailable
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-red-100/80">
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!report) {
        return null
    }

    return (
        <div className="space-y-6">
            <DirectorHero report={report} />
            <CompetitionSummary report={report} />
            <CompetitionReadiness report={report} />
            <AISchedulingStrategy
                recommendation={
                    report.recommendedGeneratorConfig
                }
            />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RiskRegister report={report} />
                <AIRecommendations report={report} />
            </div>
            <ExecutiveDecision
                report={report}
                onGenerate={handleGenerate}
                navigationError={navigationError}
            />
        </div>
    )
}
