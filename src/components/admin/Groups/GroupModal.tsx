import { Modal } from '../../common/Modal'
import type {
    GroupFormValues,
    GroupMembership,
    GroupTeam,
} from './groupTypes'

type GroupModalProps = {
    mode: 'create' | 'edit'
    values: GroupFormValues
    teams: GroupTeam[]
    memberships: GroupMembership[]
    editingGroupId: string | null
    isSaving: boolean
    onChange: (values: GroupFormValues) => void
    onClose: () => void
    onSave: () => void
}

export function GroupModal({
                               mode,
                               values,
                               teams,
                               memberships,
                               editingGroupId,
                               isSaving,
                               onChange,
                               onClose,
                               onSave,
                           }: GroupModalProps) {
    function toggleTeam(teamId: string) {
        const isSelected = values.team_ids.includes(teamId)

        onChange({
            ...values,
            team_ids: isSelected
                ? values.team_ids.filter((id) => id !== teamId)
                : [...values.team_ids, teamId],
        })
    }

    function getAssignedGroupId(teamId: string) {
        return memberships.find(
            (membership) => membership.team_id === teamId
        )?.group_id
    }

    return (
        <Modal
            title={mode === 'edit' ? 'Edit Group' : 'Add Group'}
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Group Name</span>

                    <input
                        value={values.name}
                        onChange={(event) =>
                            onChange({
                                ...values,
                                name: event.target.value,
                            })
                        }
                        placeholder="e.g. Group A"
                        autoFocus
                    />
                </label>

                <label>
                    <span>Display Order</span>

                    <input
                        type="number"
                        min="1"
                        value={values.sort_order}
                        onChange={(event) =>
                            onChange({
                                ...values,
                                sort_order: event.target.value,
                            })
                        }
                    />
                </label>

                <div className="adminFormFullWidth">
                    <span className="adminFieldLabel">
                        Allocate Teams
                    </span>

                    <div className="groupTeamSelector">
                        {teams.map((team) => {
                            const assignedGroupId =
                                getAssignedGroupId(team.id)

                            const assignedElsewhere =
                                Boolean(assignedGroupId) &&
                                assignedGroupId !== editingGroupId

                            return (
                                <label
                                    className={`groupTeamOption ${
                                        assignedElsewhere
                                            ? 'disabled'
                                            : ''
                                    }`}
                                    key={team.id}
                                >
                                    <input
                                        type="checkbox"
                                        checked={values.team_ids.includes(
                                            team.id
                                        )}
                                        disabled={assignedElsewhere}
                                        onChange={() =>
                                            toggleTeam(team.id)
                                        }
                                    />

                                    {team.logo_url ? (
                                        <img
                                            src={team.logo_url}
                                            alt={`${team.name} logo`}
                                        />
                                    ) : (
                                        <span className="groupTeamInitials">
                                            {team.name
                                                .split(' ')
                                                .filter(Boolean)
                                                .map((word) => word[0])
                                                .join('')
                                                .slice(0, 3)
                                                .toUpperCase()}
                                        </span>
                                    )}

                                    <span>
                                        <strong>{team.name}</strong>

                                        {assignedElsewhere && (
                                            <small>
                                                Already allocated to another
                                                group
                                            </small>
                                        )}
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="modalActions">
                <button
                    className="btn secondary"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="btn primary"
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update Group'
                            : 'Create Group'}
                </button>
            </div>
        </Modal>
    )
}