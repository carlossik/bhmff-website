export type TournamentAnalysisStatus =
    | 'ready'
    | 'warning'
    | 'blocked'
    | 'information'

export type TournamentAnalysisCategory =
    | 'competition'
    | 'teams'
    | 'groups'
    | 'venues'
    | 'fixtures'

export type TournamentAnalysisCheck = {
    id: string
    category: TournamentAnalysisCategory
    title: string
    description: string
    status: TournamentAnalysisStatus
    currentValue?: number | string | boolean | null
    requiredValue?: number | string | boolean | null
}

export type TournamentAnalysisWarning = {
    id: string
    category: TournamentAnalysisCategory
    title: string
    message: string
    blocking: boolean
}

export type TournamentAnalysisRecommendation = {
    id: string
    category: TournamentAnalysisCategory
    title: string
    message: string
    priority: 'high' | 'medium' | 'low'
    suggestedModule?:
        | 'Competitions'
        | 'Competition Teams'
        | 'Groups'
        | 'Venues'
        | 'Fixtures'
        | 'Auto Fixture Generator'
}

export type TournamentAnalysisSnapshot = {
    organisationId: string
    organisationName: string
    competitionId: string | null
    competitionName: string | null
    competitionTeamCount: number
    groupCount: number
    groupedTeamCount: number
    ungroupedTeamCount: number
    venueCount: number
    fixtureCount: number
}

export type TournamentAnalysisSummary = {
    readinessScore: number
    blockingIssueCount: number
    warningCount: number
    recommendationCount: number
    readyToGenerateFixtures: boolean
    status: 'ready' | 'attention-required' | 'blocked'
    headline: string
    summary: string
}

export type TournamentAnalysisReport = {
    generatedAt: string
    snapshot: TournamentAnalysisSnapshot
    summary: TournamentAnalysisSummary
    checks: TournamentAnalysisCheck[]
    warnings: TournamentAnalysisWarning[]
    recommendations: TournamentAnalysisRecommendation[]
}