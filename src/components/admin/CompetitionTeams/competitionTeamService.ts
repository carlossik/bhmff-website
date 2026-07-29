import { supabase } from '../../../lib/supabaseClient'

import {
    MATCH_DAYS,
    type CompetitionTeam,
    type CompetitionTeamRow,
    type MatchDay,
    type OrganisationTeamOption,
    type OrganisationTeamRow,
} from './competitionTeamTypes'

function getSingleRelation<T>(
    value: T | T[] | null
): T | null {
    if (!value) {
        return null
    }

    return Array.isArray(value)
        ? value[0] ?? null
        : value
}

function isMatchDay(
    value: string
): value is MatchDay {
    return MATCH_DAYS.includes(
        value as MatchDay
    )
}

function normaliseMatchDays(
    values: string[] | null | undefined
): MatchDay[] {
    return (values ?? []).filter(isMatchDay)
}

function mapOrganisationTeam(
    row: OrganisationTeamRow
): OrganisationTeamOption {
    const club = getSingleRelation(row.club)

    return {
        id: row.id,
        club_id: row.club_id,
        name: row.name,
        logo_url: row.logo_url,
        age_group: row.age_group,
        division: row.division,
        participation_status:
        row.participation_status,
        published: row.published,
        club_name: club?.name ?? null,
    }
}

function mapCompetitionTeam(
    row: CompetitionTeamRow
): CompetitionTeam | null {
    const team = getSingleRelation(row.team)

    if (!team) {
        return null
    }

    const club = getSingleRelation(team.club)

    return {
        id: row.id,
        competition_id: row.competition_id,
        team_id: row.team_id,
        created_at: row.created_at,
        preferred_match_days:
            normaliseMatchDays(
                row.preferred_match_days
            ),
        team: {
            id: team.id,
            club_id: team.club_id,
            name: team.name,
            logo_url: team.logo_url,
            age_group: team.age_group,
            division: team.division,
            participation_status:
            team.participation_status,
            published: team.published,
            club_name: club?.name ?? null,
        },
    }
}

export const competitionTeamService = {
    async getOrganisationTeams(
        organisationId: string
    ): Promise<OrganisationTeamOption[]> {
        const { data, error } = await supabase
            .from('teams')
            .select(`
                id,
                club_id,
                name,
                logo_url,
                age_group,
                division,
                participation_status,
                published,
                club:clubs (
                    name
                )
            `)
            .eq(
                'organisation_id',
                organisationId
            )
            .order('name', {
                ascending: true,
            })

        if (error) {
            throw error
        }

        return (
            (data ?? []) as OrganisationTeamRow[]
        ).map(mapOrganisationTeam)
    },

    async getCompetitionTeams(
        competitionId: string
    ): Promise<CompetitionTeam[]> {
        const { data, error } = await supabase
            .from('competition_teams')
            .select(`
                id,
                competition_id,
                team_id,
                created_at,
                preferred_match_days,
                team:teams (
                    id,
                    club_id,
                    name,
                    logo_url,
                    age_group,
                    division,
                    participation_status,
                    published,
                    club:clubs (
                        name
                    )
                )
            `)
            .eq(
                'competition_id',
                competitionId
            )
            .order('created_at', {
                ascending: true,
            })

        if (error) {
            throw error
        }

        return (
            (data ?? []) as CompetitionTeamRow[]
        )
            .map(mapCompetitionTeam)
            .filter(
                (
                    team
                ): team is CompetitionTeam =>
                    team !== null
            )
    },

    async saveSelection(
        competitionId: string,
        selectedTeamIds: string[],
        existingTeamIds: string[],
        preferredDaysByTeam: Record<
            string,
            MatchDay[]
        >,
        defaultMatchDays: MatchDay[]
    ): Promise<void> {
        const selectedIds = new Set(
            selectedTeamIds
        )

        const existingIds = new Set(
            existingTeamIds
        )

        const teamIdsToAdd =
            selectedTeamIds.filter(
                (teamId) =>
                    !existingIds.has(teamId)
            )

        const teamIdsToRemove =
            existingTeamIds.filter(
                (teamId) =>
                    !selectedIds.has(teamId)
            )

        const getDaysForTeam = (
            teamId: string
        ): MatchDay[] => {
            const preferredDays =
                preferredDaysByTeam[teamId] ??
                []

            return preferredDays.length > 0
                ? preferredDays
                : defaultMatchDays
        }

        if (teamIdsToAdd.length) {
            const rows = teamIdsToAdd.map(
                (teamId) => ({
                    competition_id:
                    competitionId,
                    team_id: teamId,
                    preferred_match_days:
                        getDaysForTeam(teamId),
                })
            )

            const { error } = await supabase
                .from('competition_teams')
                .insert(rows)

            if (error) {
                throw error
            }
        }

        const teamIdsToUpdate =
            selectedTeamIds.filter(
                (teamId) =>
                    existingIds.has(teamId)
            )

        if (teamIdsToUpdate.length) {
            const updateResults =
                await Promise.all(
                    teamIdsToUpdate.map(
                        (teamId) =>
                            supabase
                                .from(
                                    'competition_teams'
                                )
                                .update({
                                    preferred_match_days:
                                        getDaysForTeam(
                                            teamId
                                        ),
                                })
                                .eq(
                                    'competition_id',
                                    competitionId
                                )
                                .eq(
                                    'team_id',
                                    teamId
                                )
                    )
                )

            const updateError =
                updateResults.find(
                    (result) =>
                        result.error
                )?.error

            if (updateError) {
                throw updateError
            }
        }

        if (teamIdsToRemove.length) {
            const { error } = await supabase
                .from('competition_teams')
                .delete()
                .eq(
                    'competition_id',
                    competitionId
                )
                .in(
                    'team_id',
                    teamIdsToRemove
                )

            if (error) {
                throw error
            }
        }
    },
}