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
                        .includes(term) ||
                    (
                        competition.sport?.name ??
                        ''
                    )
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
            <section className="rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-14 text-center shadow-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--organisation-accent)]/10">
                    <Trophy className="h-7 w-7 text-[var(--organisation-accent)]" />
                </div>
                <h2 className="mt-5 text-xl font-black tracking-tight text-[var(--organisation-text)]">
                    Select an organisation
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--organisation-text)]/70">
                    Choose an organisation before managing its competitions.
                </p>
            </section>
        )
    }

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-5 rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="shrink-0 rounded-2xl bg-[color:var(--organisation-accent)]/10 p-3">
                        <Trophy className="h-7 w-7 text-[var(--organisation-accent)]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            Competition Management
                        </p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--organisation-text)]">
                            Competitions
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--organisation-text)]/70">
                            Manage tournaments for{' '}
                            <strong className="font-semibold text-[var(--organisation-text)]">
                                {currentOrganisation?.name ?? 'the selected organisation'}
                            </strong>.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-bold text-[var(--organisation-on-accent)] shadow-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--organisation-accent)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleAdd}
                >
                    <Plus className="h-4 w-4" />
                    New Competition
                </button>
            </section>

            {error && (
                <div
                    className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-4 sm:flex-row sm:items-center">
                <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-[color:var(--organisation-border)] bg-black/20 px-4">
                    <Search className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                    <span className="sr-only">Search competitions</span>
                    <input
                        type="text"
                        placeholder="Search competitions..."
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--organisation-text)] outline-none placeholder:text-[color:var(--organisation-text)]/45"
                    />
                </label>

                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-black/20 text-[var(--organisation-accent)] transition hover:bg-[color:var(--organisation-accent)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={loadCompetitions}
                    disabled={loading}
                    aria-label="Refresh competitions"
                    title="Refresh competitions"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                        <thead className="bg-[color:var(--organisation-accent)]/5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--organisation-accent)]">
                        <tr>
                            <th className="px-5 py-4">Name</th>
                            <th className="px-5 py-4">Sport</th>
                            <th className="px-5 py-4">Season</th>
                            <th className="px-5 py-4">Format</th>
                            <th className="px-5 py-4">Dates</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Published</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                        {loading && (
                            <tr>
                                <td colSpan={8} className="px-5 py-12 text-center text-[color:var(--organisation-text)]/65">
                                    Loading competitions...
                                </td>
                            </tr>
                        )}

                        {!loading && filteredCompetitions.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-14 text-center">
                                    <div className="mx-auto flex max-w-lg flex-col items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--organisation-accent)]/10">
                                            <Trophy className="h-6 w-6 text-[var(--organisation-accent)]" />
                                        </div>
                                        <strong className="mt-4 text-base text-[var(--organisation-text)]">
                                            {search ? 'No matching competitions found.' : 'No competitions have been created.'}
                                        </strong>
                                        {!search && (
                                            <button
                                                type="button"
                                                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-4 py-2 text-sm font-bold text-[var(--organisation-accent)] transition hover:bg-[color:var(--organisation-accent)]/15"
                                                onClick={handleAdd}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Create Competition
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && filteredCompetitions.map(competition => {
                            const isSelected = currentCompetition?.id === competition.id

                            return (
                                <tr
                                    key={competition.id}
                                    className={isSelected ? 'bg-[color:var(--organisation-accent)]/[0.07]' : 'transition hover:bg-white/[0.03]'}
                                >
                                    <td className="px-5 py-4 align-middle">
                                        <button
                                            type="button"
                                            className="flex min-w-[220px] items-center gap-3 text-left"
                                            onClick={() => handleSelectCompetition(competition)}
                                            title="Select competition"
                                        >
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--organisation-accent)]/10 text-[var(--organisation-accent)]">
                                                    <Trophy className="h-4 w-4" />
                                                </span>
                                            <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-bold text-[var(--organisation-text)]">
                                                        {competition.name}
                                                    </span>
                                                    <code className="mt-0.5 block truncate text-xs text-[color:var(--organisation-text)]/50">
                                                        {competition.slug}
                                                    </code>
                                                </span>
                                            {isSelected && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--organisation-accent)]">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Selected
                                                    </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                            <span className="inline-flex items-center rounded-full border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--organisation-accent)]">
                                                {competition.sport?.name ?? 'Not set'}
                                            </span>
                                    </td>
                                    <td className="px-5 py-4 text-[color:var(--organisation-text)]/75">
                                        {competition.season ?? '—'}
                                    </td>
                                    <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[color:var(--organisation-text)]/80">
                                                {formatLabels[competition.format]}
                                            </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex min-w-[190px] items-center gap-2 text-[color:var(--organisation-text)]/70">
                                            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                                            <span>
                                                    {competition.start_date
                                                        ? new Date(`${competition.start_date}T00:00:00`).toLocaleDateString()
                                                        : 'No start date'}
                                                {' – '}
                                                {competition.end_date
                                                    ? new Date(`${competition.end_date}T00:00:00`).toLocaleDateString()
                                                    : 'No end date'}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold capitalize text-[color:var(--organisation-text)]/80">
                                                {competition.status.toLowerCase().replace(/_/g, ' ')}
                                            </span>
                                    </td>
                                    <td className="px-5 py-4">
                                            <span className={competition.published
                                                ? 'inline-flex rounded-full border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--organisation-accent)]'
                                                : 'inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-[color:var(--organisation-text)]/55'}
                                            >
                                                {competition.published ? 'Published' : 'Unpublished'}
                                            </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--organisation-border)] bg-black/20 text-[var(--organisation-accent)] transition hover:bg-[color:var(--organisation-accent)]/10"
                                                onClick={() => handleEdit(competition)}
                                                aria-label={`Edit ${competition.name}`}
                                                title="Edit competition"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/10 text-red-300 transition hover:bg-red-500/15"
                                                onClick={() => setCompetitionToDelete(competition)}
                                                aria-label={`Delete ${competition.name}`}
                                                title="Delete competition"
                                            >
                                                <Trash2 className="h-4 w-4" />
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

            {showForm && (
                <CompetitionForm
                    competition={editingCompetition ?? undefined}
                    saving={saving}
                    onSave={handleSave}
                    onCancel={handleCloseForm}
                />
            )}

            <ConfirmDialog
                open={!!competitionToDelete}
                title="Delete Competition"
                message={competitionToDelete
                    ? `Are you sure you want to delete "${competitionToDelete.name}"? This may also affect records associated with this competition.`
                    : ''}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isProcessing={deleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!deleting) {
                        setCompetitionToDelete(null)
                    }
                }}
            />
        </div>
    )
}

export default CompetitionManager