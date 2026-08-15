import { supabase } from '../../../lib/supabaseClient'

import type {
    ClubTeamPaymentFormValues,
    ClubTeamPaymentModel,
    ClubTeamSeason,
    ClubTeamSeasonStatus,
} from './clubTeamSeasonTypes'

type SupabaseErrorLike = {
    message: string
}

type TeamJoinRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    status: ClubTeamSeasonStatus
    payment_model: ClubTeamPaymentModel
    monthly_fee_amount: number | string
    matchday_sub_amount: number | string
    monthly_due_day: number
    yellow_card_fine_amount: number | string
    red_card_fine_amount: number | string
    notes: string | null
    created_at: string
    updated_at: string
    teams: {
        id: string
        name: string
        age_group: string | null
        division: string | null
        logo_url: string | null
        published: boolean
    } | null
}

function throwSupabaseError(
    error: SupabaseErrorLike | null,
    context: string,
): void {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function money(value: string): number {
    const parsed = Number(value.trim() || '0')
    return Number.isFinite(parsed) && parsed >= 0
        ? parsed
        : 0
}

function dueDay(value: string): number {
    const parsed = Number(value.trim() || '1')

    if (!Number.isInteger(parsed)) {
        return 1
    }

    return Math.min(28, Math.max(1, parsed))
}

function optionalText(value: string): string | null {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

function mapTeamSeason(row: TeamJoinRow): ClubTeamSeason {
    if (!row.teams) {
        throw new Error(
            'A club team-season record is missing its linked team.',
        )
    }

    return {
        id: row.id,
        organisation_id: row.organisation_id,
        season_id: row.season_id,
        team_id: row.team_id,
        status: row.status,
        payment_model: row.payment_model,
        monthly_fee_amount: Number(
            row.monthly_fee_amount,
        ),
        matchday_sub_amount: Number(
            row.matchday_sub_amount,
        ),
        monthly_due_day: row.monthly_due_day,
        yellow_card_fine_amount: Number(
            row.yellow_card_fine_amount,
        ),
        red_card_fine_amount: Number(
            row.red_card_fine_amount,
        ),
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        team: row.teams,
    }
}

const TEAM_SEASON_SELECT = `
    id,
    organisation_id,
    season_id,
    team_id,
    status,
    payment_model,
    monthly_fee_amount,
    matchday_sub_amount,
    monthly_due_day,
    yellow_card_fine_amount,
    red_card_fine_amount,
    notes,
    created_at,
    updated_at,
    teams!club_team_seasons_team_id_fkey (
        id,
        name,
        age_group,
        division,
        logo_url,
        published
    )
`

export const clubTeamSeasonService = {
    async getTeamSeasons(
        organisationId: string,
        seasonId: string,
    ): Promise<ClubTeamSeason[]> {
        const { data, error } = await supabase
            .from('club_team_seasons')
            .select(TEAM_SEASON_SELECT)
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .neq('status', 'archived')
            .order('created_at', {
                ascending: true,
            })

        throwSupabaseError(
            error,
            'Failed to load club teams for the season',
        )

        return (
            (data ?? []) as unknown as TeamJoinRow[]
        )
            .map(mapTeamSeason)
            .sort((left, right) =>
                left.team.name.localeCompare(
                    right.team.name,
                    undefined,
                    {
                        sensitivity: 'base',
                    },
                ),
            )
    },

    async updatePaymentPolicy(
        teamSeason: ClubTeamSeason,
        values: ClubTeamPaymentFormValues,
    ): Promise<void> {
        const { error } = await supabase
            .from('club_team_seasons')
            .update({
                payment_model: values.payment_model,
                monthly_fee_amount: money(
                    values.monthly_fee_amount,
                ),
                matchday_sub_amount: money(
                    values.matchday_sub_amount,
                ),
                monthly_due_day: dueDay(
                    values.monthly_due_day,
                ),
                yellow_card_fine_amount: money(
                    values.yellow_card_fine_amount,
                ),
                red_card_fine_amount: money(
                    values.red_card_fine_amount,
                ),
                notes: optionalText(values.notes),
                updated_at: new Date().toISOString(),
            })
            .eq('id', teamSeason.id)
            .eq(
                'organisation_id',
                teamSeason.organisation_id,
            )
            .eq('season_id', teamSeason.season_id)
            .eq('team_id', teamSeason.team_id)

        throwSupabaseError(
            error,
            'Failed to update team payment settings',
        )
    },

    async ensureTeamSeason(
        organisationId: string,
        seasonId: string,
        teamId: string,
    ): Promise<void> {
        const { error } = await supabase
            .from('club_team_seasons')
            .upsert(
                {
                    organisation_id: organisationId,
                    season_id: seasonId,
                    team_id: teamId,
                    status: 'active',
                },
                {
                    onConflict:
                        'organisation_id,season_id,team_id',
                    ignoreDuplicates: true,
                },
            )

        throwSupabaseError(
            error,
            'Failed to link team to club season',
        )
    },
}
