import {
    useEffect,
    useState,
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

function getKickoffDateParts(
    kickoffTime: string
) {
    if (!kickoffTime) {
        return {
            day: '',
            month: '',
            year: '',
        }
    }

    const datePart =
        kickoffTime.slice(0, 10)

    const [
        year = '',
        month = '',
        day = '',
    ] = datePart.split('-')

    return {
        day,
        month,
        year,
    }
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

function getDaysInMonth(
    year: string,
    month: string
) {
    const numericYear =
        Number(year)

    const numericMonth =
        Number(month)

    if (
        !numericYear ||
        !numericMonth
    ) {
        return 31
    }

    return new Date(
        numericYear,
        numericMonth,
        0
    ).getDate()
}

function buildKickoffDateTime(
    day: string,
    month: string,
    year: string,
    time: string
) {
    if (
        !day ||
        !month ||
        !year
    ) {
        return ''
    }

    const paddedDay =
        day.padStart(2, '0')

    const paddedMonth =
        month.padStart(2, '0')

    const value =
        `${year}-${paddedMonth}-${paddedDay}`

    const candidate =
        new Date(
            `${value}T${time || defaultKickoffTime}`
        )

    if (
        Number.isNaN(
            candidate.getTime()
        ) ||
        candidate.getFullYear() !==
        Number(year) ||
        candidate.getMonth() + 1 !==
        Number(month) ||
        candidate.getDate() !==
        Number(day)
    ) {
        return ''
    }

    return `${value}T${time || defaultKickoffTime}`
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

export function FixtureModal({
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
                             }: FixtureModalProps) {
    const isGroupStage =
        values.stage === 'Group Stage'

    const initialKickoffDate =
        getKickoffDateParts(
            values.kickoff_time
        )

    const [
        kickoffDay,
        setKickoffDay,
    ] = useState(
        initialKickoffDate.day
    )

    const [
        kickoffMonth,
        setKickoffMonth,
    ] = useState(
        initialKickoffDate.month
    )

    const [
        kickoffYear,
        setKickoffYear,
    ] = useState(
        initialKickoffDate.year
    )

    const [
        kickoffClockTime,
        setKickoffClockTime,
    ] = useState(
        getKickoffClockTime(
            values.kickoff_time
        )
    )

    const currentYear =
        new Date().getFullYear()

    const yearOptions =
        Array.from(
            { length: 11 },
            (_, index) =>
                currentYear + index
        )

    const maximumDay =
        getDaysInMonth(
            kickoffYear,
            kickoffMonth
        )

    const dayOptions =
        Array.from(
            { length: maximumDay },
            (_, index) =>
                index + 1
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
                'referee' ||
                official.role ===
                'assistant_referee'
        )

    const fourthOfficials =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'referee' ||
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

    function updateKickoffDatePart(
        nextDay: string,
        nextMonth: string,
        nextYear: string
    ) {
        setKickoffDay(nextDay)
        setKickoffMonth(nextMonth)
        setKickoffYear(nextYear)

        const combinedValue =
            buildKickoffDateTime(
                nextDay,
                nextMonth,
                nextYear,
                kickoffClockTime
            )

        updateField(
            'kickoff_time',
            combinedValue
        )
    }

    function handleKickoffTimeChange(
        time: string
    ) {
        setKickoffClockTime(time)

        const combinedValue =
            buildKickoffDateTime(
                kickoffDay,
                kickoffMonth,
                kickoffYear,
                time
            )

        updateField(
            'kickoff_time',
            combinedValue
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

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[1.6fr_1fr]">
                                <div>
                                    <span className={labelClassName}>
                                        Date
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <div className="mt-2 grid grid-cols-3 gap-3">
                                        <select
                                            className={fieldClassName.replace('mt-2 ', '')}
                                            value={kickoffDay}
                                            onChange={(event) =>
                                                updateKickoffDatePart(
                                                    event.target.value,
                                                    kickoffMonth,
                                                    kickoffYear
                                                )
                                            }
                                        >
                                            <option value="">
                                                Day
                                            </option>

                                            {dayOptions.map(
                                                (day) => (
                                                    <option
                                                        key={day}
                                                        value={String(day)}
                                                    >
                                                        {day}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <select
                                            className={fieldClassName.replace('mt-2 ', '')}
                                            value={kickoffMonth}
                                            onChange={(event) =>
                                                updateKickoffDatePart(
                                                    kickoffDay,
                                                    event.target.value,
                                                    kickoffYear
                                                )
                                            }
                                        >
                                            <option value="">
                                                Month
                                            </option>

                                            {[
                                                'January',
                                                'February',
                                                'March',
                                                'April',
                                                'May',
                                                'June',
                                                'July',
                                                'August',
                                                'September',
                                                'October',
                                                'November',
                                                'December',
                                            ].map(
                                                (
                                                    month,
                                                    index
                                                ) => (
                                                    <option
                                                        key={month}
                                                        value={String(
                                                            index + 1
                                                        )}
                                                    >
                                                        {month}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <select
                                            className={fieldClassName.replace('mt-2 ', '')}
                                            value={kickoffYear}
                                            onChange={(event) =>
                                                updateKickoffDatePart(
                                                    kickoffDay,
                                                    kickoffMonth,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Year
                                            </option>

                                            {yearOptions.map(
                                                (year) => (
                                                    <option
                                                        key={year}
                                                        value={String(year)}
                                                    >
                                                        {year}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    <p className="mt-2 text-xs text-slate-500">
                                        Select the date in any order. The time remains editable while the date is being completed.
                                    </p>
                                </div>

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
                                            Select, replace or remove officials for this fixture. Changes are saved with the fixture.
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
                                    <select
                                        className={fieldClassName}
                                        value={values.referee_official_id}
                                        onChange={(event) =>
                                            updateField(
                                                'referee_official_id',
                                                event.target.value
                                            )
                                        }
                                    >
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
                                    <select
                                        className={fieldClassName}
                                        value={values.fourth_official_id}
                                        onChange={(event) =>
                                            updateField(
                                                'fourth_official_id',
                                                event.target.value
                                            )
                                        }
                                    >
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
                                    <select
                                        className={fieldClassName}
                                        value={values.assistant_referee_1_official_id}
                                        onChange={(event) =>
                                            updateField(
                                                'assistant_referee_1_official_id',
                                                event.target.value
                                            )
                                        }
                                    >
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
                                    <select
                                        className={fieldClassName}
                                        value={values.assistant_referee_2_official_id}
                                        onChange={(event) =>
                                            updateField(
                                                'assistant_referee_2_official_id',
                                                event.target.value
                                            )
                                        }
                                    >
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
                                        ? 'Active football referees can also be appointed as assistant referees or fourth officials.'
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