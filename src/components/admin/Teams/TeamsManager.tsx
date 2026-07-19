import {
    useEffect,
    useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useOrganisation } from '../../../context/OrganisationContext'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { TeamModal } from './TeamModal'
import { TeamsTable } from './TeamsTable'
import {
    deleteTeamLogo,
    replaceTeamLogo,
} from './teamService'
import type {
    ClubOption,
    DbTeam,
    TeamParticipationStatus,
    TeamVenueOption,
} from './teamTypes'

type TeamsManagerProps = {
    teams: DbTeam[]
    onTeamCreated: () => void
}

export function TeamsManager({
                                 teams,
                                 onTeamCreated,
                             }: TeamsManagerProps) {
    const { currentOrganisation } =
        useOrganisation()

    const [
        showTeamModal,
        setShowTeamModal,
    ] = useState(false)

    const [
        editingTeam,
        setEditingTeam,
    ] = useState<DbTeam | null>(null)

    const [
        teamToDelete,
        setTeamToDelete,
    ] = useState<DbTeam | null>(null)

    const [clubs, setClubs] =
        useState<ClubOption[]>([])

    const [venues, setVenues] =
        useState<TeamVenueOption[]>([])

    const [clubId, setClubId] =
        useState('')

    const [teamName, setTeamName] =
        useState('')

    const [ageGroup, setAgeGroup] =
        useState('')

    const [yearGroup, setYearGroup] =
        useState('')

    const [gender, setGender] =
        useState('Mixed')

    const [division, setDivision] =
        useState('')

    const [
        homeKitColour,
        setHomeKitColour,
    ] = useState('')

    const [
        awayKitColour,
        setAwayKitColour,
    ] = useState('')

    const [notes, setNotes] =
        useState('')

    const [logoUrl, setLogoUrl] =
        useState('')

    const [
        selectedLogo,
        setSelectedLogo,
    ] = useState<File | null>(null)

    const [
        participationStatus,
        setParticipationStatus,
    ] =
        useState<TeamParticipationStatus>(
            'interested'
        )

    const [published, setPublished] =
        useState(false)

    const [
        primaryHomeVenueId,
        setPrimaryHomeVenueId,
    ] = useState('')

    const [isSaving, setIsSaving] =
        useState(false)

    const [
        toastMessage,
        setToastMessage,
    ] = useState('')

    const [
        toastType,
        setToastType,
    ] = useState<
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

    async function loadClubs() {
        const { data, error } =
            await supabase
                .from('clubs')
                .select('id, name')
                .eq(
                    'organisation_id',
                    currentOrganisation.id
                )
                .order('name', {
                    ascending: true,
                })

        if (error) {
            showToast(
                error.message,
                'error'
            )
            return
        }

        setClubs(data ?? [])
    }

    async function loadVenues() {
        const { data, error } =
            await supabase
                .from('venues')
                .select('id, name')
                .eq(
                    'organisation_id',
                    currentOrganisation.id
                )
                .order('name', {
                    ascending: true,
                })

        if (error) {
            console.error(
                'Failed to load venues:',
                error
            )
            setVenues([])
            return
        }

        setVenues(data ?? [])
    }

    useEffect(() => {
        void Promise.all([
            loadClubs(),
            loadVenues(),
        ])
    }, [currentOrganisation.id])

    function resetForm() {
        setEditingTeam(null)
        setClubId('')
        setTeamName('')
        setAgeGroup('')
        setYearGroup('')
        setGender('Mixed')
        setDivision('')
        setHomeKitColour('')
        setAwayKitColour('')
        setNotes('')
        setLogoUrl('')
        setSelectedLogo(null)
        setParticipationStatus(
            'interested'
        )
        setPublished(false)
        setPrimaryHomeVenueId('')
    }

    function closeTeamModal() {
        resetForm()
        setShowTeamModal(false)
    }

    function openAddTeamModal() {
        resetForm()
        setShowTeamModal(true)
    }

    function openEditTeamModal(
        team: DbTeam
    ) {
        setEditingTeam(team)
        setClubId(team.club_id ?? '')
        setTeamName(team.name)
        setAgeGroup(
            team.age_group ?? ''
        )
        setYearGroup(
            team.year_group?.toString() ??
            ''
        )
        setGender(
            team.gender ?? 'Mixed'
        )
        setDivision(
            team.division ?? ''
        )
        setHomeKitColour(
            team.home_kit_colour ?? ''
        )
        setAwayKitColour(
            team.away_kit_colour ?? ''
        )
        setNotes(team.notes ?? '')
        setLogoUrl(team.logo_url ?? '')
        setSelectedLogo(null)
        setParticipationStatus(
            team.participation_status ??
            'interested'
        )
        setPublished(
            team.published ?? false
        )
        setPrimaryHomeVenueId(
            team.primary_home_venue_id ??
            ''
        )
        setShowTeamModal(true)
    }

    async function saveTeam() {
        if (!clubId) {
            showToast(
                'Select a club.',
                'error'
            )
            return
        }

        if (!teamName.trim()) {
            showToast(
                'Team name is required.',
                'error'
            )
            return
        }

        let parsedYearGroup:
            | number
            | null = null

        if (yearGroup.trim()) {
            parsedYearGroup =
                Number(yearGroup)

            if (
                !Number.isInteger(
                    parsedYearGroup
                ) ||
                parsedYearGroup < 1900 ||
                parsedYearGroup > 2200
            ) {
                showToast(
                    'Enter a valid year group.',
                    'error'
                )
                return
            }
        }

        setIsSaving(true)

        try {
            let finalLogoUrl =
                logoUrl

            if (selectedLogo) {
                finalLogoUrl =
                    await replaceTeamLogo(
                        selectedLogo,
                        editingTeam?.logo_url
                    )
            }

            const payload = {
                organisation_id:
                currentOrganisation.id,
                club_id: clubId,
                name: teamName.trim(),
                age_group:
                    ageGroup.trim() ||
                    null,
                year_group:
                parsedYearGroup,
                gender:
                    gender.trim() ||
                    null,
                division:
                    division.trim() ||
                    null,
                home_kit_colour:
                    homeKitColour.trim() ||
                    null,
                away_kit_colour:
                    awayKitColour.trim() ||
                    null,
                notes:
                    notes.trim() ||
                    null,
                logo_url:
                    finalLogoUrl ||
                    null,
                participation_status:
                participationStatus,
                published,
                primary_home_venue_id:
                    primaryHomeVenueId ||
                    null,
            }

            if (editingTeam) {
                const { error } =
                    await supabase
                        .from('teams')
                        .update(payload)
                        .eq(
                            'id',
                            editingTeam.id
                        )
                        .eq(
                            'organisation_id',
                            currentOrganisation.id
                        )

                if (error) {
                    throw error
                }
            } else {
                const { error } =
                    await supabase
                        .from('teams')
                        .insert(payload)

                if (error) {
                    throw error
                }
            }

            const wasEditing =
                Boolean(editingTeam)

            await onTeamCreated()

            closeTeamModal()

            showToast(
                wasEditing
                    ? 'Team updated successfully.'
                    : 'Team created successfully.'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save team.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function togglePublished(
        team: DbTeam
    ) {
        try {
            const nextPublished =
                !team.published

            const { error } =
                await supabase
                    .from('teams')
                    .update({
                        published:
                        nextPublished,
                    })
                    .eq('id', team.id)
                    .eq(
                        'organisation_id',
                        currentOrganisation.id
                    )

            if (error) {
                throw error
            }

            await onTeamCreated()

            showToast(
                nextPublished
                    ? `${team.name} is now published.`
                    : `${team.name} is now unpublished.`
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to update team visibility.',
                'error'
            )
        }
    }

    async function deleteTeam() {
        if (!teamToDelete) {
            return
        }

        const team = teamToDelete

        try {
            const { error } =
                await supabase
                    .from('teams')
                    .delete()
                    .eq('id', team.id)
                    .eq(
                        'organisation_id',
                        currentOrganisation.id
                    )

            if (error) {
                throw error
            }

            if (team.logo_url) {
                await deleteTeamLogo(
                    team.logo_url
                )
            }

            setTeamToDelete(null)

            await onTeamCreated()

            showToast(
                'Team deleted successfully.'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete team.',
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
                    <h3>Teams</h3>

                    <p className="muted">
                        Manage teams belonging to
                        clubs in this organisation.
                    </p>
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={
                        openAddTeamModal
                    }
                >
                    + Add Team
                </button>
            </div>

            <TeamsTable
                teams={teams}
                clubs={clubs}
                onEdit={
                    openEditTeamModal
                }
                onDelete={
                    setTeamToDelete
                }
                onTogglePublished={
                    togglePublished
                }
            />

            {showTeamModal && (
                <TeamModal
                    mode={
                        editingTeam
                            ? 'edit'
                            : 'create'
                    }
                    clubId={clubId}
                    teamName={teamName}
                    ageGroup={ageGroup}
                    yearGroup={yearGroup}
                    gender={gender}
                    division={division}
                    homeKitColour={
                        homeKitColour
                    }
                    awayKitColour={
                        awayKitColour
                    }
                    notes={notes}
                    logoUrl={logoUrl}
                    participationStatus={
                        participationStatus
                    }
                    published={published}
                    primaryHomeVenueId={
                        primaryHomeVenueId
                    }
                    clubs={clubs}
                    venues={venues}
                    isSaving={isSaving}
                    onClubIdChange={
                        setClubId
                    }
                    onTeamNameChange={
                        setTeamName
                    }
                    onAgeGroupChange={
                        setAgeGroup
                    }
                    onYearGroupChange={
                        setYearGroup
                    }
                    onGenderChange={
                        setGender
                    }
                    onDivisionChange={
                        setDivision
                    }
                    onHomeKitColourChange={
                        setHomeKitColour
                    }
                    onAwayKitColourChange={
                        setAwayKitColour
                    }
                    onNotesChange={
                        setNotes
                    }
                    onParticipationStatusChange={
                        setParticipationStatus
                    }
                    onPublishedChange={
                        setPublished
                    }
                    onPrimaryHomeVenueChange={
                        setPrimaryHomeVenueId
                    }
                    onLogoSelected={
                        setSelectedLogo
                    }
                    onClose={
                        closeTeamModal
                    }
                    onSave={saveTeam}
                />
            )}

            {teamToDelete && (
                <ConfirmDialog
                    title="Delete Team"
                    message={`Are you sure you want to delete ${teamToDelete.name}?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setTeamToDelete(
                            null
                        )
                    }
                    onConfirm={
                        deleteTeam
                    }
                />
            )}
        </div>
    )
}