import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Toast } from '../../common/Toast'
import { GroupModal } from './GroupModal'
import { groupService } from './groupService'
import type {
    CompetitionGroup,
    GroupFormValues,
    GroupMembership,
    GroupTeam,
} from './groupTypes'

const emptyForm: GroupFormValues = {
    name: '',
    sort_order: '1',
    competition_team_ids: [],
}

export function GroupsManager() {
    const [competitionId, setCompetitionId] =
        useState<string | null>(null)

    const [groups, setGroups] = useState<CompetitionGroup[]>([])
    const [teams, setTeams] = useState<GroupTeam[]>([])
    const [memberships, setMemberships] =
        useState<GroupMembership[]>([])

    const [editingGroup, setEditingGroup] =
        useState<CompetitionGroup | null>(null)

    const [groupToDelete, setGroupToDelete] =
        useState<CompetitionGroup | null>(null)

    const [formValues, setFormValues] =
        useState<GroupFormValues>(emptyForm)

    const [showModal, setShowModal] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

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
            const activeCompetitionId =
                await groupService.getActiveCompetitionId()

            setCompetitionId(activeCompetitionId)

            if (!activeCompetitionId) {
                setGroups([])
                setTeams([])
                setMemberships([])
                return
            }

            const [groupRows, teamRows] = await Promise.all([
                groupService.getGroups(activeCompetitionId),
                groupService.getTeams(activeCompetitionId),
            ])

            const membershipRows =
                await groupService.getMemberships(
                    groupRows.map((group) => group.id)
                )

            setGroups(groupRows)
            setTeams(teamRows)
            setMemberships(membershipRows)
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load groups.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadData()
    }, [])

    function openCreateModal() {
        setEditingGroup(null)

        setFormValues({
            ...emptyForm,
            sort_order: String(groups.length + 1),
        })

        setShowModal(true)
    }

    function openEditModal(group: CompetitionGroup) {
        setEditingGroup(group)

        setFormValues({
            name: group.name,
            sort_order: String(group.sort_order),
            competition_team_ids: memberships
                .filter(
                    (membership) => membership.group_id === group.id
                )
                .map(
                    (membership) =>
                        membership.competition_team_id
                ),
        })

        setShowModal(true)
    }

    function closeModal() {
        setEditingGroup(null)
        setFormValues(emptyForm)
        setShowModal(false)
    }

    async function saveGroup() {
        if (!competitionId) {
            showToast(
                'No active competition was found.',
                'error'
            )
            return
        }

        if (!formValues.name.trim()) {
            showToast('Group name is required.', 'error')
            return
        }

        const sortOrder = Number(formValues.sort_order)

        if (
            !formValues.sort_order ||
            Number.isNaN(sortOrder) ||
            sortOrder < 1
        ) {
            showToast(
                'Display order must be at least 1.',
                'error'
            )
            return
        }

        setIsSaving(true)

        const wasEditing = Boolean(editingGroup)

        try {
            if (editingGroup) {
                await groupService.updateGroup(
                    editingGroup.id,
                    formValues
                )
            } else {
                await groupService.createGroup(
                    competitionId,
                    formValues
                )
            }

            closeModal()
            await loadData()

            showToast(
                wasEditing
                    ? 'Group updated successfully.'
                    : 'Group created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save group.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteGroup() {
        if (!groupToDelete) return

        try {
            await groupService.deleteGroup(groupToDelete.id)

            setGroupToDelete(null)
            await loadData()

            showToast(
                'Group deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete group.',
                'error'
            )
        }
    }

    function getGroupTeams(groupId: string): GroupTeam[] {
        const competitionTeamIds = memberships
            .filter(
                (membership) => membership.group_id === groupId
            )
            .map(
                (membership) =>
                    membership.competition_team_id
            )

        return teams.filter((team) =>
            competitionTeamIds.includes(
                team.competition_team_id
            )
        )
    }

    if (isLoading) {
        return <p className="muted">Loading groups...</p>
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
                    <h3>Tournament Groups</h3>

                    <p className="muted">
                        Create competition groups and allocate each
                        registered team to its group.
                    </p>
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openCreateModal}
                    disabled={!competitionId}
                >
                    + Add Group
                </button>
            </div>

            {!competitionId ? (
                <div className="teamsEmptyState">
                    <h3>No active competition</h3>

                    <p>
                        Create or activate a competition before
                        managing tournament groups.
                    </p>
                </div>
            ) : !groups.length ? (
                <div className="teamsEmptyState">
                    <h3>No groups created</h3>

                    <p>
                        Create Group A, Group B or any additional
                        groups required by the competition.
                    </p>
                </div>
            ) : (
                <div className="adminGroupsGrid">
                    {groups.map((group) => {
                        const groupTeams = getGroupTeams(group.id)

                        return (
                            <article
                                className="adminGroupCard"
                                key={group.id}
                            >
                                <div className="adminGroupHeader">
                                    <div>
                                        <span className="badge">
                                            Order {group.sort_order}
                                        </span>

                                        <h4>{group.name}</h4>
                                    </div>

                                    <div className="tableActions">
                                        <button
                                            className="btn secondary small"
                                            type="button"
                                            onClick={() =>
                                                openEditModal(group)
                                            }
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="btn secondary small"
                                            type="button"
                                            onClick={() =>
                                                setGroupToDelete(
                                                    group
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="adminGroupTeams">
                                    {groupTeams.length ? (
                                        groupTeams.map((team) => (
                                            <div
                                                className="adminGroupTeam"
                                                key={
                                                    team.competition_team_id
                                                }
                                            >
                                                {team.logo_url ? (
                                                    <img
                                                        src={
                                                            team.logo_url
                                                        }
                                                        alt={`${team.name} logo`}
                                                    />
                                                ) : (
                                                    <span>
                                                        {team.name
                                                            .split(' ')
                                                            .filter(
                                                                Boolean
                                                            )
                                                            .map(
                                                                (
                                                                    word
                                                                ) =>
                                                                    word[0]
                                                            )
                                                            .join('')
                                                            .slice(0, 3)
                                                            .toUpperCase()}
                                                    </span>
                                                )}

                                                <strong>
                                                    {team.name}
                                                </strong>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="muted">
                                            No teams allocated.
                                        </p>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <GroupModal
                    mode={editingGroup ? 'edit' : 'create'}
                    values={formValues}
                    teams={teams}
                    memberships={memberships}
                    editingGroupId={
                        editingGroup?.id ?? null
                    }
                    isSaving={isSaving}
                    onChange={setFormValues}
                    onClose={closeModal}
                    onSave={saveGroup}
                />
            )}

            {groupToDelete && (
                <ConfirmDialog
                    title="Delete Group"
                    message={`Are you sure you want to delete ${groupToDelete.name}? Fixtures assigned to this group will remain but their group will be cleared.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setGroupToDelete(null)
                    }
                    onConfirm={deleteGroup}
                />
            )}
        </div>
    )
}