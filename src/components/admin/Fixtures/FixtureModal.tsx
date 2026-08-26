import {
    useEffect,
} from 'react'
import {
    CalendarDays,
    MapPin,
    Save,
    Shield,
    Sparkles,
    Trophy,
    Users,
    X,
} from 'lucide-react'
import { TournamentHQBrand } from '../../common/TournamentHQBrand'
import type { Official } from '../../../types/officialTypes'

import type {
    FixtureFormValues,
    FixtureGroup,
    FixtureGroupMembership,
    FixtureStatus,
    MatchFormat,
    FixtureTeam,
    FixtureVenue,
} from './fixtureTypes'
import type {
    ClubFixtureFormValues,
    ClubFixtureStatus,
    MatchFormat as ClubMatchFormat,
    ClubFixtureType,
    ClubHomeAway,
} from './clubFixtureTypes'

type CompetitionFixtureModalProps = {
    mode: 'create' | 'edit'
    values: FixtureFormValues
    teams: FixtureTeam[]
    venues: FixtureVenue[]
    groups: FixtureGroup[]
    groupMemberships: FixtureGroupMembership[]
    officials: Official[]
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

const matchFormats: readonly MatchFormat[] = ['5v5', '7v7', '9v9', '11v11']

const statuses: FixtureStatus[] = [
    'scheduled',
    'postponed',
    'completed',
    'cancelled',
]

const defaultKickoffTime = '12:00'

const fieldClassName =
    'mt-2 w-full rounded-xl border border-lime-900/60 bg-[#0c160b] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:font-normal placeholder:text-slate-600 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 disabled:cursor-not-allowed disabled:opacity-50'

const labelClassName =
    'block text-sm font-semibold text-slate-300'

function getKickoffDate(
    kickoffTime: string
) {
    if (!kickoffTime) return ''

    return kickoffTime.slice(0, 10)
}

function getKickoffClockTime(
    kickoffTime: string
) {
    if (!kickoffTime) {
        return defaultKickoffTime
    }

    const time =
        kickoffTime.slice(11, 16)

    return time || defaultKickoffTime
}

function combineKickoffDateAndTime(
    date: string,
    time: string
) {
    if (!date) return ''

    return `${date}T${time || defaultKickoffTime}`
}
function getTodayLocalDate() {
    const today = new Date()

    const year = today.getFullYear()
    const month = String(
        today.getMonth() + 1
    ).padStart(2, '0')
    const day = String(
        today.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatTeamDisplayName(
    team: FixtureTeam
) {
    return team.club_name
        ? `${team.club_name} — ${team.team_name}`
        : team.team_name
}

function formatStatus(
    status: FixtureStatus
) {
    return (
        status.charAt(0).toUpperCase() +
        status.slice(1).replace(/_/g, ' ')
    )
}


function formatOfficialDisplayName(
    official: Official
) {
    const fullName =
        official.full_name?.trim()

    if (fullName) {
        return fullName
    }

    return [
        official.first_name,
        official.last_name,
    ]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Unnamed official'
}

function CompetitionFixtureModal({
                                 mode,
                                 values,
                                 teams,
                                 venues,
                                 groups,
                                 groupMemberships,
                                 officials,
                                 isSaving,
                                 onChange,
                                 onClose,
                                 onSave,
                             }: CompetitionFixtureModalProps) {
    const isGroupStage =
        values.stage === 'Group Stage'

    const kickoffDate =
        getKickoffDate(
            values.kickoff_time
        )

    const kickoffClockTime =
        getKickoffClockTime(
            values.kickoff_time
        )
    const minimumFixtureDate =
        mode === 'create'
            ? getTodayLocalDate()
            : undefined

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
        isGroupStage &&
        values.group_id
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

    const sortedVenues =
        [...venues].sort(
            (
                firstVenue,
                secondVenue
            ) =>
                firstVenue.name.localeCompare(
                    secondVenue.name,
                    'en-GB',
                    {
                        sensitivity:
                            'base',
                    }
                )
        )


    const activeOfficials =
        officials
            .filter(
                (official) =>
                    official.status ===
                    'active'
            )
            .sort(
                (
                    firstOfficial,
                    secondOfficial
                ) =>
                    formatOfficialDisplayName(
                        firstOfficial
                    ).localeCompare(
                        formatOfficialDisplayName(
                            secondOfficial
                        ),
                        'en-GB',
                        {
                            sensitivity:
                                'base',
                        }
                    )
            )

    const referees =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'referee'
        )

    const assistantReferees =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'assistant_referee'
        )

    const fourthOfficials =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'fourth_official'
        )

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (
                event.key === 'Escape' &&
                !isSaving
            ) {
                onClose()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [
        isSaving,
        onClose,
    ])

    function updateField<
        Key extends keyof FixtureFormValues
    >(
        field: Key,
        value: FixtureFormValues[Key]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handleStageChange(
        stage: string
    ) {
        onChange({
            ...values,
            stage,
            group_id:
                stage === 'Group Stage'
                    ? values.group_id
                    : '',
            home_competition_team_id:
                '',
            away_competition_team_id:
                '',
        })
    }

    function handleGroupChange(
        groupId: string
    ) {
        onChange({
            ...values,
            group_id: groupId,
            home_competition_team_id:
                '',
            away_competition_team_id:
                '',
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
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 font-sans backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !isSaving
                ) {
                    onClose()
                }
            }}
        >
            <section
                aria-labelledby="fixture-modal-title"
                aria-modal="true"
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-lime-900/60 bg-[#0d170c] shadow-2xl shadow-black/70"
                role="dialog"
            >
                <header className="flex shrink-0 items-center justify-between border-b border-lime-900/50 bg-[#10190f] px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-5">
                        <TournamentHQBrand
                            variant="compact"
                            size="sm"
                        />

                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.20em] text-lime-400">
                                Fixture Administration
                            </p>

                            <h2
                                id="fixture-modal-title"
                                className="mt-1 text-3xl font-black tracking-tight text-white"
                            >
                                {mode === 'edit'
                                    ? 'Edit Football Fixture'
                                    : 'Add Football Fixture'}
                            </h2>

                            <p className="mt-2 text-sm text-slate-400">
                                Schedule fixtures, assign venues and prepare match officials for this competition.
                            </p>
                        </div>
                    </div>

                    <button
                        aria-label="Close fixture form"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lime-800/60 bg-black/20 text-slate-300 transition hover:border-lime-500 hover:bg-lime-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <Trophy className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Competition stage
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Choose the stage and, where applicable, the competition group.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Stage
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <select
                                        className={fieldClassName}
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

                                        {stages.map(
                                            (stage) => (
                                                <option
                                                    key={stage}
                                                    value={stage}
                                                >
                                                    {stage}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Status

                                    <select
                                        className={fieldClassName}
                                        value={values.status}
                                        onChange={(event) =>
                                            updateField(
                                                'status',
                                                event.target.value as FixtureStatus
                                            )
                                        }
                                    >
                                        {statuses.map(
                                            (status) => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {formatStatus(
                                                        status
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Match format
                                    <select
                                        className={fieldClassName}
                                        value={values.match_format ?? '11v11'}
                                        onChange={(event) =>
                                            updateField('match_format', event.target.value as MatchFormat)
                                        }
                                    >
                                        {matchFormats.map((format) => (
                                            <option key={format} value={format}>{format}</option>
                                        ))}
                                    </select>
                                </label>

                                {isGroupStage && (
                                    <label className={`${labelClassName} md:col-span-2`}>
                                        Competition group
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>

                                        <select
                                            className={fieldClassName}
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

                                            {groups.map(
                                                (group) => (
                                                    <option
                                                        key={group.id}
                                                        value={group.id}
                                                    >
                                                        {group.name}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <Users className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Teams
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Select the home and away teams. Club names are included for clarity.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Home team
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <select
                                        className={fieldClassName}
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
                                                    {formatTeamDisplayName(
                                                        team
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Away team
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <select
                                        className={fieldClassName}
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
                                                    {formatTeamDisplayName(
                                                        team
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <CalendarDays className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Kick-off
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Set the fixture date and kick-off time.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Date
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <input
                                        className={fieldClassName}
                                        type="date"
                                        min={minimumFixtureDate}
                                        value={kickoffDate}
                                        required
                                        onChange={(event) => {
                                            const selectedDate =
                                                event.target.value

                                            if (
                                                mode === 'create' &&
                                                selectedDate &&
                                                selectedDate <
                                                getTodayLocalDate()
                                            ) {
                                                onChange({
                                                    ...values,
                                                    kickoff_time: '',
                                                })

                                                return
                                            }

                                            handleKickoffDateChange(
                                                selectedDate
                                            )
                                        }}
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Time
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <input
                                        className={fieldClassName}
                                        type="time"
                                        value={kickoffClockTime}
                                        onChange={(event) =>
                                            handleKickoffTimeChange(
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-lime-400/10 p-3">
                                    <MapPin className="h-5 w-5 text-lime-400" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Venue
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Select the pitch or venue for this fixture.
                                    </p>
                                </div>
                            </div>

                            <label className={`${labelClassName} mt-5`}>
                                Fixture venue

                                <select
                                    className={fieldClassName}
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
                        </section>

                        <section className="rounded-2xl border border-lime-900/50 bg-black/20 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-lime-400/10 p-3">
                                        <Shield className="h-5 w-5 text-lime-400" />
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-white">
                                            Match Officials
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-400">
                                            Select active officials for this fixture. Assignment saving will be enabled in Phase 3.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-700/60 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-300 opacity-60"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    AI Recommend
                                </button>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Referee
                                    <select className={fieldClassName} defaultValue="">
                                        <option value="">
                                            {referees.length ? 'Select referee' : 'No active referees available'}
                                        </option>
                                        {referees.map((official) => (
                                            <option key={official.id} value={official.id}>
                                                {formatOfficialDisplayName(official)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Fourth Official
                                    <select className={fieldClassName} defaultValue="">
                                        <option value="">
                                            {fourthOfficials.length ? 'Select fourth official' : 'No active fourth officials available'}
                                        </option>
                                        {fourthOfficials.map((official) => (
                                            <option key={official.id} value={official.id}>
                                                {formatOfficialDisplayName(official)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Assistant Referee 1
                                    <select className={fieldClassName} defaultValue="">
                                        <option value="">
                                            {assistantReferees.length ? 'Select assistant referee' : 'No active assistant referees available'}
                                        </option>
                                        {assistantReferees.map((official) => (
                                            <option key={official.id} value={official.id}>
                                                {formatOfficialDisplayName(official)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Assistant Referee 2
                                    <select className={fieldClassName} defaultValue="">
                                        <option value="">
                                            {assistantReferees.length ? 'Select assistant referee' : 'No active assistant referees available'}
                                        </option>
                                        {assistantReferees.map((official) => (
                                            <option key={official.id} value={official.id}>
                                                {formatOfficialDisplayName(official)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="mt-6 rounded-xl border border-dashed border-lime-700/40 bg-lime-400/[0.04] p-4">
                                <p className="text-sm font-semibold text-lime-300">
                                    {activeOfficials.length} active official{activeOfficials.length === 1 ? '' : 's'} available
                                </p>

                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    {activeOfficials.length
                                        ? 'Officials are filtered by the selected competition sport and active status.'
                                        : 'Add active officials for this sport in Sports Officials before assigning them to fixtures.'}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-lime-900/50 bg-[#0b140a] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-900/60 bg-black/20 px-5 py-3 text-sm font-bold text-white transition hover:border-lime-500/70 hover:bg-lime-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4" />

                        {isSaving
                            ? 'Saving...'
                            : mode === 'edit'
                                ? 'Update Fixture'
                                : 'Save Fixture'}
                    </button>
                </footer>
            </section>
        </div>
    )
}

type ClubFixtureModalProps = {
    context: 'club'
    mode: 'create' | 'edit'
    values: ClubFixtureFormValues
    clubName: string
    teamName: string
    isSaving: boolean
    onChange: (values: ClubFixtureFormValues) => void
    onClose: () => void
    onSave: () => void
}

type SharedFixtureModalProps =
    | CompetitionFixtureModalProps
    | ClubFixtureModalProps

const clubMatchFormats: readonly ClubMatchFormat[] = ['5v5', '7v7', '9v9', '11v11']

const clubStatuses: Array<{
    value: ClubFixtureStatus
    label: string
}> = [
    { value: 'proposed', label: 'Proposed' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'played', label: 'Played' },
    { value: 'postponed', label: 'Postponed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'abandoned', label: 'Abandoned' },
]

const clubFixtureTypes: Array<{
    value: ClubFixtureType
    label: string
}> = [
    { value: 'friendly', label: 'Friendly' },
    { value: 'league', label: 'League' },
    { value: 'cup', label: 'Cup' },
    { value: 'tournament', label: 'Tournament' },
    { value: 'other', label: 'Other' },
]

const clubHomeAwayOptions: Array<{
    value: ClubHomeAway
    label: string
}> = [
    { value: 'home', label: 'Home' },
    { value: 'away', label: 'Away' },
    { value: 'neutral', label: 'Neutral' },
]

function ClubFixtureModal({
    mode,
    values,
    clubName,
    teamName,
    isSaving,
    onChange,
    onClose,
    onSave,
}: ClubFixtureModalProps) {
    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow
        document.body.style.overflow = 'hidden'

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isSaving) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isSaving, onClose])

    function updateField<
        Key extends keyof ClubFixtureFormValues
    >(
        field: Key,
        value: ClubFixtureFormValues[Key]
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    const matchPreview =
        values.home_away === 'away'
            ? `${values.opponent_name.trim() || 'Opponent'} vs ${teamName}`
            : values.home_away === 'neutral'
              ? `${teamName} vs ${values.opponent_name.trim() || 'Opponent'} (Neutral)`
              : `${teamName} vs ${values.opponent_name.trim() || 'Opponent'}`

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 font-sans backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !isSaving
                ) {
                    onClose()
                }
            }}
        >
            <section
                aria-labelledby="club-fixture-modal-title"
                aria-modal="true"
                className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] shadow-2xl shadow-black/70"
                role="dialog"
            >
                <header className="flex shrink-0 items-center justify-between border-b border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-5">
                        <TournamentHQBrand
                            variant="compact"
                            size="sm"
                        />

                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.20em] text-[var(--organisation-accent)]">
                                Club Fixture Administration
                            </p>

                            <h2
                                id="club-fixture-modal-title"
                                className="mt-1 text-2xl font-black tracking-tight text-[var(--organisation-text)] sm:text-3xl"
                            >
                                {mode === 'edit'
                                    ? 'Edit Fixture'
                                    : 'Add Fixture'}
                            </h2>

                            <p className="mt-1 text-sm text-[color:var(--organisation-text)]/60">
                                {clubName} · {teamName}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-xl border border-[var(--organisation-border)] bg-black/20 p-2 text-[var(--organisation-text)] transition hover:bg-white/10 disabled:opacity-40"
                        aria-label="Close fixture editor"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="overflow-y-auto px-6 py-6 sm:px-8">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-[var(--organisation-border)] bg-black/15 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-[color:var(--organisation-accent)]/10 p-3">
                                    <Users className="h-5 w-5 text-[var(--organisation-accent)]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--organisation-text)]">
                                        Match
                                    </h3>
                                    <p className="mt-1 text-sm text-[color:var(--organisation-text)]/60">
                                        Type the opponent. TournamentHQ will reuse an existing opponent record or create it automatically.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Opponent <span className="text-red-400">*</span>
                                    <input
                                        className={fieldClassName}
                                        type="text"
                                        value={values.opponent_name}
                                        placeholder="e.g. Bexley Borough U15"
                                        autoComplete="off"
                                        onChange={(event) =>
                                            updateField(
                                                'opponent_name',
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Home / Away
                                    <select
                                        className={fieldClassName}
                                        value={values.home_away}
                                        onChange={(event) =>
                                            updateField(
                                                'home_away',
                                                event.target.value as ClubHomeAway
                                            )
                                        }
                                    >
                                        {clubHomeAwayOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="mt-5 rounded-xl border border-[color:var(--organisation-accent)]/30 bg-[color:var(--organisation-accent)]/5 px-4 py-3 text-sm font-semibold text-[var(--organisation-text)]">
                                {matchPreview}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-[var(--organisation-border)] bg-black/15 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-[color:var(--organisation-accent)]/10 p-3">
                                    <CalendarDays className="h-5 w-5 text-[var(--organisation-accent)]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--organisation-text)]">
                                        Schedule
                                    </h3>
                                    <p className="mt-1 text-sm text-[color:var(--organisation-text)]/60">
                                        Set the date, kick-off, fixture type and current status.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Date <span className="text-red-400">*</span>
                                    <input
                                        className={fieldClassName}
                                        type="date"
                                        value={values.fixture_date}
                                        onChange={(event) =>
                                            updateField('fixture_date', event.target.value)
                                        }
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Kick-off
                                    <input
                                        className={fieldClassName}
                                        type="time"
                                        value={values.kickoff_time}
                                        onChange={(event) =>
                                            updateField('kickoff_time', event.target.value)
                                        }
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Fixture type
                                    <select
                                        className={fieldClassName}
                                        value={values.fixture_type}
                                        onChange={(event) =>
                                            updateField(
                                                'fixture_type',
                                                event.target.value as ClubFixtureType
                                            )
                                        }
                                    >
                                        {clubFixtureTypes.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Match format
                                    <select
                                        className={fieldClassName}
                                        value={values.match_format}
                                        onChange={(event) =>
                                            updateField('match_format', event.target.value as ClubMatchFormat)
                                        }
                                    >
                                        {clubMatchFormats.map((format) => (
                                            <option key={format} value={format}>{format}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className={labelClassName}>
                                    Status
                                    <select
                                        className={fieldClassName}
                                        value={values.status}
                                        onChange={(event) =>
                                            updateField(
                                                'status',
                                                event.target.value as ClubFixtureStatus
                                            )
                                        }
                                    >
                                        {clubStatuses.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-[var(--organisation-border)] bg-black/15 p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-[color:var(--organisation-accent)]/10 p-3">
                                    <MapPin className="h-5 w-5 text-[var(--organisation-accent)]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--organisation-text)]">
                                        Venue & match information
                                    </h3>
                                    <p className="mt-1 text-sm text-[color:var(--organisation-text)]/60">
                                        These details are used by the public site and fixture RSVP notice.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className={labelClassName}>
                                    Venue name
                                    <input
                                        className={fieldClassName}
                                        type="text"
                                        value={values.venue_name}
                                        placeholder="e.g. MFC Arena"
                                        onChange={(event) =>
                                            updateField('venue_name', event.target.value)
                                        }
                                    />
                                </label>

                                <label className={labelClassName}>
                                    Referee
                                    <input
                                        className={fieldClassName}
                                        type="text"
                                        value={values.referee_name}
                                        placeholder="Optional"
                                        onChange={(event) =>
                                            updateField('referee_name', event.target.value)
                                        }
                                    />
                                </label>

                                <label className={`${labelClassName} md:col-span-2`}>
                                    Venue address
                                    <input
                                        className={fieldClassName}
                                        type="text"
                                        value={values.venue_address}
                                        placeholder="Full address / postcode"
                                        onChange={(event) =>
                                            updateField('venue_address', event.target.value)
                                        }
                                    />
                                </label>

                                <label className={`${labelClassName} md:col-span-2`}>
                                    Notes
                                    <textarea
                                        className={`${fieldClassName} min-h-24 resize-y`}
                                        value={values.notes}
                                        placeholder="Meet time, kit instructions, parking, changing rooms, etc."
                                        onChange={(event) =>
                                            updateField('notes', event.target.value)
                                        }
                                    />
                                </label>
                            </div>

                            <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-[var(--organisation-text)]">
                                <input
                                    type="checkbox"
                                    checked={values.published}
                                    onChange={(event) =>
                                        updateField('published', event.target.checked)
                                    }
                                    className="h-4 w-4 accent-[var(--organisation-accent)]"
                                />
                                Publish on club site
                            </label>
                        </section>
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--organisation-border)] bg-[var(--organisation-surface)] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--organisation-border)] bg-black/20 px-5 py-3 text-sm font-bold text-[var(--organisation-text)] transition hover:bg-white/10 disabled:opacity-50"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-bold text-[var(--organisation-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4" />
                        {isSaving
                            ? 'Saving...'
                            : mode === 'edit'
                              ? 'Update Fixture'
                              : 'Save Fixture'}
                    </button>
                </footer>
            </section>
        </div>
    )
}

export function FixtureModal(
    props: SharedFixtureModalProps
) {
    if ('context' in props && props.context === 'club') {
        return <ClubFixtureModal {...props} />
    }

    return <CompetitionFixtureModal {...props} />
}
