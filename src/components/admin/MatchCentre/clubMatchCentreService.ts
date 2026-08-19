import { supabase } from '../../../lib/supabaseClient'

import type {
    ClubMatchCentreFixture,
    ClubMatchCentreRosterPlayer,
    ClubMatchCentreSeason,
    ClubMatchCentreSquad,
    ClubMatchCentreSquadMember,
    ClubMatchCentreTeam,
    ClubMatchSquadStatus,
    SaveClubMatchCentreSquadInput,
    SaveClubMatchCentreSquadResult,
} from './clubMatchCentreTypes'

type SupabaseErrorLike = {
    message: string
}

type SeasonRow = {
    id: string
    organisation_id: string
    name: string
    season_label: string
    start_date: string | null
    end_date: string | null
    status: string
}

type TeamSeasonRow = {
    team_id: string
    status: string
}

type TeamRow = {
    id: string
    name: string
}

type FixtureRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    opponent_id: string | null
    fixture_date: string
    kickoff_time: string | null
    home_away: 'home' | 'away' | 'neutral'
    fixture_type: string
    venue_name: string | null
    venue_address: string | null
    status: ClubMatchCentreFixture['status']
    published: boolean
}

type OpponentRow = {
    id: string
    name: string
}

type MatchSquadRow = {
    id: string
    organisation_id: string
    season_id: string
    team_id: string
    fixture_id: string
    status: ClubMatchSquadStatus
    published: boolean
    notes: string | null
}

type MatchSquadMemberRow = {
    id: string
    match_squad_id: string
    squad_member_id: string
    selection_role: ClubMatchCentreSquadMember['selectionRole']
    appearance_status: ClubMatchCentreSquadMember['appearanceStatus']
    squad_number: number | null
    position: string | null
    player_name: string
    is_captain: boolean
    is_goalkeeper: boolean
    sort_order: number
}

type SquadMemberRow = {
    id: string
    player_id: string
    squad_number: number | null
    position: string | null
    registration_status: ClubMatchCentreRosterPlayer['registrationStatus']
    active: boolean
}

type PlayerRow = {
    id: string
    first_name: string
    last_name: string
}

type SaveRpcRow = {
    match_squad_id: string
    fixture_id: string
    status: ClubMatchSquadStatus
    published: boolean
    member_count: number
}

