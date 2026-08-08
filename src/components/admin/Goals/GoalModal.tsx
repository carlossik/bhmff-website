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
    const teamNames = new Map(
        teams.map((team) => [
            team.id,
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
                team.id ===
                selectedFixture.home_team_id ||
                team.id ===
                selectedFixture.away_team_id
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

        const teamStillValid =
            fixture &&
            (values.team_id ===
                fixture.home_team_id ||
                values.team_id ===
                fixture.away_team_id)

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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-[var(--organisation-text)] [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--organisation-border)] [&_input]:bg-[var(--organisation-background)] [&_input]:px-4 [&_input]:py-3 [&_input]:text-[var(--organisation-text)] [&_input]:outline-none [&_input]:focus:border-[var(--organisation-accent)] [&_select]:rounded-xl [&_select]:border [&_select]:border-[var(--organisation-border)] [&_select]:bg-[var(--organisation-background)] [&_select]:px-4 [&_select]:py-3 [&_select]:text-[var(--organisation-text)] [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[var(--organisation-border)] [&_textarea]:bg-[var(--organisation-background)] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[var(--organisation-text)]">
                <label className="md:col-span-2">
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
                                teamNames.get(
                                    fixture.home_team_id ??
                                    ''
                                ) ??
                                'Home team TBC'

                            const away =
                                teamNames.get(
                                    fixture.away_team_id ??
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

                <label className="md:col-span-2">
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

                <label className="md:col-span-2">
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

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--organisation-border)] pt-5 sm:flex-row sm:justify-end">
                <button
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-5 py-3 font-semibold text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)] disabled:opacity-50"
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancel
                </button>

                <button
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-3 font-bold text-[var(--organisation-on-accent)] transition hover:brightness-110 disabled:opacity-50"
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