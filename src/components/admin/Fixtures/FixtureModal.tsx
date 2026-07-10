import { Modal } from '../../common/Modal'
import type {
    FixtureFormValues,
    FixtureStatus,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'

type FixtureModalProps = {
    mode: 'create' | 'edit'
    values: FixtureFormValues
    teams: FixtureTeam[]
    venues: FixtureVenue[]
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
                                 isSaving,
                                 onChange,
                                 onClose,
                                 onSave,
                             }: FixtureModalProps) {
    function updateField<K extends keyof FixtureFormValues>(
        field: K,
        value: FixtureFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
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
                            updateField('stage', event.target.value)
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
                                {status.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Home Team</span>
                    <select
                        value={values.home_team_id}
                        onChange={(event) =>
                            updateField('home_team_id', event.target.value)
                        }
                    >
                        <option value="">Select home team</option>
                        {teams.map((team) => (
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
                        onChange={(event) =>
                            updateField('away_team_id', event.target.value)
                        }
                    >
                        <option value="">Select away team</option>
                        {teams.map((team) => (
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
                            updateField('kickoff_time', event.target.value)
                        }
                    />
                </label>

                <label>
                    <span>Venue</span>
                    <select
                        value={values.venue_id}
                        onChange={(event) =>
                            updateField('venue_id', event.target.value)
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

            {!venues.length && (
                <p className="muted">
                    No venues have been added yet. The fixture can still be
                    saved with the venue marked as to be confirmed.
                </p>
            )}

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