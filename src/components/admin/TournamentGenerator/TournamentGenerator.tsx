import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Eye,
    MapPin,
    RefreshCw,
    Save,
    Settings2,
    ShieldCheck,
    Shuffle,
    Sparkles,
    Trophy,
    Users,
    WandSparkles,
    XCircle,
} from 'lucide-react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'

import {
    generateDoubleRoundRobin,
    generateKnockoutFirstRound,
    generateLimitedSchedule,
    generateSingleRoundRobin,
} from './competitionEngine'

import { tournamentGeneratorService } from './tournamentGeneratorService'

import type {
    CompetitionMode,
    ExistingFixture,
    GeneratedFixturePreview,
    GeneratorCompetitionTeam,
    GeneratorConfig,
    GeneratorGroup,
    GeneratorMembership,
    GeneratorVenue,
    VenueAssignmentMode,
} from './tournamentGeneratorTypes'

const initialConfig: GeneratorConfig = {
    mode: 'group_full',
    startDateTime: '',
    daysBetweenRounds: 7,
    venueAssignmentMode: 'selected_venue',
    venueId: '',
    publishImmediately: false,
    confirmedOnly: true,
    matchesPerTeam: 2,
    randomiseCupDraw: true,
}

const competitionModeOptions: Array<{
    value: CompetitionMode
    label: string
    description: string
}> = [
    {
        value: 'group_full',
        label: 'Group Full Round Robin',
        description:
            'Every eligible team plays every other team in its group once.',
    },
    {
        value: 'group_limited',
        label: 'Group Limited Schedule',
        description:
            'Each eligible team plays a selected number of group matches.',
    },
    {
        value: 'league_single',
        label: 'League Single Round Robin',
        description:
            'Every eligible competition team plays every other team once.',
    },
    {
        value: 'league_double',
        label: 'League Double Round Robin',
        description:
            'Every eligible competition team plays every other team home and away.',
    },
    {
        value: 'knockout',
        label: 'Knockout Draw',
        description:
            'Generate the opening knockout round, including automatic byes.',
    },
    {
        value: 'manual',
        label: 'Manual',
        description:
            'Do not automatically generate pairings.',
    },
]

const venueAssignmentOptions: Array<{
    value: VenueAssignmentMode
    label: string
}> = [
    {
        value: 'selected_venue',
        label: 'Use selected venue',
    },
    {
        value: 'home_team',
        label: 'Use home team venue',
    },
    {
        value: 'unassigned',
        label: 'Leave venue unassigned',
    },
]

const inputClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10'

const selectClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-[#10190d] px-4 py-3 text-white outline-none transition focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10'

const labelClassName =
    'text-sm font-semibold text-slate-300'

function formatKickoff(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
}

function createPairKey(
    firstTeamId: string,
    secondTeamId: string
) {
    return [firstTeamId, secondTeamId]
        .sort()
        .join('::')
}

type ReadinessCardProps = {
    label: string
    value: string | number
    status: 'ready' | 'warning' | 'protected'
    icon: typeof Users
    detail: string
}

function ReadinessCard({
                           label,
                           value,
                           status,
                           icon: Icon,
                           detail,
                       }: ReadinessCardProps) {
    const statusClasses = {
        ready:
            'border-lime-800/50 bg-lime-500/10 text-lime-300',
        warning:
            'border-amber-800/50 bg-amber-500/10 text-amber-300',
        protected:
            'border-sky-800/50 bg-sky-500/10 text-sky-300',
    }

    const statusLabels = {
        ready: 'Ready',
        warning: 'Action required',
        protected: 'Protected',
    }

    return (
        <article className="rounded-2xl border border-lime-900/40 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-400">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-black text-white">
                        {value}
                    </p>
                </div>

                <div className="rounded-xl bg-lime-400/10 p-3">
                    <Icon className="h-6 w-6 text-lime-400" />
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
                <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[status]}`}
                >
                    {statusLabels[status]}
                </span>

                <span className="text-right text-xs text-slate-500">
                    {detail}
                </span>
            </div>
        </article>
    )
}

export function TournamentGenerator() {
    const { currentCompetition } =
        useCompetition()

    const [groups, setGroups] =
        useState<GeneratorGroup[]>([])

    const [teams, setTeams] =
        useState<GeneratorCompetitionTeam[]>([])

    const [memberships, setMemberships] =
        useState<GeneratorMembership[]>([])

    const [venues, setVenues] =
        useState<GeneratorVenue[]>([])

    const [
        existingFixtures,
        setExistingFixtures,
    ] = useState<ExistingFixture[]>([])

    const [config, setConfig] =
        useState<GeneratorConfig>(
            initialConfig
        )

    const [
        intervalMinutes,
        setIntervalMinutes,
    ] = useState(60)

    const [
        preview,
        setPreview,
    ] = useState<
        GeneratedFixturePreview[]
    >([])

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [
        showSaveConfirmation,
        setShowSaveConfirmation,
    ] = useState(false)

    const [
        toastMessage,
        setToastMessage,
    ] = useState('')

    const [
        toastType,
        setToastType,
    ] = useState<
        'success' | 'error' | 'info'
    >('success')

    function showToast(
        message: string,
        type:
            | 'success'
            | 'error'
            | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    const loadData = useCallback(
        async () => {
            if (!currentCompetition?.id) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setExistingFixtures([])
                setPreview([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            try {
                const [
                    groupRows,
                    teamRows,
                    venueRows,
                    existingFixtureRows,
                ] = await Promise.all([
                    tournamentGeneratorService.getGroups(
                        currentCompetition.id
                    ),
                    tournamentGeneratorService.getTeams(
                        currentCompetition.id
                    ),
                    tournamentGeneratorService.getVenues(
                        currentCompetition.id
                    ),
                    tournamentGeneratorService.getExistingFixtures(
                        currentCompetition.id
                    ),
                ])

                const membershipRows =
                    await tournamentGeneratorService.getMemberships(
                        groupRows.map(
                            (group) => group.id
                        )
                    )

                setGroups(groupRows)
                setTeams(teamRows)
                setVenues(venueRows)
                setMemberships(
                    membershipRows
                )
                setExistingFixtures(
                    existingFixtureRows
                )
                setPreview([])
            } catch (error) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setExistingFixtures([])
                setPreview([])

                showToast(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load tournament generator data.',
                    'error'
                )
            } finally {
                setIsLoading(false)
            }
        },
        [currentCompetition?.id]
    )

    useEffect(() => {
        void loadData()
    }, [loadData])

    const eligibleTeams = useMemo(
        () =>
            teams.filter((team) => {
                if (!config.confirmedOnly) {
                    return (
                        team.participation_status !==
                        'withdrawn'
                    )
                }

                return (
                    team.participation_status ===
                    'confirmed'
                )
            }),
        [
            teams,
            config.confirmedOnly,
        ]
    )

    const eligibleTeamIds = useMemo(
        () =>
            new Set(
                eligibleTeams.map(
                    (team) => team.id
                )
            ),
        [eligibleTeams]
    )

    const teamById = useMemo(
        () =>
            new Map(
                teams.map((team) => [
                    team.id,
                    team,
                ])
            ),
        [teams]
    )

    const venueById = useMemo(
        () =>
            new Map(
                venues.map((venue) => [
                    venue.id,
                    venue,
                ])
            ),
        [venues]
    )

    const existingPairKeys = useMemo(
        () =>
            new Set(
                existingFixtures.map(
                    (fixture) =>
                        createPairKey(
                            fixture.home_competition_team_id,
                            fixture.away_competition_team_id
                        )
                )
            ),
        [existingFixtures]
    )

    const groupIdsWithFixtures =
        useMemo(
            () =>
                new Set(
                    existingFixtures
                        .map(
                            (fixture) =>
                                fixture.group_id
                        )
                        .filter(
                            (
                                groupId
                            ): groupId is string =>
                                Boolean(groupId)
                        )
                ),
            [existingFixtures]
        )

    const groupSummaries = useMemo(
        () =>
            groups.map((group) => {
                const allocatedTeamIds =
                    memberships
                        .filter(
                            (membership) =>
                                membership.group_id ===
                                group.id
                        )
                        .map(
                            (membership) =>
                                membership.competition_team_id
                        )

                const groupTeams =
                    teams.filter(
                        (team) =>
                            allocatedTeamIds.includes(
                                team.id
                            ) &&
                            eligibleTeamIds.has(
                                team.id
                            )
                    )

                return {
                    ...group,
                    teams: groupTeams,
                    hasExistingFixtures:
                        groupIdsWithFixtures.has(
                            group.id
                        ),
                }
            }),
        [
            groups,
            memberships,
            teams,
            eligibleTeamIds,
            groupIdsWithFixtures,
        ]
    )

    const selectedMode =
        competitionModeOptions.find(
            (option) =>
                option.value ===
                config.mode
        )

    function updateConfig<
        Key extends keyof GeneratorConfig
    >(
        key: Key,
        value: GeneratorConfig[Key]
    ) {
        setConfig((current) => ({
            ...current,
            [key]: value,
        }))

        setPreview([])
    }

    function resolveVenue(
        homeTeam:
            | GeneratorCompetitionTeam
            | undefined
    ) {
        if (
            config.venueAssignmentMode ===
            'unassigned'
        ) {
            return {
                venueId: null,
                venueName: 'Venue TBC',
            }
        }

        if (
            config.venueAssignmentMode ===
            'home_team'
        ) {
            const homeVenueId =
                homeTeam?.primary_home_venue_id ??
                null

            const homeVenue =
                homeVenueId
                    ? venueById.get(homeVenueId)
                    : undefined

            return {
                venueId:
                    homeVenue?.id ?? null,
                venueName:
                    homeVenue?.name ??
                    'Home venue TBC',
            }
        }

        const selectedVenue =
            venueById.get(config.venueId)

        return {
            venueId:
                selectedVenue?.id ?? null,
            venueName:
                selectedVenue?.name ??
                'Venue TBC',
        }
    }

    function createPreviewFixture(params: {
        groupId: string | null
        groupName: string
        stage: string
        roundNumber: number
        roundFixtureIndex: number
        homeTeamId: string
        awayTeamId: string
        startDate: Date
    }): GeneratedFixturePreview | null {
        const homeTeam =
            teamById.get(
                params.homeTeamId
            )

        const awayTeam =
            teamById.get(
                params.awayTeamId
            )

        if (!homeTeam || !awayTeam) {
            return null
        }

        const pairKey =
            createPairKey(
                homeTeam.id,
                awayTeam.id
            )

        if (
            existingPairKeys.has(pairKey)
        ) {
            return null
        }

        const roundStart =
            new Date(
                params.startDate.getTime() +
                (
                    params.roundNumber - 1
                ) *
                config.daysBetweenRounds *
                24 *
                60 *
                60 *
                1000
            )

        const kickoff =
            new Date(
                roundStart.getTime() +
                params.roundFixtureIndex *
                intervalMinutes *
                60_000
            )

        const venue =
            resolveVenue(homeTeam)

        return {
            previewId: [
                params.groupId ??
                'competition',
                params.stage,
                params.roundNumber,
                homeTeam.id,
                awayTeam.id,
            ].join('-'),

            groupId:
            params.groupId,

            groupName:
            params.groupName,

            stage:
            params.stage,

            roundNumber:
            params.roundNumber,

            homeCompetitionTeamId:
            homeTeam.id,

            awayCompetitionTeamId:
            awayTeam.id,

            homeTeamName:
            homeTeam.name,

            awayTeamName:
            awayTeam.name,

            kickoffTime:
                kickoff.toISOString(),

            venueId:
            venue.venueId,

            venueName:
            venue.venueName,
        }
    }

    function generateGroupFixtures(
        mode:
            | 'group_full'
            | 'group_limited',
        startDate: Date
    ) {
        const generated:
            GeneratedFixturePreview[] = []

        const readyGroups =
            groupSummaries.filter(
                (group) =>
                    !group.hasExistingFixtures &&
                    group.teams.length >= 2
            )

        for (const group of readyGroups) {
            const pairings =
                mode === 'group_full'
                    ? generateSingleRoundRobin(
                        group.teams.map(
                            (team) =>
                                team.id
                        )
                    )
                    : generateLimitedSchedule(
                        group.teams.map(
                            (team) =>
                                team.id
                        ),
                        config.matchesPerTeam
                    )

            const pairingsByRound =
                new Map<
                    number,
                    typeof pairings
                >()

            for (const pairing of pairings) {
                const roundPairings =
                    pairingsByRound.get(
                        pairing.roundNumber
                    ) ?? []

                roundPairings.push(pairing)

                pairingsByRound.set(
                    pairing.roundNumber,
                    roundPairings
                )
            }

            for (
                const [
                    roundNumber,
                    roundPairings,
                ] of pairingsByRound
                ) {
                roundPairings.forEach(
                    (
                        pairing,
                        roundFixtureIndex
                    ) => {
                        const fixture =
                            createPreviewFixture({
                                groupId:
                                group.id,
                                groupName:
                                group.name,
                                stage:
                                    'Group Stage',
                                roundNumber,
                                roundFixtureIndex,
                                homeTeamId:
                                pairing.homeTeamId,
                                awayTeamId:
                                pairing.awayTeamId,
                                startDate,
                            })

                        if (fixture) {
                            generated.push(
                                fixture
                            )
                        }
                    }
                )
            }
        }

        return generated
    }

    function generateLeagueFixtures(
        mode:
            | 'league_single'
            | 'league_double',
        startDate: Date
    ) {
        const teamIds =
            eligibleTeams.map(
                (team) => team.id
            )

        const pairings =
            mode === 'league_single'
                ? generateSingleRoundRobin(
                    teamIds
                )
                : generateDoubleRoundRobin(
                    teamIds
                )

        const generated:
            GeneratedFixturePreview[] = []

        const pairingsByRound =
            new Map<
                number,
                typeof pairings
            >()

        for (const pairing of pairings) {
            const roundPairings =
                pairingsByRound.get(
                    pairing.roundNumber
                ) ?? []

            roundPairings.push(pairing)

            pairingsByRound.set(
                pairing.roundNumber,
                roundPairings
            )
        }

        for (
            const [
                roundNumber,
                roundPairings,
            ] of pairingsByRound
            ) {
            roundPairings.forEach(
                (
                    pairing,
                    roundFixtureIndex
                ) => {
                    const fixture =
                        createPreviewFixture({
                            groupId: null,
                            groupName:
                                'Competition',
                            stage:
                                'League',
                            roundNumber,
                            roundFixtureIndex,
                            homeTeamId:
                            pairing.homeTeamId,
                            awayTeamId:
                            pairing.awayTeamId,
                            startDate,
                        })

                    if (fixture) {
                        generated.push(
                            fixture
                        )
                    }
                }
            )
        }

        return generated
    }

    function generateKnockoutFixtures(
        startDate: Date
    ) {
        const draw =
            generateKnockoutFirstRound(
                eligibleTeams.map(
                    (team) => team.id
                ),
                config.randomiseCupDraw
            )

        const generated:
            GeneratedFixturePreview[] = []

        draw.fixtures.forEach(
            (
                pairing,
                roundFixtureIndex
            ) => {
                const fixture =
                    createPreviewFixture({
                        groupId: null,
                        groupName:
                        draw.roundName,
                        stage:
                        draw.roundName,
                        roundNumber:
                        pairing.roundNumber,
                        roundFixtureIndex,
                        homeTeamId:
                        pairing.homeTeamId,
                        awayTeamId:
                        pairing.awayTeamId,
                        startDate,
                    })

                if (fixture) {
                    generated.push(
                        fixture
                    )
                }
            }
        )

        if (
            draw.byeTeamIds.length >
            0
        ) {
            const byeNames =
                draw.byeTeamIds
                    .map(
                        (teamId) =>
                            teamById.get(
                                teamId
                            )?.name
                    )
                    .filter(
                        (
                            name
                        ): name is string =>
                            Boolean(name)
                    )

            showToast(
                `${generated.length} knockout fixtures generated. ${byeNames.length} team${byeNames.length === 1 ? '' : 's'} received a bye: ${byeNames.join(', ')}.`,
                'info'
            )
        }

        return generated
    }

    function validateConfiguration() {
        if (!currentCompetition?.id) {
            return 'Select a competition before generating fixtures.'
        }

        if (
            config.mode === 'manual'
        ) {
            return 'Manual mode does not automatically generate fixtures.'
        }

        if (!config.startDateTime) {
            return 'Select the first kick-off date and time.'
        }

        if (
            !Number.isFinite(
                intervalMinutes
            ) ||
            intervalMinutes < 15
        ) {
            return 'The fixture interval must be at least 15 minutes.'
        }

        if (
            !Number.isFinite(
                config.daysBetweenRounds
            ) ||
            config.daysBetweenRounds < 0
        ) {
            return 'Days between rounds cannot be negative.'
        }

        if (
            config.venueAssignmentMode ===
            'selected_venue' &&
            !config.venueId
        ) {
            return 'Select a venue or choose another venue assignment mode.'
        }

        if (
            eligibleTeams.length < 2
        ) {
            return 'At least two eligible teams are required.'
        }

        if (
            config.mode ===
            'group_limited'
        ) {
            if (
                !Number.isFinite(
                    config.matchesPerTeam
                ) ||
                config.matchesPerTeam < 1
            ) {
                return 'Matches per team must be at least 1.'
            }
        }

        return null
    }

    function validatePreview(
        fixtures:
        GeneratedFixturePreview[]
    ) {
        const issues: string[] = []

        const previewIds =
            new Set<string>()

        const fixturePairKeys =
            new Set<string>()

        const teamKickoffKeys =
            new Set<string>()

        const venueKickoffKeys =
            new Set<string>()

        for (const fixture of fixtures) {
            if (
                previewIds.has(
                    fixture.previewId
                )
            ) {
                issues.push(
                    `Duplicate preview fixture detected: ${fixture.homeTeamName} vs ${fixture.awayTeamName}.`
                )
            }

            previewIds.add(
                fixture.previewId
            )

            const pairKey =
                createPairKey(
                    fixture.homeCompetitionTeamId,
                    fixture.awayCompetitionTeamId
                )

            if (
                fixturePairKeys.has(
                    pairKey
                )
            ) {
                issues.push(
                    `Duplicate pairing detected: ${fixture.homeTeamName} vs ${fixture.awayTeamName}.`
                )
            }

            fixturePairKeys.add(
                pairKey
            )

            const homeKickoffKey =
                `${fixture.homeCompetitionTeamId}::${fixture.kickoffTime}`

            const awayKickoffKey =
                `${fixture.awayCompetitionTeamId}::${fixture.kickoffTime}`

            if (
                teamKickoffKeys.has(
                    homeKickoffKey
                ) ||
                teamKickoffKeys.has(
                    awayKickoffKey
                )
            ) {
                issues.push(
                    `A team has more than one fixture at ${formatKickoff(fixture.kickoffTime)}.`
                )
            }

            teamKickoffKeys.add(
                homeKickoffKey
            )

            teamKickoffKeys.add(
                awayKickoffKey
            )

            if (fixture.venueId) {
                const venueKickoffKey =
                    `${fixture.venueId}::${fixture.kickoffTime}`

                if (
                    venueKickoffKeys.has(
                        venueKickoffKey
                    )
                ) {
                    issues.push(
                        `${fixture.venueName} has more than one fixture at ${formatKickoff(fixture.kickoffTime)}.`
                    )
                }

                venueKickoffKeys.add(
                    venueKickoffKey
                )
            }
        }

        return Array.from(
            new Set(issues)
        )
    }

    function generatePreview() {
        const validationError =
            validateConfiguration()

        if (validationError) {
            showToast(
                validationError,
                'error'
            )
            return
        }

        const startDate =
            new Date(
                config.startDateTime
            )

        if (
            Number.isNaN(
                startDate.getTime()
            )
        ) {
            showToast(
                'Enter a valid first kick-off date and time.',
                'error'
            )
            return
        }

        try {
            let generated:
                GeneratedFixturePreview[] =
                []

            switch (config.mode) {
                case 'group_full':
                    generated =
                        generateGroupFixtures(
                            'group_full',
                            startDate
                        )
                    break

                case 'group_limited':
                    generated =
                        generateGroupFixtures(
                            'group_limited',
                            startDate
                        )
                    break

                case 'league_single':
                    generated =
                        generateLeagueFixtures(
                            'league_single',
                            startDate
                        )
                    break

                case 'league_double':
                    generated =
                        generateLeagueFixtures(
                            'league_double',
                            startDate
                        )
                    break

                case 'knockout':
                    generated =
                        generateKnockoutFixtures(
                            startDate
                        )
                    break

                case 'manual':
                    generated = []
                    break
            }

            if (!generated.length) {
                showToast(
                    'No fixtures could be generated. Check the selected mode, eligible teams, existing fixtures and group allocations.',
                    'error'
                )
                return
            }

            const previewIssues =
                validatePreview(
                    generated
                )

            if (
                previewIssues.length > 0
            ) {
                showToast(
                    previewIssues[0],
                    'error'
                )
                return
            }

            setPreview(generated)

            showToast(
                `${generated.length} fixtures generated for preview.`,
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Fixture generation failed.',
                'error'
            )
        }
    }

    async function saveGeneratedFixtures() {
        if (
            !currentCompetition?.id ||
            !preview.length
        ) {
            return
        }

        const previewIssues =
            validatePreview(preview)

        if (
            previewIssues.length > 0
        ) {
            setShowSaveConfirmation(
                false
            )

            showToast(
                previewIssues[0],
                'error'
            )
            return
        }

        setIsSaving(true)

        try {
            await tournamentGeneratorService.createFixtures(
                currentCompetition.id,
                preview,
                config.publishImmediately
            )

            setShowSaveConfirmation(
                false
            )

            setPreview([])

            await loadData()

            showToast(
                config.publishImmediately
                    ? 'Tournament fixtures created and published successfully.'
                    : 'Tournament fixtures created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save generated fixtures.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[480px] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <RefreshCw className="h-12 w-12 animate-spin text-lime-400" />

                    <div>
                        <h3 className="text-xl font-bold text-white">
                            Loading Auto Fixture Generator
                        </h3>

                        <p className="mt-2 text-slate-400">
                            Preparing competition teams, groups and venues.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-gradient-to-br from-[#1b2a15] via-[#14200f] to-[#0d140a] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-lime-400/10 p-3">
                            <WandSparkles className="h-9 w-9 text-lime-400" />
                        </div>

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-400">
                                Automated competition scheduling
                            </p>

                            <h2 className="mt-2 text-3xl font-bold text-white">
                                Auto Fixture Generator
                            </h2>

                            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                                Generate, validate and preview tournament fixtures before saving or publishing.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-lime-800/60 bg-black/20 px-5 py-4">
                        <p className="text-sm text-slate-400">
                            Selected competition
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-lime-400" />

                            <span className="font-semibold text-white">
                                {currentCompetition?.name ??
                                    'Not selected'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {!currentCompetition ? (
                <section className="rounded-3xl border border-amber-800/40 bg-amber-500/10 p-10 text-center">
                    <XCircle className="mx-auto h-12 w-12 text-amber-400" />

                    <h3 className="mt-4 text-2xl font-bold text-white">
                        No competition selected
                    </h3>

                    <p className="mt-2 text-slate-300">
                        Select a competition before generating fixtures.
                    </p>
                </section>
            ) : (
                <>
                    <section className="rounded-3xl border border-lime-900/40 bg-[#121d0f] p-6">
                        <div className="flex items-center gap-3">
                            <Settings2 className="h-6 w-6 text-lime-400" />

                            <div>
                                <h3 className="text-xl font-semibold text-white">
                                    Generator configuration
                                </h3>

                                <p className="mt-1 text-sm text-slate-400">
                                    Configure the competition structure, timing and venue rules.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <label className={labelClassName}>
                                Generator mode

                                <select
                                    className={selectClassName}
                                    value={
                                        config.mode
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'mode',
                                            event.target.value as CompetitionMode
                                        )
                                    }
                                >
                                    {competitionModeOptions.map(
                                        (option) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label className={labelClassName}>
                                First kick-off

                                <input
                                    className={inputClassName}
                                    type="datetime-local"
                                    value={
                                        config.startDateTime
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'startDateTime',
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Days between rounds

                                <input
                                    className={inputClassName}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        config.daysBetweenRounds
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'daysBetweenRounds',
                                            Number(
                                                event.target.value
                                            )
                                        )
                                    }
                                />
                            </label>

                            <label className={labelClassName}>
                                Minutes between fixtures

                                <input
                                    className={inputClassName}
                                    type="number"
                                    min="15"
                                    step="5"
                                    value={
                                        intervalMinutes
                                    }
                                    onChange={(
                                        event
                                    ) => {
                                        setIntervalMinutes(
                                            Number(
                                                event.target.value
                                            )
                                        )

                                        setPreview([])
                                    }}
                                />
                            </label>

                            <label className={labelClassName}>
                                Venue assignment

                                <select
                                    className={selectClassName}
                                    value={
                                        config.venueAssignmentMode
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'venueAssignmentMode',
                                            event.target.value as VenueAssignmentMode
                                        )
                                    }
                                >
                                    {venueAssignmentOptions.map(
                                        (option) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            {config.venueAssignmentMode ===
                                'selected_venue' && (
                                    <label className={labelClassName}>
                                        Default venue

                                        <select
                                            className={selectClassName}
                                            value={
                                                config.venueId
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'venueId',
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select venue
                                            </option>

                                            {venues.map(
                                                (venue) => (
                                                    <option
                                                        key={
                                                            venue.id
                                                        }
                                                        value={
                                                            venue.id
                                                        }
                                                    >
                                                        {
                                                            venue.name
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                )}

                            {config.mode ===
                                'group_limited' && (
                                    <label className={labelClassName}>
                                        Matches per team

                                        <input
                                            className={inputClassName}
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={
                                                config.matchesPerTeam
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'matchesPerTeam',
                                                    Number(
                                                        event.target.value
                                                    )
                                                )
                                            }
                                        />
                                    </label>
                                )}
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                            {config.mode ===
                                'knockout' && (
                                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                        <input
                                            className="h-4 w-4 accent-lime-400"
                                            type="checkbox"
                                            checked={
                                                config.randomiseCupDraw
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'randomiseCupDraw',
                                                    event.target.checked
                                                )
                                            }
                                        />

                                        <div>
                                        <span className="font-semibold text-white">
                                            Randomise knockout draw
                                        </span>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Shuffle eligible teams before creating the first round.
                                            </p>
                                        </div>
                                    </label>
                                )}

                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                <input
                                    className="h-4 w-4 accent-lime-400"
                                    type="checkbox"
                                    checked={
                                        config.confirmedOnly
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'confirmedOnly',
                                            event.target.checked
                                        )
                                    }
                                />

                                <div>
                                    <span className="font-semibold text-white">
                                        Use confirmed teams only
                                    </span>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Exclude invited, interested and withdrawn teams.
                                    </p>
                                </div>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                <input
                                    className="h-4 w-4 accent-lime-400"
                                    type="checkbox"
                                    checked={
                                        config.publishImmediately
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'publishImmediately',
                                            event.target.checked
                                        )
                                    }
                                />

                                <div>
                                    <span className="font-semibold text-white">
                                        Publish immediately
                                    </span>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Make saved fixtures publicly visible.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-6 rounded-2xl border border-lime-800/40 bg-lime-400/5 p-5">
                            <div className="flex items-start gap-3">
                                <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-lime-400" />

                                <div>
                                    <p className="font-semibold text-white">
                                        {selectedMode?.label}
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        {selectedMode?.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                                type="button"
                                onClick={
                                    generatePreview
                                }
                                disabled={
                                    config.mode ===
                                    'manual'
                                }
                            >
                                <WandSparkles className="h-5 w-5" />
                                Generate Preview
                            </button>

                            {preview.length >
                                0 && (
                                    <button
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/50 bg-black/20 px-6 py-3 font-semibold text-white transition hover:border-lime-500/60 hover:bg-lime-500/5"
                                        type="button"
                                        onClick={() =>
                                            setPreview([])
                                        }
                                    >
                                        <RefreshCw className="h-5 w-5" />
                                        Clear Preview
                                    </button>
                                )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-lime-900/40 bg-[#121d0f] p-6">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-lime-400" />

                            <div>
                                <h3 className="text-xl font-semibold text-white">
                                    Tournament readiness
                                </h3>

                                <p className="mt-1 text-sm text-slate-400">
                                    Current data available to the generator.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <ReadinessCard
                                label="Eligible teams"
                                value={
                                    eligibleTeams.length
                                }
                                status={
                                    eligibleTeams.length >=
                                    2
                                        ? 'ready'
                                        : 'warning'
                                }
                                icon={Users}
                                detail={
                                    eligibleTeams.length >=
                                    2
                                        ? 'Minimum reached'
                                        : 'At least 2 required'
                                }
                            />

                            <ReadinessCard
                                label="Groups"
                                value={
                                    groups.length
                                }
                                status={
                                    groups.length >
                                    0
                                        ? 'ready'
                                        : 'warning'
                                }
                                icon={Trophy}
                                detail={
                                    groups.length >
                                    0
                                        ? 'Available'
                                        : 'None configured'
                                }
                            />

                            <ReadinessCard
                                label="Venues"
                                value={
                                    venues.length
                                }
                                status={
                                    venues.length >
                                    0
                                        ? 'ready'
                                        : 'warning'
                                }
                                icon={MapPin}
                                detail={
                                    venues.length >
                                    0
                                        ? 'Available'
                                        : 'None configured'
                                }
                            />

                            <ReadinessCard
                                label="Existing fixtures"
                                value={
                                    existingFixtures.length
                                }
                                status="protected"
                                icon={ShieldCheck}
                                detail="Will not be changed"
                            />
                        </div>
                    </section>

                    {(config.mode ===
                        'group_full' ||
                        config.mode ===
                        'group_limited') && (
                        <section className="rounded-3xl border border-lime-900/40 bg-[#121d0f] p-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-lime-400" />

                                <div>
                                    <h3 className="text-xl font-semibold text-white">
                                        Group readiness
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-400">
                                        Eligible teams and existing fixture coverage for each group.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {groupSummaries.map(
                                    (group) => (
                                        <article
                                            className="rounded-2xl border border-lime-900/40 bg-black/20 p-5"
                                            key={
                                                group.id
                                            }
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className="rounded-full border border-lime-800/50 bg-lime-500/10 px-3 py-1 text-xs font-bold text-lime-300">
                                                        {
                                                            group.teams.length
                                                        }{' '}
                                                        eligible teams
                                                    </span>

                                                    <h4 className="mt-4 text-lg font-bold text-white">
                                                        {
                                                            group.name
                                                        }
                                                    </h4>
                                                </div>

                                                {group.hasExistingFixtures ? (
                                                    <span className="rounded-full border border-amber-800/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                                                        Existing fixtures
                                                    </span>
                                                ) : group.teams.length <
                                                2 ? (
                                                    <span className="rounded-full border border-red-800/50 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                                                        Not ready
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-lime-800/50 bg-lime-500/10 px-3 py-1 text-xs font-bold text-lime-300">
                                                        Ready
                                                    </span>
                                                )}
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        </section>
                    )}

                    {preview.length >
                        0 && (
                            <section className="rounded-3xl border border-lime-900/40 bg-[#121d0f] p-6">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-3">
                                        <Eye className="mt-1 h-6 w-6 text-lime-400" />

                                        <div>
                                            <h3 className="text-xl font-semibold text-white">
                                                Fixture Preview
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-400">
                                                Review all{' '}
                                                {
                                                    preview.length
                                                }{' '}
                                                generated fixtures before saving.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300"
                                        type="button"
                                        onClick={() =>
                                            setShowSaveConfirmation(
                                                true
                                            )
                                        }
                                    >
                                        <Save className="h-5 w-5" />

                                        {config.publishImmediately
                                            ? 'Save and Publish Fixtures'
                                            : 'Save Fixtures'}
                                    </button>
                                </div>

                                <div className="mt-6 overflow-x-auto rounded-2xl border border-lime-900/40">
                                    <table className="min-w-full divide-y divide-lime-900/40">
                                        <thead className="bg-black/30">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Stage
                                            </th>

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Group
                                            </th>

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Round
                                            </th>

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Fixture
                                            </th>

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Kick-off
                                            </th>

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Venue
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-lime-900/30 bg-black/10">
                                        {preview.map(
                                            (fixture) => (
                                                <tr
                                                    className="transition hover:bg-lime-500/5"
                                                    key={
                                                        fixture.previewId
                                                    }
                                                >
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                                        <span className="rounded-full border border-lime-800/50 bg-lime-500/10 px-3 py-1 text-xs font-semibold text-lime-300">
                                                            {
                                                                fixture.stage
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                                        {
                                                            fixture.groupName
                                                        }
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-white">
                                                        {
                                                            fixture.roundNumber
                                                        }
                                                    </td>

                                                    <td className="min-w-[260px] px-4 py-4 text-sm text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <strong className="text-white">
                                                                {
                                                                    fixture.homeTeamName
                                                                }
                                                            </strong>

                                                            <span className="text-slate-500">
                                                                vs
                                                            </span>

                                                            <strong className="text-white">
                                                                {
                                                                    fixture.awayTeamName
                                                                }
                                                            </strong>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-lime-400" />

                                                            {formatKickoff(
                                                                fixture.kickoffTime
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-lime-400" />

                                                            {
                                                                fixture.venueName
                                                            }
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                        <div className="flex items-center gap-3">
                                            <Trophy className="h-5 w-5 text-lime-400" />

                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                                    Fixtures
                                                </p>

                                                <p className="mt-1 text-xl font-bold text-white">
                                                    {
                                                        preview.length
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                        <div className="flex items-center gap-3">
                                            <Clock3 className="h-5 w-5 text-lime-400" />

                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                                    Interval
                                                </p>

                                                <p className="mt-1 text-xl font-bold text-white">
                                                    {
                                                        intervalMinutes
                                                    }{' '}
                                                    minutes
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                        <div className="flex items-center gap-3">
                                            {config.publishImmediately ? (
                                                <CheckCircle2 className="h-5 w-5 text-lime-400" />
                                            ) : (
                                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                            )}

                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                                    Publish status
                                                </p>

                                                <p className="mt-1 text-xl font-bold text-white">
                                                    {config.publishImmediately
                                                        ? 'Publish on save'
                                                        : 'Save as unpublished'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                </>
            )}

            {showSaveConfirmation && (
                <ConfirmDialog
                    title={
                        config.publishImmediately
                            ? 'Create and Publish Fixtures'
                            : 'Create Generated Fixtures'
                    }
                    message={
                        config.publishImmediately
                            ? `Create and publish ${preview.length} fixtures? Existing fixtures will not be changed.`
                            : `Create ${preview.length} fixtures? Existing fixtures will not be changed.`
                    }
                    confirmText={
                        isSaving
                            ? 'Saving...'
                            : config.publishImmediately
                                ? 'Create and Publish'
                                : 'Create Fixtures'
                    }
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!isSaving) {
                            setShowSaveConfirmation(
                                false
                            )
                        }
                    }}
                    onConfirm={() => {
                        if (!isSaving) {
                            void saveGeneratedFixtures()
                        }
                    }}
                />
            )}
        </div>
    )
}