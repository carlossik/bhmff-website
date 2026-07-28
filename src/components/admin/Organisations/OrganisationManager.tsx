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

import './Organisations.css'

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
        const message = error.message.trim()
        const lowerMessage = message.toLowerCase()

        if (
            lowerMessage.includes('duplicate') ||
            lowerMessage.includes('already exists') ||
            lowerMessage.includes('organisations_slug_key')
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
    ] = useState<Organisation | null>(null)

    const [
        organisationToDelete,
        setOrganisationToDelete,
    ] = useState<Organisation | null>(null)

    const [
        createdOrganisation,
        setCreatedOrganisation,
    ] = useState<Organisation | null>(null)

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

            if (!options.preserveMessages) {
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
        }, [organisations, search])

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

        // The database creation has succeeded at this point.
        // Any subsequent list-refresh problem must not be
        // presented as a failed creation.
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

            // Reloading intentionally rebuilds the authenticated
            // admin profile so the newly-created membership is
            // available to the existing OrganisationProvider.
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

    return (
        <div className="organisation-manager">
            <div className="organisation-header">
                <div className="organisation-header-copy">
                    <h2>
                        <Building2 size={26} />
                        Organisations
                    </h2>

                    <p>
                        Manage organisations that use
                        TournamentHQ.
                    </p>
                </div>

                <button
                    className="primary-button"
                    type="button"
                    onClick={openCreateForm}
                >
                    <Plus size={18} />
                    New Organisation
                </button>
            </div>

            {message && (
                <div
                    role="status"
                    className="adminSuccessMessage"
                >
                    {message}
                </div>
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="adminErrorMessage"
                >
                    {errorMessage}
                </div>
            )}

            {createdOrganisation && (
                <section className="organisation-created-panel">
                    <div>
                        <p className="organisation-created-eyebrow">
                            Organisation ready
                        </p>

                        <h3>
                            Switch to{' '}
                            {createdOrganisation.name}?
                        </h3>

                        <p>
                            Stay on the current organisation or
                            reload TournamentHQ with the new
                            organisation selected.
                        </p>
                    </div>

                    <div className="organisation-created-actions">
                        <button
                            type="button"
                            className="btn secondary"
                            disabled={switching}
                            onClick={() =>
                                setCreatedOrganisation(
                                    null
                                )
                            }
                        >
                            Stay here
                        </button>

                        <button
                            type="button"
                            className="btn primary"
                            disabled={switching}
                            onClick={
                                handleSwitchToCreated
                            }
                        >
                            {switching
                                ? 'Switching...'
                                : 'Switch organisation'}
                        </button>
                    </div>
                </section>
            )}

            <div className="organisation-toolbar">
                <div className="organisation-search">
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search organisations..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />
                </div>

                <button
                    className="icon-button"
                    type="button"
                    aria-label="Refresh organisations"
                    title="Refresh organisations"
                    disabled={loading}
                    onClick={() =>
                        void loadOrganisations()
                    }
                >
                    <RefreshCw
                        size={18}
                        className={
                            loading
                                ? 'organisation-spin'
                                : undefined
                        }
                    />
                </button>
            </div>

            <div className="organisation-table-container">
                <table className="organisation-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Slug</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="loading-cell"
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
                                        className="loading-cell"
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
                                    >
                                        <td>
                                            <div className="organisation-name">
                                                {organisation.logo_url ? (
                                                    <img
                                                        src={
                                                            organisation.logo_url
                                                        }
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span className="organisation-name-icon">
                                                        <Building2
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    </span>
                                                )}

                                                <span className="organisation-name-text">
                                                    {
                                                        organisation.name
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <code>
                                                {
                                                    organisation.slug
                                                }
                                            </code>
                                        </td>

                                        <td>
                                            <span
                                                className={`status-badge ${organisation.status}`}
                                            >
                                                {
                                                    organisation.status
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            {new Date(
                                                organisation.created_at
                                            ).toLocaleDateString(
                                                'en-GB'
                                            )}
                                        </td>

                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="icon-button"
                                                    type="button"
                                                    aria-label={`Edit ${organisation.name}`}
                                                    title={`Edit ${organisation.name}`}
                                                    onClick={() =>
                                                        openEditForm(
                                                            organisation
                                                        )
                                                    }
                                                >
                                                    <Pencil
                                                        size={
                                                            16
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    className="icon-button danger"
                                                    type="button"
                                                    aria-label={`Delete ${organisation.name}`}
                                                    title={`Delete ${organisation.name}`}
                                                    onClick={() =>
                                                        setOrganisationToDelete(
                                                            organisation
                                                        )
                                                    }
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
                            )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <OrganisationForm
                    organisation={
                        editingOrganisation ??
                        undefined
                    }
                    saving={saving}
                    onSave={handleSave}
                    onCancel={closeForm}
                />
            )}

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
