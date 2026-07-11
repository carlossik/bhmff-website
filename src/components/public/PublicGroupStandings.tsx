import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
    calculateStandings,
    type LeagueStanding,
    type StandingsResult,
    type StandingsTeam,
} from '../../utils/calculateStandings'

type PublicGroup = {
    id: string
    name: string
    sort_order: number
}

type PublicMembership = {
    group_id: string
    team_id: string
}

type PublicTeam = {
    id: string
    name: string
    manager_name: string | null
    logo_url: string | null
}

type FixtureRelation = {
    id: string
    group_id: string | null
    home_team_id: string | null
    away_team_id: string | null
    stage: string
}

type RelatedFixture =
    | FixtureRelation
    | FixtureRelation[]
    | null

type PublicResultRow = {
    home_score: number
    away_score: number
    fixture: RelatedFixture
}

type GroupStandingBlock = {
    id: string
    name: string
    standings: LeagueStanding[]
}

function getFixture(relation: RelatedFixture) {
    if (!relation) return null

    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase()
}

function formatGoalDifference(value: number) {
    return value > 0 ? `+${value}` : String(value)
}

export function PublicGroupStandings() {
    const [blocks, setBlocks] = useState<GroupStandingBlock[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadStandings() {
            setIsLoading(true)

            try {
                const { data: festival, error: festivalError } =
                    await supabase
                        .from('festivals')
                        .select('id')
                        .eq('status', 'active')
                        .order('year', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                if (festivalError) throw festivalError

                if (!festival) {
                    setBlocks([])
                    return
                }

                const [
                    groupsResponse,
                    teamsResponse,
                    membershipsResponse,
                    resultsResponse,
                ] = await Promise.all([
                    supabase
                        .from('groups')
                        .select('id, name, sort_order')
                        .eq('festival_id', festival.id)
                        .order('sort_order', { ascending: true }),

                    supabase
                        .from('teams')
                        .select(
                            'id, name, manager_name, logo_url'
                        )
                        .eq('festival_id', festival.id),

                    supabase
                        .from('group_teams')
                        .select('group_id, team_id'),

                    supabase
                        .from('results')
                        .select(`
                            home_score,
                            away_score,
                            fixture:fixtures!results_fixture_id_fkey!inner (
                                id,
                                festival_id,
                                group_id,
                                home_team_id,
                                away_team_id,
                                stage
                            )
                        `)
                        .eq('published', true)
                        .eq('fixture.festival_id', festival.id)
                        .eq('fixture.stage', 'Group Stage'),
                ])

                if (groupsResponse.error) throw groupsResponse.error
                if (teamsResponse.error) throw teamsResponse.error
                if (membershipsResponse.error) {
                    throw membershipsResponse.error
                }
                if (resultsResponse.error) throw resultsResponse.error

                const groups =
                    (groupsResponse.data ?? []) as PublicGroup[]

                const teams =
                    (teamsResponse.data ?? []) as PublicTeam[]

                const memberships =
                    (membershipsResponse.data ??
                        []) as PublicMembership[]

                const results =
                    (resultsResponse.data ??
                        []) as unknown as PublicResultRow[]

                const standingBlocks = groups.map((group) => {
                    const teamIds = memberships
                        .filter(
                            (membership) =>
                                membership.group_id === group.id
                        )
                        .map((membership) => membership.team_id)

                    const groupTeams: StandingsTeam[] = teams
                        .filter((team) => teamIds.includes(team.id))
                        .map((team) => ({
                            id: team.id,
                            name: team.name.trim(),
                            manager: team.manager_name ?? 'TBC',
                            logoUrl: team.logo_url ?? '',
                        }))

                    const groupResults: StandingsResult[] = results
                        .map((result) => {
                            const fixture = getFixture(result.fixture)

                            if (
                                !fixture ||
                                fixture.group_id !== group.id ||
                                !fixture.home_team_id ||
                                !fixture.away_team_id
                            ) {
                                return null
                            }

                            return {
                                homeTeamId: fixture.home_team_id,
                                awayTeamId: fixture.away_team_id,
                                homeScore: result.home_score,
                                awayScore: result.away_score,
                            }
                        })
                        .filter(
                            (
                                result
                            ): result is StandingsResult =>
                                result !== null
                        )

                    return {
                        id: group.id,
                        name: group.name,
                        standings: calculateStandings(
                            groupTeams,
                            groupResults
                        ),
                    }
                })

                setBlocks(standingBlocks)
            } catch (error) {
                console.error(
                    'Failed to load grouped standings:',
                    error
                )
                setBlocks([])
            } finally {
                setIsLoading(false)
            }
        }

        loadStandings()
    }, [])

    if (isLoading) {
        return <p className="muted">Loading group standings...</p>
    }

    if (!blocks.length) {
        return (
            <div className="teamsEmptyState">
                <h3>Groups coming soon</h3>

                <p>
                    Group tables will appear once teams have been allocated.
                </p>
            </div>
        )
    }

    return (
        <div className="publicGroupStandings">
            {blocks.map((block) => (
                <article
                    className="publicGroupStandingCard"
                    key={block.id}
                >
                    <div className="publicGroupStandingHeader">
                        <span className="eyebrow">
                            Group Standings
                        </span>

                        <h3>{block.name}</h3>
                    </div>

                    {!block.standings.length ? (
                        <p className="muted">
                            No teams allocated to this group.
                        </p>
                    ) : (
                        <div className="tableWrap leagueTableWrap">
                            <table className="leagueTable">
                                <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Team</th>
                                    <th>P</th>
                                    <th>W</th>
                                    <th>D</th>
                                    <th>L</th>
                                    <th>GF</th>
                                    <th>GA</th>
                                    <th>GD</th>
                                    <th>Pts</th>
                                </tr>
                                </thead>

                                <tbody>
                                {block.standings.map((team) => (
                                    <tr key={team.id}>
                                        <td>
                                                <span className="leaguePosition">
                                                    {team.position}
                                                </span>
                                        </td>

                                        <td className="leagueTeamName">
                                            <div className="leagueTeamIdentity">
                                                <div className="leagueTeamLogo">
                                                    {team.logoUrl ? (
                                                        <img
                                                            src={
                                                                team.logoUrl
                                                            }
                                                            alt={`${team.name} logo`}
                                                        />
                                                    ) : (
                                                        getInitials(
                                                            team.name
                                                        )
                                                    )}
                                                </div>

                                                <strong>
                                                    {team.name}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>{team.played}</td>
                                        <td>{team.won}</td>
                                        <td>{team.drawn}</td>
                                        <td>{team.lost}</td>
                                        <td>{team.goalsFor}</td>
                                        <td>{team.goalsAgainst}</td>

                                        <td>
                                            {formatGoalDifference(
                                                team.goalDifference
                                            )}
                                        </td>

                                        <td className="leaguePoints">
                                            <strong>
                                                {team.points}
                                            </strong>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </article>
            ))}
        </div>
    )
}