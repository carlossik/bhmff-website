import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { ResultModal } from './ResultModal'
import { ResultsTable } from './ResultsTable'
import { resultService } from './resultService'
import type {
    Result,
    ResultFixture,
    ResultFormValues,
    ResultTeam,
} from './resultTypes'

const emptyForm: ResultFormValues = {
    fixture_id: '',
    home_score: '',
    away_score: '',
    player_of_match: '',
    match_report: '',
    published: false,
}

export function ResultsManager() {
    const { currentCompetition } = useCompetition()

    const [fixtures, setFixtures] =
        useState<ResultFixture[]>([])

    const [teams, setTeams] =
        useState<ResultTeam[]>([])

    const [results, setResults] =
        useState<Result[]>([])

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [editingResult, setEditingResult] =
        useState<Result | null>(null)

    const [resultToDelete, setResultToDelete] =
        useState<Result | null>(null)

    const [formValues, setFormValues] =
        useState<ResultFormValues>(emptyForm)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<'success' | 'error' | 'info'>('success')

    function showToast(
        message: string,
        type: 'success' | 'error' | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    const loadData = useCallback(
        async () => {
            if (!currentCompetition?.id) {
                setFixtures([])
                setTeams([])
                setResults([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            try {
                const [fixtureRows, teamRows] =
                    await Promise.all([
                        resultService.getFixtures(
                            currentCompetition.id
                        ),
                        resultService.getTeams(
                            currentCompetition.id
                        ),
                    ])

                const resultRows =
                    await resultService.getResults(
                        fixtureRows.map(
                            (fixture) => fixture.id
                        )
                    )

                setFixtures(fixtureRows)
                setTeams(teamRows)
                setResults(resultRows)
            } catch (error) {
                setFixtures([])
                setTeams([])
                setResults([])

                showToast(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load results.',
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
        setEditingResult(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(result: Result) {
        setEditingResult(result)

        setFormValues({
            fixture_id: result.fixture_id,
            home_score: String(result.home_score),
            away_score: String(result.away_score),
            player_of_match:
                result.player_of_match ?? '',
            match_report:
                result.match_report ?? '',
            published: result.published,
        })

        setShowModal(true)
    }

    function closeModal() {
        setEditingResult(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    async function saveResult() {
        if (!formValues.fixture_id) {
            showToast(
                'Please select a fixture.',
                'error'
            )
            return
        }

        if (
            formValues.home_score === '' ||
            formValues.away_score === ''
        ) {
            showToast(
                'Both scores are required.',
                'error'
            )
            return
        }

        const homeScore = Number(
            formValues.home_score
        )

        const awayScore = Number(
            formValues.away_score
        )

        if (
            !Number.isInteger(homeScore) ||
            !Number.isInteger(awayScore)
        ) {
            showToast(
                'Scores must be whole numbers.',
                'error'
            )
            return
        }

        if (
            homeScore < 0 ||
            awayScore < 0
        ) {
            showToast(
                'Scores cannot be negative.',
                'error'
            )
            return
        }

        const fixtureAlreadyHasResult =
            results.some(
                (result) =>
                    result.fixture_id ===
                    formValues.fixture_id &&
                    result.id !== editingResult?.id
            )

        if (fixtureAlreadyHasResult) {
            showToast(
                'A result already exists for this fixture.',
                'error'
            )
            return
        }

        setIsSaving(true)

        const wasEditing = Boolean(editingResult)

        try {
            if (editingResult) {
                await resultService.updateResult(
                    editingResult.id,
                    formValues
                )
            } else {
                await resultService.createResult(
                    formValues
                )
            }

            closeModal()
            await loadData()

            showToast(
                wasEditing
                    ? 'Result updated successfully.'
                    : 'Result created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save result.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteResult() {
        if (!resultToDelete) return

        try {
            await resultService.deleteResult(
                resultToDelete.id
            )

            setResultToDelete(null)
            await loadData()

            showToast(
                'Result deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete result.',
                'error'
            )
        }
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage('')}
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Results</h3>

                    <p className="muted">
                        Record match scores, player-of-the-match
                        details and match reports for the selected
                        competition.
                    </p>

                    {currentCompetition && (
                        <span className="badge">
                            {currentCompetition.name}
                        </span>
                    )}
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                    disabled={
                        !currentCompetition ||
                        !fixtures.length ||
                        isLoading
                    }
                >
                    + Add Result
                </button>
            </div>

            {!currentCompetition ? (
                <div className="teamsEmptyState">
                    <h3>No competition selected</h3>

                    <p>
                        Select a competition before managing results.
                    </p>
                </div>
            ) : isLoading ? (
                <p className="muted">
                    Loading results...
                </p>
            ) : (
                <ResultsTable
                    results={results}
                    fixtures={fixtures}
                    teams={teams}
                    onEdit={openEditModal}
                    onDelete={setResultToDelete}
                />
            )}

            {showModal && (
                <ResultModal
                    mode={
                        editingResult
                            ? 'edit'
                            : 'create'
                    }
                    values={formValues}
                    fixtures={fixtures}
                    teams={teams}
                    existingFixtureIds={results.map(
                        (result) => result.fixture_id
                    )}
                    isSaving={isSaving}
                    onChange={setFormValues}
                    onClose={closeModal}
                    onSave={saveResult}
                />
            )}

            {resultToDelete && (
                <ConfirmDialog
                    title="Delete Result"
                    message="Are you sure you want to delete this result?"
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setResultToDelete(null)
                    }
                    onConfirm={deleteResult}
                />
            )}
        </div>
    )
}