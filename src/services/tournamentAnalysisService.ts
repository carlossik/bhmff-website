import { competitionTeamService } from
        '../components/admin/CompetitionTeams/competitionTeamService'
import { fixtureService } from
        '../components/admin/Fixtures/fixtureService'
import { groupService } from
        '../components/admin/Groups/groupService'
import { venueService } from
        '../components/admin/Venues/venueService'
import { competitionService } from
        './competitionService'

import type {
    TournamentAnalysisCheck,
    TournamentAnalysisRecommendation,
    TournamentAnalysisReport,
    TournamentAnalysisSnapshot,
    TournamentAnalysisWarning,
} from '../types/tournamentAnalysis'

type LoadTournamentSnapshotParams = {
    organisationId: string
    organisationName: string
    competitionId: string | null
}

export class TournamentAnalysisService {
    static async loadTournamentSnapshot({
                                            organisationId,
                                            organisationName,
                                            competitionId,
                                        }: LoadTournamentSnapshotParams): Promise<TournamentAnalysisSnapshot> {
        if (!organisationId) {
            throw new Error(
                'An organisation is required to analyse the tournament.'
            )
        }

        if (!competitionId) {
            return {
                organisationId,
                organisationName,
                competitionId: null,
                competitionName: null,
                competitionTeamCount: 0,
                groupCount: 0,
                groupedTeamCount: 0,
                ungroupedTeamCount: 0,
                venueCount: 0,
                fixtureCount: 0,
            }
        }

        const competition =
            await competitionService.getById(competitionId)

        if (!competition) {
            throw new Error(
                'The selected competition could not be found.'
            )
        }

        const [
            competitionTeams,
            groups,
            venues,
            fixtures,
        ] = await Promise.all([
            competitionTeamService.getCompetitionTeams(
                competitionId
            ),
            groupService.getGroups(competitionId),
            venueService.getVenues(
                competitionId,
                organisationId
            ),
            fixtureService.getFixtures(competitionId),
        ])

        const groupIds = groups.map(
            (group) => group.id
        )

        const groupMemberships =
            await groupService.getMemberships(groupIds)

        const uniqueGroupedCompetitionTeamIds =
            new Set(
                groupMemberships.map(
                    (membership) =>
                        membership.competition_team_id
                )
            )

        const competitionTeamCount =
            competitionTeams.length

        const groupedTeamCount =
            uniqueGroupedCompetitionTeamIds.size

        const ungroupedTeamCount =
            Math.max(
                competitionTeamCount -
                groupedTeamCount,
                0
            )

        return {
            organisationId,
            organisationName,
            competitionId: competition.id,
            competitionName: competition.name,
            competitionTeamCount,
            groupCount: groups.length,
            groupedTeamCount,
            ungroupedTeamCount,
            venueCount: venues.length,
            fixtureCount: fixtures.length,
        }
    }

    static async analyseTournament(
        params: LoadTournamentSnapshotParams
    ): Promise<TournamentAnalysisReport> {
        const snapshot =
            await TournamentAnalysisService
                .loadTournamentSnapshot(params)

        return TournamentAnalysisService.analyse(
            snapshot
        )
    }

