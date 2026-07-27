import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import { useCompetition } from '../../../contexts/CompetitionContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { tournamentGeneratorService } from './tournamentGeneratorService'
import type {
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
    venueAssignmentMode: 'selected_venue',
    venueId: '',
    publishImmediately: false,
    confirmedOnly: true,
    matchesPerTeam: 2,
    randomiseCupDraw: true,
}

type Pairing = {
    roundNumber: number
    homeCompetitionTeamId: string
    awayCompetitionTeamId: string
}

function createRoundRobinPairings(
    competitionTeamIds: string[]
): Pairing[] {
    if (competitionTeamIds.length < 2) {
        return []
    }

    const rotation: Array<string | null> = [
        ...competitionTeamIds,
    ]

    if (rotation.length % 2 !== 0) {
        rotation.push(null)
    }

    const rounds = rotation.length - 1
    const matchesPerRound = rotation.length / 2
    const pairings: Pairing[] = []

    for (
        let roundIndex = 0;
        roundIndex < rounds;
        roundIndex += 1
    ) {
        for (
            let matchIndex = 0;
            matchIndex < matchesPerRound;
            matchIndex += 1
        ) {
            const first = rotation[matchIndex]
            const second =
                rotation[
                rotation.length - 1 - matchIndex
                    ]

            if (!first || !second) {
                continue
            }

            const shouldSwap =
                roundIndex % 2 !== 0

            pairings.push({
                roundNumber: roundIndex + 1,
                homeCompetitionTeamId:
                    shouldSwap ? second : first,
                awayCompetitionTeamId:
                    shouldSwap ? first : second,
            })
        }

        const fixedTeam = rotation[0]
        const movingTeams = rotation.slice(1)
        const lastTeam =
            movingTeams.pop() ?? null

        rotation.splice(
            0,
            rotation.length,
            fixedTeam,
            lastTeam,
            ...movingTeams
        )
    }

    return pairings
}

