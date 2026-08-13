import React, {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    CalendarDays,
    Pencil,
    Plus,
    RefreshCw,
    Search,
} from 'lucide-react'

import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'
import { useOrganisation } from '../../../context/OrganisationContext'
import { clubFixtureService } from '../Fixtures/clubFixtureService'

import type {
    ClubSeason,
    ClubSeasonFormValues,
    ClubSeasonStatus,
} from '../Fixtures/clubFixtureTypes'

const emptyForm: ClubSeasonFormValues = {
    name: '',
    season_label: '',
    start_date: '',
    end_date: '',
    status: 'active',
}

function formatDate(value: string | null): string {
    if (!value) return 'Not set'

    return new Date(
        `${value}T00:00:00`
    ).toLocaleDateString()
}

const ClubSeasonsManager: React.FC = () => {
    const { currentOrganisation } =
        useOrganisation()

    const organisationId =
        currentOrganisation?.id ?? null

    const [seasons, setSeasons] =
        useState<ClubSeason[]>([])

    const [search, setSearch] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [showForm, setShowForm] =
        useState(false)

    const [
        editingSeason,
        setEditingSeason,
    ] = useState<ClubSeason | null>(null)

    const [
        seasonToArchive,
        setSeasonToArchive,
    ] = useState<ClubSeason | null>(null)

    const [form, setForm] =
        useState<ClubSeasonFormValues>(
            emptyForm
        )

    const [error, setError] =
        useState<string | null>(null)

    const loadSeasons = async () => {
        if (!organisationId) {
            setSeasons([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const data =
                await clubFixtureService.getSeasons(
                    organisationId
                )

            setSeasons(data)
        } catch (caughtError) {
            console.error(caughtError)

            setSeasons([])

            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to load club seasons.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setSearch('')
        setShowForm(false)
        setEditingSeason(null)
        setSeasonToArchive(null)
        setForm(emptyForm)

        void loadSeasons()
    }, [organisationId])

    const filteredSeasons =
        useMemo(() => {
            const term = search
                .trim()
                .toLowerCase()

            if (!term) return seasons

            return seasons.filter(
                season =>
                    season.name
                        .toLowerCase()
                        .includes(term) ||
                    season.season_label
                        .toLowerCase()
                        .includes(term) ||
                    season.status
                        .toLowerCase()
                        .includes(term)
            )
        }, [seasons, search])

    const openCreate = () => {
        setEditingSeason(null)
        setForm(emptyForm)
        setShowForm(true)
        setError(null)
    }

    const openEdit = (
        season: ClubSeason
    ) => {
        setEditingSeason(season)
        setForm({
            name: season.name,
            season_label:
                season.season_label,
            start_date:
                season.start_date ?? '',
            end_date:
                season.end_date ?? '',
            status: season.status,
        })
        setShowForm(true)
        setError(null)
    }

    const closeForm = () => {
        if (saving) return

        setShowForm(false)
        setEditingSeason(null)
        setForm(emptyForm)
    }

    const updateForm = <
        K extends keyof ClubSeasonFormValues
    >(
        key: K,
        value: ClubSeasonFormValues[K]
    ) => {
        setForm(previous => ({
            ...previous,
            [key]: value,
        }))
    }

    const saveSeason = async (
        event: React.FormEvent
    ) => {
        event.preventDefault()

        if (!organisationId) {
            setError(
                'Please select an organisation before creating a season.'
            )
            return
        }

        if (
            !form.name.trim() ||
            !form.season_label.trim()
        ) {
            setError(
                'Season name and season label are required.'
            )
            return
        }

        if (
            form.start_date &&
            form.end_date &&
            form.end_date < form.start_date
        ) {
            setError(
                'The season end date cannot be before the start date.'
            )
            return
        }

        try {
            setSaving(true)
            setError(null)

            if (editingSeason) {
                await clubFixtureService.updateSeason(
                    editingSeason.id,
                    form
                )
            } else {
                await clubFixtureService.createSeason(
                    organisationId,
                    form
                )
            }

            await loadSeasons()
            closeForm()
        } catch (caughtError) {
            console.error(caughtError)

            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to save the club season.'
            )
        } finally {
            setSaving(false)
        }
    }

    const archiveSeason = async () => {
        if (!seasonToArchive) return

        try {
            setSaving(true)
            setError(null)

            await clubFixtureService.updateSeason(
                seasonToArchive.id,
                {
                    name: seasonToArchive.name,
                    season_label:
                        seasonToArchive.season_label,
                    start_date:
                        seasonToArchive.start_date ??
                        '',
                    end_date:
                        seasonToArchive.end_date ??
                        '',
                    status: 'archived',
                }
            )

            setSeasonToArchive(null)
            await loadSeasons()
        } catch (caughtError) {
            console.error(caughtError)

            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to archive the season.'
            )
        } finally {
            setSaving(false)
        }
    }

    if (!organisationId) {
        return (
            <section className="rounded-3xl border border-[color:rgba(255,255,255,0.10)] bg-[#0b1510] px-6 py-14 text-center shadow-xl">
                <CalendarDays className="mx-auto h-8 w-8 text-[#8cf566]" />
                <h2 className="mt-4 text-xl font-black text-[#ffffff]">
                    Select an organisation
                </h2>
                <p className="mt-2 text-sm text-[color:#ffffff]/70">
                    Choose a club before managing its seasons.
                </p>
            </section>
        )
    }

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-5 rounded-3xl border border-[color:rgba(255,255,255,0.10)] bg-[#0b1510] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-[color:#8cf566]/10 p-3">
                        <CalendarDays className="h-7 w-7 text-[#8cf566]" />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8cf566]">
                            Club Fixture Programme
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-[#ffffff]">
                            Seasons
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[color:#ffffff]/70">
                            Manage playing seasons for{' '}
                            <strong className="font-semibold text-[#ffffff]">
                                {currentOrganisation?.name ??
                                    'the selected club'}
                            </strong>.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-5 py-3 text-sm font-bold text-[#061008] shadow-lg transition hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Add Season
                </button>
            </section>

            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                >
                    {error}
                </div>
            )}

            <section className="flex gap-3 rounded-2xl border border-[color:rgba(255,255,255,0.10)] bg-[#0b1510] p-4">
                <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4">
                    <Search className="h-4 w-4 text-[#8cf566]" />
                    <span className="sr-only">
                        Search seasons
                    </span>
                    <input
                        value={search}
                        onChange={event =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search seasons..."
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#ffffff] outline-none placeholder:text-[color:#ffffff]/45"
                    />
                </label>

                <button
                    type="button"
                    onClick={() =>
                        void loadSeasons()
                    }
                    disabled={loading}
                    aria-label="Refresh seasons"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 text-[#8cf566] disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${
                            loading
                                ? 'animate-spin'
                                : ''
                        }`}
                    />
                </button>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[color:rgba(255,255,255,0.10)] bg-[#0b1510] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                        <thead className="bg-[color:#8cf566]/5 text-xs font-bold uppercase tracking-[0.12em] text-[#8cf566]">
                            <tr>
                                <th className="px-5 py-4">
                                    Season
                                </th>
                                <th className="px-5 py-4">
                                    Label
                                </th>
                                <th className="px-5 py-4">
                                    Dates
                                </th>
                                <th className="px-5 py-4">
                                    Status
                                </th>
                                <th className="px-5 py-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/10">
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-12 text-center text-[color:#ffffff]/65"
                                    >
                                        Loading seasons...
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                filteredSeasons.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-14 text-center"
                                        >
                                            <CalendarDays className="mx-auto h-7 w-7 text-[#8cf566]" />
                                            <strong className="mt-4 block text-base text-[#ffffff]">
                                                {search
                                                    ? 'No matching seasons found.'
                                                    : 'No club seasons have been created.'}
                                            </strong>

                                            {!search && (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        openCreate
                                                    }
                                                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-[color:#8cf566]/10 px-4 py-2 text-sm font-bold text-[#8cf566]"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Create Season
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}

                            {!loading &&
                                filteredSeasons.map(
                                    season => (
                                        <tr
                                            key={
                                                season.id
                                            }
                                            className="transition hover:bg-white/[0.03]"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-[220px] items-center gap-3">
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:#8cf566]/10 text-[#8cf566]">
                                                        <CalendarDays className="h-4 w-4" />
                                                    </span>
                                                    <span className="font-bold text-[#ffffff]">
                                                        {
                                                            season.name
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-[color:#ffffff]/75">
                                                {
                                                    season.season_label
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-[color:#ffffff]/75">
                                                {formatDate(
                                                    season.start_date
                                                )}
                                                {' – '}
                                                {formatDate(
                                                    season.end_date
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold capitalize text-[color:#ffffff]/80">
                                                    {season.status}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                season
                                                            )
                                                        }
                                                        title="Edit season"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:rgba(255,255,255,0.10)] bg-black/20 text-[#8cf566]"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    {season.status !==
                                                        'archived' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSeasonToArchive(
                                                                    season
                                                                )
                                                            }
                                                            className="rounded-lg border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-3 py-2 text-xs font-bold text-[color:#ffffff]/70"
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                        </tbody>
                    </table>
                </div>
            </section>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <form
                        onSubmit={saveSeason}
                        className="w-full max-w-2xl rounded-3xl border border-[color:rgba(255,255,255,0.10)] bg-[#0b1510] p-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-black text-[#ffffff]">
                            {editingSeason
                                ? 'Edit Season'
                                : 'Create Season'}
                        </h3>

                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <label className="sm:col-span-2">
                                <span className="mb-2 block text-sm font-bold text-[#ffffff]">
                                    Season name
                                </span>
                                <input
                                    required
                                    value={form.name}
                                    onChange={event =>
                                        updateForm(
                                            'name',
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Petts Wood Vets 2026/27"
                                    className="w-full rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4 py-3 text-sm text-[#ffffff] outline-none"
                                />
                            </label>

                            <label>
                                <span className="mb-2 block text-sm font-bold text-[#ffffff]">
                                    Season label
                                </span>
                                <input
                                    required
                                    value={
                                        form.season_label
                                    }
                                    onChange={event =>
                                        updateForm(
                                            'season_label',
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="2026/27"
                                    className="w-full rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4 py-3 text-sm text-[#ffffff] outline-none"
                                />
                            </label>

                            <label>
                                <span className="mb-2 block text-sm font-bold text-[#ffffff]">
                                    Status
                                </span>
                                <select
                                    value={form.status}
                                    onChange={event =>
                                        updateForm(
                                            'status',
                                            event.target
                                                .value as ClubSeasonStatus
                                        )
                                    }
                                    className="w-full rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4 py-3 text-sm text-[#ffffff] outline-none"
                                >
                                    <option value="draft">
                                        Draft
                                    </option>
                                    <option value="active">
                                        Active
                                    </option>
                                    <option value="completed">
                                        Completed
                                    </option>
                                    <option value="archived">
                                        Archived
                                    </option>
                                </select>
                            </label>

                            <label>
                                <span className="mb-2 block text-sm font-bold text-[#ffffff]">
                                    Start date
                                </span>
                                <input
                                    type="date"
                                    value={
                                        form.start_date
                                    }
                                    onChange={event =>
                                        updateForm(
                                            'start_date',
                                            event.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4 py-3 text-sm text-[#ffffff] outline-none"
                                />
                            </label>

                            <label>
                                <span className="mb-2 block text-sm font-bold text-[#ffffff]">
                                    End date
                                </span>
                                <input
                                    type="date"
                                    min={
                                        form.start_date ||
                                        undefined
                                    }
                                    value={form.end_date}
                                    onChange={event =>
                                        updateForm(
                                            'end_date',
                                            event.target
                                                .value
                                        )
                                    }
                                    className="w-full rounded-xl border border-[color:rgba(255,255,255,0.10)] bg-black/20 px-4 py-3 text-sm text-[#ffffff] outline-none"
                                />
                            </label>
                        </div>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={closeForm}
                                className="rounded-xl border border-[color:rgba(255,255,255,0.10)] px-5 py-3 text-sm font-bold text-[#ffffff]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-xl bg-[#8cf566] px-5 py-3 text-sm font-bold text-[#061008] disabled:opacity-60"
                            >
                                {saving
                                    ? 'Saving...'
                                    : editingSeason
                                      ? 'Save Changes'
                                      : 'Create Season'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmDialog
                open={!!seasonToArchive}
                title="Archive Season"
                message={
                    seasonToArchive
                        ? `Archive "${seasonToArchive.name}"? Its fixtures and historical data will be retained.`
                        : ''
                }
                confirmLabel="Archive"
                cancelLabel="Cancel"
                isProcessing={saving}
                onConfirm={archiveSeason}
                onCancel={() => {
                    if (!saving) {
                        setSeasonToArchive(null)
                    }
                }}
            />
        </div>
    )
}

export default ClubSeasonsManager
