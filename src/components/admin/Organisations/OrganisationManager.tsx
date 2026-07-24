import React, { useEffect, useMemo, useState } from 'react'
import {
    Plus,
    Pencil,
    Trash2,
    Building2,
    Search,
    RefreshCw
} from 'lucide-react'

import './Organisations.css'

import {OrganisationForm} from './OrganisationForm'
import {ConfirmDialog} from '../../common/ConfirmDialog/ConfirmDialog'

import {
    Organisation,
    OrganisationFormData
} from './organisationTypes'

import {
    getOrganisations,
    createOrganisation,
    updateOrganisation,
    deleteOrganisation
} from './organisationService'

const OrganisationManager: React.FC = () => {
    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [search, setSearch] = useState('')

    const [showForm, setShowForm] = useState(false)

    const [editingOrganisation, setEditingOrganisation] =
        useState<Organisation | null>(null)

    const [deleteOrganisationItem, setDeleteOrganisationItem] =
        useState<Organisation | null>(null)

    const loadOrganisations = async () => {
        try {
            setLoading(true)

            const data = await getOrganisations()

            setOrganisations(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrganisations()
    }, [])

    const filteredOrganisations = useMemo(() => {
        const term = search.toLowerCase()

        return organisations.filter(org =>
            org.name.toLowerCase().includes(term) ||
            org.slug.toLowerCase().includes(term)
        )
    }, [organisations, search])

    const handleAdd = () => {
        setEditingOrganisation(null)
        setShowForm(true)
    }

    const handleEdit = (organisation: Organisation) => {
        setEditingOrganisation(organisation)
        setShowForm(true)
    }

    const handleSave = async (values: OrganisationFormData) => {
        try {
            setSaving(true)

            if (editingOrganisation) {
                await updateOrganisation(
                    editingOrganisation.id,
                    values
                )
            } else {
                await createOrganisation(values)
            }

            await loadOrganisations()

            setShowForm(false)
            setEditingOrganisation(null)
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (!deleteOrganisationItem) return

        try {
            await deleteOrganisation(deleteOrganisationItem.id)

            setDeleteOrganisationItem(null)

            await loadOrganisations()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="organisation-manager">

            <div className="organisation-header">

                <div>

                    <h2>
                        <Building2 size={22} />
                        Organisations
                    </h2>

                    <p>
                        Manage organisations that use
                        TournamentHQ.
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={handleAdd}
                >
                    <Plus size={18} />
                    New Organisation
                </button>

            </div>

            <div className="organisation-toolbar">

                <div className="organisation-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search organisations..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>

                <button
                    className="icon-button"
                    onClick={loadOrganisations}
                >
                    <RefreshCw size={18} />
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
                        <th></th>

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
                        filteredOrganisations.length === 0 && (

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
                        filteredOrganisations.map(org => (

                            <tr key={org.id}>

                                <td>

                                    <div className="organisation-name">

                                        <Building2 size={18} />

                                        <span>
                                            {org.name}
                                        </span>

                                    </div>

                                </td>

                                <td>

                                    <code>{org.slug}</code>

                                </td>

                                <td>

                                    <span
                                        className={`status-badge ${org.status}`}
                                    >
                                        {org.status}
                                    </span>

                                </td>

                                <td>

                                    {new Date(
                                        org.created_at
                                    ).toLocaleDateString()}

                                </td>

                                <td>

                                    <div className="table-actions">

                                        <button
                                            className="icon-button"
                                            onClick={() =>
                                                handleEdit(org)
                                            }
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="icon-button danger"
                                            onClick={() =>
                                                setDeleteOrganisationItem(
                                                    org
                                                )
                                            }
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        ))}
                    </tbody>

                </table>

            </div>

            {showForm && (
                <OrganisationForm
                    organisation={editingOrganisation ?? undefined}
                    saving={saving}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false)
                        setEditingOrganisation(null)
                    }}
                />
            )}

            <ConfirmDialog
                open={!!deleteOrganisationItem}
                title="Delete Organisation"
                message={
                    deleteOrganisationItem
                        ? `Are you sure you want to delete "${deleteOrganisationItem.name}"?`
                        : ''
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isProcessing={saving}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteOrganisationItem(null)}
            />

        </div>
    )
}

export default OrganisationManager