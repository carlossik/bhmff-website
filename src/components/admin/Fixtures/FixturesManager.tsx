import {
    useEffect,
    useState,
} from 'react'
import {
    CalendarDays,
    Plus,
    Trophy,
} from 'lucide-react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { officialService } from '../../../services/officialService'
import type {
    Official,
    OfficialAssignment,
    OfficialRole,
} from '../../../types/officialTypes'

import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { FixtureModal } from './FixtureModal'
import { FixturesTable } from './FixturesTable'
import { fixtureService } from './fixtureService'
import type {
    Fixture,
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

const emptyForm: FixtureFormValues = {
    stage: '',
    group_id: '',
    home_competition_team_id: '',
    away_competition_team_id: '',
    venue_id: '',
    kickoff_time: '',
    status: 'scheduled',
    referee_official_id: '',
    assistant_referee_1_official_id: '',
    assistant_referee_2_official_id: '',
    fourth_official_id: '',
}

type ToastType =
    | 'success'
    | 'error'
    | 'info'

type AssignmentSlot = {
    field:
        | 'referee_official_id'
        | 'assistant_referee_1_official_id'
        | 'assistant_referee_2_official_id'
        | 'fourth_official_id'
    role: OfficialRole
    label: string
}

const assignmentSlots: AssignmentSlot[] = [
    {
        field: 'referee_official_id',
        role: 'referee',
        label: 'Referee',
    },
    {
        field:
            'assistant_referee_1_official_id',
        role: 'assistant_referee',
        label: 'Assistant Referee 1',
    },
    {
        field:
            'assistant_referee_2_official_id',
        role: 'assistant_referee',
        label: 'Assistant Referee 2',
    },
    {
        field: 'fourth_official_id',
        role: 'fourth_official',
        label: 'Fourth Official',
    },
]

function toDateTimeLocal(
    value: string | null
) {
    if (!value) return ''

    const date = new Date(value)

    if (
        Number.isNaN(date.getTime())
    ) {
        return ''
    }

    const localDate = new Date(
        date.getTime() -
        date.getTimezoneOffset() *
        60_000
    )

    return localDate
        .toISOString()
        .slice(0, 16)
}

function getActiveAssignments(
    assignments: OfficialAssignment[]
) {
    return assignments.filter(
        (assignment) =>
            assignment.status !==
            'cancelled' &&
            assignment.status !==
            'declined'
    )
}

function getAssignmentSelections(
    assignments: OfficialAssignment[]
) {
    const activeAssignments =
        getActiveAssignments(assignments)

    const referee =
        activeAssignments.find(
            (assignment) =>
                assignment.role ===
                'referee'
        )

    const assistantReferees =
        activeAssignments.filter(
            (assignment) =>
                assignment.role ===
                'assistant_referee'
        )

    const fourthOfficial =
        activeAssignments.find(
            (assignment) =>
                assignment.role ===
                'fourth_official'
        )

    return {
        referee_official_id:
            referee?.official_id ?? '',
        assistant_referee_1_official_id:
            assistantReferees[0]
                ?.official_id ?? '',
        assistant_referee_2_official_id:
            assistantReferees[1]
                ?.official_id ?? '',
        fourth_official_id:
            fourthOfficial
                ?.official_id ?? '',
    }
}

export function FixturesManager() {
    const { currentOrganisation } =
        useOrganisation()

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

    const [fixtures, setFixtures] =
        useState<Fixture[]>([])

    const [teams, setTeams] =
        useState<FixtureTeam[]>([])

    const [venues, setVenues] =
        useState<FixtureVenue[]>([])

    const [officials, setOfficials] =
        useState<Official[]>([])

    const [
        assignments,
        setAssignments,
    ] = useState<
        OfficialAssignment[]
    >([])

    const [groups, setGroups] =
        useState<FixtureGroup[]>([])

    const [
        groupMemberships,
        setGroupMemberships,
    ] = useState<
        FixtureGroupMembership[]
    >([])

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [isDeleting, setIsDeleting] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [
        editingFixture,
        setEditingFixture,
    ] = useState<Fixture | null>(
        null
    )

    const [
        fixtureToDelete,
        setFixtureToDelete,
    ] = useState<Fixture | null>(
        null
    )

    const [
        formValues,
        setFormValues,
    ] = useState<FixtureFormValues>(
        emptyForm
    )

    const [
        toastMessage,
        setToastMessage,
    ] = useState('')

    const [
        toastType,
        setToastType,
    ] = useState<ToastType>(
        'success'
    )

    function showToast(
        message: string,
        type: ToastType = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    function clearFixtureData() {
        setFixtures([])
        setTeams([])
        setVenues([])
        setGroups([])
        setGroupMemberships([])
        setOfficials([])
        setAssignments([])
    }

    async function loadData(
        competitionId: string
    ) {
        setIsLoading(true)

        try {
            const [
                fixtureRows,
                teamRows,
                venueRows,
                groupRows,
                officialRows,
                assignmentRows,
            ] = await Promise.all([
                fixtureService.getFixtures(
                    competitionId
                ),
                fixtureService.getTeams(
                    competitionId
                ),
                fixtureService.getVenues(
                    competitionId
                ),
                fixtureService.getGroups(
                    competitionId
                ),
                officialService.getAll(
                    currentOrganisation.id
                ),
                officialService.getAssignments(
                    currentOrganisation.id
                ),
            ])

            const membershipRows =
                await fixtureService
                    .getGroupMemberships(
                        groupRows.map(
                            (group) =>
                                group.id
                        )
                    )

            setFixtures(fixtureRows)
            setTeams(teamRows)
            setVenues(venueRows)
            setGroups(groupRows)
            setGroupMemberships(
                membershipRows
            )

            setOfficials(
                officialRows.filter(
                    (official) =>
                        official.status ===
                        'active' &&
                        (
                            !currentCompetition
                                ?.sport_id ||
                            official.sport_id ===
                            currentCompetition
                                .sport_id
                        )
                )
            )

            setAssignments(
                assignmentRows.filter(
                    (assignment) =>
                        assignment.competition_id ===
                        competitionId ||
                        fixtureRows.some(
                            (fixture) =>
                                fixture.id ===
                                assignment.fixture_id
                        )
                )
            )
        } catch (error) {
            clearFixtureData()

            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load fixture data.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        closeModal()
        setFixtureToDelete(null)
        setToastMessage('')

        if (!currentCompetitionId) {
            clearFixtureData()
            setIsLoading(false)
            return
        }

        void loadData(
            currentCompetitionId
        )
    }, [
        currentCompetitionId,
        currentOrganisation.id,
    ])

    function openCreateModal() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before creating a fixture.',
                'error'
            )
            return
        }

        setEditingFixture(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    async function openEditModal(
        fixture: Fixture
    ) {
        try {
            setEditingFixture(fixture)

            const assignments =
                await officialService
                    .getAssignmentsForFixture(
                        fixture.id
                    )

            setFormValues({
                stage: fixture.stage,
                group_id:
                    fixture.group_id ?? '',
                home_competition_team_id:
                    fixture
                        .home_competition_team_id ??
                    '',
                away_competition_team_id:
                    fixture
                        .away_competition_team_id ??
                    '',
                venue_id:
                    fixture.venue_id ?? '',
                kickoff_time:
                    toDateTimeLocal(
                        fixture.kickoff_time
                    ),
                status: fixture.status,
                ...getAssignmentSelections(
                    assignments
                ),
            })

            setShowModal(true)
        } catch (error) {
            setEditingFixture(null)

            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load fixture officials.',
                'error'
            )
        }
    }

    function closeModal() {
        setEditingFixture(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    function validateFixture() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before saving a fixture.',
                'error'
            )
            return false
        }

        if (!formValues.stage.trim()) {
            showToast(
                'Fixture stage is required.',
                'error'
            )
            return false
        }

        if (
            formValues.stage ===
            'Group Stage' &&
            !formValues.group_id
        ) {
            showToast(
                'Select a group for this group-stage fixture.',
                'error'
            )
            return false
        }

        if (
            !formValues
                .home_competition_team_id ||
            !formValues
                .away_competition_team_id
        ) {
            showToast(
                'Both the home and away teams are required.',
                'error'
            )
            return false
        }

        if (
            formValues
                .home_competition_team_id ===
            formValues
                .away_competition_team_id
        ) {
            showToast(
                'A team cannot play against itself.',
                'error'
            )
            return false
        }

        if (!formValues.kickoff_time) {
            showToast(
                'Kick-off date and time are required.',
                'error'
            )
            return false
        }

        const kickoffDate =
            new Date(
                formValues.kickoff_time
            )

        if (
            Number.isNaN(
                kickoffDate.getTime()
            )
        ) {
            showToast(
                'Enter a valid kick-off date and time.',
                'error'
            )
            return false
        }

        if (
            !editingFixture &&
            kickoffDate.getTime() <
            Date.now()
        ) {
            showToast(
                'A new fixture must have a future kick-off date and time.',
                'error'
            )
            return false
        }

        if (
            formValues.stage ===
            'Group Stage'
        ) {
            const groupCompetitionTeamIds =
                groupMemberships
                    .filter(
                        (membership) =>
                            membership
                                .group_id ===
                            formValues
                                .group_id
                    )
                    .map(
                        (membership) =>
                            membership
                                .competition_team_id
                    )

            if (
                !groupCompetitionTeamIds.includes(
                    formValues
                        .home_competition_team_id
                ) ||
                !groupCompetitionTeamIds.includes(
                    formValues
                        .away_competition_team_id
                )
            ) {
                showToast(
                    'Both teams must belong to the selected group.',
                    'error'
                )
                return false
            }
        }

        const selectedOfficialIds = [
            formValues
                .referee_official_id,
            formValues
                .assistant_referee_1_official_id,
            formValues
                .assistant_referee_2_official_id,
            formValues
                .fourth_official_id,
        ].filter(Boolean)

        if (
            new Set(selectedOfficialIds)
                .size !==
            selectedOfficialIds.length
        ) {
            showToast(
                'The same official cannot be assigned to more than one role in the same fixture.',
                'error'
            )
            return false
        }

        return true
    }

    async function cancelAssignment(
        assignment: OfficialAssignment,
        reason: string
    ) {
        await officialService
            .updateAssignment(
                assignment.id,
                {
                    status: 'cancelled',
                    notes: [
                        assignment.notes,
                        reason,
                    ]
                        .filter(Boolean)
                        .join('\n'),
                }
            )
    }

    async function createAssignment(
        fixture: Fixture,
        officialId: string,
        role: OfficialRole,
        label: string
    ) {
        const official =
            officials.find(
                (item) =>
                    item.id === officialId
            )

        if (!official) {
            throw new Error(
                `${label} could not be found in the active officials directory.`
            )
        }

        await officialService
            .assignOfficial({
                organisation_id:
                currentOrganisation.id,
                official_id:
                officialId,
                competition_id:
                currentCompetitionId,
                fixture_id:
                fixture.id,
                venue_id:
                fixture.venue_id,
                sport_id:
                    currentCompetition
                        ?.sport_id ??
                    official.sport_id ??
                    null,
                role,
                source: 'manual',
                status: 'proposed',
                assignment_score: null,
                travel_distance_km: null,
                travel_duration_minutes:
                    null,
                assigned_fee: 0,
                assigned_expenses: 0,
                assigned_by: null,
                assigned_at: null,
                accepted_at: null,
                notes: `${label} assigned from the fixture administration screen.`,
            })
    }

    async function saveAssignments(
        fixture: Fixture
    ) {
        const existingAssignments =
            getActiveAssignments(
                await officialService
                    .getAssignmentsForFixture(
                        fixture.id
                    )
            )

        const assignmentsByRole =
            new Map<
                OfficialRole,
                OfficialAssignment[]
            >()

        for (
            const assignment of
            existingAssignments
            ) {
            const roleAssignments =
                assignmentsByRole.get(
                    assignment.role
                ) ?? []

            roleAssignments.push(
                assignment
            )

            assignmentsByRole.set(
                assignment.role,
                roleAssignments
            )
        }

        const roleIndexes =
            new Map<OfficialRole, number>()

        for (
            const slot of
            assignmentSlots
            ) {
            const roleIndex =
                roleIndexes.get(
                    slot.role
                ) ?? 0

            const currentAssignment =
                assignmentsByRole.get(
                    slot.role
                )?.[roleIndex]

            roleIndexes.set(
                slot.role,
                roleIndex + 1
            )

            const selectedOfficialId =
                formValues[slot.field]

            if (
                currentAssignment
                    ?.official_id ===
                selectedOfficialId
            ) {
                continue
            }

            if (currentAssignment) {
                await cancelAssignment(
                    currentAssignment,
                    selectedOfficialId
                        ? `${slot.label} replaced through fixture editing.`
                        : `${slot.label} removed through fixture editing.`
                )
            }

            if (selectedOfficialId) {
                await createAssignment(
                    fixture,
                    selectedOfficialId,
                    slot.role,
                    slot.label
                )
            }
        }
    }

    async function saveFixture() {
        if (
            !validateFixture() ||
            !currentCompetitionId
        ) {
            return
        }

        setIsSaving(true)

        const wasEditing =
            editingFixture !== null

        try {
            const savedFixture =
                editingFixture
                    ? await fixtureService
                        .updateFixture(
                            editingFixture.id,
                            formValues
                        )
                    : await fixtureService
                        .createFixture(
                            currentCompetitionId,
                            formValues
                        )

            await saveAssignments(
                savedFixture
            )

            closeModal()

            await loadData(
                currentCompetitionId
            )

            showToast(
                wasEditing
                    ? 'Fixture and official assignments updated successfully.'
                    : 'Fixture and official assignments created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save fixture and official assignments.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteFixture() {
        if (
            !fixtureToDelete ||
            !currentCompetitionId ||
            isDeleting
        ) {
            return
        }

        setIsDeleting(true)

        try {
            const assignments =
                await officialService
                    .getAssignmentsForFixture(
                        fixtureToDelete.id
                    )

            await Promise.all(
                getActiveAssignments(
                    assignments
                ).map(
                    (assignment) =>
                        cancelAssignment(
                            assignment,
                            'Fixture deleted.'
                        )
                )
            )

            await fixtureService
                .deleteFixture(
                    fixtureToDelete.id
                )

            setFixtureToDelete(null)

            await loadData(
                currentCompetitionId
            )

            showToast(
                'Fixture deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete fixture.',
                'error'
            )
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6 font-sans">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <section className="flex flex-col gap-5 rounded-3xl border border-lime-900/50 bg-[#10190f] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-lime-400/10 p-3">
                        <CalendarDays className="h-7 w-7 text-lime-400" />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                            Competition scheduling
                        </p>

                        <h3 className="mt-1 text-2xl font-bold tracking-tight text-white">
                            Fixtures
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            Create and manage group-stage and knockout fixtures for the selected competition.
                        </p>

                        {currentCompetition && (
                            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-lime-800/50 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300">
                                <Trophy className="h-3.5 w-3.5" />
                                {
                                    currentCompetition.name
                                }
                            </span>
                        )}
                    </div>
                </div>

                <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    type="button"
                    onClick={
                        openCreateModal
                    }
                    disabled={
                        !currentCompetitionId ||
                        teams.length < 2 ||
                        isLoading
                    }
                >
                    <Plus className="h-5 w-5" />
                    Add Fixture
                </button>
            </section>

            {!currentCompetitionId ? (
                <section className="rounded-3xl border border-dashed border-lime-900/60 bg-[#10190f] px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10">
                        <Trophy className="h-7 w-7 text-lime-400" />
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-white">
                        No competition selected
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                        Select a competition before managing its fixtures.
                    </p>
                </section>
            ) : isLoading ? (
                <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] px-6 py-12 text-center">
                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-lime-900 border-t-lime-400" />

                    <p className="mt-4 text-sm font-semibold text-slate-300">
                        Loading fixtures...
                    </p>
                </section>
            ) : (
                <FixturesTable
                    fixtures={fixtures}
                    teams={teams}
                    venues={venues}
                    groups={groups}
                    officials={officials}
                    assignments={assignments}
                    onEdit={(fixture) =>
                        void openEditModal(
                            fixture
                        )
                    }
                    onDelete={
                        setFixtureToDelete
                    }
                />
            )}

            {showModal &&
                currentCompetitionId && (
                    <FixtureModal
                        mode={
                            editingFixture
                                ? 'edit'
                                : 'create'
                        }
                        values={formValues}
                        teams={teams}
                        venues={venues}
                        groups={groups}
                        officials={officials}
                        groupMemberships={
                            groupMemberships
                        }
                        isSaving={
                            isSaving
                        }
                        onChange={
                            setFormValues
                        }
                        onClose={
                            closeModal
                        }
                        onSave={
                            saveFixture
                        }
                    />
                )}

            {fixtureToDelete && (
                <ConfirmDialog
                    title="Delete Fixture"
                    message={`Are you sure you want to delete this ${fixtureToDelete.stage} fixture?`}
                    confirmText={
                        isDeleting
                            ? 'Deleting...'
                            : 'Delete'
                    }
                    cancelText="Cancel"
                    onCancel={() =>
                        setFixtureToDelete(
                            null
                        )
                    }
                    onConfirm={
                        deleteFixture
                    }
                />
            )}
        </div>
    )
}