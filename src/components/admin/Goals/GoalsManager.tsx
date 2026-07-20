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

export function GoalsManager() {
    const { currentCompetition } =
        useCompetition()

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
        useState<
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
                setGoals([])
                setFixtures([])
                setTeams([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            try {
                const [
                    fixtureRows,
                    teamRows,
                ] = await Promise.all([
                    goalService.getFixtures(
                        currentCompetition.id
                    ),
                    goalService.getTeams(
                        currentCompetition.id
                    ),
                ])

                const goalRows =
                    await goalService.getGoals(
                        fixtureRows.map(
                            (fixture) =>
                                fixture.id
                        )
                    )

                setFixtures(fixtureRows)
                setTeams(teamRows)
                setGoals(goalRows)
            } catch (error) {
                setGoals([])
                setFixtures([])
                setTeams([])

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
        [currentCompetition?.id]
    )

    useEffect(() => {
        void loadData()
    }, [loadData])

    function openCreateModal() {
        setEditingGoal(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(
        goal: Goal
    ) {
        setEditingGoal(goal)

        setFormValues({
            fixture_id:
                goal.fixture_id ?? '',
            team_id: goal.team_id ?? '',
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

    function closeModal() {
        setEditingGoal(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    async function saveGoal() {
        if (!formValues.fixture_id) {
            showToast(
                'Please select a fixture.',
                'error'
            )
            return
        }

        if (!formValues.team_id) {
            showToast(
                'Please select the scoring team.',
                'error'
            )
            return
        }

        if (
            !formValues.player_name.trim()
        ) {
            showToast(
                'Player name is required.',
                'error'
            )
            return
        }

        if (
            formValues.minute &&
            (Number(formValues.minute) < 1 ||
                Number(formValues.minute) >
                130)
        ) {
            showToast(
                'Goal minute must be between 1 and 130.',
                'error'
            )
            return
        }

        const fixture = fixtures.find(
            (item) =>
                item.id ===
                formValues.fixture_id
        )

        const selectedTeam = teams.find(
            (team) =>
                team.id ===
                formValues.team_id
        )

        if (
            fixture &&
            selectedTeam &&
            selectedTeam.competition_team_id !==
            fixture.home_competition_team_id &&
            selectedTeam.competition_team_id !==
            fixture.away_competition_team_id
        ) {
            showToast(
                'The selected team is not part of this fixture.',
                'error'
            )
            return
        }

        setIsSaving(true)

        const wasEditing =
            Boolean(editingGoal)

        try {
            if (editingGoal) {
                await goalService.updateGoal(
                    editingGoal.id,
                    formValues
                )
            } else {
                await goalService.createGoal(
                    formValues
                )
            }

            closeModal()
            await loadData()

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
        if (!goalToDelete) return

        try {
            await goalService.deleteGoal(
                goalToDelete.id
            )

            setGoalToDelete(null)
            await loadData()

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

            <div className="adminWorkspaceHeader">
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
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                    disabled={
                        !currentCompetition ||
                        !fixtures.length
                    }
                >
                    + Add Goal
                </button>
            </div>

            {!currentCompetition ? (
                <div className="teamsEmptyState">
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

            {showModal && (
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
                    confirmText="Delete"
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