import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { GoalModal } from './GoalModal'
import { GoalsTable } from './GoalsTable'
import { goalService } from './goalService'
import type {
    Goal,
    GoalFixture,
    GoalFormValues,
    GoalTeam,
} from './goalTypes'

const emptyForm: GoalFormValues = {
    fixture_id: '',
    team_id: '',
    player_name: '',
    minute: '',
    video_timestamp: '',
}

type ToastType =
    | 'success'
    | 'error'
    | 'info'

export function GoalsManager() {
    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

    const [goals, setGoals] =
        useState<Goal[]>([])

    const [fixtures, setFixtures] =
        useState<GoalFixture[]>([])

    const [teams, setTeams] =
        useState<GoalTeam[]>([])

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [isDeleting, setIsDeleting] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [editingGoal, setEditingGoal] =
        useState<Goal | null>(null)

    const [goalToDelete, setGoalToDelete] =
        useState<Goal | null>(null)

    const [formValues, setFormValues] =
        useState<GoalFormValues>(emptyForm)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<ToastType>('success')

    function showToast(
        message: string,
        type: ToastType = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    function clearGoalData() {
        setGoals([])
        setFixtures([])
        setTeams([])
    }

    function closeModal() {
        setEditingGoal(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    const loadData = useCallback(
        async (competitionId: string) => {
            setIsLoading(true)

            try {
                const [
                    fixtureRows,
                    teamRows,
                    goalRows,
                ] = await Promise.all([
                    goalService.getFixtures(
                        competitionId
                    ),
                    goalService.getTeams(
                        competitionId
                    ),
                    goalService.getGoals(
                        competitionId
                    ),
                ])

                setFixtures(fixtureRows)
                setTeams(teamRows)
                setGoals(goalRows)
            } catch (error) {
                clearGoalData()

                showToast(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load goals.',
                    'error'
                )
            } finally {
                setIsLoading(false)
            }
        },
        []
    )

    useEffect(() => {
        closeModal()
        setGoalToDelete(null)
        setToastMessage('')

        if (!currentCompetitionId) {
            clearGoalData()
            setIsLoading(false)
            return
        }

        void loadData(currentCompetitionId)
    }, [currentCompetitionId, loadData])

    function openCreateModal() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before adding a goal.',
                'error'
            )
            return
        }

        setEditingGoal(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(
        goal: Goal
    ) {
        if (
            !currentCompetitionId ||
            goal.competition_id !==
            currentCompetitionId
        ) {
            showToast(
                'This goal does not belong to the selected competition.',
                'error'
            )
            return
        }

        setEditingGoal(goal)

        setFormValues({
            fixture_id:
                goal.fixture_id ?? '',
            team_id:
                goal.team_id ?? '',
            player_name:
            goal.player_name,
            minute:
                goal.minute !== null
                    ? String(goal.minute)
                    : '',
            video_timestamp:
                goal.video_timestamp ?? '',
        })

        setShowModal(true)
    }

    function validateGoal() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before saving a goal.',
                'error'
            )
            return false
        }

        if (!formValues.fixture_id) {
            showToast(
                'Please select a fixture.',
                'error'
            )
            return false
        }

        if (!formValues.team_id) {
            showToast(
                'Please select the scoring team.',
                'error'
            )
            return false
        }

        if (
            !formValues.player_name.trim()
        ) {
            showToast(
                'Player name is required.',
                'error'
            )
            return false
        }

        const fixture = fixtures.find(
            (item) =>
                item.id ===
                formValues.fixture_id
        )

        if (!fixture) {
            showToast(
                'The selected fixture does not belong to this competition.',
                'error'
            )
            return false
        }

        const selectedTeam = teams.find(
            (team) =>
                team.id ===
                formValues.team_id
        )

        if (!selectedTeam) {
            showToast(
                'The selected team does not belong to this competition.',
                'error'
            )
            return false
        }

        if (
            selectedTeam.competition_team_id !==
            fixture.home_competition_team_id &&
            selectedTeam.competition_team_id !==
            fixture.away_competition_team_id
        ) {
            showToast(
                'The selected team is not part of this fixture.',
                'error'
            )
            return false
        }

        if (formValues.minute) {
            const minute = Number(
                formValues.minute
            )

            if (
                !Number.isInteger(minute) ||
                minute < 1 ||
                minute > 130
            ) {
                showToast(
                    'Goal minute must be a whole number between 1 and 130.',
                    'error'
                )
                return false
            }
        }

        return true
    }

    async function saveGoal() {
        if (
            !validateGoal() ||
            !currentCompetitionId
        ) {
            return
        }

        setIsSaving(true)

        const wasEditing =
            editingGoal !== null

        try {
            if (editingGoal) {
                await goalService.updateGoal(
                    editingGoal.id,
                    currentCompetitionId,
                    formValues
                )
            } else {
                await goalService.createGoal(
                    currentCompetitionId,
                    formValues
                )
            }

            closeModal()

            await loadData(
                currentCompetitionId
            )

            showToast(
                wasEditing
                    ? 'Goal updated successfully.'
                    : 'Goal recorded successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save goal.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteGoal() {
        if (
            !goalToDelete ||
            !currentCompetitionId ||
            isDeleting
        ) {
            return
        }

        setIsDeleting(true)

        try {
            await goalService.deleteGoal(
                goalToDelete.id,
                currentCompetitionId
            )

            setGoalToDelete(null)

            await loadData(
                currentCompetitionId
            )

            showToast(
                'Goal deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete goal.',
                'error'
            )
        } finally {
            setIsDeleting(false)
        }
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

            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3>Goals</h3>

                    <p className="muted">
                        Record scorers, goal minutes
                        and video timestamps for the
                        selected competition.
                    </p>

                    {currentCompetition && (
                        <span className="badge">
                            {
                                currentCompetition.name
                            }
                        </span>
                    )}
                </div>

                <button
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={openCreateModal}
                    disabled={
                        !currentCompetitionId ||
                        !fixtures.length ||
                        isLoading
                    }
                >
                    + Add Goal
                </button>
            </div>

            {!currentCompetitionId ? (
                <div className="rounded-2xl border border-dashed border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-12 text-center text-[var(--organisation-text)] [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:text-slate-400">
                    <h3>
                        No competition selected
                    </h3>

                    <p>
                        Select a competition before
                        managing goals.
                    </p>
                </div>
            ) : isLoading ? (
                <p className="muted">
                    Loading goals...
                </p>
            ) : (
                <GoalsTable
                    goals={goals}
                    fixtures={fixtures}
                    teams={teams}
                    onEdit={openEditModal}
                    onDelete={
                        setGoalToDelete
                    }
                />
            )}

            {showModal &&
                currentCompetitionId && (
                    <GoalModal
                        mode={
                            editingGoal
                                ? 'edit'
                                : 'create'
                        }
                        values={formValues}
                        fixtures={fixtures}
                        teams={teams}
                        isSaving={isSaving}
                        onChange={setFormValues}
                        onClose={closeModal}
                        onSave={saveGoal}
                    />
                )}

            {goalToDelete && (
                <ConfirmDialog
                    title="Delete Goal"
                    message={`Are you sure you want to delete the goal recorded for ${goalToDelete.player_name}?`}
                    confirmText={
                        isDeleting
                            ? 'Deleting...'
                            : 'Delete'
                    }
                    cancelText="Cancel"
                    onCancel={() =>
                        setGoalToDelete(null)
                    }
                    onConfirm={deleteGoal}
                />
            )}
        </div>
    )
}