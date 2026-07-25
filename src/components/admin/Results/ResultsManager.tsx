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

type ToastType =
    | 'success'
    | 'error'
    | 'info'

export function ResultsManager() {
    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

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

    const [isDeleting, setIsDeleting] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [
        editingResult,
        setEditingResult,
    ] = useState<Result | null>(null)

    const [
        resultToDelete,
        setResultToDelete,
    ] = useState<Result | null>(null)

    const [formValues, setFormValues] =
        useState<ResultFormValues>(emptyForm)

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

    function clearResultData() {
        setFixtures([])
        setTeams([])
        setResults([])
    }

    const loadData = useCallback(
        async (competitionId: string) => {
            setIsLoading(true)

            try {
                const [
                    fixtureRows,
                    teamRows,
                    resultRows,
                ] = await Promise.all([
                    resultService.getFixtures(
                        competitionId
                    ),
                    resultService.getTeams(
                        competitionId
                    ),
                    resultService.getResults(
                        competitionId
                    ),
                ])

                setFixtures(fixtureRows)
                setTeams(teamRows)
                setResults(resultRows)
            } catch (error) {
                clearResultData()

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
        []
    )

    useEffect(() => {
        closeModal()
        setResultToDelete(null)
        setToastMessage('')

        if (!currentCompetitionId) {
            clearResultData()
            setIsLoading(false)
            return
        }

        void loadData(currentCompetitionId)
    }, [currentCompetitionId, loadData])

    function openCreateModal() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before adding a result.',
                'error'
            )
            return
        }

        setEditingResult(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(result: Result) {
        if (
            !currentCompetitionId ||
            result.competition_id !==
            currentCompetitionId
        ) {
            showToast(
                'This result does not belong to the selected competition.',
                'error'
            )
            return
        }

        setEditingResult(result)

        setFormValues({
            fixture_id: result.fixture_id,
            home_score: String(
                result.home_score
            ),
            away_score: String(
                result.away_score
            ),
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

    function validateResult() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before saving a result.',
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

        const selectedFixture =
            fixtures.find(
                (fixture) =>
                    fixture.id ===
                    formValues.fixture_id
            )

        if (!selectedFixture) {
            showToast(
                'The selected fixture does not belong to this competition.',
                'error'
            )
            return false
        }

        if (
            formValues.home_score === '' ||
            formValues.away_score === ''
        ) {
            showToast(
                'Both scores are required.',
                'error'
            )
            return false
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
            return false
        }

        if (
            homeScore < 0 ||
            awayScore < 0
        ) {
            showToast(
                'Scores cannot be negative.',
                'error'
            )
            return false
        }

        const fixtureAlreadyHasResult =
            results.some(
                (result) =>
                    result.fixture_id ===
                    formValues.fixture_id &&
                    result.id !==
                    editingResult?.id
            )

        if (fixtureAlreadyHasResult) {
            showToast(
                'A result already exists for this fixture.',
                'error'
            )
            return false
        }

        return true
    }

    async function saveResult() {
        if (
            !validateResult() ||
            !currentCompetitionId
        ) {
            return
        }

        setIsSaving(true)

        const wasEditing =
            editingResult !== null

        try {
            if (editingResult) {
                await resultService.updateResult(
                    editingResult.id,
                    currentCompetitionId,
                    formValues
                )
            } else {
                await resultService.createResult(
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
        if (
            !resultToDelete ||
            !currentCompetitionId ||
            isDeleting
        ) {
            return
        }

        setIsDeleting(true)

        try {
            await resultService.deleteResult(
                resultToDelete.id,
                currentCompetitionId
            )

            setResultToDelete(null)

            await loadData(
                currentCompetitionId
            )

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

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Results</h3>

                    <p className="muted">
                        Record match scores,
                        player-of-the-match details
                        and match reports for the
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
                        !currentCompetitionId ||
                        !fixtures.length ||
                        isLoading
                    }
                >
                    + Add Result
                </button>
            </div>

            {!currentCompetitionId ? (
                <div className="teamsEmptyState">
                    <h3>
                        No competition selected
                    </h3>

                    <p>
                        Select a competition before
                        managing results.
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
                    onDelete={
                        setResultToDelete
                    }
                />
            )}

            {showModal &&
                currentCompetitionId && (
                    <ResultModal
                        mode={
                            editingResult
                                ? 'edit'
                                : 'create'
                        }
                        values={formValues}
                        fixtures={fixtures}
                        teams={teams}
                        existingFixtureIds={
                            results.map(
                                (result) =>
                                    result.fixture_id
                            )
                        }
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
                    confirmText={
                        isDeleting
                            ? 'Deleting...'
                            : 'Delete'
                    }
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