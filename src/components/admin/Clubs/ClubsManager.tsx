import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useOrganisation } from '../../../context/OrganisationContext'
import { ConfirmDialog } from '../../common/ConfirmDialog/ConfirmDialog'
import { ClubModal } from './ClubModal'
import { ClubsTable } from './ClubsTable'
import {
    emptyClubForm,
    mapClubToForm,
    type ClubFormValues,
    type DbClub,
} from './clubTypes'

function nullableText(value: string) {
    const trimmedValue = value.trim()
    return trimmedValue || null
}

function parseFoundedYear(value: string) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return null
    }

    const year = Number(trimmedValue)

    if (
        !Number.isInteger(year) ||
        year < 1800 ||
        year > 2200
    ) {
        return null
    }

    return year
}

export function ClubsManager() {
    const { currentOrganisation } = useOrganisation()

    const [clubs, setClubs] = useState<DbClub[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const [editingClub, setEditingClub] =
        useState<DbClub | null>(null)

    const [clubToDelete, setClubToDelete] =
        useState<DbClub | null>(null)

    const [modalInitialValues, setModalInitialValues] =
        useState<ClubFormValues>({
            ...emptyClubForm,
        })

    const organisationId =
        currentOrganisation?.id ?? ''

    const loadClubs = useCallback(async () => {
        if (!organisationId) {
            setClubs([])
            setLoading(false)
            return
        }

        setLoading(true)

        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .eq('organisation_id', organisationId)
            .order('name', {
                ascending: true,
            })

        if (error) {
            console.error(
                'Could not load clubs:',
                error
            )

            alert(
                `Could not load clubs: ${error.message}`
            )

            setClubs([])
            setLoading(false)
            return
        }

        setClubs((data ?? []) as DbClub[])
        setLoading(false)
    }, [organisationId])

    useEffect(() => {
        void loadClubs()
    }, [loadClubs])

    function openCreateModal() {
        setEditingClub(null)

        setModalInitialValues({
            ...emptyClubForm,
        })

        setShowModal(true)
    }

    function openEditModal(club: DbClub) {
        setEditingClub(club)
        setModalInitialValues(mapClubToForm(club))
        setShowModal(true)
    }

    function closeModal() {
        if (isSaving) {
            return
        }

        setShowModal(false)
        setEditingClub(null)

        setModalInitialValues({
            ...emptyClubForm,
        })
    }

    function closeModalAfterSave() {
        setShowModal(false)
        setEditingClub(null)

        setModalInitialValues({
            ...emptyClubForm,
        })
    }

    async function saveClub(
        formValues: ClubFormValues
    ) {
        if (!organisationId) {
            alert(
                'No organisation is currently selected.'
            )
            return
        }

        const name = formValues.name.trim()

        if (!name) {
            alert('Club name is required.')
            return
        }

        const foundedYear = parseFoundedYear(
            formValues.foundedYear
        )

        if (
            formValues.foundedYear.trim() &&
            foundedYear === null
        ) {
            alert(
                'Founded year must be between 1800 and 2200.'
            )
            return
        }

        const payload = {
            organisation_id: organisationId,
            name,
            short_name: nullableText(
                formValues.shortName
            ),
            badge_url: nullableText(
                formValues.badgeUrl
            ),
            website: nullableText(
                formValues.website
            ),
            email: nullableText(
                formValues.email
            ),
            phone: nullableText(
                formValues.phone
            ),
            address: nullableText(
                formValues.address
            ),
            manager_name: nullableText(
                formValues.managerName
            ),
            secretary_name: nullableText(
                formValues.secretaryName
            ),
            facebook_url: nullableText(
                formValues.facebookUrl
            ),
            instagram_url: nullableText(
                formValues.instagramUrl
            ),
            twitter_url: nullableText(
                formValues.twitterUrl
            ),
            founded_year: foundedYear,
            colours: nullableText(
                formValues.colours
            ),
            description: nullableText(
                formValues.description
            ),
            updated_at: new Date().toISOString(),
        }

        setIsSaving(true)

        try {
            if (editingClub) {
                const { error } = await supabase
                    .from('clubs')
                    .update(payload)
                    .eq('id', editingClub.id)
                    .eq(
                        'organisation_id',
                        organisationId
                    )

                if (error) {
                    throw error
                }
            } else {
                const { error } = await supabase
                    .from('clubs')
                    .insert(payload)

                if (error) {
                    throw error
                }
            }

            closeModalAfterSave()
            await loadClubs()
        } catch (saveError) {
            console.error(
                'Could not save club:',
                saveError
            )

            alert(
                saveError instanceof Error
                    ? saveError.message
                    : 'The club could not be saved.'
            )
        } finally {
            setIsSaving(false)
        }
    }

    function requestDeleteClub(club: DbClub) {
        if (isDeleting) {
            return
        }

        setClubToDelete(club)
    }

    function cancelDeleteClub() {
        if (isDeleting) {
            return
        }

        setClubToDelete(null)
    }

    async function confirmDeleteClub() {
        if (
            !organisationId ||
            !clubToDelete ||
            isDeleting
        ) {
            return
        }

        setIsDeleting(true)

        try {
            const { error } = await supabase
                .from('clubs')
                .delete()
                .eq('id', clubToDelete.id)
                .eq(
                    'organisation_id',
                    organisationId
                )

            if (error) {
                throw error
            }

            setClubToDelete(null)
            await loadClubs()
        } catch (deleteError) {
            console.error(
                'Could not delete club:',
                deleteError
            )

            alert(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'The club could not be deleted.'
            )
        } finally {
            setIsDeleting(false)
        }
    }

    if (!currentOrganisation) {
        return (
            <div className="teamsEmptyState">
                <p>
                    No organisation is currently
                    selected.
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="adminSectionHeader mb-6">
                <div>
                    <h2>Clubs</h2>

                    <p>
                        Manage clubs belonging to{' '}
                        {currentOrganisation.name}.
                    </p>
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                >
                    Add Club
                </button>
            </div>

            <ClubsTable
                clubs={clubs}
                loading={loading}
                onEdit={openEditModal}
                onDelete={requestDeleteClub}
            />

            <ClubModal
                open={showModal}
                mode={
                    editingClub
                        ? 'edit'
                        : 'create'
                }
                organisationId={organisationId}
                initialValues={modalInitialValues}
                isSaving={isSaving}
                onClose={closeModal}
                onSave={saveClub}
            />

            <ConfirmDialog
                open={clubToDelete !== null}
                title="Delete club?"
                message={
                    clubToDelete
                        ? `You are about to delete ${clubToDelete.name}. This action cannot be undone.`
                        : ''
                }
                confirmLabel="Delete club"
                cancelLabel="Cancel"
                isProcessing={isDeleting}
                onConfirm={confirmDeleteClub}
                onCancel={cancelDeleteClub}
            />
        </>
    )
}