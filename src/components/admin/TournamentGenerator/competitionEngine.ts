export type EnginePairing = {
    roundNumber: number
    homeTeamId: string
    awayTeamId: string
}

export type KnockoutDraw = {
    fixtures: EnginePairing[]
    byeTeamIds: string[]
    roundName: string
}

function rotate<T>(items: T[]): T[] {
    if (items.length <= 2) return [...items]

    return [
        items[0],
        items[items.length - 1],
        ...items.slice(1, -1),
    ]
}

export function generateSingleRoundRobin(
    teamIds: string[]
): EnginePairing[] {
    const uniqueTeamIds = Array.from(new Set(teamIds))

    if (uniqueTeamIds.length < 2) return []

    let rotation: Array<string | null> = [...uniqueTeamIds]

    if (rotation.length % 2 !== 0) {
        rotation.push(null)
    }

    const roundCount = rotation.length - 1
    const matchesPerRound = rotation.length / 2
    const fixtures: EnginePairing[] = []

    for (
        let roundIndex = 0;
        roundIndex < roundCount;
        roundIndex += 1
    ) {
        for (
            let matchIndex = 0;
            matchIndex < matchesPerRound;
            matchIndex += 1
        ) {
            const first = rotation[matchIndex]
            const second =
                rotation[rotation.length - 1 - matchIndex]

            if (!first || !second) continue

            const reverse =
                (roundIndex + matchIndex) % 2 === 1

            fixtures.push({
                roundNumber: roundIndex + 1,
                homeTeamId: reverse ? second : first,
                awayTeamId: reverse ? first : second,
            })
        }

        rotation = rotate(rotation)
    }

    return fixtures
}

export function generateDoubleRoundRobin(
    teamIds: string[]
): EnginePairing[] {
    const firstLeg = generateSingleRoundRobin(teamIds)

    const roundOffset = Math.max(
        0,
        ...firstLeg.map((fixture) => fixture.roundNumber)
    )

    const secondLeg = firstLeg.map((fixture) => ({
        roundNumber: fixture.roundNumber + roundOffset,
        homeTeamId: fixture.awayTeamId,
        awayTeamId: fixture.homeTeamId,
    }))

    return [...firstLeg, ...secondLeg]
}

type Edge = {
    homeTeamId: string
    awayTeamId: string
}

function buildRegularGraphEdges(
    teamIds: string[],
    matchesPerTeam: number
): Edge[] {
    const teamCount = teamIds.length

    if (
        teamCount < 2 ||
        matchesPerTeam < 1 ||
        matchesPerTeam >= teamCount
    ) {
        throw new Error(
            'Matches per team must be between 1 and the number of available opponents.'
        )
    }

    if ((teamCount * matchesPerTeam) % 2 !== 0) {
        throw new Error(
            'This schedule is mathematically impossible because the total number of team appearances is odd.'
        )
    }

    if (
        teamCount % 2 !== 0 &&
        matchesPerTeam % 2 !== 0
    ) {
        throw new Error(
            'With an odd number of teams, matches per team must be even.'
        )
    }

    const edges = new Map<string, Edge>()

    const addEdge = (
        firstIndex: number,
        secondIndex: number
    ) => {
        const firstId = teamIds[firstIndex]
        const secondId = teamIds[secondIndex]

        if (!firstId || !secondId || firstId === secondId) {
            return
        }

        const key = [firstId, secondId].sort().join('::')

        if (!edges.has(key)) {
            const reverse = edges.size % 2 === 1

            edges.set(key, {
                homeTeamId: reverse ? secondId : firstId,
                awayTeamId: reverse ? firstId : secondId,
            })
        }
    }

    const distanceCount = Math.floor(matchesPerTeam / 2)

    for (
        let distance = 1;
        distance <= distanceCount;
        distance += 1
    ) {
        for (
            let index = 0;
            index < teamCount;
            index += 1
        ) {
            addEdge(
                index,
                (index + distance) % teamCount
            )
        }
    }

    if (matchesPerTeam % 2 === 1) {
        const oppositeDistance = teamCount / 2

        for (
            let index = 0;
            index < oppositeDistance;
            index += 1
        ) {
            addEdge(index, index + oppositeDistance)
        }
    }

    return Array.from(edges.values())
}

function allocateEdgesToRounds(
    edges: Edge[]
): EnginePairing[] {
    const rounds: Array<{
        usedTeamIds: Set<string>
        fixtures: Edge[]
    }> = []

    for (const edge of edges) {
        let round = rounds.find(
            (candidate) =>
                !candidate.usedTeamIds.has(edge.homeTeamId) &&
                !candidate.usedTeamIds.has(edge.awayTeamId)
        )

        if (!round) {
            round = {
                usedTeamIds: new Set<string>(),
                fixtures: [],
            }

            rounds.push(round)
        }

        round.usedTeamIds.add(edge.homeTeamId)
        round.usedTeamIds.add(edge.awayTeamId)
        round.fixtures.push(edge)
    }

    return rounds.flatMap((round, roundIndex) =>
        round.fixtures.map((fixture) => ({
            roundNumber: roundIndex + 1,
            ...fixture,
        }))
    )
}

export function generateLimitedSchedule(
    teamIds: string[],
    matchesPerTeam: number
): EnginePairing[] {
    const uniqueTeamIds = Array.from(new Set(teamIds))

    return allocateEdgesToRounds(
        buildRegularGraphEdges(
            uniqueTeamIds,
            matchesPerTeam
        )
    )
}

function nextPowerOfTwo(value: number) {
    let result = 1

    while (result < value) {
        result *= 2
    }

    return result
}

function shuffle<T>(items: T[]): T[] {
    const copy = [...items]

    for (
        let index = copy.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
                Math.random() * (index + 1)
            )

        ;[copy[index], copy[randomIndex]] = [
            copy[randomIndex],
            copy[index],
        ]
    }

    return copy
}

export function generateKnockoutFirstRound(
    teamIds: string[],
    randomise: boolean
): KnockoutDraw {
    const uniqueTeamIds = Array.from(new Set(teamIds))

    if (uniqueTeamIds.length < 2) {
        return {
            fixtures: [],
            byeTeamIds: uniqueTeamIds,
            roundName: 'Grand Final',
        }
    }

    const orderedTeamIds = randomise
        ? shuffle(uniqueTeamIds)
        : uniqueTeamIds

    const bracketSize = nextPowerOfTwo(
        orderedTeamIds.length
    )

    const byeCount = bracketSize - orderedTeamIds.length
    const byeTeamIds = orderedTeamIds.slice(0, byeCount)
    const playingTeamIds = orderedTeamIds.slice(byeCount)

    const roundName =
        bracketSize === 2
            ? 'Grand Final'
            : bracketSize === 4
                ? 'Semi Final'
                : bracketSize === 8
                    ? 'Quarter Final'
                    : `Round of ${bracketSize}`

    const fixtures: EnginePairing[] = []

    for (
        let index = 0;
        index < playingTeamIds.length;
        index += 2
    ) {
        const homeTeamId = playingTeamIds[index]
        const awayTeamId = playingTeamIds[index + 1]

        if (homeTeamId && awayTeamId) {
            fixtures.push({
                roundNumber: 1,
                homeTeamId,
                awayTeamId,
            })
        }
    }

    return {
        fixtures,
        byeTeamIds,
        roundName,
    }
}