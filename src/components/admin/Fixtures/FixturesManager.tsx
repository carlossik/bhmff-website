import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { FixtureModal } from './FixtureModal'
import { FixturesTable } from './FixturesTable'
import { fixtureService } from './fixtureService'
import type {
    Festival,
    Fixture,
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

const emptyForm: FixtureFormValues = {
    stage: '',
    group_id: '',
    home_team_id: '',
    away_team_id: '',
    venue_id: '',
    kickoff_time: '',
    status: 'scheduled',
}

function toDateTimeLocal(value: string | null) {
    if (!value) return ''

    const date = new Date(value)

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000
    )

    return localDate.toISOString().slice(0, 16)
}

export function FixturesManager() {
    const [festival, setFestival] = useState<Festival | null>(null)
    const [fixtures, setFixtures] = useState<Fixture[]>([])
    const [teams, setTeams] = useState<FixtureTeam[]>([])
    const [venues, setVenues] = useState<FixtureVenue[]>([])
    const [groups, setGroups] = useState<FixtureGroup[]>([])
    const [groupMemberships, setGroupMemberships] =
        useState<FixtureGroupMembership[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const [editingFixture, setEditingFixture] =
        useState<Fixture | null>(null)

    const [fixtureToDelete, setFixtureToDelete] =
        useState<Fixture | null>(null)

    const [formValues, setFormValues] =
        useState<FixtureFormValues>(emptyForm)

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
                await fixtureService.getActiveFestival()

            setFestival(activeFestival)

            if (!activeFestival) {
                setFixtures([])
                setTeams([])
                setVenues([])
                setGroups([])
                setGroupMemberships([])
                return
            }

            const [
                fixtureRows,
                teamRows,
                venueRows,
                groupRows,
            ] = await Promise.all([
                fixtureService.getFixtures(activeFestival.id),
                fixtureService.getTeams(activeFestival.id),
                fixtureService.getVenues(activeFestival.id),
                fixtureService.getGroups(activeFestival.id),
            ])

            const membershipRows =
                await fixtureService.getGroupMemberships(
                    groupRows.map((group) => group.id)
                )

            setFixtures(fixtureRows)
            setTeams(teamRows)
            setVenues(venueRows)
            setGroups(groupRows)
            setGroupMemberships(membershipRows)
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load fixture data.',
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
        setEditingFixture(null)
        setFormValues(emptyForm)
        setShowModal(true)
    }

    function openEditModal(fixture: Fixture) {
        setEditingFixture(fixture)

        setFormValues({
            stage: fixture.stage,
            group_id: fixture.group_id ?? '',
            home_team_id: fixture.home_team_id ?? '',
            away_team_id: fixture.away_team_id ?? '',
            venue_id: fixture.venue_id ?? '',
            kickoff_time: toDateTimeLocal(fixture.kickoff_time),
            status: fixture.status,
        })

        setShowModal(true)
    }

    function closeModal() {
        setEditingFixture(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    async function saveFixture() {
        if (!festival) {
            showToast('No active festival was found.', 'error')
            return
        }

        if (!formValues.stage.trim()) {
            showToast('Fixture stage is required.', 'error')
            return
        }

        if (
            formValues.stage === 'Group Stage' &&
            !formValues.group_id
        ) {
            showToast(
                'Please select a group for this group-stage fixture.',
                'error'
            )
            return
        }

        if (
            !formValues.home_team_id ||
            !formValues.away_team_id
        ) {
            showToast(
                'Both the home and away teams are required.',
                'error'
            )
            return
        }

        if (
            formValues.home_team_id === formValues.away_team_id
        ) {
            showToast(
                'A team cannot play against itself.',
                'error'
            )
            return
        }

        if (!formValues.kickoff_time) {
            showToast(
                'Kick-off date and time are required.',
                'error'
            )
            return
        }

        if (formValues.stage === 'Group Stage') {
            const groupTeamIds = groupMemberships
                .filter(
                    (membership) =>
                        membership.group_id === formValues.group_id
                )
                .map((membership) => membership.team_id)

            if (
                !groupTeamIds.includes(formValues.home_team_id) ||
                !groupTeamIds.includes(formValues.away_team_id)
            ) {
                showToast(
                    'Both teams must belong to the selected group.',
                    'error'
                )
                return
            }
        }

        setIsSaving(true)

        const wasEditing = Boolean(editingFixture)

        try {
            if (editingFixture) {
                await fixtureService.updateFixture(
                    editingFixture.id,
                    formValues
                )
            } else {
                await fixtureService.createFixture(
                    festival.id,
                    formValues
                )
            }

            closeModal()
            await loadData()

            showToast(
                wasEditing
                    ? 'Fixture updated successfully.'
                    : 'Fixture created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save fixture.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteFixture() {
        if (!fixtureToDelete) return

        try {
            await fixtureService.deleteFixture(fixtureToDelete.id)

            setFixtureToDelete(null)
            await loadData()

            showToast('Fixture deleted successfully.', 'success')
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete fixture.',
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
                    <h3>Fixtures</h3>

                    <p className="muted">
                        Create group-stage and knockout fixtures for the
                        active festival.
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
                    disabled={!festival || teams.length < 2}
                >
                    + Add Fixture
                </button>
            </div>

            {isLoading ? (
                <p className="muted">Loading fixtures...</p>
            ) : (
                <FixturesTable
                    fixtures={fixtures}
                    teams={teams}
                    venues={venues}
                    groups={groups}
                    onEdit={openEditModal}
                    onDelete={setFixtureToDelete}
                />
            )}

            {showModal && (
                <FixtureModal
                    mode={editingFixture ? 'edit' : 'create'}
                    values={formValues}
                    teams={teams}
                    venues={venues}
                    groups={groups}
                    groupMemberships={groupMemberships}
                    isSaving={isSaving}
                    onChange={setFormValues}
                    onClose={closeModal}
                    onSave={saveFixture}
                />
            )}

            {fixtureToDelete && (
                <ConfirmDialog
                    title="Delete Fixture"
                    message={`Are you sure you want to delete this ${fixtureToDelete.stage} fixture?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() => setFixtureToDelete(null)}
                    onConfirm={deleteFixture}
                />
            )}
        </div>
    )
}