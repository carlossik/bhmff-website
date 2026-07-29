import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    Building2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react'

import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'
import { OrganisationForm } from './OrganisationForm'

import type {
    Organisation,
    OrganisationFormData,
} from './organisationTypes'

import {
    createOrganisation,
    deleteOrganisation,
    getOrganisations,
    updateOrganisation,
} from './organisationService'

const CURRENT_ORGANISATION_KEY =
    'tournamenthq-current-organisation'

function getErrorMessage(error: unknown) {
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        const message =
            error.message.trim()

        const lowerMessage =
            message.toLowerCase()

        if (
            lowerMessage.includes('duplicate') ||
            lowerMessage.includes('already exists') ||
            lowerMessage.includes(
                'organisations_slug_key'
            )
        ) {
            return 'An organisation with this slug already exists. Please choose a different slug.'
        }

        if (
            lowerMessage.includes(
                'final organisation cannot be deleted'
            )
        ) {
            return 'The final organisation cannot be deleted. Create another organisation before deleting this one.'
        }

        return message
    }

    return 'The operation could not be completed.'
}

const OrganisationManager = () => {
    const [organisations, setOrganisations] =
        useState<Organisation[]>([])

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [deleting, setDeleting] =
        useState(false)

    const [switching, setSwitching] =
        useState(false)

    const [search, setSearch] =
        useState('')

    const [showForm, setShowForm] =
        useState(false)

    const [
        editingOrganisation,
        setEditingOrganisation,
    ] = useState<Organisation | null>(
        null
    )

    const [
        organisationToDelete,
        setOrganisationToDelete,
    ] = useState<Organisation | null>(
        null
    )

    const [
        createdOrganisation,
        setCreatedOrganisation,
    ] = useState<Organisation | null>(
        null
    )

    const [message, setMessage] =
        useState<string | null>(null)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    async function loadOrganisations(
        options: {
            preserveMessages?: boolean
        } = {}
    ) {
        try {
            setLoading(true)

            if (
                !options.preserveMessages
            ) {
                setErrorMessage(null)
            }

            const data =
                await getOrganisations()

            setOrganisations(data)
            return true
        } catch (error) {
            console.error(
                'Failed to load organisations:',
                error
            )

            setErrorMessage(
                getErrorMessage(error)
            )

            return false
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadOrganisations()
    }, [])

    const filteredOrganisations =
        useMemo(() => {
            const term =
                search.trim().toLowerCase()

            if (!term) {
                return organisations
            }

            return organisations.filter(
                (organisation) =>
                    organisation.name
                        .toLowerCase()
                        .includes(term) ||
                    organisation.slug
                        .toLowerCase()
                        .includes(term)
            )
        }, [
            organisations,
            search,
        ])

    function openCreateForm() {
        setEditingOrganisation(null)
        setCreatedOrganisation(null)
        setShowForm(true)
        setMessage(null)
        setErrorMessage(null)
    }

    function openEditForm(
        organisation: Organisation
    ) {
        setEditingOrganisation(
            organisation
        )
        setCreatedOrganisation(null)
        setShowForm(true)
        setMessage(null)
        setErrorMessage(null)
    }

    function closeForm() {
        if (saving) {
            return
        }

        setShowForm(false)
        setEditingOrganisation(null)
    }

    async function handleSave(
        values: OrganisationFormData,
        provisionalId?: string
    ) {
        setSaving(true)
        setMessage(null)
        setErrorMessage(null)

        if (editingOrganisation) {
            try {
                await updateOrganisation(
                    editingOrganisation.id,
                    values
                )
            } catch (error) {
                const resolvedMessage =
                    getErrorMessage(error)

                setErrorMessage(
                    resolvedMessage
                )

                throw new Error(
                    resolvedMessage
                )
            } finally {
                setSaving(false)
            }

            setShowForm(false)
            setEditingOrganisation(null)
            setMessage(
                'Organisation updated successfully.'
            )

            await loadOrganisations({
                preserveMessages: true,
            })

            return
        }

        let created: Organisation

        try {
            created =
                await createOrganisation(
                    values,
                    provisionalId
                )
        } catch (error) {
            const resolvedMessage =
                getErrorMessage(error)

            setErrorMessage(
                resolvedMessage
            )
            setSaving(false)

            throw new Error(
                resolvedMessage
            )
        }

        setSaving(false)
        setShowForm(false)
        setEditingOrganisation(null)
        setCreatedOrganisation(created)
        setMessage(
            `"${created.name}" was created successfully.`
        )

        const listRefreshed =
            await loadOrganisations({
                preserveMessages: true,
            })

        if (!listRefreshed) {
            setErrorMessage(
                'The organisation was created, but the organisation list could not be refreshed automatically. Use the refresh button to reload the list.'
            )
        }
    }

    function handleSwitchToCreated() {
        if (!createdOrganisation) {
            return
        }

        setSwitching(true)
        setErrorMessage(null)

        try {
            window.localStorage.setItem(
                CURRENT_ORGANISATION_KEY,
                createdOrganisation.id
            )

            window.location.reload()
        } catch (error) {
            console.error(
                'Failed to switch organisation:',
                error
            )

            setSwitching(false)
            setErrorMessage(
                'The organisation was created, but TournamentHQ could not switch to it automatically. Refresh the page and select it from the organisation menu.'
            )
        }
    }

    async function confirmDelete() {
        if (!organisationToDelete) {
            return
        }

        const deletedName =
            organisationToDelete.name

        try {
            setDeleting(true)
            setMessage(null)
            setErrorMessage(null)

            await deleteOrganisation(
                organisationToDelete.id
            )

            setOrganisationToDelete(null)
            setMessage(
                `"${deletedName}" was deleted successfully.`
            )

            const listRefreshed =
                await loadOrganisations({
                    preserveMessages: true,
                })

            if (!listRefreshed) {
                setErrorMessage(
                    'The organisation was deleted, but the organisation list could not be refreshed automatically.'
                )
            }
        } catch (error) {
            console.error(
                'Failed to delete organisation:',
                error
            )

            setErrorMessage(
                getErrorMessage(error)
            )
        } finally {
            setDeleting(false)
        }
    }

    if (showForm) {
        return (
            <OrganisationForm
                organisation={
                    editingOrganisation ??
                    undefined
                }
                saving={saving}
                onSave={handleSave}
                onCancel={closeForm}
            />
        )
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-gradient-to-br from-[#1b2a15] via-[#14200f] to-[#0d140a] p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-lime-400/10 p-3">
                            <Building2 className="h-9 w-9 text-lime-400" />
                        </div>

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-400">
                                Tenant administration
                            </p>

                            <h2 className="mt-2 text-3xl font-bold normal-case text-white">
                                Organisations
                            </h2>

                            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                                Create, configure and manage the organisations using TournamentHQ.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-[#071006] transition hover:bg-lime-300"
                    >
                        <Plus className="h-5 w-5" />
                        New organisation
                    </button>
                </div>
            </section>

            {message && (
                <div
                    role="status"
                    className="rounded-2xl border border-lime-800/50 bg-lime-500/10 px-5 py-4 text-sm font-semibold text-lime-200"
                >
                    {message}
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-800/50 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200"
                >
                    {errorMessage}
                </div>
            )}

            {createdOrganisation && (
                <section className="flex flex-col gap-5 rounded-3xl border border-lime-800/50 bg-[#10190f] p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-400">
                            Organisation ready
                        </p>

                        <h3 className="mt-2 text-xl font-bold normal-case text-white">
                            Switch to{' '}
                            {createdOrganisation.name}?
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                            Stay on the current organisation or reload TournamentHQ with the new organisation selected.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            type="button"
                            disabled={switching}
                            onClick={() =>
                                setCreatedOrganisation(
                                    null
                                )
                            }
                            className="rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-lime-500/50 disabled:opacity-60"
                        >
                            Stay here
                        </button>

                        <button
                            type="button"
                            disabled={switching}
                            onClick={
                                handleSwitchToCreated
                            }
                            className="rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-[#071006] transition hover:bg-lime-300 disabled:opacity-60"
                        >
                            {switching
                                ? 'Switching...'
                                : 'Switch organisation'}
                        </button>
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-lime-900/50 bg-[#10190f] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3 rounded-xl border border-lime-900/50 bg-black/20 px-4 py-3">
                        <Search className="h-5 w-5 text-lime-400" />

                        <input
                            type="text"
                            placeholder="Search organisations..."
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-600"
                        />
                    </div>

                    <button
                        type="button"
                        aria-label="Refresh organisations"
                        title="Refresh organisations"
                        disabled={loading}
                        onClick={() =>
                            void loadOrganisations()
                        }
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-lime-900/50 bg-black/20 text-lime-400 transition hover:border-lime-500/50 disabled:opacity-60"
                    >
                        <RefreshCw
                            className={[
                                'h-5 w-5',
                                loading
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-lime-900/50 bg-[#10190f]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse">
                        <thead>
                            <tr className="border-b border-lime-900/50 bg-lime-400/5 text-left text-sm text-lime-300">
                                <th className="px-5 py-4">
                                    Name
                                </th>

                                <th className="px-5 py-4">
                                    Slug
                                </th>

                                <th className="px-5 py-4">
                                    Status
                                </th>

                                <th className="px-5 py-4">
                                    Created
                                </th>

                                <th className="px-5 py-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-10 text-center text-slate-400"
                                    >
                                        Loading organisations...
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                filteredOrganisations.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-10 text-center text-slate-400"
                                        >
                                            No organisations found.
                                        </td>
                                    </tr>
                                )}

                            {!loading &&
                                filteredOrganisations.map(
                                    (organisation) => (
                                        <tr
                                            key={
                                                organisation.id
                                            }
                                            className="border-b border-lime-900/30 last:border-b-0"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-lime-900/50 bg-black/20 p-1.5">
                                                        {organisation.logo_url ? (
                                                            <img
                                                                src={
                                                                    organisation.logo_url
                                                                }
                                                                alt=""
                                                                className="h-full w-full object-contain"
                                                            />
                                                        ) : (
                                                            <Building2 className="h-5 w-5 text-lime-400" />
                                                        )}
                                                    </div>

                                                    <span className="font-semibold text-white">
                                                        {
                                                            organisation.name
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 font-mono text-sm text-slate-300">
                                                {
                                                    organisation.slug
                                                }
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize',
                                                        organisation.status ===
                                                        'active'
                                                            ? 'border-lime-700/50 bg-lime-500/10 text-lime-300'
                                                            : organisation.status ===
                                                              'suspended'
                                                              ? 'border-red-800/50 bg-red-500/10 text-red-300'
                                                              : 'border-slate-700 bg-slate-500/10 text-slate-300',
                                                    ].join(' ')}
                                                >
                                                    {
                                                        organisation.status
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-400">
                                                {new Date(
                                                    organisation.created_at
                                                ).toLocaleDateString(
                                                    'en-GB'
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        aria-label={`Edit ${organisation.name}`}
                                                        title={`Edit ${organisation.name}`}
                                                        onClick={() =>
                                                            openEditForm(
                                                                organisation
                                                            )
                                                        }
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-lime-900/50 bg-lime-500/10 text-lime-300 transition hover:border-lime-500/60 hover:bg-lime-500/15"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label={`Delete ${organisation.name}`}
                                                        title={`Delete ${organisation.name}`}
                                                        onClick={() =>
                                                            setOrganisationToDelete(
                                                                organisation
                                                            )
                                                        }
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-800/50 bg-red-500/10 text-red-300 transition hover:bg-red-500/15"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmDialog
                open={
                    organisationToDelete !== null
                }
                title="Delete organisation?"
                message={
                    organisationToDelete
                        ? `Permanently delete ${organisationToDelete.name} and its associated data? This action cannot be undone.`
                        : ''
                }
                confirmLabel="Delete organisation"
                cancelLabel="Cancel"
                isProcessing={deleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!deleting) {
                        setOrganisationToDelete(
                            null
                        )
                    }
                }}
            />
        </div>
    )
}

export default OrganisationManager
