import {
    useEffect,
    useState,
} from 'react'
import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { VenueModal } from './VenueModal'
import { VenuesTable } from './VenuesTable'
import { venueService } from './venueService'
import type {
    Venue,
    VenueFormValues,
} from './venueTypes'

const emptyForm: VenueFormValues = {
    name: '',
    address: '',
    postcode: '',
    notes: '',
}

type ToastType =
    | 'success'
    | 'error'
    | 'info'

function normaliseVenueName(
    value: string
) {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
}

function formatPostcode(value: string) {
    const compact = value
        .toUpperCase()
        .replace(/\s+/g, '')

    if (compact.length <= 3) {
        return compact
    }

    return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export function VenuesManager() {
    const { currentOrganisation } =
        useOrganisation()

    const { currentCompetition } =
        useCompetition()

    const [venues, setVenues] =
        useState<Venue[]>([])

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [isDeleting, setIsDeleting] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [
        editingVenue,
        setEditingVenue,
    ] = useState<Venue | null>(null)

    const [
        venueToDelete,
        setVenueToDelete,
    ] = useState<Venue | null>(null)

    const [
        formValues,
        setFormValues,
    ] = useState<VenueFormValues>(
        emptyForm
    )

    const [
        toastMessage,
        setToastMessage,
    ] = useState('')

    const [
        toastType,
        setToastType,
    ] = useState<ToastType>('success')

    function showToast(
        message: string,
        type: ToastType = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    async function loadData(
        competitionId: string
    ) {
        setIsLoading(true)

        try {
            const venueRows =
                await venueService.getVenues(
                    competitionId,
                    currentOrganisation.id
                )

            setVenues(venueRows)
        } catch (error) {
            setVenues([])

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
        if (!currentCompetition?.id) {
            setVenues([])
            setIsLoading(false)
            return
        }

        void loadData(
            currentCompetition.id
        )
    }, [
        currentCompetition?.id,
        currentOrganisation.id,
    ])

    function openCreateModal() {
        if (!currentCompetition?.id) {
            showToast(
                'Select a competition before adding a venue.',
                'error'
            )
            return
        }

        setEditingVenue(null)
        setFormValues({
            ...emptyForm,
        })
        setShowModal(true)
    }

    function openEditModal(
        venue: Venue
    ) {
        setEditingVenue(venue)

        setFormValues({
            name: venue.name,
            address:
                venue.address ?? '',
            postcode:
                venue.postcode ?? '',
            notes:
                venue.notes ?? '',
        })

        setShowModal(true)
    }

    function closeModal() {
        if (isSaving) {
            return
        }

        setEditingVenue(null)
        setFormValues({
            ...emptyForm,
        })
        setShowModal(false)
    }

    async function saveVenue() {
        if (!currentCompetition?.id) {
            showToast(
                'Select a competition before saving a venue.',
                'error'
            )
            return
        }

        const cleanedValues: VenueFormValues = {
            name: formValues.name
                .trim()
                .replace(/\s+/g, ' '),
            address: formValues.address
                .trim()
                .replace(/\s+/g, ' '),
            postcode: formatPostcode(
                formValues.postcode
            ),
            notes: formValues.notes.trim(),
        }

        if (!cleanedValues.name) {
            showToast(
                'Venue name is required.',
                'error'
            )
            return
        }

        const duplicateVenue =
            venues.find(
                (venue) =>
                    venue.id !==
                    editingVenue?.id &&
                    normaliseVenueName(
                        venue.name
                    ) ===
                    normaliseVenueName(
                        cleanedValues.name
                    )
            )

        if (duplicateVenue) {
            showToast(
                `A venue named ${duplicateVenue.name} already exists.`,
                'error'
            )
            return
        }

        setFormValues(cleanedValues)
        setIsSaving(true)

        const wasEditing =
            Boolean(editingVenue)

        try {
            if (editingVenue) {
                await venueService.updateVenue(
                    editingVenue.id,
                    currentCompetition.id,
                    currentOrganisation.id,
                    cleanedValues
                )
            } else {
                await venueService.createVenue(
                    currentCompetition.id,
                    currentOrganisation.id,
                    cleanedValues
                )
            }

            setEditingVenue(null)
            setFormValues({
                ...emptyForm,
            })
            setShowModal(false)

            await loadData(
                currentCompetition.id
            )

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
        if (
            !venueToDelete ||
            !currentCompetition?.id
        ) {
            return
        }

        setIsDeleting(true)

        try {
            await venueService.deleteVenue(
                venueToDelete.id,
                currentCompetition.id,
                currentOrganisation.id
            )

            setVenueToDelete(null)

            await loadData(
                currentCompetition.id
            )

            showToast(
                'Venue deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete venue.',
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
                    <h3>Venues</h3>

                    <p className="muted">
                        Manage the grounds and
                        facilities available for the
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
                        !currentCompetition ||
                        isLoading
                    }
                >
                    + Add Venue
                </button>
            </div>

            {!currentCompetition ? (
                <div className="teamsEmptyState">
                    <h3>
                        No competition selected
                    </h3>

                    <p>
                        Select a competition before
                        managing its venues.
                    </p>
                </div>
            ) : isLoading ? (
                <p className="muted">
                    Loading venues...
                </p>
            ) : (
                <VenuesTable
                    venues={venues}
                    onEdit={openEditModal}
                    onDelete={
                        setVenueToDelete
                    }
                />
            )}

            {showModal &&
                currentCompetition && (
                    <VenueModal
                        mode={
                            editingVenue
                                ? 'edit'
                                : 'create'
                        }
                        values={formValues}
                        isSaving={isSaving}
                        onChange={
                            setFormValues
                        }
                        onClose={closeModal}
                        onSave={saveVenue}
                    />
                )}

            {venueToDelete && (
                <ConfirmDialog
                    title="Delete Venue"
                    message={`Are you sure you want to delete ${venueToDelete.name}? Fixtures using this venue may need to be updated first.`}
                    confirmText={
                        isDeleting
                            ? 'Deleting...'
                            : 'Delete'
                    }
                    cancelText="Cancel"
                    onCancel={() =>
                        setVenueToDelete(
                            null
                        )
                    }
                    onConfirm={
                        deleteVenue
                    }
                />
            )}
        </div>
    )
}