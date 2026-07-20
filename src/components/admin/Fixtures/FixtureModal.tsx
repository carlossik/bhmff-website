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
    'Round of 16',
    'Quarter Final',
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

const defaultKickoffTime = '12:00'

function getKickoffDate(kickoffTime: string) {
    if (!kickoffTime) return ''

    return kickoffTime.slice(0, 10)
}

function getKickoffClockTime(kickoffTime: string) {
    if (!kickoffTime) return defaultKickoffTime

    const time = kickoffTime.slice(11, 16)

    return time || defaultKickoffTime
}

function combineKickoffDateAndTime(
    date: string,
    time: string
) {
    if (!date) return ''

    return `${date}T${time || defaultKickoffTime}`
}

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
    const isGroupStage =
        values.stage === 'Group Stage'

    const kickoffDate = getKickoffDate(
        values.kickoff_time
    )

    const kickoffClockTime =
        getKickoffClockTime(
            values.kickoff_time
        )

    const groupCompetitionTeamIds =
        groupMemberships
            .filter(
                (membership) =>
                    membership.group_id ===
                    values.group_id
            )
            .map(
                (membership) =>
                    membership.competition_team_id
            )

    const availableTeams =
        isGroupStage && values.group_id
            ? teams.filter((team) =>
                groupCompetitionTeamIds.includes(
                    team.competition_team_id
                )
            )
            : teams

    const availableHomeTeams =
        availableTeams.filter(
            (team) =>
                team.competition_team_id !==
                values.away_competition_team_id
        )

    const availableAwayTeams =
        availableTeams.filter(
            (team) =>
                team.competition_team_id !==
                values.home_competition_team_id
        )

    const sortedVenues = [...venues].sort(
        (firstVenue, secondVenue) =>
            firstVenue.name.localeCompare(
                secondVenue.name,
                'en-GB',
                {
                    sensitivity: 'base',
                }
            )
    )

    function updateField<
        K extends keyof FixtureFormValues
    >(
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
            group_id:
                stage === 'Group Stage'
                    ? values.group_id
                    : '',
            home_competition_team_id: '',
            away_competition_team_id: '',
        })
    }

    function handleGroupChange(groupId: string) {
        onChange({
            ...values,
            group_id: groupId,
            home_competition_team_id: '',
            away_competition_team_id: '',
        })
    }

    function handleKickoffDateChange(
        date: string
    ) {
        updateField(
            'kickoff_time',
            combineKickoffDateAndTime(
                date,
                kickoffClockTime
            )
        )
    }

    function handleKickoffTimeChange(
        time: string
    ) {
        if (!kickoffDate) {
            return
        }

        updateField(
            'kickoff_time',
            combineKickoffDateAndTime(
                kickoffDate,
                time
            )
        )
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Fixture'
                    : 'Add Fixture'
            }
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label>
                    <span>Stage</span>

                    <select
                        value={values.stage}
                        onChange={(event) =>
                            handleStageChange(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select stage
                        </option>

                        {stages.map((stage) => (
                            <option
                                key={stage}
                                value={stage}
                            >
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
                                event.target
                                    .value as FixtureStatus
                            )
                        }
                    >
                        {statuses.map((status) => (
                            <option
                                key={status}
                                value={status}
                            >
                                {status.replace(
                                    /_/g,
                                    ' '
                                )}
                            </option>
                        ))}
                    </select>
                </label>

                {isGroupStage && (
                    <label className="adminFormFullWidth">
                        <span>
                            Competition Group
                        </span>

                        <select
                            value={values.group_id}
                            onChange={(event) =>
                                handleGroupChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                Select group
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
                )}

                <label>
                    <span>Home Team</span>

                    <select
                        value={
                            values.home_competition_team_id
                        }
                        disabled={
                            isGroupStage &&
                            !values.group_id
                        }
                        onChange={(event) =>
                            updateField(
                                'home_competition_team_id',
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select home team
                        </option>

                        {availableHomeTeams.map(
                            (team) => (
                                <option
                                    key={
                                        team.competition_team_id
                                    }
                                    value={
                                        team.competition_team_id
                                    }
                                >
                                    {team.name}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label>
                    <span>Away Team</span>

                    <select
                        value={
                            values.away_competition_team_id
                        }
                        disabled={
                            isGroupStage &&
                            !values.group_id
                        }
                        onChange={(event) =>
                            updateField(
                                'away_competition_team_id',
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select away team
                        </option>

                        {availableAwayTeams.map(
                            (team) => (
                                <option
                                    key={
                                        team.competition_team_id
                                    }
                                    value={
                                        team.competition_team_id
                                    }
                                >
                                    {team.name}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <div className="adminFormFullWidth">
                    <span>Kick-off</span>
                </div>

                <label>
                    <span>Date</span>

                    <input
                        type="date"
                        value={kickoffDate}
                        onChange={(event) =>
                            handleKickoffDateChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Time</span>

                    <input
                        type="time"
                        value={kickoffClockTime}
                        onChange={(event) =>
                            handleKickoffTimeChange(
                                event.target.value
                            )
                        }
                    />
                </label>

                <label className="adminFormFullWidth">
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
                        <option value="">
                            To be confirmed
                        </option>

                        {sortedVenues.map(
                            (venue) => (
                                <option
                                    key={venue.id}
                                    value={venue.id}
                                >
                                    {venue.name}
                                </option>
                            )
                        )}
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