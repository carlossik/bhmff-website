import {
    useEffect,
    useState,
} from 'react'
import {
    Plus,
    Users,
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { TeamModal } from './TeamModal'
import { TeamsTable } from './TeamsTable'
import {
    deleteTeamLogo,
    replaceTeamLogo,
} from './teamService'
import { venueService } from '../Venues/venueService'
import type {
    ClubOption,
    DbTeam,
    NewTeamVenueDraft,
    TeamParticipationStatus,
    TeamVenueOption,
} from './teamTypes'

type TeamsManagerProps = {
    teams: DbTeam[]
    onTeamCreated: () => void
}

const emptyVenueDraft: NewTeamVenueDraft = {
    groundName: '',
    pitchName: '',
}

function buildVenueName(
    venueDraft: NewTeamVenueDraft
) {
    const groundName =
        venueDraft.groundName.trim()

    const pitchName =
        venueDraft.pitchName.trim()

    return pitchName
        ? `${groundName} — ${pitchName}`
        : groundName
}

export function TeamsManager({
                                 teams,
                                 onTeamCreated,
                             }: TeamsManagerProps) {
    const { currentOrganisation } =
        useOrganisation()

    const { currentCompetition } =
        useCompetition()

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

    const [
        createNewVenue,
        setCreateNewVenue,
    ] = useState(false)

    const [
        newVenueDraft,
        setNewVenueDraft,
    ] = useState<NewTeamVenueDraft>(
        emptyVenueDraft
    )

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
        setCreateNewVenue(false)
        setNewVenueDraft(
            emptyVenueDraft
        )
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
        setCreateNewVenue(false)
        setNewVenueDraft(
            emptyVenueDraft
        )
        setShowTeamModal(true)
    }

    async function resolveHomeVenueId() {
        if (!createNewVenue) {
            if (!primaryHomeVenueId) {
                throw new Error(
                    'A primary home venue is required.'
                )
            }

            return primaryHomeVenueId
        }

        if (
            !newVenueDraft
                .groundName
                .trim()
        ) {
            throw new Error(
                'Enter the ground or venue name.'
            )
        }

        const venueName =
            buildVenueName(
                newVenueDraft
            )

        const existingVenue =
            venues.find(
                (venue) =>
                    venue.name
                        .localeCompare(
                            venueName,
                            undefined,
                            {
                                sensitivity:
                                    'base',
                            }
                        ) === 0
            )

        if (existingVenue) {
            return existingVenue.id
        }

        if (!currentCompetition?.id) {
            throw new Error(
                'Select a competition before creating a venue.'
            )
        }

        const createdVenue =
            await venueService.createVenue(
                currentCompetition.id,
                currentOrganisation.id,
                {
                    name: venueName,
                    address: '',
                    postcode: '',
                    notes: '',
                }
            )

        setVenues((current) =>
            [...current, createdVenue]
                .sort((left, right) =>
                    left.name.localeCompare(
                        right.name,
                        undefined,
                        {
                            sensitivity:
                                'base',
                        }
                    )
                )
        )

        return createdVenue.id
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

        if (
            !createNewVenue &&
            !primaryHomeVenueId
        ) {
            showToast(
                'A primary home venue is required.',
                'error'
            )
            return
        }

        if (
            createNewVenue &&
            !newVenueDraft
                .groundName
                .trim()
        ) {
            showToast(
                'Enter the ground or venue name.',
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
            const finalHomeVenueId =
                await resolveHomeVenueId()

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
                finalHomeVenueId,
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
            await loadVenues()

            closeTeamModal()

            showToast(
                wasEditing
                    ? 'Team and home venue updated successfully.'
                    : 'Team and home venue created successfully.'
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
        <div className="space-y-6 font-sans">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <section className="flex flex-col gap-5 rounded-3xl border border-[color:var(--organisation-border)] bg-[var(--organisation-surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-[color:var(--organisation-accent)]/10 p-3">
                        <Users className="h-7 w-7 text-[var(--organisation-accent)]" />
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            Teams
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Manage teams and their mandatory primary home pitches.
                        </p>
                    </div>
                </div>

                <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] transition hover:opacity-90"
                    type="button"
                    onClick={openAddTeamModal}
                >
                    <Plus className="h-5 w-5" />
                    Add Team
                </button>
            </section>

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
                    createNewVenue={
                        createNewVenue
                    }
                    newVenueDraft={
                        newVenueDraft
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
                    onCreateNewVenueChange={(
                        value
                    ) => {
                        setCreateNewVenue(
                            value
                        )

                        if (value) {
                            setPrimaryHomeVenueId(
                                ''
                            )
                        } else {
                            setNewVenueDraft(
                                emptyVenueDraft
                            )
                        }
                    }}
                    onNewVenueDraftChange={
                        setNewVenueDraft
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