import { supabase } from '../../lib/supabaseClient'

export type ClubPublicSeason = {
    id: string
    name: string
    seasonLabel: string
}

export type ClubPublicTeam = {
    id: string
    name: string
    ageGroup: string | null
    yearGroup: number | null
    gender: string | null
    division: string | null
    logoUrl: string | null
}

export type ClubPublicFixture = {
    id: string
    teamId: string | null
    fixtureDate: string
    kickoffTime: string | null
    homeAway: string
    fixtureType: string
    venueName: string | null
    status: string
    opponentName: string | null
}

export type ClubPublicResult = {
    id: string
    fixtureId: string
    homeScore: number
    awayScore: number
    playerOfTheMatch: string | null
}

export type ClubPublicSquadMember = {
    id: string
    teamId: string | null
    squadNumber: number | null
    position: string | null
    playerName: string
}

export type ClubPublicGoal = {
    id: string
    fixtureId: string
    playerName: string
    squadMemberId: string | null
}

export type ClubPublicData = {
    season: ClubPublicSeason | null
    teams: ClubPublicTeam[]
    fixtures: ClubPublicFixture[]
    results: ClubPublicResult[]
    squad: ClubPublicSquadMember[]
    goals: ClubPublicGoal[]
}

type SeasonRow = {
    id: string
    name: string
    season_label: string | null
}

type TeamRow = {
    id: string
    name: string
    age_group: string | null
    year_group: number | null
    gender: string | null
    division: string | null
    logo_url: string | null
}

type FixtureRow = {
    id: string
    team_id: string | null
    fixture_date: string
    kickoff_time: string | null
    home_away: string
    fixture_type: string
    venue_name: string | null
    status: string
    club_opponents: { name: string } | null
}

type ResultRow = {
    id: string
    fixture_id: string
    home_score: number
    away_score: number
    player_of_the_match: string | null
}

type SquadRow = {
    id: string
    team_id: string | null
    squad_number: number | null
    position: string | null
    club_players: {
        first_name: string
        last_name: string
    } | null
}

type GoalRow = {
    id: string
    fixture_id: string
    player_name: string
    squad_member_id: string | null
}

type ErrorLike = {
    message: string
}

function throwIfError(
    error: ErrorLike | null,
    context: string,
): void {
    if (!error) {
        return
    }

    console.error(`${context}:`, error)
    throw new Error(error.message)
}

