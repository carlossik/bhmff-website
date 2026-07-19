import { Modal } from '../../common/Modal'
import type {
    CompetitionTeamForm,
    CompetitionTeamStatus,
    GroupOption,
    TeamOption,
} from './competitionTeamTypes'

type CompetitionTeamModalProps = {
    mode: 'create' | 'edit'

    form: CompetitionTeamForm

    teams: TeamOption[]

    groups: GroupOption[]

    isSaving: boolean

    onChange: (
        field: keyof CompetitionTeamForm,
        value: string | boolean
    ) => void

    onClose: () => void

    onSave: () => void
}

export function CompetitionTeamModal({
                                         mode,
                                         form,
                                         teams,
                                         groups,
                                         isSaving,
                                         onChange,
                                         onClose,
                                         onSave,
                                     }: CompetitionTeamModalProps) {
    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Competition Team'
                    : 'Add Competition Team'
            }
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Team</span>

                    <select
                        value={form.team_id}
                        disabled={mode === 'edit'}
                        onChange={(e) =>
                            onChange(
                                'team_id',
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Select Team
                        </option>

                        {teams.map((team) => (
                            <option
                                key={team.id}
                                value={team.id}
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Group</span>

                    <select
                        value={form.group_id}
                        onChange={(e) =>
                            onChange(
                                'group_id',
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            Not Assigned
                        </option>

                        {groups.map((group) => (
                            <option
                                key={group.id}
                                value={group.id}
                            >
                                {group.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Seed</span>

                    <input
                        type="number"
                        value={form.seed}
                        onChange={(e) =>
                            onChange(
                                'seed',
                                e.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Squad Number</span>

                    <input
                        type="number"
                        value={form.squad_number}
                        onChange={(e) =>
                            onChange(
                                'squad_number',
                                e.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Status</span>

                    <select
                        value={form.status}
                        onChange={(e) =>
                            onChange(
                                'status',
                                e.target
                                    .value as CompetitionTeamStatus
                            )
                        }
                    >
                        <option value="invited">
                            Invited
                        </option>

                        <option value="confirmed">
                            Confirmed
                        </option>

                        <option value="withdrawn">
                            Withdrawn
                        </option>
                    </select>
                </label>

                <label className="adminCheckboxLabel">
                    <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) =>
                            onChange(
                                'published',
                                e.target.checked
                            )
                        }
                    />

                    <span>Published</span>
                </label>
            </div>

            <div className="modalActions">
                <button
                    className="btn secondary"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="btn primary"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving
                        ? 'Saving...'
                        : mode === 'edit'
                            ? 'Update'
                            : 'Save'}
                </button>
            </div>
        </Modal>
    )
}