import { supabase } from '../../../lib/supabaseClient'
import type {
    ClubPaymentStatus,
    ClubPlayerRegistrationStatus,
    ClubSquadMember,
    ClubSquadMemberFormValues,
} from './squadTypes'

type SupabaseErrorLike = {
    message: string
}

type SquadJoinRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    player_id: string
    squad_number: number | null
    position: string | null
    registration_status: ClubPlayerRegistrationStatus
    sign_on_fee_amount: number | string
    sign_on_fee_status: ClubPaymentStatus
    notes: string | null
    active: boolean
    created_at: string
    updated_at: string
    club_players: {
        id: string
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
        active: boolean
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

function optionalText(
    value: string,
): string | null {
    const trimmed = value.trim()
    return trimmed.length > 0
        ? trimmed
        : null
}

function optionalNumber(
    value: string,
): number | null {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = Number(trimmed)

    return Number.isFinite(parsed)
        ? parsed
        : null
}

function money(value: string): number {
    const parsed = Number(
        value.trim() || '0',
    )

    return Number.isFinite(parsed) &&
        parsed >= 0
        ? parsed
        : 0
}

function mapRow(
    row: SquadJoinRow,
): ClubSquadMember {
    if (!row.club_players) {
        throw new Error(
            'A squad member is missing its linked player record.',
        )
    }

    return {
        id: row.id,
        organisation_id:
            row.organisation_id,
        season_id: row.season_id,
        team_id: row.team_id,
        player_id: row.player_id,
        squad_number:
            row.squad_number,
        position: row.position,
        registration_status:
            row.registration_status,
        sign_on_fee_amount: Number(
            row.sign_on_fee_amount,
        ),
        sign_on_fee_status:
            row.sign_on_fee_status,
        notes: row.notes,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        player: row.club_players,
    }
}

export const clubSquadService = {
    async getSquad(
        organisationId: string,
        seasonId: string,
        teamId: string,
    ): Promise<ClubSquadMember[]> {
        const { data, error } =
            await supabase
                .from(
                    'club_squad_members',
                )
                .select(`
                    id,
                    organisation_id,
                    season_id,
                    team_id,
                    player_id,
                    squad_number,
                    position,
                    registration_status,
                    sign_on_fee_amount,
                    sign_on_fee_status,
                    notes,
                    active,
                    created_at,
                    updated_at,
                    club_players!club_squad_members_player_id_fkey (
                        id,
                        first_name,
                        last_name,
                        email,
                        phone,
                        active
                    )
                `)
                .eq(
                    'organisation_id',
                    organisationId,
                )
                .eq(
                    'season_id',
                    seasonId,
                )
                .eq(
                    'team_id',
                    teamId,
                )
                .order(
                    'squad_number',
                    {
                        ascending: true,
                        nullsFirst: false,
                    },
                )

        throwSupabaseError(
            error,
            'Failed to load club squad',
        )

        return (
            (data ?? []) as unknown as
                SquadJoinRow[]
        ).map(mapRow)
    },

    async createMember(
        organisationId: string,
        seasonId: string,
        teamId: string,
        values:
            ClubSquadMemberFormValues,
    ): Promise<void> {
        const {
            data: player,
            error: playerError,
        } =
            await supabase
                .from('club_players')
                .insert({
                    organisation_id:
                        organisationId,
                    first_name:
                        values.first_name.trim(),
                    last_name:
                        values.last_name.trim(),
                    email: optionalText(
                        values.email,
                    ),
                    phone: optionalText(
                        values.phone,
                    ),
                    active: values.active,
                    updated_at:
                        new Date().toISOString(),
                })
                .select('id')
                .single()

        throwSupabaseError(
            playerError,
            'Failed to create club player',
        )

        if (!player) {
            throw new Error(
                'Player was created but could not be returned.',
            )
        }

        const { error: squadError } =
            await supabase
                .from(
                    'club_squad_members',
                )
                .insert({
                    organisation_id:
                        organisationId,
                    season_id:
                        seasonId,
                    team_id: teamId,
                    player_id:
                        player.id,
                    squad_number:
                        optionalNumber(
                            values.squad_number,
                        ),
                    position:
                        optionalText(
                            values.position,
                        ),
                    registration_status:
                        values.registration_status,
                    sign_on_fee_amount:
                        money(
                            values.sign_on_fee_amount,
                        ),
                    sign_on_fee_status:
                        values.sign_on_fee_status,
                    notes: optionalText(
                        values.notes,
                    ),
                    active:
                        values.active,
                    updated_at:
                        new Date().toISOString(),
                })

        if (squadError) {
            await supabase
                .from('club_players')
                .delete()
                .eq(
                    'id',
                    player.id,
                )

            throwSupabaseError(
                squadError,
                'Failed to add player to squad',
            )
        }
    },

    async updateMember(
        member: ClubSquadMember,
        values:
            ClubSquadMemberFormValues,
    ): Promise<void> {
        const { error: playerError } =
            await supabase
                .from('club_players')
                .update({
                    first_name:
                        values.first_name.trim(),
                    last_name:
                        values.last_name.trim(),
                    email: optionalText(
                        values.email,
                    ),
                    phone: optionalText(
                        values.phone,
                    ),
                    active: values.active,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq(
                    'id',
                    member.player_id,
                )
                .eq(
                    'organisation_id',
                    member.organisation_id,
                )

        throwSupabaseError(
            playerError,
            'Failed to update club player',
        )

        const { error: memberError } =
            await supabase
                .from(
                    'club_squad_members',
                )
                .update({
                    squad_number:
                        optionalNumber(
                            values.squad_number,
                        ),
                    position:
                        optionalText(
                            values.position,
                        ),
                    registration_status:
                        values.registration_status,
                    sign_on_fee_amount:
                        money(
                            values.sign_on_fee_amount,
                        ),
                    sign_on_fee_status:
                        values.sign_on_fee_status,
                    notes: optionalText(
                        values.notes,
                    ),
                    active:
                        values.active,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq(
                    'id',
                    member.id,
                )
                .eq(
                    'organisation_id',
                    member.organisation_id,
                )
                .eq(
                    'season_id',
                    member.season_id,
                )
                .eq(
                    'team_id',
                    member.team_id,
                )

        throwSupabaseError(
            memberError,
            'Failed to update squad member',
        )
    },

    async removeMember(
        member: ClubSquadMember,
    ): Promise<void> {
        const { error } =
            await supabase
                .from(
                    'club_squad_members',
                )
                .delete()
                .eq(
                    'id',
                    member.id,
                )
                .eq(
                    'organisation_id',
                    member.organisation_id,
                )
                .eq(
                    'season_id',
                    member.season_id,
                )
                .eq(
                    'team_id',
                    member.team_id,
                )

        throwSupabaseError(
            error,
            'Failed to remove player from squad',
        )
    },
}
