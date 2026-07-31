import React, {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    CalendarDays,
    CheckCircle2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Trophy,
} from 'lucide-react'

import './Competitions.css'

import {
    CompetitionForm,
    type CompetitionFormData,
} from './CompetitionForm'

import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'

import { competitionService } from '../../../services/competitionService'

import type {
    Competition,
    CreateCompetitionInput,
    UpdateCompetitionInput,
} from '../../../types/competitionTypes'

const formatLabels: Record<
    Competition['format'],
    string
> = {
    LEAGUE: 'League',
    ROUND_ROBIN: 'Round Robin',
    GROUP_AND_KNOCKOUT:
        'Group and Knockout',
    KNOCKOUT: 'Knockout',
    SINGLE_MATCH: 'Single Match',
    FRIENDLY: 'Friendly',
    CUSTOM: 'Custom',
}

const CompetitionManager: React.FC = () => {
    const {
        currentOrganisation,
    } = useOrganisation()

    const currentOrganisationId =
        currentOrganisation?.id ?? null

    const {
        currentCompetition,
        setCurrentCompetition,
    } = useCompetition()

    const [
        competitions,
        setCompetitions,
    ] = useState<Competition[]>([])

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [deleting, setDeleting] =
        useState(false)

    const [search, setSearch] =
        useState('')

    const [showForm, setShowForm] =
        useState(false)

    const [
        editingCompetition,
        setEditingCompetition,
    ] = useState<Competition | null>(null)

    const [
        competitionToDelete,
        setCompetitionToDelete,
    ] = useState<Competition | null>(null)

    const [error, setError] =
        useState<string | null>(null)

    const loadCompetitions = async () => {
        if (!currentOrganisationId) {
            setCompetitions([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const data =
                await competitionService.getAll(
                    currentOrganisationId
                )

            setCompetitions(data)

            if (
                currentCompetition &&
                currentCompetition.organisation_id ===
                currentOrganisationId
            ) {
                const refreshedSelection =
                    data.find(
                        competition =>
                            competition.id ===
                            currentCompetition.id
                    )

                if (refreshedSelection) {
                    setCurrentCompetition(
                        refreshedSelection
                    )
                } else {
                    setCurrentCompetition(
                        data[0] ?? null
                    )
                }
            } else {
                setCurrentCompetition(
                    data[0] ?? null
                )
            }
        } catch (caughtError) {
            console.error(caughtError)

            setCompetitions([])

            setCurrentCompetition(null)

            setError(
                'Unable to load competitions. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setSearch('')
        setShowForm(false)
        setEditingCompetition(null)
        setCompetitionToDelete(null)

        loadCompetitions()
    }, [currentOrganisationId])

    const filteredCompetitions =
        useMemo(() => {
            const term = search
                .trim()
                .toLowerCase()

            if (!term) {
                return competitions
            }

            return competitions.filter(
                competition =>
                    competition.name
                        .toLowerCase()
                        .includes(term) ||
                    competition.slug
                        .toLowerCase()
                        .includes(term) ||
                    (
                        competition.season ??
                        ''
                    )
                        .toLowerCase()
                        .includes(term) ||
                    formatLabels[
                        competition.format
                        ]
                        .toLowerCase()
                        .includes(term) ||
                    competition.status
                        .toLowerCase()
                        .includes(term)
            )
        }, [competitions, search])

    const handleAdd = () => {
        setEditingCompetition(null)
        setShowForm(true)
        setError(null)
    }

    const handleEdit = (
        competition: Competition
    ) => {
        setEditingCompetition(competition)
        setShowForm(true)
        setError(null)
    }

    const handleCloseForm = () => {
        if (saving) {
            return
        }

        setShowForm(false)
        setEditingCompetition(null)
    }

    const handleSave = async (
        values: CompetitionFormData
    ) => {
        if (!currentOrganisationId) {
            setError(
                'Please select an organisation before creating a competition.'
            )
            return
        }

        try {
            setSaving(true)
            setError(null)

            let savedCompetition: Competition

            if (editingCompetition) {
                const updates: UpdateCompetitionInput = {
                    sport_id: values.sport_id,

                    name: values.name,
                    slug: values.slug,
                    season: values.season,
                    format: values.format,
                    description: values.description,
                    start_date: values.start_date,
                    end_date: values.end_date,
                    status: values.status,
                    published: values.published,
                }

                savedCompetition =
                    await competitionService.update(
                        editingCompetition.id,
                        updates
                    )
            } else {
                const input: CreateCompetitionInput = {
                    organisation_id: currentOrganisationId,

                    sport_id: values.sport_id,

                    name: values.name,
                    slug: values.slug,
                    season: values.season,
                    format: values.format,
                    description: values.description,
                    start_date: values.start_date,
                    end_date: values.end_date,
                    status: values.status,
                    published: values.published,
                }
                savedCompetition =
                    await competitionService.create(
                        input
                    )
            }

            const refreshedCompetitions =
                await competitionService.getAll(
                    currentOrganisationId
                )

            setCompetitions(
                refreshedCompetitions
            )

            const refreshedSavedCompetition =
                refreshedCompetitions.find(
                    competition =>
                        competition.id ===
                        savedCompetition.id
                ) ?? savedCompetition

            setCurrentCompetition(
                refreshedSavedCompetition
            )

            setShowForm(false)
            setEditingCompetition(null)
        } catch (caughtError) {
            console.error(caughtError)

            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to save the competition.'

            setError(message)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (
            !competitionToDelete ||
            !currentOrganisationId
        ) {
            return
        }

        try {
            setDeleting(true)
            setError(null)

            await competitionService.delete(
                competitionToDelete.id
            )

            const remainingCompetitions =
                competitions.filter(
                    competition =>
                        competition.id !==
                        competitionToDelete.id
                )

            setCompetitions(
                remainingCompetitions
            )

            if (
                currentCompetition?.id ===
                competitionToDelete.id
            ) {
                setCurrentCompetition(
                    remainingCompetitions[0] ??
                    null
                )
            }

            setCompetitionToDelete(null)
        } catch (caughtError) {
            console.error(caughtError)

            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to delete the competition.'

            setError(message)
        } finally {
            setDeleting(false)
        }
    }

    const handleSelectCompetition = (
        competition: Competition
    ) => {
        setCurrentCompetition(competition)
    }

    if (!currentOrganisationId) {
        return (
            <div className="competition-manager">
                <div className="competition-empty-state">
                    <Trophy size={42} />

                    <h2>
                        Select an organisation
                    </h2>

                    <p>
                        Choose an organisation before
                        managing its competitions.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="competition-manager">
            <div className="competition-header">
                <div>
                    <h2>
                        <Trophy size={22} />
                        Competitions
                    </h2>

                    <p>
                        Manage tournaments for{' '}
                        <strong>
                            {currentOrganisation?.name ??
                                'the selected organisation'}
                        </strong>
                        .
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={handleAdd}
                >
                    <Plus size={18} />
                    New Competition
                </button>
            </div>

            {error && (
                <div
                    className="competition-error-banner"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="competition-toolbar">
                <div className="competition-search">
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search competitions..."
                        value={search}
                        onChange={event =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />
                </div>

                <button
                    type="button"
                    className="icon-button"
                    onClick={loadCompetitions}
                    disabled={loading}
                    aria-label="Refresh competitions"
                    title="Refresh competitions"
                >
                    <RefreshCw
                        size={18}
                        className={
                            loading
                                ? 'competition-spin'
                                : ''
                        }
                    />
                </button>
            </div>

            <div className="competition-table-container">
                <table className="competition-table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Season</th>
                        <th>Format</th>
                        <th>Dates</th>
                        <th>Status</th>
                        <th>Published</th>
                        <th></th>
                    </tr>
                    </thead>

                    <tbody>
                    {loading && (
                        <tr>
                            <td
                                colSpan={7}
                                className="loading-cell"
                            >
                                Loading competitions...
                            </td>
                        </tr>
                    )}

                    {!loading &&
                        filteredCompetitions.length ===
                        0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="competition-empty-cell"
                                >
                                    <div className="competition-table-empty">
                                        <Trophy
                                            size={34}
                                        />

                                        <strong>
                                            {search
                                                ? 'No matching competitions found.'
                                                : 'No competitions have been created.'}
                                        </strong>

                                        {!search && (
                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={
                                                    handleAdd
                                                }
                                            >
                                                <Plus
                                                    size={
                                                        17
                                                    }
                                                />
                                                Create Competition
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}

                    {!loading &&
                        filteredCompetitions.map(
                            competition => {
                                const isSelected =
                                    currentCompetition?.id ===
                                    competition.id

                                return (
                                    <tr
                                        key={
                                            competition.id
                                        }
                                        className={
                                            isSelected
                                                ? 'competition-row-selected'
                                                : ''
                                        }
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="competition-name-button"
                                                onClick={() =>
                                                    handleSelectCompetition(
                                                        competition
                                                    )
                                                }
                                                title="Select competition"
                                            >
                                                    <span className="competition-icon">
                                                        <Trophy
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    </span>

                                                <span className="competition-name-details">
                                                        <strong>
                                                            {
                                                                competition.name
                                                            }
                                                        </strong>

                                                        <code>
                                                            {
                                                                competition.slug
                                                            }
                                                        </code>
                                                    </span>

                                                {isSelected && (
                                                    <span className="competition-selected-label">
                                                            <CheckCircle2
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Selected
                                                        </span>
                                                )}
                                            </button>
                                        </td>

                                        <td>
                                            {competition.season ??
                                                '—'}
                                        </td>

                                        <td>
                                                <span className="competition-format-badge">
                                                    {
                                                        formatLabels[
                                                            competition
                                                                .format
                                                            ]
                                                    }
                                                </span>
                                        </td>

                                        <td>
                                            <div className="competition-date-range">
                                                <CalendarDays
                                                    size={
                                                        16
                                                    }
                                                />

                                                <span>
                                                        {competition.start_date
                                                            ? new Date(
                                                                `${competition.start_date}T00:00:00`
                                                            ).toLocaleDateString()
                                                            : 'No start date'}

                                                    {' – '}

                                                    {competition.end_date
                                                        ? new Date(
                                                            `${competition.end_date}T00:00:00`
                                                        ).toLocaleDateString()
                                                        : 'No end date'}
                                                    </span>
                                            </div>
                                        </td>

                                        <td>
                                                <span
                                                    className={`competition-status-badge ${competition.status.toLowerCase()}`}
                                                >
                                                    {
                                                        competition.status
                                                    }
                                                </span>
                                        </td>

                                        <td>
                                                <span
                                                    className={`competition-published-badge ${
                                                        competition.published
                                                            ? 'published'
                                                            : 'unpublished'
                                                    }`}
                                                >
                                                    {competition.published
                                                        ? 'Published'
                                                        : 'Unpublished'}
                                                </span>
                                        </td>

                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    type="button"
                                                    className="icon-button"
                                                    onClick={() =>
                                                        handleEdit(
                                                            competition
                                                        )
                                                    }
                                                    aria-label={`Edit ${competition.name}`}
                                                    title="Edit competition"
                                                >
                                                    <Pencil
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="icon-button danger"
                                                    onClick={() =>
                                                        setCompetitionToDelete(
                                                            competition
                                                        )
                                                    }
                                                    aria-label={`Delete ${competition.name}`}
                                                    title="Delete competition"
                                                >
                                                    <Trash2
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <CompetitionForm
                    competition={
                        editingCompetition ??
                        undefined
                    }
                    saving={saving}
                    onSave={handleSave}
                    onCancel={handleCloseForm}
                />
            )}

            <ConfirmDialog
                open={!!competitionToDelete}
                title="Delete Competition"
                message={
                    competitionToDelete
                        ? `Are you sure you want to delete "${competitionToDelete.name}"? This may also affect records associated with this competition.`
                        : ''
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isProcessing={deleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!deleting) {
                        setCompetitionToDelete(
                            null
                        )
                    }
                }}
            />
        </div>
    )
}

export default CompetitionManager