import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { VenueModal } from './VenueModal'
import { VenuesTable } from './VenuesTable'
import { venueService } from './venueService'
import type {
    Festival,
    Venue,
    VenueFormValues,
} from './venueTypes'

const emptyForm: VenueFormValues = {
    name: '',
    address: '',
    postcode: '',
    notes: '',
}

export function VenuesManager() {
    const [festival, setFestival] = useState<Festival | null>(null)
    const [venues, setVenues] = useState<Venue[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const [editingVenue, setEditingVenue] =
        useState<Venue | null>(null)

    const [venueToDelete, setVenueToDelete] =
        useState<Venue | null>(null)

    const [formValues, setFormValues] =
        useState<VenueFormValues>(emptyForm)

    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] =
        useState<'success' | 'error' | 'info'>('success')

    function showToast(
        message: string,
        type: 'success' | 'error' | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    async function loadData() {
        setIsLoading(true)

        try {
            const activeFestival =
                await venueService.getActiveFestival()

            setFestival(activeFestival)

            if (!activeFestival) {
                setVenues([])
                return
            }

            const venueRows = await venueService.getVenues(
                activeFestival.id
            )

            setVenues(venueRows)
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load venues.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    function openCreateModal() {
        setEditingVenue(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(venue: Venue) {
        setEditingVenue(venue)
        setFormValues({
            name: venue.name,
            address: venue.address ?? '',
            postcode: venue.postcode ?? '',
            notes: venue.notes ?? '',
        })
        setShowModal(true)
    }

    function closeModal() {
        setEditingVenue(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    async function saveVenue() {
        if (!festival) {
            showToast('No active festival was found.', 'error')
            return
        }

        if (!formValues.name.trim()) {
            showToast('Venue name is required.', 'error')
            return
        }

        setIsSaving(true)

        const wasEditing = Boolean(editingVenue)

        try {
            if (editingVenue) {
                await venueService.updateVenue(
                    editingVenue.id,
                    formValues
                )
            } else {
                await venueService.createVenue(
                    festival.id,
                    formValues
                )
            }

            closeModal()
            await loadData()

            showToast(
                wasEditing
                    ? 'Venue updated successfully.'
                    : 'Venue created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save venue.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteVenue() {
        if (!venueToDelete) return

        try {
            await venueService.deleteVenue(venueToDelete.id)

            setVenueToDelete(null)
            await loadData()
            showToast('Venue deleted successfully.', 'success')
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete venue.',
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
                    <h3>Venues</h3>
                    <p className="muted">
                        Manage the grounds and facilities available for
                        festival fixtures.
                    </p>

                    {festival && (
                        <span className="badge">
                            {festival.name} {festival.year}
                        </span>
                    )}
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                    disabled={!festival}
                >
                    + Add Venue
                </button>
            </div>

            {isLoading ? (
                <p className="muted">Loading venues...</p>
            ) : (
                <VenuesTable
                    venues={venues}
                    onEdit={openEditModal}
                    onDelete={setVenueToDelete}
                />
            )}

            {showModal && (
                <VenueModal
                    mode={editingVenue ? 'edit' : 'create'}
                    values={formValues}
                    isSaving={isSaving}
                    onChange={setFormValues}
                    onClose={closeModal}
                    onSave={saveVenue}
                />
            )}

            {venueToDelete && (
                <ConfirmDialog
                    title="Delete Venue"
                    message={`Are you sure you want to delete ${venueToDelete.name}? Fixtures using this venue may need to be updated first.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() => setVenueToDelete(null)}
                    onConfirm={deleteVenue}
                />
            )}
        </div>
    )
}