import { Modal } from '../../common/Modal'
import type {
    GoalFixture,
    GoalFormValues,
    GoalTeam,
} from './goalTypes'

type GoalModalProps = {
    mode: 'create' | 'edit'
    values: GoalFormValues
    fixtures: GoalFixture[]
    teams: GoalTeam[]
    isSaving: boolean
    onChange: (values: GoalFormValues) => void
    onClose: () => void
    onSave: () => void
}

export function GoalModal({
                              mode,
                              values,
                              fixtures,
                              teams,
                              isSaving,
                              onChange,
                              onClose,
                              onSave,
                          }: GoalModalProps) {
    const competitionTeamNames = new Map(
        teams.map((team) => [
            team.competition_team_id,
            team.name.trim(),
        ])
    )

    const selectedFixture = fixtures.find(
        (fixture) =>
            fixture.id === values.fixture_id
    )

    const selectableTeams = selectedFixture
        ? teams.filter(
            (team) =>
                team.competition_team_id ===
                selectedFixture.home_competition_team_id ||
                team.competition_team_id ===
                selectedFixture.away_competition_team_id
        )
        : []

    function updateField<
        K extends keyof GoalFormValues,
    >(
        field: K,
        value: GoalFormValues[K]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handleFixtureChange(
        fixtureId: string
    ) {
        const fixture = fixtures.find(
            (item) => item.id === fixtureId
        )

        const selectedTeam = teams.find(
            (team) =>
                team.id === values.team_id
        )

        const teamStillValid =
            fixture &&
            selectedTeam &&
            (selectedTeam.competition_team_id ===
                fixture.home_competition_team_id ||
                selectedTeam.competition_team_id ===
                fixture.away_competition_team_id)

        onChange({
            ...values,
            fixture_id: fixtureId,
            team_id: teamStillValid
                ? values.team_id
                : '',
        })
    }

    return (
        <Modal
            title={
                mode === 'edit'
                    ? 'Edit Goal'
                    : 'Add Goal'
            }
            onClose={onClose}
        >
            <div className="adminFormGrid">
                <label className="adminFormFullWidth">
                    <span>Fixture</span>

                    <select
                        value={values.fixture_id}
                        onChange={(event) =>
                            handleFixtureChange(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select fixture
                        </option>

                        {fixtures.map((fixture) => {
                            const home =
                                competitionTeamNames.get(
                                    fixture.home_competition_team_id ??
                                    ''
                                ) ??
                                'Home team TBC'

                            const away =
                                competitionTeamNames.get(
                                    fixture.away_competition_team_id ??
                                    ''
                                ) ??
                                'Away team TBC'

                            return (
                                <option
                                    key={fixture.id}
                                    value={fixture.id}
                                >
                                    {fixture.stage}: {home}{' '}
                                    vs {away}
                                </option>
                            )
                        })}
                    </select>
                </label>

                <label>
                    <span>Scoring Team</span>

                    <select
                        value={values.team_id}
                        onChange={(event) =>
                            updateField(
                                'team_id',
                                event.target.value
                            )
                        }
                        disabled={
                            !values.fixture_id
                        }
                    >
                        <option value="">
                            Select team
                        </option>

                        {selectableTeams.map(
                            (team) => (
                                <option
                                    key={team.id}
                                    value={team.id}
                                >
                                    {team.name}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label>
                    <span>Minute</span>

                    <input
                        type="number"
                        min="1"
                        max="130"
                        value={values.minute}
                        onChange={(event) =>
                            updateField(
                                'minute',
                                event.target.value
                            )
                        }
                        placeholder="e.g. 42"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>Player Name</span>

                    <input
                        value={values.player_name}
                        onChange={(event) =>
                            updateField(
                                'player_name',
                                event.target.value
                            )
                        }
                        placeholder="Enter scorer name"
                    />
                </label>

                <label className="adminFormFullWidth">
                    <span>
                        Video Timestamp
                    </span>

                    <input
                        value={
                            values.video_timestamp
                        }
                        onChange={(event) =>
                            updateField(
                                'video_timestamp',
                                event.target.value
                            )
                        }
                        placeholder="e.g. 12:45"
                    />
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