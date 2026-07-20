import {
    useEffect,
    useState,
} from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { SponsorModal } from './SponsorModal'
import { SponsorsTable } from './SponsorsTable'
import { sponsorService } from './sponsorService'
import type {
    Sponsor,
    SponsorFormValues,
} from './sponsorTypes'

const emptyForm: SponsorFormValues = {
    name: '',
    tier: '',
    website_url: '',
    description: '',
    active: true,
}

const MAX_LOGO_SIZE =
    3 * 1024 * 1024

const ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
]

export function SponsorsManager() {
    const [competitionId, setCompetitionId] =
        useState<string | null>(null)

    const [sponsors, setSponsors] =
        useState<Sponsor[]>([])

    const [editingSponsor, setEditingSponsor] =
        useState<Sponsor | null>(null)

    const [sponsorToDelete, setSponsorToDelete] =
        useState<Sponsor | null>(null)

    const [formValues, setFormValues] =
        useState<SponsorFormValues>(
            emptyForm
        )

    const [selectedLogo, setSelectedLogo] =
        useState<File | null>(null)

    const [existingLogoUrl, setExistingLogoUrl] =
        useState('')

    const [removeExistingLogo, setRemoveExistingLogo] =
        useState(false)

    const [showModal, setShowModal] =
        useState(false)

    const [isLoading, setIsLoading] =
        useState(true)

    const [isSaving, setIsSaving] =
        useState(false)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<
            'success' | 'error' | 'info'
        >('success')

    function showToast(
        message: string,
        type:
            | 'success'
            | 'error'
            | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    async function loadData() {
        setIsLoading(true)

        try {
            const activeCompetitionId =
                await sponsorService
                    .getActiveCompetitionId()

            setCompetitionId(
                activeCompetitionId
            )

            if (!activeCompetitionId) {
                setSponsors([])
                return
            }

            const rows =
                await sponsorService
                    .getSponsors(
                        activeCompetitionId
                    )

            setSponsors(rows)
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load sponsors.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    function resetForm() {
        setEditingSponsor(null)
        setFormValues(emptyForm)
        setSelectedLogo(null)
        setExistingLogoUrl('')
        setRemoveExistingLogo(false)
    }

    function closeModal() {
        resetForm()
        setShowModal(false)
    }

    function openCreateModal() {
        resetForm()
        setShowModal(true)
    }

    function openEditModal(
        sponsor: Sponsor
    ) {
        setEditingSponsor(sponsor)

        setFormValues({
            name: sponsor.name,
            tier: sponsor.tier ?? '',
            website_url:
                sponsor.website_url ?? '',
            description:
                sponsor.description ?? '',
            active: sponsor.active,
        })

        setExistingLogoUrl(
            sponsor.logo_url ?? ''
        )

        setSelectedLogo(null)
        setRemoveExistingLogo(false)
        setShowModal(true)
    }

    function handleLogoSelected(
        file: File | null
    ) {
        if (!file) {
            setSelectedLogo(null)
            return
        }

        if (
            !ALLOWED_TYPES.includes(file.type)
        ) {
            showToast(
                'Select a PNG, JPG, WEBP or SVG logo.',
                'error'
            )
            return
        }

        if (file.size > MAX_LOGO_SIZE) {
            showToast(
                'Sponsor logos must be smaller than 3 MB.',
                'error'
            )
            return
        }

        setSelectedLogo(file)
        setRemoveExistingLogo(false)
    }

    async function saveSponsor() {
        if (!competitionId) {
            showToast(
                'No active competition was found.',
                'error'
            )
            return
        }

        if (!formValues.name.trim()) {
            showToast(
                'Sponsor name is required.',
                'error'
            )
            return
        }

        setIsSaving(true)

        let uploadedStoragePath:
            | string
            | null = null

        try {
            let nextLogoUrl =
                editingSponsor?.logo_url ??
                null

            if (selectedLogo) {
                const uploaded =
                    await sponsorService
                        .uploadLogo(
                            selectedLogo
                        )

                nextLogoUrl =
                    uploaded.publicUrl

                uploadedStoragePath =
                    uploaded.storagePath
            } else if (removeExistingLogo) {
                nextLogoUrl = null
            }

            if (editingSponsor) {
                await sponsorService
                    .updateSponsor(
                        editingSponsor.id,
                        formValues,
                        nextLogoUrl
                    )
            } else {
                await sponsorService
                    .createSponsor(
                        competitionId,
                        formValues,
                        nextLogoUrl
                    )
            }

            if (
                editingSponsor?.logo_url &&
                editingSponsor.logo_url !==
                nextLogoUrl
            ) {
                await sponsorService
                    .deleteLogo(
                        editingSponsor.logo_url
                    )
            }

            const wasEditing =
                Boolean(editingSponsor)

            closeModal()
            await loadData()

            showToast(
                wasEditing
                    ? 'Sponsor updated successfully.'
                    : 'Sponsor added successfully.',
                'success'
            )
        } catch (error) {
            if (uploadedStoragePath) {
                const temporaryPublicUrl =
                    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/sponsor-logos/${uploadedStoragePath}`

                await sponsorService
                    .deleteLogo(
                        temporaryPublicUrl
                    )
            }

            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save sponsor.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteSponsor() {
        if (!sponsorToDelete) return

        const sponsor =
            sponsorToDelete

        try {
            await sponsorService
                .deleteSponsor(
                    sponsor.id
                )

            await sponsorService
                .deleteLogo(
                    sponsor.logo_url
                )

            setSponsorToDelete(null)
            await loadData()

            showToast(
                'Sponsor deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete sponsor.',
                'error'
            )
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
                    <h3>Sponsors</h3>

                    <p className="muted">
                        Manage confirmed partners and sponsors.
                    </p>
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                    disabled={!competitionId}
                >
                    + Add Sponsor
                </button>
            </div>

            {isLoading ? (
                <p className="muted">
                    Loading sponsors...
                </p>
            ) : (
                <SponsorsTable
                    sponsors={sponsors}
                    onEdit={openEditModal}
                    onDelete={
                        setSponsorToDelete
                    }
                />
            )}

            {showModal && (
                <SponsorModal
                    mode={
                        editingSponsor
                            ? 'edit'
                            : 'create'
                    }
                    values={formValues}
                    existingLogoUrl={
                        existingLogoUrl
                    }
                    isSaving={isSaving}
                    onChange={setFormValues}
                    onLogoSelected={
                        handleLogoSelected
                    }
                    onRemoveLogo={() => {
                        setSelectedLogo(null)
                        setExistingLogoUrl('')
                        setRemoveExistingLogo(
                            true
                        )
                    }}
                    onClose={closeModal}
                    onSave={saveSponsor}
                />
            )}

            {sponsorToDelete && (
                <ConfirmDialog
                    title="Delete Sponsor"
                    message={`Are you sure you want to delete ${sponsorToDelete.name}?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setSponsorToDelete(
                            null
                        )
                    }
                    onConfirm={deleteSponsor}
                />
            )}
        </div>
    )
}