    static analyse(
        snapshot: TournamentAnalysisSnapshot
    ): TournamentAnalysisReport {
        const checks: TournamentAnalysisCheck[] = []
        const warnings: TournamentAnalysisWarning[] = []
        const recommendations:
            TournamentAnalysisRecommendation[] = []

        //--------------------------------------------------
        // Competition
        //--------------------------------------------------

        if (snapshot.competitionId) {
            checks.push({
                id: 'competition-selected',
                category: 'competition',
                title: 'Competition selected',
                description:
                    snapshot.competitionName ??
                    'Competition selected',
                status: 'ready',
                currentValue:
                snapshot.competitionName,
            })
        } else {
            checks.push({
                id: 'competition-selected',
                category: 'competition',
                title: 'Competition selected',
                description:
                    'No competition selected',
                status: 'blocked',
                currentValue: false,
                requiredValue: true,
            })

            warnings.push({
                id: 'competition-required',
                category: 'competition',
                title: 'Competition required',
                message:
                    'Select or create a competition before continuing.',
                blocking: true,
            })

            recommendations.push({
                id: 'competition-create',
                category: 'competition',
                title:
                    'Create or select a competition',
                message:
                    'Tournament analysis requires a selected competition.',
                priority: 'high',
                suggestedModule: 'Competitions',
            })
        }

        //--------------------------------------------------
        // Competition Teams
        //--------------------------------------------------

        if (snapshot.competitionTeamCount >= 2) {
            checks.push({
                id: 'competition-teams',
                category: 'teams',
                title: 'Competition teams',
                description:
                    `${snapshot.competitionTeamCount} teams registered`,
                status: 'ready',
                currentValue:
                snapshot.competitionTeamCount,
                requiredValue: 2,
            })
        } else {
            checks.push({
                id: 'competition-teams',
                category: 'teams',
                title: 'Competition teams',
                description:
                    'Not enough teams registered',
                status: 'blocked',
                currentValue:
                snapshot.competitionTeamCount,
                requiredValue: 2,
            })

            warnings.push({
                id: 'competition-teams-warning',
                category: 'teams',
                title: 'Not enough teams',
                message:
                    'At least two teams must be registered before fixtures can be generated.',
                blocking: true,
            })

            recommendations.push({
                id: 'competition-teams-action',
                category: 'teams',
                title: 'Register teams',
                message:
                    'Add at least two teams to the selected competition.',
                priority: 'high',
                suggestedModule:
                    'Competition Teams',
            })
        }

        //--------------------------------------------------
        // Groups
        //--------------------------------------------------

        if (snapshot.groupCount > 0) {
            checks.push({
                id: 'groups',
                category: 'groups',
                title: 'Groups configured',
                description:
                    `${snapshot.groupCount} groups configured`,
                status: 'ready',
                currentValue:
                snapshot.groupCount,
            })
        } else {
            checks.push({
                id: 'groups',
                category: 'groups',
                title: 'Groups configured',
                description:
                    'No groups configured',
                status: 'warning',
                currentValue: 0,
            })

            recommendations.push({
                id: 'groups-create',
                category: 'groups',
                title: 'Create groups',
                message:
                    'Create groups where the competition format requires a group stage.',
                priority: 'medium',
                suggestedModule: 'Groups',
            })
        }

        //--------------------------------------------------
        // Group Team Allocation
        //--------------------------------------------------

        if (snapshot.groupCount === 0) {
            checks.push({
                id: 'group-team-allocation',
                category: 'groups',
                title: 'Group team allocation',
                description:
                    'No groups are currently configured',
                status: 'information',
                currentValue: 0,
            })
        } else if (
            snapshot.ungroupedTeamCount === 0 &&
            snapshot.competitionTeamCount > 0
        ) {
            checks.push({
                id: 'group-team-allocation',
                category: 'groups',
                title: 'Group team allocation',
                description:
                    `All ${snapshot.groupedTeamCount} teams are assigned to groups`,
                status: 'ready',
                currentValue:
                snapshot.groupedTeamCount,
                requiredValue:
                snapshot.competitionTeamCount,
            })
        } else {
            checks.push({
                id: 'group-team-allocation',
                category: 'groups',
                title: 'Group team allocation',
                description:
                    `${snapshot.ungroupedTeamCount} teams are not assigned to a group`,
                status: 'blocked',
                currentValue:
                snapshot.groupedTeamCount,
                requiredValue:
                snapshot.competitionTeamCount,
            })

            warnings.push({
                id: 'ungrouped-teams-warning',
                category: 'groups',
                title: 'Teams require group allocation',
                message:
                    `${snapshot.ungroupedTeamCount} competition teams have not been assigned to a group.`,
                blocking: true,
            })

            recommendations.push({
                id: 'group-team-allocation-action',
                category: 'groups',
                title: 'Complete group allocation',
                message:
                    'Assign every competition team to a group before generating group-stage fixtures.',
                priority: 'high',
                suggestedModule: 'Groups',
            })
        }

        //--------------------------------------------------
        // Venues
        //--------------------------------------------------

        if (snapshot.venueCount > 0) {
            checks.push({
                id: 'venues',
                category: 'venues',
                title: 'Venues configured',
                description:
                    `${snapshot.venueCount} venues available`,
                status: 'ready',
                currentValue:
                snapshot.venueCount,
                requiredValue: 1,
            })
        } else {
            checks.push({
                id: 'venues',
                category: 'venues',
                title: 'Venues configured',
                description:
                    'No venues configured',
                status: 'warning',
                currentValue: 0,
                requiredValue: 1,
            })

            warnings.push({
                id: 'venues-warning',
                category: 'venues',
                title: 'No venues configured',
                message:
                    'Fixtures can be generated, but they cannot be fully scheduled without a venue.',
                blocking: false,
            })

            recommendations.push({
                id: 'venues-create',
                category: 'venues',
                title: 'Add venues',
                message:
                    'Add at least one venue before publishing the fixture schedule.',
                priority: 'medium',
                suggestedModule: 'Venues',
            })
        }

        //--------------------------------------------------
        // Fixtures
        //--------------------------------------------------

        if (snapshot.fixtureCount > 0) {
            checks.push({
                id: 'fixtures',
                category: 'fixtures',
                title: 'Fixtures generated',
                description:
                    `${snapshot.fixtureCount} fixtures currently exist`,
                status: 'information',
                currentValue:
                snapshot.fixtureCount,
            })
        } else {
            checks.push({
                id: 'fixtures',
                category: 'fixtures',
                title: 'Fixtures generated',
                description:
                    'Fixtures have not yet been generated',
                status: 'warning',
                currentValue: 0,
            })

            recommendations.push({
                id: 'fixture-generator',
                category: 'fixtures',
                title: 'Generate fixtures',
                message:
                    'Use the Auto Fixture Generator after all blocking setup issues have been resolved.',
                priority: 'medium',
                suggestedModule:
                    'Auto Fixture Generator',
            })
        }

        //--------------------------------------------------
        // Readiness Summary
        //--------------------------------------------------

        const blockingIssueCount =
            warnings.filter(
                (warning) => warning.blocking
            ).length

        const warningCount =
            warnings.length

        const recommendationCount =
            recommendations.length

        const blocked =
            blockingIssueCount > 0

        const scoredChecks =
            checks.filter(
                (check) =>
                    check.status !== 'information'
            )

        const readyChecks =
            scoredChecks.filter(
                (check) =>
                    check.status === 'ready'
            ).length

        const readinessScore =
            scoredChecks.length > 0
                ? Math.round(
                    (
                        readyChecks /
                        scoredChecks.length
                    ) * 100
                )
                : 0

        const readyToGenerateFixtures =
            Boolean(snapshot.competitionId) &&
            snapshot.competitionTeamCount >= 2 &&
            !blocked

        return {
            generatedAt:
                new Date().toISOString(),

            snapshot,

            summary: {
                readinessScore,
                readyToGenerateFixtures,
                blockingIssueCount,
                warningCount,
                recommendationCount,

                status:
                    blocked
                        ? 'blocked'
                        : readinessScore >= 80
                            ? 'ready'
                            : 'attention-required',

                headline:
                    blocked
                        ? 'Tournament setup incomplete'
                        : readyToGenerateFixtures
                            ? 'Tournament ready for fixture generation'
                            : 'Tournament analysis complete',

                summary:
                    blocked
                        ? 'Resolve the blocking issues before generating fixtures.'
                        : readinessScore >= 80
                            ? 'The tournament configuration is ready for the next stage.'
                            : 'Review the recommendations before proceeding.',
            },

            checks,
            warnings,
            recommendations,
        }
    }
}