export const clubPublicService = {
    async getClubPublicData(
        organisationId: string,
    ): Promise<ClubPublicData> {
        const [seasonResponse, teamsResponse] = await Promise.all([
            supabase
                .from('club_seasons')
                .select('id,name,season_label')
                .eq('organisation_id', organisationId)
                .eq('status', 'active')
                .order('start_date', {
                    ascending: false,
                    nullsFirst: false,
                })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('teams')
                .select(
                    'id,name,age_group,year_group,gender,division,logo_url',
                )
                .eq('organisation_id', organisationId)
                .eq('published', true)
                .eq('participation_status', 'confirmed')
                .order('name', { ascending: true }),
        ])

        throwIfError(
            seasonResponse.error,
            'Failed to load the public club season',
        )
        throwIfError(
            teamsResponse.error,
            'Failed to load public club teams',
        )

        const seasonRow = seasonResponse.data as SeasonRow | null
        const teamRows = (teamsResponse.data ?? []) as TeamRow[]

        const season: ClubPublicSeason | null = seasonRow
            ? {
                  id: seasonRow.id,
                  name: seasonRow.name,
                  seasonLabel:
                      seasonRow.season_label ?? seasonRow.name,
              }
            : null

        const teams: ClubPublicTeam[] = teamRows.map((team) => ({
            id: team.id,
            name: team.name,
            ageGroup: team.age_group,
            yearGroup: team.year_group,
            gender: team.gender,
            division: team.division,
            logoUrl: team.logo_url,
        }))

        if (!season) {
            return {
                season,
                teams,
                fixtures: [],
                results: [],
                squad: [],
                goals: [],
            }
        }

        const [fixtureResponse, squadResponse] = await Promise.all([
            supabase
                .from('club_fixtures')
                .select(`
                    id,
                    team_id,
                    fixture_date,
                    kickoff_time,
                    home_away,
                    fixture_type,
                    venue_name,
                    status,
                    club_opponents(name)
                `)
                .eq('organisation_id', organisationId)
                .eq('season_id', season.id)
                .eq('published', true)
                .neq('status', 'cancelled')
                .order('fixture_date', { ascending: true })
                .order('kickoff_time', {
                    ascending: true,
                    nullsFirst: false,
                }),
            supabase
                .from('club_squad_members')
                .select(`
                    id,
                    team_id,
                    squad_number,
                    position,
                    club_players(
                        first_name,
                        last_name
                    )
                `)
                .eq('organisation_id', organisationId)
                .eq('season_id', season.id)
                .eq('active', true)
                .order('squad_number', {
                    ascending: true,
                    nullsFirst: false,
                }),
        ])

        throwIfError(
            fixtureResponse.error,
            'Failed to load public club fixtures',
        )
        throwIfError(
            squadResponse.error,
            'Failed to load public club squad members',
        )

        const fixtureRows =
            (fixtureResponse.data ?? []) as unknown as FixtureRow[]
        const squadRows =
            (squadResponse.data ?? []) as unknown as SquadRow[]

        const fixtureIds = fixtureRows.map((fixture) => fixture.id)

        let resultRows: ResultRow[] = []
        let goalRows: GoalRow[] = []

        if (fixtureIds.length > 0) {
            const [resultResponse, goalResponse] = await Promise.all([
                supabase
                    .from('club_results')
                    .select(
                        'id,fixture_id,home_score,away_score,player_of_the_match',
                    )
                    .eq('organisation_id', organisationId)
                    .eq('season_id', season.id)
                    .eq('published', true)
                    .in('fixture_id', fixtureIds),
                supabase
                    .from('club_goals')
                    .select(
                        'id,fixture_id,player_name,squad_member_id',
                    )
                    .eq('organisation_id', organisationId)
                    .eq('season_id', season.id)
                    .in('fixture_id', fixtureIds),
            ])

            throwIfError(
                resultResponse.error,
                'Failed to load public club results',
            )
            throwIfError(
                goalResponse.error,
                'Failed to load public club goals',
            )

            resultRows = (resultResponse.data ?? []) as ResultRow[]
            goalRows = (goalResponse.data ?? []) as GoalRow[]
        }

        const publishedTeamIds = new Set(teams.map((team) => team.id))

        // If a team was unpublished after historical fixtures were published,
        // keep those records out of the public site. Legacy null team IDs are
        // retained only when this is effectively a one-team club.
        const allowLegacyNullTeam = teams.length <= 1

        const visibleFixtures = fixtureRows.filter((fixture) =>
            fixture.team_id
                ? publishedTeamIds.has(fixture.team_id)
                : allowLegacyNullTeam,
        )

        const visibleFixtureIds = new Set(
            visibleFixtures.map((fixture) => fixture.id),
        )

        const visibleSquad = squadRows.filter((member) =>
            member.team_id
                ? publishedTeamIds.has(member.team_id)
                : allowLegacyNullTeam,
        )


        return {
            season,
            teams,
            fixtures: visibleFixtures.map((fixture) => ({
                id: fixture.id,
                teamId: fixture.team_id,
                fixtureDate: fixture.fixture_date,
                kickoffTime: fixture.kickoff_time,
                homeAway: fixture.home_away,
                fixtureType: fixture.fixture_type,
                venueName: fixture.venue_name,
                status: fixture.status,
                opponentName: fixture.club_opponents?.name ?? null,
            })),
            results: resultRows
                .filter((result) => visibleFixtureIds.has(result.fixture_id))
                .map((result) => ({
                    id: result.id,
                    fixtureId: result.fixture_id,
                    homeScore: result.home_score,
                    awayScore: result.away_score,
                    playerOfTheMatch: result.player_of_the_match,
                })),
            squad: visibleSquad.map((member) => ({
                id: member.id,
                teamId: member.team_id,
                squadNumber: member.squad_number,
                position: member.position,
                playerName: member.club_players
                    ? `${member.club_players.first_name} ${member.club_players.last_name}`.trim()
                    : 'Player',
            })),
            goals: goalRows
                .filter((goal) => visibleFixtureIds.has(goal.fixture_id))
                .map((goal) => ({
                    id: goal.id,
                    fixtureId: goal.fixture_id,
                    playerName: goal.player_name,
                    squadMemberId: goal.squad_member_id,
                })),
        }
    },
}
