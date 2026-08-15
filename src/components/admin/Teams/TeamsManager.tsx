import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import {
    Plus,
    Users,
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { useOrganisation } from '../../../context/OrganisationContext'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import {
    TeamModal,
    type TeamModalDraft,
} from './TeamModal'
import { TeamsTable } from './TeamsTable'
import {
    deleteTeamLogo,
    replaceTeamLogo,
} from './teamService'
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

    const isClubOrganisation =
        currentOrganisation.organisation_type === 'club'

    const canonicalClub =
        isClubOrganisation
            ? clubs.find(
                  (club) =>
                      club.name.trim().localeCompare(
                          currentOrganisation.name.trim(),
                          undefined,
                          { sensitivity: 'base' }
                      ) === 0
              ) ?? clubs[0] ?? null
            : null

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

    const loadClubs = useCallback(async () => {
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
            setToastMessage(error.message)
            setToastType('error')
            return
        }

        let nextClubs =
            (data ?? []) as ClubOption[]

        if (
            isClubOrganisation &&
            nextClubs.length === 0
        ) {
            const {
                data: createdClub,
                error: createClubError,
            } = await supabase
                .from('clubs')
                .insert({
                    organisation_id:
                        currentOrganisation.id,
                    name:
                        currentOrganisation.name.trim(),
                })
                .select('id, name')
                .single()

            if (createClubError) {
                setToastMessage(
                    `TournamentHQ could not initialise the club record: ${createClubError.message}`
                )
                setToastType('error')
                return
            }

            nextClubs = [createdClub]
        }

        if (isClubOrganisation) {
            const primaryClub =
                nextClubs.find(
                    (club) =>
                        club.name.trim().localeCompare(
                            currentOrganisation.name.trim(),
                            undefined,
                            { sensitivity: 'base' }
                        ) === 0
                ) ?? nextClubs[0] ?? null

            if (primaryClub) {
                setClubId((current) =>
                    current || primaryClub.id
                )

                const { error: repairError } =
                    await supabase
                        .from('teams')
                        .update({
                            club_id: primaryClub.id,
                        })
                        .eq(
                            'organisation_id',
                            currentOrganisation.id
                        )
                        .is('club_id', null)

                if (repairError) {
                    setToastMessage(
                        `The club was loaded, but existing teams could not be linked automatically: ${repairError.message}`
                    )
                    setToastType('error')
                }
            }
        }

        setClubs(nextClubs)
    }, [
        currentOrganisation.id,
        currentOrganisation.name,
        isClubOrganisation,
    ])

    const loadVenues = useCallback(async () => {
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
    }, [currentOrganisation.id])

    useEffect(() => {
        void Promise.all([
            loadClubs(),
            loadVenues(),
        ])
    }, [loadClubs, loadVenues])

    function resetForm() {
        setEditingTeam(null)
        setClubId(
            isClubOrganisation
                ? canonicalClub?.id ?? ''
                : ''
        )
        setTeamName('')
        setAgeGroup('')
        setYearGroup('')
        setGender('Mixed')
        setDivision('')
        setHomeKitColour('')
        setAwayKitColour('')
        setNotes('')
        setLogoUrl('')
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
        setClubId(
            team.club_id ??
                canonicalClub?.id ??
                ''
        )
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

    async function resolveHomeVenueId(
        draft: TeamModalDraft
    ) {
        if (!draft.createNewVenue) {
            if (!draft.primaryHomeVenueId) {
                throw new Error(
                    'A primary home venue is required.'
                )
            }

            return draft.primaryHomeVenueId
        }

        if (
            !draft.newVenueDraft
                .groundName
                .trim()
        ) {
            throw new Error(
                'Enter the ground or venue name.'
            )
        }

        const venueName =
            buildVenueName(
                draft.newVenueDraft
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

        const { data, error } =
            await supabase
                .from('venues')
                .insert({
                    organisation_id:
                    currentOrganisation.id,
                    name: venueName,
                })
                .select('id, name')
                .single()

        if (error) {
            throw error
        }

        const createdVenue =
            data as TeamVenueOption

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

    async function saveTeam(
        draft: TeamModalDraft
    ) {
        const effectiveClubId =
            isClubOrganisation
                ? canonicalClub?.id ?? draft.clubId
                : draft.clubId

        if (!effectiveClubId) {
            showToast(
                isClubOrganisation
                    ? 'Your club workspace is still initialising. Please try again in a moment.'
                    : 'Select a club.',
                'error'
            )
            return
        }

        if (!draft.teamName.trim()) {
            showToast(
                'Team name is required.',
                'error'
            )
            return
        }

        if (
            !draft.createNewVenue &&
            !draft.primaryHomeVenueId
        ) {
            showToast(
                'A primary home venue is required.',
                'error'
            )
            return
        }

        if (
            draft.createNewVenue &&
            !draft.newVenueDraft
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

        if (draft.yearGroup.trim()) {
            parsedYearGroup =
                Number(draft.yearGroup)

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
                await resolveHomeVenueId(
                    draft
                )

            let finalLogoUrl =
                logoUrl

            if (draft.selectedLogo) {
                finalLogoUrl =
                    await replaceTeamLogo(
                        draft.selectedLogo,
                        editingTeam?.logo_url
                    )
            }

            const payload = {
                organisation_id:
                currentOrganisation.id,
                club_id: effectiveClubId,
                name: draft.teamName.trim(),
                age_group:
                    draft.ageGroup.trim() ||
                    null,
                year_group:
                parsedYearGroup,
                gender:
                    draft.gender.trim() ||
                    null,
                division:
                    draft.division.trim() ||
                    null,
                home_kit_colour:
                    draft.homeKitColour.trim() ||
                    null,
                away_kit_colour:
                    draft.awayKitColour.trim() ||
                    null,
                notes:
                    draft.notes.trim() ||
                    null,
                logo_url:
                    finalLogoUrl ||
                    null,
                participation_status:
                draft.participationStatus,
                published:
                draft.published,
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

    const displayTeams =
        isClubOrganisation && canonicalClub
            ? teams.map((team) =>
                  team.club_id
                      ? team
                      : {
                            ...team,
                            club_id:
                                canonicalClub.id,
                        }
              )
            : teams

    return (
        <div className="space-y-6 font-sans">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <section className="flex flex-col gap-5 rounded-3xl border border-lime-900/40 bg-[#121d0f] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-lime-400/10 p-3">
                        <Users className="h-7 w-7 text-lime-400" />
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={openAddTeamModal}
                    disabled={
                        isClubOrganisation &&
                        !canonicalClub
                    }
                >
                    <Plus className="h-5 w-5" />
                    Add Team
                </button>
            </section>

            <TeamsTable
                teams={displayTeams}
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
                    clubSelectionLocked={
                        isClubOrganisation
                    }
                    lockedClubName={
                        canonicalClub?.name ??
                        currentOrganisation.name
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