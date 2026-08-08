import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
    Sparkles,
    Trophy,
    Users,
    WandSparkles,
    XCircle,
} from 'lucide-react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { useOrganisation } from '../../../context/OrganisationContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'

import {
    generateDoubleRoundRobin,
    generateKnockoutFirstRound,
    generateLimitedSchedule,
    generateSingleRoundRobin,
} from './competitionEngine'

import { tournamentGeneratorService } from './tournamentGeneratorService'
import {
    TournamentAnalysisService,
} from '../../../services/tournamentAnalysisService'
import { FootballRulesEngine } from
        '../../../services/footballRulesEngine'
import { officialService } from '../../../services/officialService'

import type { Official } from '../../../types/officialTypes'

import type {
    RecommendedGeneratorConfig,
} from '../../../services/tournamentAnalysisService'

import type {
    CompetitionMode,
    ExistingFixture,
    GeneratedFixturePreview,
    GeneratorCompetitionTeam,
    GeneratorConfig,
    GeneratorGroup,
    GeneratorMembership,
    GeneratorVenue,
} from './tournamentGeneratorTypes'

const initialConfig: GeneratorConfig = {
    mode: 'group_full',
    startDateTime: '',
    daysBetweenRounds: 7,
    venueAssignmentMode: 'home_team',
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

const inputClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10'

const selectClassName =
    'mt-2 w-full rounded-xl border border-lime-900/50 bg-[#10190d] px-4 py-3 text-white outline-none transition focus:border-lime-500/70 focus:ring-2 focus:ring-lime-500/10'

const labelClassName =
    'text-sm font-semibold text-slate-300'


function toCompetitionStartDateTime(
    startDate: string | null | undefined
) {
    if (!startDate) {
        return ''
    }

    return `${startDate}T10:00`
}

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
    const { currentOrganisation } =
        useOrganisation()

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

    const [officials, setOfficials] =
        useState<Official[]>([])

    const [
        existingFixtures,
        setExistingFixtures,
    ] = useState<ExistingFixture[]>([])

    const [config, setConfig] =
        useState<GeneratorConfig>(
            initialConfig
        )

    const activeFootballRules = useMemo(
        () =>
            FootballRulesEngine.resolveScheduleRules(
                FootballRulesEngine.getProfileForFormat(
                    config.mode === 'knockout'
                        ? 'knockout'
                        : 'league'
                )
            ),
        [config.mode]
    )

    const [
        aiRecommendation,
        setAiRecommendation,
    ] = useState<RecommendedGeneratorConfig | null>(
        null
    )

    const [
        isLoadingAiRecommendation,
        setIsLoadingAiRecommendation,
    ] = useState(false)

    const [
        aiRecommendationError,
        setAiRecommendationError,
    ] = useState<string | null>(null)

    const [
        aiRecommendationApplied,
        setAiRecommendationApplied,
    ] = useState(false)

    const appliedRecommendationCompetitionId =
        useRef<string | null>(null)

    const [
        intervalMinutes,
        setIntervalMinutes,
    ] = useState(90)

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

    const mapAiRecommendationToGeneratorConfig =
        useCallback(
            (
                recommendation: RecommendedGeneratorConfig
            ): Partial<GeneratorConfig> => {
                const recommendedMode: CompetitionMode =
                    recommendation.competitionMode ===
                    'group-stage'
                        ? 'group_full'
                        : 'league_single'

                return {
                    mode: recommendedMode,
                    daysBetweenRounds:
                        Math.max(
                            7,
                            recommendation.daysBetweenRounds
                        ),
                    venueAssignmentMode:
                        'home_team',
                    venueId: '',
                    publishImmediately:
                        recommendation.publishImmediately,
                    confirmedOnly:
                        recommendation.confirmedTeamsOnly,
                }
            },
            []
        )

    const applyAiRecommendation =
        useCallback(
            (
                recommendation: RecommendedGeneratorConfig,
                notify = true
            ) => {
                const mappedConfig =
                    mapAiRecommendationToGeneratorConfig(
                        recommendation
                    )

                const recommendedRules =
                    FootballRulesEngine.resolveScheduleRules(
                        FootballRulesEngine.getProfileForFormat(
                            mappedConfig.mode === 'knockout'
                                ? 'knockout'
                                : 'league'
                        )
                    )

                const minimumSafeInterval =
                    Math.max(
                        recommendation.minutesBetweenFixtures,
                        recommendation.minimumSafeFixtureIntervalMinutes,
                        recommendedRules.minimumSameVenueStartIntervalMinutes
                    )

                if (
                    recommendation.recommendationStatus !==
                    'validated'
                ) {
                    setAiRecommendationApplied(false)

                    if (notify) {
                        showToast(
                            recommendation.validationMessages[0] ??
                            'The AI recommendation is not safe to apply yet. Resolve the tournament readiness issues first.',
                            'error'
                        )
                    }

                    return
                }

                setConfig((current) => ({
                    ...current,
                    ...mappedConfig,
                }))

                setIntervalMinutes((currentInterval) =>
                    Math.max(
                        currentInterval,
                        minimumSafeInterval
                    )
                )

                setPreview([])
                setAiRecommendationApplied(true)

                if (notify) {
                    showToast(
                        `Validated AI recommendations applied using ${recommendedRules.label}. Weekly rounds, automatic home venues and safe clash resolution are enabled.`,
                        'success'
                    )
                }
            },
            [mapAiRecommendationToGeneratorConfig]
        )

    const loadData = useCallback(
        async () => {
            if (!currentCompetition?.id) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setOfficials([])
                setExistingFixtures([])
                setPreview([])
                setAiRecommendation(null)
                setAiRecommendationError(null)
                setAiRecommendationApplied(false)
                appliedRecommendationCompetitionId.current = null
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            try {
                setIsLoadingAiRecommendation(
                    Boolean(currentOrganisation?.id)
                )
                setAiRecommendationError(null)

                const [
                    groupRows,
                    teamRows,
                    venueRows,
                    existingFixtureRows,
                    officialRows,
                    analysisReport,
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
                    currentOrganisation?.id
                        ? officialService.getAll(
                            currentOrganisation.id
                        )
                        : Promise.resolve([]),
                    currentOrganisation?.id
                        ? TournamentAnalysisService.analyseTournament(
                            {
                                organisationId:
                                currentOrganisation.id,
                                organisationName:
                                currentOrganisation.name,
                                competitionId:
                                currentCompetition.id,
                            }
                        ).catch((error: unknown) => {
                            setAiRecommendationError(
                                error instanceof Error
                                    ? error.message
                                    : 'Unable to load AI scheduling recommendations.'
                            )
                            return null
                        })
                        : Promise.resolve(null),
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
                setOfficials(
                    officialRows.filter(
                        (official) =>
                            official.status === 'active' &&
                            (
                                !currentCompetition?.sport_id ||
                                official.sport_id === currentCompetition.sport_id
                            )
                    )
                )
                setPreview([])

                const rawRecommendation =
                    analysisReport?.recommendedGeneratorConfig ??
                    null

                const recommendation =
                    rawRecommendation
                        ? {
                            ...rawRecommendation,
                            daysBetweenRounds: Math.max(
                                7,
                                rawRecommendation.daysBetweenRounds
                            ),
                        }
                        : null

                setAiRecommendation(
                    recommendation
                )

                if (
                    recommendation &&
                    appliedRecommendationCompetitionId.current !==
                    currentCompetition.id
                ) {
                    applyAiRecommendation(
                        recommendation,
                        false
                    )

                    appliedRecommendationCompetitionId.current =
                        currentCompetition.id
                }
            } catch (error) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setOfficials([])
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
                setIsLoadingAiRecommendation(false)
            }
        },
        [
            currentCompetition?.id,
            currentOrganisation?.id,
            currentOrganisation?.name,
            applyAiRecommendation,
        ]
    )

    useEffect(() => {
        void loadData()
    }, [loadData])

    useEffect(() => {
        if (!currentCompetition?.id) {
            return
        }

        setConfig((current) => ({
            ...current,
            startDateTime:
                toCompetitionStartDateTime(
                    currentCompetition.start_date
                ),
            daysBetweenRounds: 7,
            venueAssignmentMode: 'home_team',
            venueId: '',
        }))
    }, [
        currentCompetition?.id,
        currentCompetition?.start_date,
    ])

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
            resolveVenue(
                homeTeam
            )

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

        if (!currentCompetition.start_date) {
            return 'The selected competition does not have a start date configured.'
        }

        if (
            !Number.isFinite(
                intervalMinutes
            ) ||
            intervalMinutes < 1
        ) {
            return 'The fixture interval must be at least 1 minute.'
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
            aiRecommendationApplied &&
            aiRecommendation
        ) {
            const minimumSafeInterval =
                Math.max(
                    aiRecommendation.minimumSafeFixtureIntervalMinutes,
                    activeFootballRules.minimumSameVenueStartIntervalMinutes
                )

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

    function repairGeneratedSchedule(
        fixtures: GeneratedFixturePreview[]
    ) {
        const durationMs =
            activeFootballRules
                .scheduledFixtureDurationMinutes *
            60_000

        const stepMs = Math.max(
            1,
            intervalMinutes
        ) * 60_000

        const teamBookings =
            new Map<string, Array<{
                start: number
                end: number
            }>>()

        const venueBookings =
            new Map<string, Array<{
                start: number
                end: number
            }>>()

        const overlaps = (
            bookings: Array<{
                start: number
                end: number
            }> | undefined,
            start: number,
            end: number
        ) =>
            Boolean(
                bookings?.some(
                    (booking) =>
                        start < booking.end &&
                        booking.start < end
                )
            )

        const addBooking = (
            bookings: Map<
                string,
                Array<{
                    start: number
                    end: number
                }>
            >,
            key: string,
            start: number,
            end: number
        ) => {
            const existing =
                bookings.get(key) ?? []

            existing.push({
                start,
                end,
            })

            bookings.set(
                key,
                existing
            )
        }

        return [...fixtures]
            .sort(
                (first, second) =>
                    new Date(
                        first.kickoffTime
                    ).getTime() -
                    new Date(
                        second.kickoffTime
                    ).getTime()
            )
            .map((fixture) => {
                let start = new Date(
                    fixture.kickoffTime
                ).getTime()

                if (!Number.isFinite(start)) {
                    return fixture
                }

                let attempts = 0

                while (attempts < 10_000) {
                    const end =
                        start + durationMs

                    const homeConflict =
                        overlaps(
                            teamBookings.get(
                                fixture
                                    .homeCompetitionTeamId
                            ),
                            start,
                            end
                        )

                    const awayConflict =
                        overlaps(
                            teamBookings.get(
                                fixture
                                    .awayCompetitionTeamId
                            ),
                            start,
                            end
                        )

                    const venueConflict =
                        fixture.venueId
                            ? overlaps(
                                venueBookings.get(
                                    fixture.venueId
                                ),
                                start,
                                end
                            )
                            : false

                    if (
                        !homeConflict &&
                        !awayConflict &&
                        !venueConflict
                    ) {
                        addBooking(
                            teamBookings,
                            fixture
                                .homeCompetitionTeamId,
                            start,
                            end
                        )

                        addBooking(
                            teamBookings,
                            fixture
                                .awayCompetitionTeamId,
                            start,
                            end
                        )

                        if (fixture.venueId) {
                            addBooking(
                                venueBookings,
                                fixture.venueId,
                                start,
                                end
                            )
                        }

                        return {
                            ...fixture,
                            kickoffTime:
                                new Date(
                                    start
                                ).toISOString(),
                        }
                    }

                    start += stepMs
                    attempts += 1
                }

                return fixture
            })
    }

    function assignPreviewOfficials(
        fixtures: GeneratedFixturePreview[]
    ) {
        const refereePool =
            officials
                .filter(
                    (official) =>
                        official.role === 'referee'
                )
                .sort(
                    (left, right) =>
                        (left.completed_matches ?? 0) -
                        (right.completed_matches ?? 0)
                )

        if (!refereePool.length) {
            return fixtures.map(
                (fixture) => ({
                    ...fixture,
                    refereeOfficialId: null,
                    refereeName:
                        'To Be Appointed',
                })
            )
        }

        const bookingMap =
            new Map<
                string,
                Array<{
                    start: number
                    end: number
                }>
            >()

        const allocationCount =
            new Map<string, number>()

        const overlaps = (
            bookings:
                | Array<{
                    start: number
                    end: number
                }>
                | undefined,
            start: number,
            end: number
        ) =>
            Boolean(
                bookings?.some(
                    (booking) =>
                        start < booking.end &&
                        booking.start < end
                )
            )

        const durationMs =
            activeFootballRules
                .scheduledFixtureDurationMinutes *
            60_000

        return fixtures.map((fixture) => {
            const start =
                new Date(
                    fixture.kickoffTime
                ).getTime()

            const end =
                start + durationMs

            const availableReferees =
                refereePool
                    .filter(
                        (official) =>
                            !overlaps(
                                bookingMap.get(
                                    official.id
                                ),
                                start,
                                end
                            )
                    )
                    .sort(
                        (left, right) =>
                            (
                                allocationCount.get(
                                    left.id
                                ) ?? 0
                            ) -
                            (
                                allocationCount.get(
                                    right.id
                                ) ?? 0
                            )
                    )

            const selectedOfficial =
                availableReferees[0]

            if (!selectedOfficial) {
                return {
                    ...fixture,
                    refereeOfficialId: null,
                    refereeName:
                        'To Be Appointed',
                }
            }

            const bookings =
                bookingMap.get(
                    selectedOfficial.id
                ) ?? []

            bookings.push({
                start,
                end,
            })

            bookingMap.set(
                selectedOfficial.id,
                bookings
            )

            allocationCount.set(
                selectedOfficial.id,
                (
                    allocationCount.get(
                        selectedOfficial.id
                    ) ?? 0
                ) + 1
            )

            return {
                ...fixture,
                refereeOfficialId:
                    selectedOfficial.id,
                refereeName:
                    selectedOfficial.full_name ||
                    `${selectedOfficial.first_name} ${selectedOfficial.last_name}`.trim(),
            }
        })
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

        const fixtureDurationMinutes =
            activeFootballRules.scheduledFixtureDurationMinutes

        const scheduledVenueFixtures =
            fixtures.filter(
                (fixture) =>
                    Boolean(fixture.venueId)
            )

        for (
            let firstIndex = 0;
            firstIndex < scheduledVenueFixtures.length;
            firstIndex += 1
        ) {
            const firstFixture =
                scheduledVenueFixtures[firstIndex]

            const firstStart =
                new Date(
                    firstFixture.kickoffTime
                ).getTime()

            const firstEnd =
                firstStart +
                fixtureDurationMinutes *
                60_000

            for (
                let secondIndex = firstIndex + 1;
                secondIndex < scheduledVenueFixtures.length;
                secondIndex += 1
            ) {
                const secondFixture =
                    scheduledVenueFixtures[secondIndex]

                if (
                    firstFixture.venueId !==
                    secondFixture.venueId
                ) {
                    continue
                }

                const secondStart =
                    new Date(
                        secondFixture.kickoffTime
                    ).getTime()

                const secondEnd =
                    secondStart +
                    fixtureDurationMinutes *
                    60_000

                if (
                    firstStart < secondEnd &&
                    secondStart < firstEnd
                ) {
                    issues.push(
                        `${firstFixture.venueName} has overlapping fixtures: ${firstFixture.homeTeamName} vs ${firstFixture.awayTeamName} and ${secondFixture.homeTeamName} vs ${secondFixture.awayTeamName}.`
                    )
                }
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

        const kickoffTime =
            config.startDateTime.slice(11, 16) ||
            '10:00'

        const startDate =
            new Date(
                `${currentCompetition.start_date}T${kickoffTime}`
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

            const originalKickoffByPreviewId =
                new Map(
                    generated.map((fixture) => [
                        fixture.previewId,
                        fixture.kickoffTime,
                    ])
                )

            generated =
                repairGeneratedSchedule(
                    generated
                )

            generated =
                assignPreviewOfficials(
                    generated
                )

            const automaticallyAdjustedFixtures =
                generated.filter(
                    (fixture) =>
                        originalKickoffByPreviewId.get(
                            fixture.previewId
                        ) !== fixture.kickoffTime
                ).length

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
                automaticallyAdjustedFixtures > 0
                    ? `${generated.length} fixtures generated for preview. ${automaticallyAdjustedFixtures} fixture${automaticallyAdjustedFixtures === 1 ? '' : 's'} automatically rescheduled to resolve team or venue clashes.`
                    : `${generated.length} fixtures generated for preview.`,
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
            const createdFixtures =
                await tournamentGeneratorService.createFixtures(
                    currentCompetition.id,
                    preview,
                    config.publishImmediately
                )

            if (
                currentOrganisation?.id
            ) {
                const previewByKey =
                    new Map(
                        preview.map(
                            (fixture) => [
                                [
                                    fixture.homeCompetitionTeamId,
                                    fixture.awayCompetitionTeamId,
                                    fixture.kickoffTime,
                                ].join('::'),
                                fixture,
                            ]
                        )
                    )

                await Promise.all(
                    createdFixtures.map(
                        async (fixture) => {
                            const previewFixture =
                                previewByKey.get(
                                    [
                                        fixture.home_competition_team_id,
                                        fixture.away_competition_team_id,
                                        fixture.kickoff_time,
                                    ].join('::')
                                )

                            if (
                                !previewFixture
                                    ?.refereeOfficialId
                            ) {
                                return
                            }

                            await officialService.assignOfficial({
                                organisation_id:
                                    currentOrganisation.id,
                                official_id:
                                    previewFixture.refereeOfficialId,
                                competition_id:
                                    currentCompetition.id,
                                fixture_id:
                                    fixture.id,
                                venue_id:
                                    fixture.venue_id,
                                sport_id:
                                    currentCompetition.sport_id ??
                                    null,
                                role: 'referee',
                                source: 'ai',
                                status: 'proposed',
                                assignment_score: null,
                                travel_distance_km: null,
                                travel_duration_minutes: null,
                                assigned_fee: 0,
                                assigned_expenses: 0,
                                assigned_by: null,
                                assigned_at: null,
                                accepted_at: null,
                                notes:
                                    'Automatically assigned by the TournamentHQ Intelligent Fixture Generator.',
                            })
                        }
                    )
                )
            }

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
                            Loading Intelligent Fixture Generator
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
                                Intelligent Fixture Generator
                            </h2>

                            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                                Generate an intelligent, conflict-aware fixture schedule using competition dates, home venues and available officials before saving or publishing.
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
                    <section className="rounded-3xl border border-lime-900/40 bg-gradient-to-br from-lime-500/10 via-[#121d0f] to-[#121d0f] p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl border border-lime-400/20 bg-lime-400/10 p-3">
                                    <Sparkles className="h-6 w-6 text-lime-300" />
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">
                                        AI-assisted configuration
                                    </p>

                                    <h3 className="mt-2 text-xl font-semibold text-white">
                                        Tournament Director recommendations
                                    </h3>

                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                                        Recommendations pre-populate the existing generator settings only. The scheduling engine and fixture-generation rules remain unchanged.
                                    </p>
                                </div>
                            </div>

                            {aiRecommendation && (
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-5 py-3 font-semibold text-lime-200 transition hover:border-lime-300/50 hover:bg-lime-400/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/40 disabled:text-slate-500"
                                    type="button"
                                    disabled={
                                        aiRecommendation.recommendationStatus !==
                                        'validated'
                                    }
                                    onClick={() => {
                                        applyAiRecommendation(
                                            aiRecommendation,
                                            venues
                                        )

                                        appliedRecommendationCompetitionId.current =
                                            currentCompetition.id
                                    }}
                                >
                                    <Sparkles className="h-5 w-5" />
                                    Apply AI Recommendations
                                </button>
                            )}
                        </div>

                        {isLoadingAiRecommendation ? (
                            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
                                <RefreshCw className="h-5 w-5 animate-spin text-lime-400" />
                                Analysing the current tournament configuration...
                            </div>
                        ) : aiRecommendationError ? (
                            <div className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-500/10 p-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />

                                    <div>
                                        <p className="font-semibold text-amber-200">
                                            AI recommendations unavailable
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-amber-100/70">
                                            {aiRecommendationError}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : aiRecommendation ? (
                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                    <p className="text-xs uppercase tracking-wider text-slate-500">
                                        Competition mode
                                    </p>
                                    <p className="mt-2 font-semibold text-white">
                                        {aiRecommendation.competitionMode === 'group-stage'
                                            ? 'Group stage'
                                            : 'Round robin'}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                    <p className="text-xs uppercase tracking-wider text-slate-500">
                                        Scheduling strategy
                                    </p>
                                    <p className="mt-2 font-semibold capitalize text-white">
                                        {aiRecommendation.preferredSchedulingStrategy.replace('-', ' ')}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                    <p className="text-xs uppercase tracking-wider text-slate-500">
                                        Round spacing
                                    </p>
                                    <p className="mt-2 font-semibold text-white">
                                        {Math.max(7, aiRecommendation.daysBetweenRounds)} days
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-lime-900/40 bg-black/20 p-4">
                                    <p className="text-xs uppercase tracking-wider text-slate-500">
                                        Fixture interval
                                    </p>
                                    <p className="mt-2 font-semibold text-white">
                                        {Math.max(
                                            aiRecommendation.minutesBetweenFixtures,
                                            aiRecommendation.minimumSafeFixtureIntervalMinutes
                                        )} minutes ({aiRecommendation.rulesProfileId === 'adult-knockout' ? 'adult knockout' : 'adult league'})
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-400">
                                Select an organisation and competition to receive AI-assisted generator defaults.
                            </div>
                        )}

                        {aiRecommendationApplied && aiRecommendation && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-lime-300">
                                <CheckCircle2 className="h-4 w-4" />
                                AI defaults are validated and applied. Unsafe timing reductions will be rejected before preview generation.
                            </div>
                        )}
                    </section>

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

                            <div>
                                <p className={labelClassName}>
                                    Competition start date
                                </p>

                                <div className="mt-2 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-4 py-3 text-white">
                                    {currentCompetition.start_date
                                        ? new Intl.DateTimeFormat('en-GB', {
                                            dateStyle: 'full',
                                        }).format(
                                            new Date(`${currentCompetition.start_date}T00:00:00`)
                                        )
                                        : 'Start date not configured'}
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    Automatically inherited from the selected competition.
                                </p>
                            </div>

                            <label className={labelClassName}>
                                First kick-off time

                                <input
                                    className={inputClassName}
                                    type="time"
                                    value={
                                        config.startDateTime.slice(11, 16) || '10:00'
                                    }
                                    onChange={(event) => {
                                        if (!currentCompetition.start_date) {
                                            return
                                        }

                                        updateConfig(
                                            'startDateTime',
                                            `${currentCompetition.start_date}T${event.target.value}`
                                        )
                                    }}
                                    disabled={!currentCompetition.start_date}
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    The date is automatic; only the kick-off time is editable.
                                </p>
                            </label>

                            <label className={labelClassName}>
                                Days between rounds

                                <input
                                    className={inputClassName}
                                    type="number"
                                    min="1"
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

                                <p className="mt-2 text-xs text-slate-500">
                                    Defaults to 7 days and remains editable for exceptional schedules.
                                </p>
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

                                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Referee
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

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-lime-400" />
                                                            <span
                                                                className={
                                                                    fixture.refereeOfficialId
                                                                        ? 'text-white'
                                                                        : 'text-amber-300'
                                                                }
                                                            >
                                                                {
                                                                    fixture.refereeName ??
                                                                    'To Be Appointed'
                                                                }
                                                            </span>
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