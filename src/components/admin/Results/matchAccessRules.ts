export function filterFixturesForTeam<T extends {
    home_competition_team_id: string | null
    away_competition_team_id: string | null
}>(fixtures: T[], competitionTeamId: string | null, role: string): T[] {
    if (role !== 'match_official') return fixtures
    if (!competitionTeamId) return []
    return fixtures.filter((fixture) =>
        fixture.home_competition_team_id === competitionTeamId ||
        fixture.away_competition_team_id === competitionTeamId)
}
