import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    CalendarDays,
    FileSpreadsheet,
    Plus,
    Trash2,
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
import { FixtureImportModal } from './FixtureImportModal'
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
import { clubFixtureService } from './clubFixtureService'
import type {
    ClubFixture,
    ClubFixtureFormValues,
    ClubFixtureTeamOption,
    ClubOpponent,
    ClubSeason,
} from './clubFixtureTypes'

const emptyForm: FixtureFormValues = {
    stage: '',
    group_id: '',
    home_competition_team_id: '',
    away_competition_team_id: '',
    venue_id: '',
    kickoff_time: '',
    status: 'scheduled',
    match_format: '11v11',
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

function CompetitionFixturesWorkspace() {
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

    const [
        showDeleteAllConfirm,
        setShowDeleteAllConfirm,
    ] = useState(false)

    const [
        isDeletingAll,
        setIsDeletingAll,
    ] = useState(false)

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
        showImportModal,
        setShowImportModal,
    ] = useState(false)

    const [
        isImporting,
        setIsImporting,
    ] = useState(false)

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
        setShowDeleteAllConfirm(false)
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
                match_format: fixture.match_format ?? '11v11',
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

    async function importFixtures(
        rows: FixtureFormValues[]
    ) {
        if (
            !currentCompetitionId ||
            rows.length === 0
        ) {
            return
        }

        setIsImporting(true)

        try {
            for (const row of rows) {
                await fixtureService
                    .createFixture(
                        currentCompetitionId,
                        row
                    )
            }

            setShowImportModal(false)

            await loadData(
                currentCompetitionId
            )

            showToast(
                `${rows.length} fixture${
                    rows.length === 1
                        ? ''
                        : 's'
                } imported successfully.`,
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to import fixtures.',
                'error'
            )
        } finally {
            setIsImporting(false)
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


    async function deleteAllFixtures() {
        if (
            !currentCompetitionId ||
            fixtures.length === 0 ||
            isDeletingAll
        ) {
            return
        }

        setIsDeletingAll(true)

        const fixtureIds = new Set(
            fixtures.map(
                (fixture) => fixture.id
            )
        )

        try {
            const activeFixtureAssignments =
                getActiveAssignments(
                    assignments
                ).filter(
                    (assignment) =>
                        Boolean(
                            assignment.fixture_id &&
                            fixtureIds.has(
                                assignment.fixture_id
                            )
                        )
                )

            await Promise.all(
                activeFixtureAssignments.map(
                    (assignment) =>
                        cancelAssignment(
                            assignment,
                            'All fixtures deleted from Fixture Administration.'
                        )
                )
            )

            for (const fixture of fixtures) {
                await fixtureService
                    .deleteFixture(
                        fixture.id
                    )
            }

            const deletedCount =
                fixtures.length

            setShowDeleteAllConfirm(
                false
            )

            await loadData(
                currentCompetitionId
            )

            showToast(
                `${deletedCount} fixture${
                    deletedCount === 1
                        ? ''
                        : 's'
                } deleted successfully.`,
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete all fixtures.',
                'error'
            )
        } finally {
            setIsDeletingAll(false)
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

                <div className="flex flex-wrap gap-3">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
                        type="button"
                        onClick={() =>
                            setShowDeleteAllConfirm(
                                true
                            )
                        }
                        disabled={
                            !currentCompetitionId ||
                            fixtures.length === 0 ||
                            isLoading ||
                            isDeleting ||
                            isDeletingAll
                        }
                        title={
                            fixtures.length === 0
                                ? 'There are no fixtures to delete.'
                                : `Delete all ${fixtures.length} fixtures from this competition.`
                        }
                    >
                        <Trash2 className="h-5 w-5" />
                        Delete All Fixtures
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white transition hover:border-[var(--organisation-accent)] hover:bg-[color:var(--organisation-accent)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        onClick={() =>
                            setShowImportModal(
                                true
                            )
                        }
                        disabled={
                            !currentCompetitionId ||
                            teams.length < 2 ||
                            isLoading
                        }
                    >
                        <FileSpreadsheet className="h-5 w-5" />
                        Import Fixtures
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-bold text-[var(--organisation-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
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
                </div>
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

            {showImportModal &&
                currentCompetitionId && (
                    <FixtureImportModal
                        teams={teams}
                        venues={venues}
                        groups={groups}
                        groupMemberships={
                            groupMemberships
                        }
                        isImporting={
                            isImporting
                        }
                        onClose={() =>
                            setShowImportModal(
                                false
                            )
                        }
                        onImport={
                            importFixtures
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

            {showDeleteAllConfirm &&
                currentCompetitionId && (
                    <ConfirmDialog
                        title="Delete All Fixtures"
                        message={`WARNING: You are about to permanently delete all ${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'} from ${currentCompetition?.name ?? 'the selected competition'}. This action cannot be undone. Only continue if you intend to clear the entire fixture schedule.`}
                        confirmText={
                            isDeletingAll
                                ? 'Deleting All...'
                                : `Delete All ${fixtures.length}`
                        }
                        cancelText="Keep Fixtures"
                        onCancel={() => {
                            if (!isDeletingAll) {
                                setShowDeleteAllConfirm(
                                    false
                                )
                            }
                        }}
                        onConfirm={
                            deleteAllFixtures
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

function getNextLocalDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 1)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function createEmptyClubFixtureForm(
    teamId: string
): ClubFixtureFormValues {
    return {
        team_id: teamId,
        slot_id: '',
        opponent_id: '',
        opponent_name: '',
        fixture_date: getNextLocalDate(),
        kickoff_time: '11:00',
        home_away: 'home',
        fixture_type: 'friendly',
        match_format: '11v11',
        venue_name: '',
        venue_address: '',
        status: 'confirmed',
        opponent_contact_name: '',
        opponent_contact_phone: '',
        opponent_contact_email: '',
        referee_name: '',
        notes: '',
        published: true,
        cancellation_reason: '',
        replaced_fixture_id: '',
    }
}

function ClubFixturesWorkspace() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? null

    const [seasons, setSeasons] = useState<ClubSeason[]>([])
    const [seasonId, setSeasonId] = useState('')
    const [teams, setTeams] = useState<ClubFixtureTeamOption[]>([])
    const [teamId, setTeamId] = useState('')
    const [fixtures, setFixtures] = useState<ClubFixture[]>([])
    const [opponents, setOpponents] = useState<ClubOpponent[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editingFixture, setEditingFixture] =
        useState<ClubFixture | null>(null)
    const [fixtureToDelete, setFixtureToDelete] =
        useState<ClubFixture | null>(null)
    const [formValues, setFormValues] =
        useState<ClubFixtureFormValues>(
            createEmptyClubFixtureForm('')
        )
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] =
        useState<ToastType>('success')

    const selectedTeam = useMemo(
        () => teams.find(team => team.id === teamId) ?? null,
        [teamId, teams]
    )

    const opponentNames = useMemo(
        () =>
            new Map(
                opponents.map(opponent => [
                    opponent.id,
                    opponent.name,
                ])
            ),
        [opponents]
    )

    function showToast(
        message: string,
        type: ToastType = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    const loadSeasons = useCallback(async () => {
        if (!organisationId) {
            setSeasons([])
            setSeasonId('')
            setLoading(false)
            return
        }

        try {
            const rows = await clubFixtureService.getSeasons(
                organisationId
            )
            setSeasons(rows)
            setSeasonId(previous => {
                if (rows.some(season => season.id === previous)) {
                    return previous
                }

                return (
                    rows.find(season => season.status === 'active')?.id ??
                    rows[0]?.id ??
                    ''
                )
            })
        } catch (error) {
            setSeasons([])
            setSeasonId('')
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load club seasons.',
                'error'
            )
        }
    }, [organisationId])

    const loadSeasonContext = useCallback(async () => {
        if (!organisationId || !seasonId) {
            setTeams([])
            setTeamId('')
            setOpponents([])
            setFixtures([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const [teamRows, opponentRows] = await Promise.all([
                clubFixtureService.getTeamOptions(
                    organisationId,
                    seasonId
                ),
                clubFixtureService.getOpponents(organisationId),
            ])

            setTeams(teamRows)
            setOpponents(opponentRows)
            setTeamId(previous => {
                if (teamRows.some(team => team.id === previous)) {
                    return previous
                }

                return teamRows[0]?.id ?? ''
            })
        } catch (error) {
            setTeams([])
            setTeamId('')
            setOpponents([])
            setFixtures([])
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load the club fixture workspace.',
                'error'
            )
        } finally {
            setLoading(false)
        }
    }, [organisationId, seasonId])

    const loadFixtures = useCallback(async () => {
        if (!seasonId || !teamId) {
            setFixtures([])
            return
        }

        try {
            setLoading(true)
            const rows = await clubFixtureService.getFixtures(
                seasonId,
                teamId
            )
            setFixtures(rows)
        } catch (error) {
            setFixtures([])
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load club fixtures.',
                'error'
            )
        } finally {
            setLoading(false)
        }
    }, [seasonId, teamId])

    useEffect(() => {
        setShowModal(false)
        setEditingFixture(null)
        setFixtureToDelete(null)
        setToastMessage('')
        void loadSeasons()
    }, [loadSeasons])

    useEffect(() => {
        void loadSeasonContext()
    }, [loadSeasonContext])

    useEffect(() => {
        void loadFixtures()
    }, [loadFixtures])

    function openCreateModal() {
        if (!teamId) {
            showToast(
                'Select a team before creating a fixture.',
                'error'
            )
            return
        }

        setEditingFixture(null)
        setFormValues(createEmptyClubFixtureForm(teamId))
        setShowModal(true)
    }

    function openEditModal(fixture: ClubFixture) {
        setEditingFixture(fixture)
        setFormValues({
            team_id: fixture.team_id ?? teamId,
            slot_id: fixture.slot_id ?? '',
            opponent_id: fixture.opponent_id ?? '',
            opponent_name: fixture.opponent_id
                ? opponentNames.get(fixture.opponent_id) ?? ''
                : '',
            fixture_date: fixture.fixture_date,
            kickoff_time: fixture.kickoff_time?.slice(0, 5) ?? '',
            home_away: fixture.home_away,
            fixture_type: fixture.fixture_type,
            match_format: fixture.match_format ?? '11v11',
            venue_name: fixture.venue_name ?? '',
            venue_address: fixture.venue_address ?? '',
            status: fixture.status,
            opponent_contact_name:
                fixture.opponent_contact_name ?? '',
            opponent_contact_phone:
                fixture.opponent_contact_phone ?? '',
            opponent_contact_email:
                fixture.opponent_contact_email ?? '',
            referee_name: fixture.referee_name ?? '',
            notes: fixture.notes ?? '',
            published: fixture.published,
            cancellation_reason:
                fixture.cancellation_reason ?? '',
            replaced_fixture_id:
                fixture.replaced_fixture_id ?? '',
        })
        setShowModal(true)
    }

    function closeModal() {
        if (saving) return
        setShowModal(false)
        setEditingFixture(null)
        setFormValues(createEmptyClubFixtureForm(teamId))
    }

    function validateFixture(): boolean {
        if (!organisationId || !seasonId || !teamId) {
            showToast(
                'Select an active season and team before saving a fixture.',
                'error'
            )
            return false
        }

        if (!formValues.opponent_name.trim()) {
            showToast('Opponent name is required.', 'error')
            return false
        }

        if (!formValues.fixture_date) {
            showToast('Fixture date is required.', 'error')
            return false
        }

        return true
    }

    async function saveFixture() {
        if (
            !validateFixture() ||
            !organisationId ||
            !seasonId ||
            !teamId
        ) {
            return
        }

        setSaving(true)

        try {
            const opponent =
                await clubFixtureService.findOrCreateOpponent(
                    organisationId,
                    formValues.opponent_name
                )

            const values: ClubFixtureFormValues = {
                ...formValues,
                team_id: teamId,
                opponent_id: opponent.id,
                opponent_name: opponent.name,
            }

            if (editingFixture) {
                await clubFixtureService.updateFixture(
                    editingFixture.id,
                    values
                )
            } else {
                await clubFixtureService.createFixture(
                    organisationId,
                    seasonId,
                    values
                )
            }

            const refreshedOpponents =
                await clubFixtureService.getOpponents(
                    organisationId
                )
            setOpponents(refreshedOpponents)

            closeModal()
            await loadFixtures()
            showToast(
                editingFixture
                    ? 'Fixture updated successfully.'
                    : 'Fixture created successfully. It is now available to Match Centre and fixture RSVP.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save the club fixture.',
                'error'
            )
        } finally {
            setSaving(false)
        }
    }

    async function deleteFixture() {
        if (!fixtureToDelete) return

        try {
            setSaving(true)
            await clubFixtureService.deleteFixture(
                fixtureToDelete.id
            )
            setFixtureToDelete(null)
            await loadFixtures()
            showToast('Fixture deleted successfully.', 'success')
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete the fixture.',
                'error'
            )
        } finally {
            setSaving(false)
        }
    }

    if (!organisationId) {
        return (
            <section className="rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-[var(--organisation-accent)]" />
                <h3 className="mt-4 text-xl font-black text-[var(--organisation-text)]">
                    Select a club
                </h3>
            </section>
        )
    }

    return (
        <div className="space-y-6 font-sans">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage('')}
            />

            <section className="rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            Club Match Operations
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-[var(--organisation-text)]">
                            Fixtures
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm text-[color:var(--organisation-text)]/60">
                            Create fixtures using the same TournamentHQ fixture workflow. Club fixtures feed Match Centre, RSVP, results and the public site.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
                        <label className="text-sm font-semibold text-[var(--organisation-text)]">
                            Season
                            <select
                                className="mt-2 w-full rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-[var(--organisation-text)]"
                                value={seasonId}
                                onChange={event =>
                                    setSeasonId(event.target.value)
                                }
                            >
                                <option value="">Select season</option>
                                {seasons.map(season => (
                                    <option key={season.id} value={season.id}>
                                        {season.season_label || season.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-sm font-semibold text-[var(--organisation-text)]">
                            Team
                            <select
                                className="mt-2 w-full rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-3 text-[var(--organisation-text)]"
                                value={teamId}
                                onChange={event =>
                                    setTeamId(event.target.value)
                                }
                                disabled={!seasonId || teams.length === 0}
                            >
                                <option value="">Select team</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={!seasonId || !teamId || loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-bold text-[var(--organisation-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus className="h-5 w-5" />
                        Add Fixture
                    </button>
                </div>
            </section>

            {!seasonId ? (
                <section className="rounded-3xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[color:var(--organisation-text)]/60">
                    Select a season to manage fixtures.
                </section>
            ) : !teamId ? (
                <section className="rounded-3xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[color:var(--organisation-text)]/60">
                    No team is linked to this season yet. Add/link a team before creating fixtures.
                </section>
            ) : loading ? (
                <section className="rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[color:var(--organisation-text)]/60">
                    Loading fixtures...
                </section>
            ) : fixtures.length === 0 ? (
                <section className="rounded-3xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-[var(--organisation-accent)]" />
                    <h3 className="mt-4 text-lg font-black text-[var(--organisation-text)]">
                        No fixtures yet
                    </h3>
                    <p className="mt-2 text-sm text-[color:var(--organisation-text)]/60">
                        Add the first fixture for {selectedTeam?.name ?? 'this team'}.
                    </p>
                </section>
            ) : (
                <section className="overflow-hidden rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="border-b border-[var(--organisation-border)] bg-black/20 text-left text-xs uppercase tracking-[0.12em] text-[color:var(--organisation-text)]/55">
                                <tr>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4">Fixture</th>
                                    <th className="px-5 py-4">Venue</th>
                                    <th className="px-5 py-4">Type</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--organisation-border)]">
                                {fixtures.map(fixture => {
                                    const opponent = fixture.opponent_id
                                        ? opponentNames.get(fixture.opponent_id) ?? 'Opponent'
                                        : 'Opponent'
                                    const title = fixture.home_away === 'away'
                                        ? `${opponent} vs ${selectedTeam?.name ?? currentOrganisation.name}`
                                        : `${selectedTeam?.name ?? currentOrganisation.name} vs ${opponent}`

                                    return (
                                        <tr key={fixture.id}>
                                            <td className="px-5 py-4 text-sm font-semibold text-[var(--organisation-text)]">
                                                {fixture.fixture_date}
                                                {fixture.kickoff_time && (
                                                    <span className="ml-2 text-[color:var(--organisation-text)]/55">
                                                        {fixture.kickoff_time.slice(0, 5)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-[var(--organisation-text)]">
                                                {title}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-[color:var(--organisation-text)]/70">
                                                {fixture.venue_name ?? 'TBC'}
                                            </td>
                                            <td className="px-5 py-4 text-sm capitalize text-[color:var(--organisation-text)]/70">
                                                {fixture.fixture_type}
                                            </td>
                                            <td className="px-5 py-4 text-sm capitalize text-[color:var(--organisation-text)]/70">
                                                {fixture.status}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(fixture)}
                                                        className="rounded-lg border border-[var(--organisation-border)] px-3 py-2 text-xs font-bold text-[var(--organisation-text)] hover:bg-white/5"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFixtureToDelete(fixture)}
                                                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {showModal && selectedTeam && (
                <FixtureModal
                    context="club"
                    mode={editingFixture ? 'edit' : 'create'}
                    values={formValues}
                    clubName={currentOrganisation.name}
                    teamName={selectedTeam.name}
                    isSaving={saving}
                    onChange={setFormValues}
                    onClose={closeModal}
                    onSave={saveFixture}
                />
            )}

            {fixtureToDelete && (
                <ConfirmDialog
                    title="Delete Fixture"
                    message="Are you sure you want to delete this club fixture? Match Centre and RSVP records linked to it may also be affected."
                    confirmText={saving ? 'Deleting...' : 'Delete'}
                    cancelText="Cancel"
                    onCancel={() => {
                        if (!saving) setFixtureToDelete(null)
                    }}
                    onConfirm={deleteFixture}
                />
            )}
        </div>
    )
}

export function FixturesManager() {
    const { currentOrganisation } = useOrganisation()

    if (currentOrganisation?.organisation_type === 'club') {
        return <ClubFixturesWorkspace />
    }

    return <CompetitionFixturesWorkspace />
}
