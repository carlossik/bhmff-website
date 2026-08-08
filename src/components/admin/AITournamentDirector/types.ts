import { TournamentAnalysisService } from '../../../services/tournamentAnalysisService'

export type TournamentDirectorReport = Awaited<
    ReturnType<typeof TournamentAnalysisService.analyseTournament>
>

export type RecommendedGeneratorConfig =
    TournamentDirectorReport['recommendedGeneratorConfig']

export type DirectorAccent =
    | 'theme'
    | 'sky'
    | 'violet'
    | 'amber'

export type SectionAccent =
    | 'theme'
    | 'sky'
    | 'violet'
    | 'red'
