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
    function toggleTeam(competitionTeamId: string) {
        const isSelected =
            values.competition_team_ids.includes(
                competitionTeamId
            )

        onChange({
            ...values,
            competition_team_ids: isSelected
                ? values.competition_team_ids.filter(
                    (id) => id !== competitionTeamId
                )
                : [
                    ...values.competition_team_ids,
                    competitionTeamId,
                ],
        })
    }

    function getAssignedGroupId(
        competitionTeamId: string
    ) {
        return memberships.find(
            (membership) =>
                membership.competition_team_id ===
                competitionTeamId
        )?.group_id
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Group'
                    : 'Add Group'
            }
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
                                sort_order:
                                event.target.value,
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
                                getAssignedGroupId(
                                    team.competition_team_id
                                )

                            const assignedElsewhere =
                                Boolean(assignedGroupId) &&
                                assignedGroupId !==
                                editingGroupId

                            return (
                                <label
                                    key={
                                        team.competition_team_id
                                    }
                                    className={`groupTeamOption ${
                                        assignedElsewhere
                                            ? 'disabled'
                                            : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={values.competition_team_ids.includes(
                                            team.competition_team_id
                                        )}
                                        disabled={
                                            assignedElsewhere
                                        }
                                        onChange={() =>
                                            toggleTeam(
                                                team.competition_team_id
                                            )
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

                                    <span>
                                        <strong>
                                            {team.name}
                                        </strong>

                                        {assignedElsewhere && (
                                            <small>
                                                Already
                                                allocated to
                                                another
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