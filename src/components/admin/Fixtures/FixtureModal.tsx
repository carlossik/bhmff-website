import { Modal } from '../../common/Modal'
import type {
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureStatus,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type FixtureModalProps = {
    mode: 'create' | 'edit'
    values: FixtureFormValues
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    groups: FixtureGroup[]
    groupMemberships: FixtureGroupMembership[]
    isSaving: boolean
    onChange: (values: FixtureFormValues) => void
    onClose: () => void
    onSave: () => void
}

const stages = [
    'Group Stage',
    'Semi Final',
    'Third Place Playoff',
    'Grand Final',
]

const statuses: FixtureStatus[] = [
    'scheduled',
    'postponed',
    'completed',
    'cancelled',
]

export function FixtureModal({
                                 mode,
                                 values,
                                 teams,
                                 venues,
                                 groups,
                                 groupMemberships,
                                 isSaving,
                                 onChange,
                                 onClose,
                                 onSave,
                             }: FixtureModalProps) {
    const isGroupStage = values.stage === 'Group Stage'

    const groupTeamIds = groupMemberships
        .filter(
            (membership) => membership.group_id === values.group_id
        )
        .map((membership) => membership.team_id)

    const availableTeams =
        isGroupStage && values.group_id
            ? teams.filter((team) => groupTeamIds.includes(team.id))
            : teams

    function updateField<K extends keyof FixtureFormValues>(
        field: K,
        value: FixtureFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handleStageChange(stage: string) {
        onChange({
            ...values,
            stage,
            group_id: stage === 'Group Stage' ? values.group_id : '',
            home_team_id: '',
            away_team_id: '',
        })
    }

    function handleGroupChange(groupId: string) {
        onChange({
            ...values,
            group_id: groupId,
            home_team_id: '',
            away_team_id: '',
        })
    }

    return (
        <Modal
            title={mode === 'edit' ? 'Edit Fixture' : 'Add Fixture'}
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Stage</span>

                    <select
                        value={values.stage}
                        onChange={(event) =>
                            handleStageChange(event.target.value)
                        }
                    >
                        <option value="">Select stage</option>

                        {stages.map((stage) => (
                            <option key={stage} value={stage}>
                                {stage}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Status</span>

                    <select
                        value={values.status}
                        onChange={(event) =>
                            updateField(
                                'status',
                                event.target.value as FixtureStatus
                            )
                        }
                    >
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </label>

                {isGroupStage && (
                    <label className="adminFormFullWidth">
                        <span>Competition Group</span>

                        <select
                            value={values.group_id}
                            onChange={(event) =>
                                handleGroupChange(event.target.value)
                            }
                        >
                            <option value="">Select group</option>

                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label>
                    <span>Home Team</span>

                    <select
                        value={values.home_team_id}
                        disabled={isGroupStage && !values.group_id}
                        onChange={(event) =>
                            updateField(
                                'home_team_id',
                                event.target.value
                            )
                        }
                    >
                        <option value="">Select home team</option>

                        {availableTeams.map((team) => (
                            <option
                                key={team.id}
                                value={team.id}
                                disabled={team.id === values.away_team_id}
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Away Team</span>

                    <select
                        value={values.away_team_id}
                        disabled={isGroupStage && !values.group_id}
                        onChange={(event) =>
                            updateField(
                                'away_team_id',
                                event.target.value
                            )
                        }
                    >
                        <option value="">Select away team</option>

                        {availableTeams.map((team) => (
                            <option
                                key={team.id}
                                value={team.id}
                                disabled={team.id === values.home_team_id}
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Kick-off Date and Time</span>

                    <input
                        type="datetime-local"
                        value={values.kickoff_time}
                        onChange={(event) =>
                            updateField(
                                'kickoff_time',
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Venue</span>

                    <select
                        value={values.venue_id}
                        onChange={(event) =>
                            updateField(
                                'venue_id',
                                event.target.value
                            )
                        }
                    >
                        <option value="">Venue to be confirmed</option>

                        {venues.map((venue) => (
                            <option key={venue.id} value={venue.id}>
                                {venue.name}
                            </option>
                        ))}
                    </select>
                </label>
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
                            ? 'Update'
                            : 'Save'}
                </button>
            </div>
        </Modal>
    )
}