function throwSupabaseError(
    error: SupabaseErrorLike | null,
    context: string,
): void {
    if (!error) return

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

function uniqueNonEmpty(values: Array<string | null>): string[] {
    return Array.from(
        new Set(
            values.filter(
                (value): value is string =>
                    typeof value === 'string' && value.length > 0,
            ),
        ),
    )
}

function playerDisplayName(player: PlayerRow | undefined): string {
    if (!player) return 'Player'

    const name = `${player.first_name} ${player.last_name}`.trim()
    return name || 'Player'
}

export const clubMatchCentreService = {
    async getSeasons(
        organisationId: string,
    ): Promise<ClubMatchCentreSeason[]> {
        const { data, error } = await supabase
            .from('club_seasons')
            .select(
                'id,organisation_id,name,season_label,start_date,end_date,status',
            )
            .eq('organisation_id', organisationId)
            .order('start_date', {
                ascending: false,
                nullsFirst: false,
            })

        throwSupabaseError(error, 'Failed to load Match Centre seasons')

        return ((data ?? []) as SeasonRow[]).map((row) => ({
            id: row.id,
            organisationId: row.organisation_id,
            name: row.name,
            seasonLabel: row.season_label,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
        }))
    },

    async getTeams(
        organisationId: string,
        seasonId: string,
    ): Promise<ClubMatchCentreTeam[]> {
        const { data: linksData, error: linksError } = await supabase
            .from('club_team_seasons')
            .select('team_id,status')
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .neq('status', 'archived')

        throwSupabaseError(linksError, 'Failed to load Match Centre team seasons')

        const links = (linksData ?? []) as TeamSeasonRow[]
        const teamIds = uniqueNonEmpty(links.map((row) => row.team_id))

        if (teamIds.length === 0) return []

        const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id,name')
            .eq('organisation_id', organisationId)
            .in('id', teamIds)
            .order('name')

        throwSupabaseError(teamsError, 'Failed to load Match Centre teams')

        const linkByTeamId = new Map(
            links.map((link) => [link.team_id, link.status]),
        )

        return ((teamsData ?? []) as TeamRow[]).map((team) => ({
            id: team.id,
            name: team.name,
            shortName: null,
            teamSeasonStatus: linkByTeamId.get(team.id) ?? 'inactive',
        }))
    },

    async getFixtures(
        organisationId: string,
        seasonId: string,
        teamId: string,
    ): Promise<ClubMatchCentreFixture[]> {
        const { data: fixturesData, error: fixturesError } = await supabase
            .from('club_fixtures')
            .select(
                'id,organisation_id,season_id,team_id,opponent_id,fixture_date,kickoff_time,home_away,fixture_type,venue_name,venue_address,status,published',
            )
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .eq('team_id', teamId)
            .order('fixture_date', { ascending: true })
            .order('kickoff_time', {
                ascending: true,
                nullsFirst: false,
            })

        throwSupabaseError(fixturesError, 'Failed to load Match Centre fixtures')

        const fixtureRows = (fixturesData ?? []) as FixtureRow[]
        if (fixtureRows.length === 0) return []

        const opponentIds = uniqueNonEmpty(
            fixtureRows.map((fixture) => fixture.opponent_id),
        )

        const opponentById = new Map<string, string>()

        if (opponentIds.length > 0) {
            const { data: opponentsData, error: opponentsError } = await supabase
                .from('club_opponents')
                .select('id,name')
                .eq('organisation_id', organisationId)
                .in('id', opponentIds)

            throwSupabaseError(opponentsError, 'Failed to load Match Centre opponents')

            ;((opponentsData ?? []) as OpponentRow[]).forEach((opponent) => {
                opponentById.set(opponent.id, opponent.name)
            })
        }

        const fixtureIds = fixtureRows.map((fixture) => fixture.id)

        const { data: squadsData, error: squadsError } = await supabase
            .from('club_match_squads')
            .select('id,fixture_id,status')
            .eq('organisation_id', organisationId)
            .in('fixture_id', fixtureIds)

        throwSupabaseError(squadsError, 'Failed to load Match Centre squad states')

        const squadRows = (squadsData ?? []) as Array<{
            id: string
            fixture_id: string
            status: ClubMatchSquadStatus
        }>

        const squadByFixtureId = new Map(
            squadRows.map((squad) => [squad.fixture_id, squad]),
        )
        const squadIds = squadRows.map((squad) => squad.id)
        const memberCountBySquadId = new Map<string, number>()

        if (squadIds.length > 0) {
            const { data: membersData, error: membersError } = await supabase
                .from('club_match_squad_members')
                .select('match_squad_id')
                .eq('organisation_id', organisationId)
                .in('match_squad_id', squadIds)

            throwSupabaseError(
                membersError,
                'Failed to load Match Centre squad counts',
            )

            ;((membersData ?? []) as Array<{ match_squad_id: string }>).forEach(
                (member) => {
                    memberCountBySquadId.set(
                        member.match_squad_id,
                        (memberCountBySquadId.get(member.match_squad_id) ?? 0) + 1,
                    )
                },
            )
        }

        return fixtureRows.map((fixture) => {
            const squad = squadByFixtureId.get(fixture.id)

            return {
                id: fixture.id,
                organisationId: fixture.organisation_id,
                seasonId: fixture.season_id,
                teamId: fixture.team_id,
                opponentId: fixture.opponent_id,
                opponentName:
                    (fixture.opponent_id
                        ? opponentById.get(fixture.opponent_id)
                        : null) ?? 'Opponent TBC',
                fixtureDate: fixture.fixture_date,
                kickoffTime: fixture.kickoff_time,
                homeAway: fixture.home_away,
                fixtureType: fixture.fixture_type,
                venueName: fixture.venue_name,
                venueAddress: fixture.venue_address,
                status: fixture.status,
                published: fixture.published,
                matchSquadId: squad?.id ?? null,
                matchSquadStatus: squad?.status ?? null,
                matchSquadMemberCount: squad
                    ? memberCountBySquadId.get(squad.id) ?? 0
                    : 0,
            }
        })
    },

    async getSeasonRoster(
        organisationId: string,
        seasonId: string,
        teamId: string,
    ): Promise<ClubMatchCentreRosterPlayer[]> {
        const { data: membersData, error: membersError } = await supabase
            .from('club_squad_members')
            .select(
                'id,player_id,squad_number,position,registration_status,active',
            )
            .eq('organisation_id', organisationId)
            .eq('season_id', seasonId)
            .eq('team_id', teamId)
            .order('squad_number', {
                ascending: true,
                nullsFirst: false,
            })

        throwSupabaseError(membersError, 'Failed to load the season squad')

        const memberRows = (membersData ?? []) as SquadMemberRow[]
        if (memberRows.length === 0) return []

        const playerIds = uniqueNonEmpty(memberRows.map((member) => member.player_id))

        const { data: playersData, error: playersError } = await supabase
            .from('club_players')
            .select('id,first_name,last_name')
            .eq('organisation_id', organisationId)
            .in('id', playerIds)

        throwSupabaseError(playersError, 'Failed to load Match Centre players')

        const playerById = new Map(
            ((playersData ?? []) as PlayerRow[]).map((player) => [
                player.id,
                player,
            ]),
        )

        return memberRows.map((member) => ({
            squadMemberId: member.id,
            playerId: member.player_id,
            playerName: playerDisplayName(playerById.get(member.player_id)),
            squadNumber: member.squad_number,
            position: member.position,
            registrationStatus: member.registration_status,
            active: member.active,
        }))
    },

    async getMatchSquad(
        organisationId: string,
        fixtureId: string,
    ): Promise<ClubMatchCentreSquad | null> {
        const { data: squadData, error: squadError } = await supabase
            .from('club_match_squads')
            .select(
                'id,organisation_id,season_id,team_id,fixture_id,status,published,notes',
            )
            .eq('organisation_id', organisationId)
            .eq('fixture_id', fixtureId)
            .maybeSingle()

        throwSupabaseError(squadError, 'Failed to load the matchday squad')

        if (!squadData) return null

        const squad = squadData as MatchSquadRow

        const { data: membersData, error: membersError } = await supabase
            .from('club_match_squad_members')
            .select(
                'id,match_squad_id,squad_member_id,selection_role,appearance_status,squad_number,position,player_name,is_captain,is_goalkeeper,sort_order',
            )
            .eq('organisation_id', organisationId)
            .eq('match_squad_id', squad.id)
            .order('sort_order', { ascending: true })

        throwSupabaseError(membersError, 'Failed to load matchday squad members')

        const members = ((membersData ?? []) as MatchSquadMemberRow[]).map(
            (member) => ({
                id: member.id,
                matchSquadId: member.match_squad_id,
                squadMemberId: member.squad_member_id,
                selectionRole: member.selection_role,
                appearanceStatus: member.appearance_status,
                squadNumber: member.squad_number,
                position: member.position,
                playerName: member.player_name,
                isCaptain: member.is_captain,
                isGoalkeeper: member.is_goalkeeper,
                sortOrder: member.sort_order,
            }),
        )

        return {
            id: squad.id,
            organisationId: squad.organisation_id,
            seasonId: squad.season_id,
            teamId: squad.team_id,
            fixtureId: squad.fixture_id,
            status: squad.status,
            published: squad.published,
            notes: squad.notes,
            members,
        }
    },

    async saveMatchSquad(
        input: SaveClubMatchCentreSquadInput,
    ): Promise<SaveClubMatchCentreSquadResult> {
        const { data, error } = await supabase.rpc(
            'club_match_centre_save_squad',
            {
                p_organisation_id: input.organisationId,
                p_fixture_id: input.fixtureId,
                p_status: input.status,
                p_published: input.published,
                p_notes: input.notes.trim() || null,
                p_members: input.members.map((member) => ({
                    squad_member_id: member.squadMemberId,
                    selection_role: member.selectionRole,
                    is_captain: member.isCaptain,
                    is_goalkeeper: member.isGoalkeeper,
                })),
            },
        )

        throwSupabaseError(error, 'Failed to save the matchday squad')

        if (!data || typeof data !== 'object') {
            throw new Error('The matchday squad was saved but no result was returned.')
        }

        const row = data as unknown as SaveRpcRow

        return {
            matchSquadId: row.match_squad_id,
            fixtureId: row.fixture_id,
            status: row.status,
            published: row.published,
            memberCount: row.member_count,
        }
    },
}
