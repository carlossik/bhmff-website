import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    AlertTriangle,
    Building2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

import './Organisations.css'

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

const destructiveDataItems = [
    'competitions',
    'competition teams',
    'clubs and teams',
    'players and coaches',
    'groups and fixtures',
    'results and goals',
    'venues',
    'articles',
    'sponsors and enquiries',
    'media',
    'organisation memberships and user access',
]

function getErrorMessage(error: unknown) {
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        if (
            error.message
                .toLowerCase()
                .includes(
                    'final organisation cannot be deleted',
                )
        ) {
            return 'The final organisation cannot be deleted. Create another organisation before deleting this one.'
        }

        return error.message
    }

    return 'The operation could not be completed.'
}

const OrganisationManager = () => {
    const [
        organisations,
        setOrganisations,
    ] = useState<Organisation[]>([])

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
        editingOrganisation,
        setEditingOrganisation,
    ] =
        useState<Organisation | null>(
            null,
        )

    const [
        deleteOrganisationItem,
        setDeleteOrganisationItem,
    ] =
        useState<Organisation | null>(
            null,
        )

    const [
        deleteConfirmation,
        setDeleteConfirmation,
    ] = useState('')

    const [message, setMessage] =
        useState<string | null>(null)

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(null)

    const loadOrganisations =
        async () => {
            try {
                setLoading(true)
                setErrorMessage(null)

                const data =
                    await getOrganisations()

                setOrganisations(data)
            } catch (error) {
                console.error(
                    'Failed to load organisations:',
                    error,
                )

                setOrganisations([])

                setErrorMessage(
                    getErrorMessage(error),
                )
            } finally {
                setLoading(false)
            }
        }

    useEffect(() => {
        void loadOrganisations()
    }, [])

    const filteredOrganisations =
        useMemo(() => {
            const term = search
                .trim()
                .toLowerCase()

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
                        .includes(term),
            )
        }, [
            organisations,
            search,
        ])

    const deleteNameMatches =
        useMemo(() => {
            if (
                !deleteOrganisationItem
            ) {
                return false
            }

            return (
                deleteConfirmation.trim() ===
                deleteOrganisationItem.name
            )
        }, [
            deleteConfirmation,
            deleteOrganisationItem,
        ])

    function handleAdd() {
        setEditingOrganisation(null)
        setShowForm(true)
        setMessage(null)
        setErrorMessage(null)
    }

    function handleEdit(
        organisation: Organisation,
    ) {
        setEditingOrganisation(
            organisation,
        )

        setShowForm(true)
        setMessage(null)
        setErrorMessage(null)
    }

    function openDeleteDialog(
        organisation: Organisation,
    ) {
        setDeleteOrganisationItem(
            organisation,
        )

        setDeleteConfirmation('')
        setMessage(null)
        setErrorMessage(null)
    }

    function closeDeleteDialog() {
        if (deleting) {
            return
        }

        setDeleteOrganisationItem(null)
        setDeleteConfirmation('')
    }

    async function handleSave(
        values: OrganisationFormData,
    ) {
        try {
            setSaving(true)
            setMessage(null)
            setErrorMessage(null)

            if (editingOrganisation) {
                await updateOrganisation(
                    editingOrganisation.id,
                    values,
                )

                setMessage(
                    'Organisation updated successfully.',
                )
            } else {
                await createOrganisation(
                    values,
                )

                setMessage(
                    'Organisation created successfully.',
                )
            }

            await loadOrganisations()

            setShowForm(false)
            setEditingOrganisation(null)
        } catch (error) {
            console.error(
                'Failed to save organisation:',
                error,
            )

            const resolvedMessage =
                getErrorMessage(error)

            setErrorMessage(
                resolvedMessage,
            )

            throw new Error(
                resolvedMessage,
            )
        } finally {
            setSaving(false)
        }
    }

    async function confirmDelete() {
        if (
            !deleteOrganisationItem ||
            !deleteNameMatches
        ) {
            return
        }

        try {
            setDeleting(true)
            setMessage(null)
            setErrorMessage(null)

            const deletedName =
                deleteOrganisationItem.name

            await deleteOrganisation(
                deleteOrganisationItem.id,
            )

            setDeleteOrganisationItem(
                null,
            )

            setDeleteConfirmation('')

            await loadOrganisations()

            setMessage(
                `"${deletedName}" and all associated data were permanently deleted.`,
            )
        } catch (error) {
            console.error(
                'Failed to delete organisation:',
                error,
            )

            setErrorMessage(
                getErrorMessage(error),
            )
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="organisation-manager">
            <div className="organisation-header">
                <div>
                    <h2>
                        <Building2
                            size={22}
                        />

                        Organisations
                    </h2>

                    <p>
                        Manage organisations
                        that use TournamentHQ.
                    </p>
                </div>

                <button
                    className="primary-button"
                    type="button"
                    onClick={handleAdd}
                >
                    <Plus size={18} />

                    New Organisation
                </button>
            </div>

            {message && (
                <p className="adminSuccessMessage">
                    {message}
                </p>
            )}

            {errorMessage && (
                <p className="adminErrorMessage">
                    {errorMessage}
                </p>
            )}

            <div className="organisation-toolbar">
                <div className="organisation-search">
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search organisations..."
                        value={search}
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target
                                    .value,
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
                        <th>
                            Actions
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {loading && (
                        <tr>
                            <td
                                colSpan={5}
                                className="loading-cell"
                            >
                                Loading
                                organisations...
                            </td>
                        </tr>
                    )}

                    {!loading &&
                        filteredOrganisations.length ===
                        0 && (
                            <tr>
                                <td
                                    colSpan={
                                        5
                                    }
                                    className="loading-cell"
                                >
                                    No
                                    organisations
                                    found.
                                </td>
                            </tr>
                        )}

                    {!loading &&
                        filteredOrganisations.map(
                            (
                                organisation,
                            ) => (
                                <tr
                                    key={
                                        organisation.id
                                    }
                                >
                                    <td>
                                        <div className="organisation-name">
                                            <Building2
                                                size={
                                                    18
                                                }
                                            />

                                            <span>
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
                                            organisation.created_at,
                                        ).toLocaleDateString(
                                            'en-GB',
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
                                                    handleEdit(
                                                        organisation,
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
                                                    openDeleteDialog(
                                                        organisation,
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
                            ),
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
                    onCancel={() => {
                        if (saving) {
                            return
                        }

                        setShowForm(
                            false,
                        )

                        setEditingOrganisation(
                            null,
                        )
                    }}
                />
            )}

            {deleteOrganisationItem && (
                <div
                    role="presentation"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDeleteDialog()
                        }
                    }}
                    style={{
                        position:
                            'fixed',
                        inset: 0,
                        zIndex: 10000,
                        display: 'flex',
                        alignItems:
                            'center',
                        justifyContent:
                            'center',
                        padding: '24px',
                        background:
                            'rgba(0, 0, 0, 0.78)',
                        backdropFilter:
                            'blur(5px)',
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-organisation-title"
                        style={{
                            position:
                                'relative',
                            width: '100%',
                            maxWidth:
                                '620px',
                            maxHeight:
                                'calc(100vh - 48px)',
                            overflowY:
                                'auto',
                            border:
                                '1px solid rgba(239, 68, 68, 0.45)',
                            borderRadius:
                                '18px',
                            padding:
                                '30px',
                            background:
                                '#101d13',
                            boxShadow:
                                '0 24px 80px rgba(0, 0, 0, 0.55)',
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Close delete confirmation"
                            disabled={
                                deleting
                            }
                            onClick={
                                closeDeleteDialog
                            }
                            style={{
                                position:
                                    'absolute',
                                top: '16px',
                                right:
                                    '16px',
                                display:
                                    'grid',
                                placeItems:
                                    'center',
                                width:
                                    '36px',
                                height:
                                    '36px',
                                border:
                                    'none',
                                borderRadius:
                                    '10px',
                                color:
                                    '#d1d5db',
                                background:
                                    'rgba(255, 255, 255, 0.07)',
                                cursor:
                                    deleting
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                        >
                            <X
                                size={18}
                            />
                        </button>

                        <div
                            style={{
                                display:
                                    'grid',
                                placeItems:
                                    'center',
                                width:
                                    '64px',
                                height:
                                    '64px',
                                marginBottom:
                                    '18px',
                                borderRadius:
                                    '50%',
                                color:
                                    '#fca5a5',
                                background:
                                    'rgba(239, 68, 68, 0.16)',
                            }}
                        >
                            <AlertTriangle
                                size={32}
                            />
                        </div>

                        <h2
                            id="delete-organisation-title"
                            style={{
                                margin:
                                    '0 0 12px',
                                color:
                                    '#ffffff',
                            }}
                        >
                            Permanently Delete
                            Organisation
                        </h2>

                        <p
                            style={{
                                margin:
                                    '0 0 18px',
                                color:
                                    '#d1d5db',
                                lineHeight:
                                    1.6,
                            }}
                        >
                            You are about to
                            permanently delete{' '}
                            <strong
                                style={{
                                    color:
                                        '#ffffff',
                                }}
                            >
                                {
                                    deleteOrganisationItem.name
                                }
                            </strong>
                            .
                        </p>

                        <div
                            style={{
                                marginBottom:
                                    '20px',
                                border:
                                    '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius:
                                    '12px',
                                padding:
                                    '18px',
                                color:
                                    '#fecaca',
                                background:
                                    'rgba(127, 29, 29, 0.24)',
                            }}
                        >
                            <strong
                                style={{
                                    display:
                                        'block',
                                    marginBottom:
                                        '10px',
                                    fontSize:
                                        '1rem',
                                }}
                            >
                                Warning: this
                                action cannot be
                                undone.
                            </strong>

                            <p
                                style={{
                                    margin:
                                        '0 0 12px',
                                    lineHeight:
                                        1.55,
                                }}
                            >
                                Deleting this
                                organisation will
                                also permanently
                                delete all data
                                associated with it,
                                including:
                            </p>

                            <ul
                                style={{
                                    columns: 2,
                                    columnGap:
                                        '32px',
                                    margin:
                                        '0',
                                    paddingLeft:
                                        '20px',
                                    lineHeight:
                                        1.7,
                                }}
                            >
                                {destructiveDataItems.map(
                                    (
                                        item,
                                    ) => (
                                        <li
                                            key={
                                                item
                                            }
                                        >
                                            {
                                                item
                                            }
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>

                        <label
                            htmlFor="organisation-delete-confirmation"
                            style={{
                                display:
                                    'block',
                                marginBottom:
                                    '8px',
                                color:
                                    '#f3f4f6',
                                fontWeight:
                                    700,
                            }}
                        >
                            Type{' '}
                            <span
                                style={{
                                    color:
                                        '#fca5a5',
                                }}
                            >
                                {
                                    deleteOrganisationItem.name
                                }
                            </span>{' '}
                            to confirm
                        </label>

                        <input
                            id="organisation-delete-confirmation"
                            type="text"
                            autoComplete="off"
                            autoFocus
                            disabled={
                                deleting
                            }
                            value={
                                deleteConfirmation
                            }
                            onChange={(
                                event,
                            ) =>
                                setDeleteConfirmation(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            onKeyDown={(
                                event,
                            ) => {
                                if (
                                    event.key ===
                                    'Enter' &&
                                    deleteNameMatches &&
                                    !deleting
                                ) {
                                    event.preventDefault()

                                    void confirmDelete()
                                }
                            }}
                            style={{
                                boxSizing:
                                    'border-box',
                                width:
                                    '100%',
                                marginBottom:
                                    '22px',
                                border:
                                    deleteConfirmation &&
                                    !deleteNameMatches
                                        ? '1px solid #ef4444'
                                        : '1px solid rgba(255, 255, 255, 0.18)',
                                borderRadius:
                                    '10px',
                                padding:
                                    '13px 14px',
                                color:
                                    '#ffffff',
                                background:
                                    'rgba(255, 255, 255, 0.06)',
                                outline:
                                    'none',
                            }}
                        />

                        <div
                            style={{
                                display:
                                    'flex',
                                justifyContent:
                                    'flex-end',
                                gap: '12px',
                                flexWrap:
                                    'wrap',
                            }}
                        >
                            <button
                                className="btn secondary"
                                type="button"
                                disabled={
                                    deleting
                                }
                                onClick={
                                    closeDeleteDialog
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="btn primary dangerButton"
                                type="button"
                                disabled={
                                    deleting ||
                                    !deleteNameMatches
                                }
                                onClick={() =>
                                    void confirmDelete()
                                }
                                style={{
                                    opacity:
                                        deleting ||
                                        !deleteNameMatches
                                            ? 0.5
                                            : 1,
                                    cursor:
                                        deleting ||
                                        !deleteNameMatches
                                            ? 'not-allowed'
                                            : 'pointer',
                                }}
                            >
                                <Trash2
                                    size={17}
                                />

                                {deleting
                                    ? 'Deleting organisation...'
                                    : 'Permanently Delete Organisation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OrganisationManager