import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import {
    generateDoubleRoundRobin,
    generateKnockoutFirstRound,
    generateLimitedSchedule,
    generateSingleRoundRobin,
    type EnginePairing,
} from './competitionEngine'
import { tournamentGeneratorService } from './tournamentGeneratorService'
import type {
    CompetitionMode,
    ExistingFixture,
    GeneratedFixturePreview,
    GeneratorConfig,
    GeneratorFestival,
    GeneratorGroup,
    GeneratorMembership,
    GeneratorTeam,
    GeneratorVenue,
    VenueAssignmentMode,
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

const modeLabels: Record<CompetitionMode, string> = {
    group_full: 'Full group round robin',
    group_limited: 'Limited group schedule',
    league_single: 'Single round-robin league',
    league_double: 'Double round-robin league',
    knockout: 'Knockout cup',
    manual: 'Manual scheduling',
}

function formatKickoff(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
}

function createRoundDate(
    startDate: Date,
    roundNumber: number,
    daysBetweenRounds: number
) {
    return new Date(
        startDate.getTime() +
        (roundNumber - 1) *
        daysBetweenRounds *
        24 *
        60 *
        60 *
        1000
    )
}

export function TournamentGenerator() {
    const [festival, setFestival] =
        useState<GeneratorFestival | null>(null)

    const [groups, setGroups] =
        useState<GeneratorGroup[]>([])

    const [teams, setTeams] =
        useState<GeneratorTeam[]>([])

    const [memberships, setMemberships] =
        useState<GeneratorMembership[]>([])

    const [venues, setVenues] =
        useState<GeneratorVenue[]>([])

    const [existingFixtures, setExistingFixtures] =
        useState<ExistingFixture[]>([])

    const [config, setConfig] =
        useState<GeneratorConfig>(initialConfig)

    const [preview, setPreview] =
        useState<GeneratedFixturePreview[]>([])

    const [byeTeamNames, setByeTeamNames] =
        useState<string[]>([])

    const [isLoading, setIsLoading] =
        useState(true)

    const [isSaving, setIsSaving] =
        useState(false)

    const [
        showSaveConfirmation,
        setShowSaveConfirmation,
    ] = useState(false)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<'success' | 'error' | 'info'>(
            'success'
        )

    function showToast(
        message: string,
        type: 'success' | 'error' | 'info' =
        'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    const loadData = useCallback(async () => {
        setIsLoading(true)

        try {
            const activeFestival =
                await tournamentGeneratorService.getActiveFestival()

            setFestival(activeFestival)

            if (!activeFestival) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setExistingFixtures([])
                return
            }

            const [
                groupRows,
                teamRows,
                venueRows,
                fixtureRows,
            ] = await Promise.all([
                tournamentGeneratorService.getGroups(
                    activeFestival.id
                ),
                tournamentGeneratorService.getTeams(
                    activeFestival.id
                ),
                tournamentGeneratorService.getVenues(
                    activeFestival.id
                ),
                tournamentGeneratorService.getExistingFixtures(
                    activeFestival.id
                ),
            ])

            const membershipRows =
                await tournamentGeneratorService.getMemberships(
                    groupRows.map((group) => group.id)
                )

            setGroups(groupRows)
            setTeams(teamRows)
            setVenues(venueRows)
            setMemberships(membershipRows)
            setExistingFixtures(fixtureRows)
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load competition generator data.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }, [])

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
        [teams, config.confirmedOnly]
    )

    const existingGroupFixtureIds = useMemo(
        () =>
            new Set(
                existingFixtures
                    .filter(
                        (fixture) =>
                            fixture.stage ===
                            'Group Stage'
                    )
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

    const teamNameById = useMemo(
        () =>
            new Map(
                teams.map((team) => [
                    team.id,
                    team.name,
                ])
            ),
        [teams]
    )

    const selectedVenue =
        venues.find(
            (item) =>
                item.id === config.venueId
        ) ?? null

    const venueNameById = useMemo(
        () =>
            new Map(
                venues.map((venue) => [
                    venue.id,
                    venue.name,
                ])
            ),
        [venues]
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
        setByeTeamNames([])
    }

    function buildPreviewRows(
        pairings: EnginePairing[],
        options: {
            groupId: string | null
            groupName: string
            stage: string
            startDate: Date
        }
    ): GeneratedFixturePreview[] {
        return pairings.map((pairing) => {
            const kickoff = createRoundDate(
                options.startDate,
                pairing.roundNumber,
                config.daysBetweenRounds
            )

            const homeTeamName =
                teamNameById.get(
                    pairing.homeTeamId
                ) ?? 'Unknown team'

            const awayTeamName =
                teamNameById.get(
                    pairing.awayTeamId
                ) ?? 'Unknown team'

            const homeTeam =
                teamById.get(
                    pairing.homeTeamId
                )

            let fixtureVenueId: string | null =
                null

            let fixtureVenueName =
                'Venue TBC'

            if (
                config.venueAssignmentMode ===
                'home_team'
            ) {
                fixtureVenueId =
                    homeTeam
                        ?.primary_home_venue_id ??
                    null

                fixtureVenueName =
                    fixtureVenueId
                        ? venueNameById.get(
                        fixtureVenueId
                    ) ?? 'Venue TBC'
                        : 'Home venue not assigned'
            }

            if (
                config.venueAssignmentMode ===
                'selected_venue'
            ) {
                fixtureVenueId =
                    selectedVenue?.id ??
                    null

                fixtureVenueName =
                    selectedVenue?.name ??
                    'Venue TBC'
            }

            return {
                previewId: [
                    options.stage,
                    options.groupId ?? 'none',
                    pairing.roundNumber,
                    pairing.homeTeamId,
                    pairing.awayTeamId,
                ].join('-'),
                groupId: options.groupId,
                groupName: options.groupName,
                stage: options.stage,
                roundNumber: pairing.roundNumber,
                homeTeamId: pairing.homeTeamId,
                homeTeamName,
                awayTeamId: pairing.awayTeamId,
                awayTeamName,
                kickoffTime: kickoff.toISOString(),
                venueId: fixtureVenueId,
                venueName: fixtureVenueName,
            }
        })
    }

    function generateGroupedPreview(
        limited: boolean,
        startDate: Date
    ) {
        const rows: GeneratedFixturePreview[] =
            []

        for (const group of groups) {
            if (
                existingGroupFixtureIds.has(
                    group.id
                )
            ) {
                continue
            }

            const groupTeamIds = memberships
                .filter(
                    (membership) =>
                        membership.group_id ===
                        group.id
                )
                .map(
                    (membership) =>
                        membership.team_id
                )
                .filter((teamId) =>
                    eligibleTeams.some(
                        (team) =>
                            team.id === teamId
                    )
                )

            if (groupTeamIds.length < 2) {
                continue
            }

            const pairings = limited
                ? generateLimitedSchedule(
                    groupTeamIds,
                    config.matchesPerTeam
                )
                : generateSingleRoundRobin(
                    groupTeamIds
                )

            rows.push(
                ...buildPreviewRows(
                    pairings,
                    {
                        groupId: group.id,
                        groupName: group.name,
                        stage: 'Group Stage',
                        startDate,
                    }
                )
            )
        }

        return rows
    }

    function generateLeaguePreview(
        doubleRoundRobin: boolean,
        startDate: Date
    ) {
        const pairings = doubleRoundRobin
            ? generateDoubleRoundRobin(
                eligibleTeams.map(
                    (team) => team.id
                )
            )
            : generateSingleRoundRobin(
                eligibleTeams.map(
                    (team) => team.id
                )
            )

        return buildPreviewRows(pairings, {
            groupId: null,
            groupName: 'League',
            stage: 'League',
            startDate,
        })
    }

    function generateCupPreview(
        startDate: Date
    ) {
        const draw =
            generateKnockoutFirstRound(
                eligibleTeams.map(
                    (team) => team.id
                ),
                config.randomiseCupDraw
            )

        setByeTeamNames(
            draw.byeTeamIds
                .map((teamId) =>
                    teamNameById.get(teamId)
                )
                .filter(
                    (
                        name
                    ): name is string =>
                        Boolean(name)
                )
        )

        return buildPreviewRows(
            draw.fixtures,
            {
                groupId: null,
                groupName: draw.roundName,
                stage: draw.roundName,
                startDate,
            }
        )
    }

    function generatePreview() {
        if (!festival) {
            showToast(
                'No active festival was found.',
                'error'
            )
            return
        }

        if (config.mode === 'manual') {
            showToast(
                'Use Admin → Fixtures to create and manage fixtures manually.',
                'info'
            )
            return
        }

        if (!config.startDateTime) {
            showToast(
                'Select the first fixture date and time.',
                'error'
            )
            return
        }

        if (config.daysBetweenRounds < 1) {
            showToast(
                'Days between rounds must be at least 1.',
                'error'
            )
            return
        }

        const startDate = new Date(
            config.startDateTime
        )

        if (
            Number.isNaN(startDate.getTime())
        ) {
            showToast(
                'Enter a valid fixture date and time.',
                'error'
            )
            return
        }

        try {
            let generated: GeneratedFixturePreview[] =
                []

            switch (config.mode) {
                case 'group_full':
                    generated =
                        generateGroupedPreview(
                            false,
                            startDate
                        )
                    break

                case 'group_limited':
                    generated =
                        generateGroupedPreview(
                            true,
                            startDate
                        )
                    break

                case 'league_single':
                    generated =
                        generateLeaguePreview(
                            false,
                            startDate
                        )
                    break

                case 'league_double':
                    generated =
                        generateLeaguePreview(
                            true,
                            startDate
                        )
                    break

                case 'knockout':
                    generated =
                        generateCupPreview(
                            startDate
                        )
                    break

                default:
                    generated = []
            }

            if (!generated.length) {
                showToast(
                    'No fixtures could be generated. Check the selected teams, groups and existing fixtures.',
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
                    : 'Unable to generate this schedule.',
                'error'
            )
        }
    }

    async function saveGeneratedFixtures() {
        if (!festival || !preview.length) {
            return
        }

        setIsSaving(true)

        try {
            await tournamentGeneratorService.createFixtures(
                festival.id,
                preview,
                config.publishImmediately
            )

            setShowSaveConfirmation(false)
            setPreview([])
            setByeTeamNames([])

            await loadData()

            showToast(
                'Generated fixtures saved successfully.',
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
            <p className="muted">
                Loading competition generator...
            </p>
        )
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>
                        Competition Generator
                    </h3>

                    <p className="muted">
                        Generate group, league or cup
                        fixtures using configurable
                        competition rules.
                    </p>

                    {festival && (
                        <span className="badge">
                            {festival.name}{' '}
                            {festival.year}
                        </span>
                    )}
                </div>
            </div>

            {!festival ? (
                <div className="teamsEmptyState">
                    <h3>
                        No active festival
                    </h3>

                    <p>
                        Activate a festival before
                        generating fixtures.
                    </p>
                </div>
            ) : (
                <>
                    <section className="tournamentGeneratorPanel">
                        <div className="adminFormGrid">
                            <label className="adminFormFullWidth">
                                <span>
                                    Competition format
                                </span>

                                <select
                                    value={
                                        config.mode
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'mode',
                                            event
                                                .target
                                                .value as CompetitionMode
                                        )
                                    }
                                >
                                    {Object.entries(
                                        modeLabels
                                    ).map(
                                        ([
                                             value,
                                             label,
                                         ]) => (
                                            <option
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    label
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                <span>
                                    First fixture date
                                    and time
                                </span>

                                <input
                                    type="datetime-local"
                                    value={
                                        config.startDateTime
                                    }
                                    disabled={
                                        config.mode ===
                                        'manual'
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'startDateTime',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    Days between rounds
                                </span>

                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        config.daysBetweenRounds
                                    }
                                    disabled={
                                        config.mode ===
                                        'manual'
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'daysBetweenRounds',
                                            Number(
                                                event
                                                    .target
                                                    .value
                                            )
                                        )
                                    }
                                />
                            </label>

                            {config.mode ===
                                'group_limited' && (
                                    <label>
                                    <span>
                                        Matches per team
                                    </span>

                                        <input
                                            type="number"
                                            min="1"
                                            value={
                                                config.matchesPerTeam
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'matchesPerTeam',
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                        />
                                    </label>
                                )}

                            <label>
                                <span>
                                    Venue assignment
                                </span>

                                <select
                                    value={
                                        config.venueAssignmentMode
                                    }
                                    disabled={
                                        config.mode ===
                                        'manual'
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'venueAssignmentMode',
                                            event
                                                .target
                                                .value as VenueAssignmentMode
                                        )
                                    }
                                >
                                    <option value="home_team">
                                        Use home team venue
                                    </option>

                                    <option value="selected_venue">
                                        Use one selected venue
                                    </option>

                                    <option value="unassigned">
                                        Leave venues unassigned
                                    </option>
                                </select>
                            </label>

                            {config.venueAssignmentMode ===
                                'selected_venue' && (
                                    <label>
                                    <span>
                                        Selected venue
                                    </span>

                                        <select
                                            value={
                                                config.venueId
                                            }
                                            disabled={
                                                config.mode ===
                                                'manual'
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'venueId',
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select venue
                                            </option>

                                            {venues.map(
                                                (item) => (
                                                    <option
                                                        key={
                                                            item.id
                                                        }
                                                        value={
                                                            item.id
                                                        }
                                                    >
                                                        {
                                                            item.name
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                )}

                            <label className="adminCheckboxLabel">
                                <input
                                    type="checkbox"
                                    checked={
                                        config.confirmedOnly
                                    }
                                    disabled={
                                        config.mode ===
                                        'manual'
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'confirmedOnly',
                                            event
                                                .target
                                                .checked
                                        )
                                    }
                                />

                                <span>
                                    Use confirmed teams
                                    only
                                </span>
                            </label>

                            {config.mode ===
                                'knockout' && (
                                    <label className="adminCheckboxLabel">
                                        <input
                                            type="checkbox"
                                            checked={
                                                config.randomiseCupDraw
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateConfig(
                                                    'randomiseCupDraw',
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                        />

                                        <span>
                                        Randomise cup
                                        draw
                                    </span>
                                    </label>
                                )}

                            <label className="adminCheckboxLabel">
                                <input
                                    type="checkbox"
                                    checked={
                                        config.publishImmediately
                                    }
                                    disabled={
                                        config.mode ===
                                        'manual'
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateConfig(
                                            'publishImmediately',
                                            event
                                                .target
                                                .checked
                                        )
                                    }
                                />

                                <span>
                                    Publish fixtures
                                    immediately
                                </span>
                            </label>
                        </div>

                        <div className="adminFormActions">
                            {config.mode ===
                            'manual' ? (
                                <p className="muted">
                                    Manual scheduling is
                                    available under Admin
                                    → Fixtures.
                                </p>
                            ) : (
                                <button
                                    className="btn primary"
                                    type="button"
                                    onClick={
                                        generatePreview
                                    }
                                >
                                    Generate Preview
                                </button>
                            )}

                            {preview.length >
                                0 && (
                                    <button
                                        className="btn secondary"
                                        type="button"
                                        onClick={() => {
                                            setPreview([])
                                            setByeTeamNames(
                                                []
                                            )
                                        }}
                                    >
                                        Clear Preview
                                    </button>
                                )}
                        </div>
                    </section>

                    {byeTeamNames.length >
                        0 && (
                            <div className="adminSuccessMessage">
                                <strong>
                                    Cup byes:
                                </strong>{' '}
                                {byeTeamNames.join(
                                    ', '
                                )}
                            </div>
                        )}

                    {preview.length > 0 && (
                        <section className="generatorPreviewSection">
                            <div className="adminWorkspaceHeader">
                                <div>
                                    <h4>
                                        Fixture Preview
                                    </h4>

                                    <p className="muted">
                                        Review all{' '}
                                        {
                                            preview.length
                                        }{' '}
                                        fixtures before
                                        saving.
                                    </p>
                                </div>

                                <button
                                    className="btn primary"
                                    type="button"
                                    onClick={() =>
                                        setShowSaveConfirmation(
                                            true
                                        )
                                    }
                                >
                                    Save Fixtures
                                </button>
                            </div>

                            <div className="tableWrap adminTableWrap">
                                <table className="adminTable">
                                    <thead>
                                    <tr>
                                        <th>
                                            Stage
                                        </th>
                                        <th>
                                            Group
                                        </th>
                                        <th>
                                            Round
                                        </th>
                                        <th>
                                            Fixture
                                        </th>
                                        <th>
                                            Date
                                        </th>
                                        <th>
                                            Venue
                                        </th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {preview.map(
                                        (
                                            fixture
                                        ) => (
                                            <tr
                                                key={
                                                    fixture.previewId
                                                }
                                            >
                                                <td>
                                                    {
                                                        fixture.stage
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        fixture.groupName
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        fixture.roundNumber
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            fixture.homeTeamName
                                                        }
                                                    </strong>{' '}
                                                    vs{' '}
                                                    <strong>
                                                        {
                                                            fixture.awayTeamName
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {formatKickoff(
                                                        fixture.kickoffTime
                                                    )}
                                                </td>

                                                <td>
                                                    {
                                                        fixture.venueName
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}

            {showSaveConfirmation && (
                <ConfirmDialog
                    title="Create Generated Fixtures"
                    message={`Create ${preview.length} fixtures? Existing fixtures will not be changed.`}
                    confirmText={
                        isSaving
                            ? 'Saving...'
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