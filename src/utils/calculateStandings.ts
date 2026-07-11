export type StandingsTeam = {
    id: string
    name: string
    manager: string
}

export type StandingsResult = {
    homeTeamId: string
    awayTeamId: string
    homeScore: number
    awayScore: number
}

export type LeagueStanding = {
    id: string
    name: string
    manager: string
    played: number
    won: number
    drawn: number
    lost: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
    position: number
}

export function calculateStandings(
    teams: StandingsTeam[],
    results: StandingsResult[]
): LeagueStanding[] {
    const table = new Map<string, LeagueStanding>()

    teams.forEach((team) => {
        table.set(team.id, {
            id: team.id,
            name: team.name.trim(),
            manager: team.manager,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            position: 0,
        })
    })

    results.forEach((result) => {
        const homeTeam = table.get(result.homeTeamId)
        const awayTeam = table.get(result.awayTeamId)

        if (!homeTeam || !awayTeam) {
            return
        }

        homeTeam.played += 1
        awayTeam.played += 1

        homeTeam.goalsFor += result.homeScore
        homeTeam.goalsAgainst += result.awayScore

        awayTeam.goalsFor += result.awayScore
        awayTeam.goalsAgainst += result.homeScore

        if (result.homeScore > result.awayScore) {
            homeTeam.won += 1
            homeTeam.points += 3
            awayTeam.lost += 1
        } else if (result.homeScore < result.awayScore) {
            awayTeam.won += 1
            awayTeam.points += 3
            homeTeam.lost += 1
        } else {
            homeTeam.drawn += 1
            awayTeam.drawn += 1
            homeTeam.points += 1
            awayTeam.points += 1
        }
    })

    const standings = Array.from(table.values()).map((team) => ({
        ...team,
        goalDifference: team.goalsFor - team.goalsAgainst,
    }))

    standings.sort((first, second) => {
        if (second.points !== first.points) {
            return second.points - first.points
        }

        if (second.goalDifference !== first.goalDifference) {
            return second.goalDifference - first.goalDifference
        }

        if (second.goalsFor !== first.goalsFor) {
            return second.goalsFor - first.goalsFor
        }

        return first.name.localeCompare(second.name)
    })

    return standings.map((team, index) => ({
        ...team,
        position: index + 1,
    }))
}