function formatKickoff(value: string) {
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
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

    const [preview, setPreview] =
        useState<
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
            } catch (error) {
                setGroups([])
                setTeams([])
                setMemberships([])
                setVenues([])
                setExistingFixtures([])

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

    const availableCompetitionTeamIds =
        useMemo(
            () =>
                new Set(
                    teams
                        .filter((team) => {
                            if (
                                !config.confirmedOnly
                            ) {
                                return (
                                    team.participation_status !==
                                    'withdrawn'
                                )
                            }

                            return (
                                team.participation_status ===
                                'confirmed'
                            )
                        })
                        .map(
                            (team) => team.id
                        )
                ),
            [
                teams,
                config.confirmedOnly,
            ]
        )

    const groupSummaries = useMemo(
        () =>
            groups.map((group) => {
                const allocatedCompetitionTeamIds =
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

                const eligibleTeams =
                    teams.filter(
                        (team) =>
                            allocatedCompetitionTeamIds.includes(
                                team.id
                            ) &&
                            availableCompetitionTeamIds.has(
                                team.id
                            )
                    )

                return {
                    ...group,
                    teams: eligibleTeams,
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
            availableCompetitionTeamIds,
            groupIdsWithFixtures,
        ]
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

    function generatePreview() {
        if (!currentCompetition?.id) {
            showToast(
                'Select a competition before generating fixtures.',
                'error'
            )
            return
        }

        if (!config.startDateTime) {
            showToast(
                'Select the first kick-off date and time.',
                'error'
            )
            return
        }

        if (
            !Number.isFinite(
                intervalMinutes
            ) ||
            intervalMinutes < 15
        ) {
            showToast(
                'The fixture interval must be at least 15 minutes.',
                'error'
            )
            return
        }

        const startDate = new Date(
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

        const teamById = new Map(
            teams.map((team) => [
                team.id,
                team,
            ])
        )

        const venue =
            venues.find(
                (item) =>
                    item.id ===
                    config.venueId
            ) ?? null

        const generated:
            GeneratedFixturePreview[] = []

        const eligibleGroups =
            groupSummaries.filter(
                (group) =>
                    !group.hasExistingFixtures &&
                    group.teams.length >= 2
            )

        const pairingsByGroup =
            eligibleGroups.map(
                (group) => ({
                    group,
                    pairings:
                        createRoundRobinPairings(
                            group.teams.map(
                                (team) =>
                                    team.id
                            )
                        ),
                })
            )

        const highestRoundNumber =
            Math.max(
                0,
                ...pairingsByGroup.flatMap(
                    ({ pairings }) =>
                        pairings.map(
                            (pairing) =>
                                pairing.roundNumber
                        )
                )
            )

        let fixtureIndex = 0

        for (
            let roundNumber = 1;
            roundNumber <=
            highestRoundNumber;
            roundNumber += 1
        ) {
            for (const {
                group,
                pairings,
            } of pairingsByGroup) {
                const roundPairings =
                    pairings.filter(
                        (pairing) =>
                            pairing.roundNumber ===
                            roundNumber
                    )

                for (const pairing of roundPairings) {
                    const homeTeam =
                        teamById.get(
                            pairing.homeCompetitionTeamId
                        )

                    const awayTeam =
                        teamById.get(
                            pairing.awayCompetitionTeamId
                        )

                    if (
                        !homeTeam ||
                        !awayTeam
                    ) {
                        continue
                    }

                    const kickoff =
                        new Date(
                            startDate.getTime() +
                            fixtureIndex *
                            intervalMinutes *
                            60_000
                        )

                    generated.push({
                        previewId: `${group.id}-${pairing.roundNumber}-${pairing.homeCompetitionTeamId}-${pairing.awayCompetitionTeamId}`,
                        groupId:
                        group.id,
                        groupName:
                        group.name,
                        stage:
                            'Group Stage',
                        roundNumber:
                        pairing.roundNumber,
                        homeCompetitionTeamId:
                        homeTeam.id,
                        homeTeamName:
                        homeTeam.name,
                        awayCompetitionTeamId:
                        awayTeam.id,
                        awayTeamName:
                        awayTeam.name,
                        kickoffTime:
                            kickoff.toISOString(),
                        venueId:
                            venue?.id ??
                            null,
                        venueName:
                            venue?.name ??
                            'Venue TBC',
                    })

                    fixtureIndex += 1
                }
            }
        }

        if (!generated.length) {
            showToast(
                'No fixtures could be generated. Check team allocations, confirmation statuses and existing fixtures.',
                'error'
            )
            return
        }

        setPreview(generated)

        showToast(
            `${generated.length} fixtures generated for preview.`,
            'success'
        )
    }

    async function saveGeneratedFixtures() {
        if (
            !currentCompetition?.id ||
            !preview.length
        ) {
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
                'Tournament fixtures created successfully.',
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
                Loading tournament
                generator...
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
                        Tournament Generator
                    </h3>

                    <p className="muted">
                        Generate balanced
                        round-robin group fixtures
                        from the current team
                        allocations.
                    </p>

                    {currentCompetition && (
                        <span className="badge">
                            {
                                currentCompetition.name
                            }
                        </span>
                    )}
                </div>
            </div>

            {!currentCompetition ? (
                <div className="teamsEmptyState">
                    <h3>
                        No competition selected
                    </h3>

                    <p>
                        Select a competition before
                        generating fixtures.
                    </p>
                </div>
            ) : (
                <>

                    <section className="tournamentGeneratorPanel">
                        <div className="adminFormGrid">
                            <label>
                                <span>
                                    First kick-off
                                </span>

                                <input
                                    type="datetime-local"
                                    value={
                                        config.startDateTime
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
                                    Minutes between
                                    fixtures
                                </span>

                                <input
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
                                                event
                                                    .target
                                                    .value
                                            )
                                        )
                                        setPreview([])
                                    }}
                                />
                            </label>

                            <label>
                                <span>
                                    Default venue
                                </span>

                                <select
                                    value={
                                        config.venueId
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
                                        Venue TBC
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

                            <label className="adminCheckboxLabel">
                                <input
                                    type="checkbox"
                                    checked={
                                        config.confirmedOnly
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

                            <label className="adminCheckboxLabel">
                                <input
                                    type="checkbox"
                                    checked={
                                        config.publishImmediately
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
                            <button
                                className="btn primary"
                                type="button"
                                onClick={
                                    generatePreview
                                }
                            >
                                Generate Preview
                            </button>

                            {preview.length >
                                0 && (
                                    <button
                                        className="btn secondary"
                                        type="button"
                                        onClick={() =>
                                            setPreview(
                                                []
                                            )
                                        }
                                    >
                                        Clear Preview
                                    </button>
                                )}
                        </div>
                    </section>

                    <section className="generatorGroupReadiness">
                        <h4>
                            Group readiness
                        </h4>

                        <div className="generatorGroupGrid">
                            {groupSummaries.map(
                                (group) => (
                                    <article
                                        className="generatorGroupCard"
                                        key={
                                            group.id
                                        }
                                    >
                                        <div>
                                            <span className="badge">
                                                {
                                                    group
                                                        .teams
                                                        .length
                                                }{' '}
                                                eligible
                                                teams
                                            </span>

                                            <h5>
                                                {
                                                    group.name
                                                }
                                            </h5>
                                        </div>

                                        {group.hasExistingFixtures ? (
                                            <span className="generatorWarning">
                                                Fixtures
                                                already
                                                exist
                                            </span>
                                        ) : group
                                            .teams
                                            .length <
                                        2 ? (
                                            <span className="generatorWarning">
                                                At least
                                                2 teams
                                                required
                                            </span>
                                        ) : (
                                            <span className="generatorReady">
                                                Ready
                                            </span>
                                        )}
                                    </article>
                                )
                            )}
                        </div>
                    </section>

                    {preview.length >
                        0 && (
                            <section className="generatorPreviewSection">
                                <div className="adminWorkspaceHeader">
                                    <div>
                                        <h4>
                                            Fixture
                                            Preview
                                        </h4>

                                        <p className="muted">
                                            Review all{' '}
                                            {
                                                preview.length
                                            }{' '}
                                            fixtures
                                            before saving.
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
                                                Group
                                            </th>
                                            <th>
                                                Round
                                            </th>
                                            <th>
                                                Fixture
                                            </th>
                                            <th>
                                                Kick-off
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
                    message={`Create ${preview.length} group-stage fixtures? Existing fixtures will not be changed.`}
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