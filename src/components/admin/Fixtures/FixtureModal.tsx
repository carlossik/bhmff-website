import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    MapPin,
    Save,
    Shield,
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

type CalendarDay = {
    isoDate: string
    dayNumber: number
    isCurrentMonth: boolean
    isToday: boolean
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
    'mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm font-semibold text-white outline-none transition [color-scheme:dark] placeholder:font-normal placeholder:text-slate-500 focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[color:var(--organisation-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50'

const labelClassName =
    'block text-sm font-semibold text-slate-300'

const cardClassName =
    'rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6'

function padDatePart(value: number) {
    return String(value).padStart(2, '0')
}

function toIsoDate(
    year: number,
    monthIndex: number,
    day: number,
) {
    return `${year}-${padDatePart(
        monthIndex + 1,
    )}-${padDatePart(day)}`
}

function getTodayLocalDate() {
    const today = new Date()

    return toIsoDate(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    )
}

function parseIsoDate(
    value: string,
): Date | null {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            value,
        )

    if (!match) {
        return null
    }

    const year = Number(match[1])
    const monthIndex = Number(match[2]) - 1
    const day = Number(match[3])

    const date = new Date(
        year,
        monthIndex,
        day,
    )

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== monthIndex ||
        date.getDate() !== day
    ) {
        return null
    }

    return date
}

function formatDisplayDate(
    value: string,
) {
    const date = parseIsoDate(value)

    if (!date) {
        return 'Choose fixture date'
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    ).format(date)
}

function formatManualDate(
    value: string,
) {
    const date = parseIsoDate(value)

    if (!date) {
        return ''
    }

    return `${padDatePart(
        date.getDate(),
    )}/${padDatePart(
        date.getMonth() + 1,
    )}/${date.getFullYear()}`
}

function parseManualDate(
    value: string,
): string | null {
    const match =
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(
            value.trim(),
        )

    if (!match) {
        return null
    }

    const day = Number(match[1])
    const monthIndex = Number(match[2]) - 1
    const year = Number(match[3])

    const date = new Date(
        year,
        monthIndex,
        day,
    )

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== monthIndex ||
        date.getDate() !== day
    ) {
        return null
    }

    return toIsoDate(
        year,
        monthIndex,
        day,
    )
}

function getKickoffDate(
    kickoffTime: string,
) {
    if (!kickoffTime) {
        return ''
    }

    return kickoffTime.slice(0, 10)
}

function getKickoffClockTime(
    kickoffTime: string,
) {
    if (!kickoffTime) {
        return defaultKickoffTime
    }

    return (
        kickoffTime.slice(11, 16) ||
        defaultKickoffTime
    )
}

function combineKickoffDateAndTime(
    date: string,
    time: string,
) {
    if (!date) {
        return ''
    }

    return `${date}T${
        time || defaultKickoffTime
    }`
}

function formatTeamDisplayName(
    team: FixtureTeam,
) {
    return team.club_name
        ? `${team.club_name} — ${team.team_name}`
        : team.team_name
}

function formatStatus(
    status: FixtureStatus,
) {
    return (
        status.charAt(0).toUpperCase() +
        status.slice(1).replace(/_/g, ' ')
    )
}

function formatOfficialDisplayName(
    official: Official,
) {
    const fullName =
        official.full_name?.trim()

    if (fullName) {
        return fullName
    }

    return (
        [
            official.first_name,
            official.last_name,
        ]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unnamed official'
    )
}

function getCalendarDays(
    year: number,
    monthIndex: number,
): CalendarDay[] {
    const firstOfMonth = new Date(
        year,
        monthIndex,
        1,
    )
    const firstWeekday =
        (firstOfMonth.getDay() + 6) % 7
    const calendarStart = new Date(
        year,
        monthIndex,
        1 - firstWeekday,
    )
    const today = getTodayLocalDate()

    return Array.from(
        { length: 42 },
        (_, index) => {
            const date = new Date(
                calendarStart.getFullYear(),
                calendarStart.getMonth(),
                calendarStart.getDate() +
                    index,
            )
            const isoDate = toIsoDate(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
            )

            return {
                isoDate,
                dayNumber: date.getDate(),
                isCurrentMonth:
                    date.getMonth() ===
                    monthIndex,
                isToday: isoDate === today,
            }
        },
    )
}

function getMonthLabel(
    year: number,
    monthIndex: number,
) {
    return new Intl.DateTimeFormat(
        'en-GB',
        {
            month: 'long',
            year: 'numeric',
        },
    ).format(
        new Date(year, monthIndex, 1),
    )
}


type SelectOption = {
    value: string
    label: string
}

type ThemedSelectProps = {
    value: string
    options: SelectOption[]
    placeholder: string
    disabled?: boolean
    ariaLabel: string
    onChange: (value: string) => void
}

function ThemedSelect({
    value,
    options,
    placeholder,
    disabled = false,
    ariaLabel,
    onChange,
}: ThemedSelectProps) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    const selectedOption =
        options.find(
            (option) => option.value === value,
        ) ?? null

    useEffect(() => {
        function handlePointerDown(
            event: MouseEvent,
        ) {
            if (
                !rootRef.current ||
                rootRef.current.contains(
                    event.target as Node,
                )
            ) {
                return
            }

            setOpen(false)
        }

        document.addEventListener(
            'mousedown',
            handlePointerDown,
        )

        return () => {
            document.removeEventListener(
                'mousedown',
                handlePointerDown,
            )
        }
    }, [])

    useEffect(() => {
        if (disabled) {
            setOpen(false)
        }
    }, [disabled])

    return (
        <div
            ref={rootRef}
            className="relative mt-2"
        >
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-left text-sm font-semibold text-white outline-none transition hover:border-white/20 focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[color:var(--organisation-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                    setOpen((current) => !current)
                }
            >
                <span
                    className={
                        selectedOption
                            ? 'truncate text-white'
                            : 'truncate text-slate-500'
                    }
                >
                    {selectedOption?.label ??
                        placeholder}
                </span>

                <ChevronDown
                    className={`h-4 w-4 shrink-0 transition ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && !disabled ? (
                <div
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--organisation-surface)] p-1.5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9)]"
                    style={{
                        scrollbarGutter: 'stable',
                    }}
                >
                    <button
                        type="button"
                        role="option"
                        aria-selected={!value}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                        onClick={() => {
                            onChange('')
                            setOpen(false)
                        }}
                    >
                        <span className="truncate">
                            {placeholder}
                        </span>

                        {!value ? (
                            <Check className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                        ) : null}
                    </button>

                    {options.map((option) => {
                        const selected =
                            option.value === value

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                    selected
                                        ? 'bg-[color:var(--organisation-accent)]/12 text-white'
                                        : 'text-slate-200 hover:bg-white/[0.06] hover:text-white'
                                }`}
                                onClick={() => {
                                    onChange(
                                        option.value,
                                    )
                                    setOpen(false)
                                }}
                            >
                                <span className="truncate">
                                    {option.label}
                                </span>

                                {selected ? (
                                    <Check className="h-4 w-4 shrink-0 text-[var(--organisation-accent)]" />
                                ) : null}
                            </button>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
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

    const kickoffDate =
        getKickoffDate(
            values.kickoff_time,
        )

    const kickoffClockTime =
        getKickoffClockTime(
            values.kickoff_time,
        )

    const initialCalendarDate =
        parseIsoDate(kickoffDate) ??
        new Date()

    const [
        calendarMonth,
        setCalendarMonth,
    ] = useState(
        initialCalendarDate.getMonth(),
    )
    const [
        calendarYear,
        setCalendarYear,
    ] = useState(
        initialCalendarDate.getFullYear(),
    )
    const [
        calendarOpen,
        setCalendarOpen,
    ] = useState(false)
    const [
        manualDate,
        setManualDate,
    ] = useState(
        formatManualDate(kickoffDate),
    )
    const [
        manualDateError,
        setManualDateError,
    ] = useState('')

    const minimumFixtureDate =
        mode === 'create'
            ? getTodayLocalDate()
            : undefined

    useEffect(() => {
        const parsed =
            parseIsoDate(kickoffDate)

        if (parsed) {
            setCalendarYear(
                parsed.getFullYear(),
            )
            setCalendarMonth(
                parsed.getMonth(),
            )
        }

        setManualDate(
            formatManualDate(kickoffDate),
        )
        setManualDateError('')
    }, [kickoffDate])

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === 'Escape') {
                if (calendarOpen) {
                    setCalendarOpen(false)
                    return
                }

                if (!isSaving) {
                    onClose()
                }
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [
        calendarOpen,
        isSaving,
        onClose,
    ])

    const groupCompetitionTeamIds =
        useMemo(
            () =>
                groupMemberships
                    .filter(
                        (membership) =>
                            membership.group_id ===
                            values.group_id,
                    )
                    .map(
                        (membership) =>
                            membership.competition_team_id,
                    ),
            [
                groupMemberships,
                values.group_id,
            ],
        )

    const availableTeams =
        useMemo(
            () =>
                isGroupStage &&
                values.group_id
                    ? teams.filter(
                        (team) =>
                            groupCompetitionTeamIds.includes(
                                team.competition_team_id,
                            ),
                    )
                    : teams,
            [
                groupCompetitionTeamIds,
                isGroupStage,
                teams,
                values.group_id,
            ],
        )

    const availableHomeTeams =
        availableTeams.filter(
            (team) =>
                team.competition_team_id !==
                values.away_competition_team_id,
        )

    const availableAwayTeams =
        availableTeams.filter(
            (team) =>
                team.competition_team_id !==
                values.home_competition_team_id,
        )

    const sortedVenues =
        useMemo(
            () =>
                [...venues].sort(
                    (
                        firstVenue,
                        secondVenue,
                    ) =>
                        firstVenue.name.localeCompare(
                            secondVenue.name,
                            'en-GB',
                            {
                                sensitivity:
                                    'base',
                            },
                        ),
                ),
            [venues],
        )

    const activeOfficials =
        useMemo(
            () =>
                officials
                    .filter(
                        (official) =>
                            official.status ===
                            'active',
                    )
                    .sort(
                        (
                            firstOfficial,
                            secondOfficial,
                        ) =>
                            formatOfficialDisplayName(
                                firstOfficial,
                            ).localeCompare(
                                formatOfficialDisplayName(
                                    secondOfficial,
                                ),
                                'en-GB',
                                {
                                    sensitivity:
                                        'base',
                                },
                            ),
                    ),
            [officials],
        )

    const referees =
        activeOfficials.filter(
            (official) =>
                official.role === 'referee',
        )

    const assistantReferees =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'assistant_referee',
        )

    const fourthOfficials =
        activeOfficials.filter(
            (official) =>
                official.role ===
                'fourth_official',
        )

    const officialSelectOptions =
        activeOfficials.map((official) => ({
            value: official.id,
            label: `${formatOfficialDisplayName(
                official,
            )} — ${official.role
                .split('_')
                .map(
                    (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1),
                )
                .join(' ')}`,
        }))

    const calendarDays =
        useMemo(
            () =>
                getCalendarDays(
                    calendarYear,
                    calendarMonth,
                ),
            [
                calendarMonth,
                calendarYear,
            ],
        )

    function updateField<
        Key extends keyof FixtureFormValues,
    >(
        field: Key,
        value: FixtureFormValues[Key],
    ) {
        onChange({
            ...values,
            [field]: value,
        })
    }

    function handleStageChange(
        stage: string,
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
        groupId: string,
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
        date: string,
    ) {
        updateField(
            'kickoff_time',
            combineKickoffDateAndTime(
                date,
                kickoffClockTime,
            ),
        )
    }

    function handleKickoffTimeChange(
        time: string,
    ) {
        if (!kickoffDate) {
            return
        }

        updateField(
            'kickoff_time',
            combineKickoffDateAndTime(
                kickoffDate,
                time,
            ),
        )
    }

    function selectCalendarDate(
        date: string,
    ) {
        if (
            minimumFixtureDate &&
            date < minimumFixtureDate
        ) {
            return
        }

        handleKickoffDateChange(date)
        setCalendarOpen(false)
        setManualDate(
            formatManualDate(date),
        )
        setManualDateError('')
    }

    function changeCalendarMonth(
        offset: number,
    ) {
        const nextDate = new Date(
            calendarYear,
            calendarMonth + offset,
            1,
        )

        setCalendarYear(
            nextDate.getFullYear(),
        )
        setCalendarMonth(
            nextDate.getMonth(),
        )
    }

    function applyManualDate() {
        if (!manualDate.trim()) {
            setManualDateError(
                'Enter a date as DD/MM/YYYY.',
            )
            return
        }

        const parsed =
            parseManualDate(manualDate)

        if (!parsed) {
            setManualDateError(
                'Enter a valid date as DD/MM/YYYY.',
            )
            return
        }

        if (
            minimumFixtureDate &&
            parsed < minimumFixtureDate
        ) {
            setManualDateError(
                'New fixtures cannot be scheduled in the past.',
            )
            return
        }

        selectCalendarDate(parsed)
    }

    const selectedOfficialIds =
        new Set(
            [
                values.referee_official_id,
                values
                    .assistant_referee_1_official_id,
                values
                    .assistant_referee_2_official_id,
                values.fourth_official_id,
            ].filter(Boolean),
        )

    function officialOptions(
        available: Official[],
        currentValue: string,
    ) {
        return available.filter(
            (official) =>
                official.id ===
                    currentValue ||
                !selectedOfficialIds.has(
                    official.id,
                ),
        )
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-3 font-sans backdrop-blur-md sm:p-6"
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
                className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--organisation-background)] shadow-[0_30px_120px_-30px_rgba(0,0,0,0.9)]" 
                style={{
                    height: 'min(92vh, 920px)',
                    maxHeight: '92vh',
                }}
                role="dialog"
            >
                <header className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[var(--organisation-surface)] px-5 py-5 sm:px-8 sm:py-7">
                    <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[color:var(--organisation-accent)]/10 blur-3xl" />

                    <div className="relative flex items-start justify-between gap-5">
                        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                            <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/20 p-3 sm:block">
                                <TournamentHQBrand
                                    variant="compact"
                                    size="sm"
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--organisation-accent)]">
                                    <CalendarDays className="h-4 w-4" />
                                    Fixture Administration
                                </div>

                                <div className="mt-2 sm:hidden">
                                    <TournamentHQBrand
                                        variant="compact"
                                        size="sm"
                                    />
                                </div>

                                <h2
                                    id="fixture-modal-title"
                                    className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl"
                                >
                                    {mode === 'edit'
                                        ? 'Edit Fixture'
                                        : 'Add Fixture'}
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                                    Configure the match,
                                    select the venue and
                                    appoint match officials
                                    from one streamlined
                                    workflow.
                                </p>
                            </div>
                        </div>

                        <button
                            aria-label="Close fixture form"
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-300 transition hover:border-[var(--organisation-accent)] hover:bg-[color:var(--organisation-accent)]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-7"
                    style={{
                        overflowY: 'auto',
                        scrollbarGutter: 'stable',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <div className="space-y-5">
                        <section className={cardClassName}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 p-3">
                                    <Trophy className="h-5 w-5 text-[var(--organisation-accent)]" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Competition
                                        context
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Select the stage
                                        and competition
                                        group for this
                                        fixture.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <span className={labelClassName}>
                                        Stage
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Fixture stage"
                                        value={values.stage}
                                        placeholder="Select stage"
                                        options={stages.map(
                                            (stage) => ({
                                                value: stage,
                                                label: stage,
                                            }),
                                        )}
                                        onChange={handleStageChange}
                                    />
                                </div>

                                <div>
                                    <span className={labelClassName}>
                                        Status
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Fixture status"
                                        value={values.status}
                                        placeholder="Select status"
                                        options={statuses.map(
                                            (status) => ({
                                                value: status,
                                                label:
                                                    formatStatus(
                                                        status,
                                                    ),
                                            }),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'status',
                                                value as FixtureStatus,
                                            )
                                        }
                                    />
                                </div>

                                {isGroupStage && (
                                    <div className="md:col-span-2">
                                        <span className={labelClassName}>
                                            Competition group
                                            <span className="ml-1 text-red-400">
                                                *
                                            </span>
                                        </span>

                                        <ThemedSelect
                                            ariaLabel="Competition group"
                                            value={values.group_id}
                                            placeholder="Select group"
                                            options={groups.map(
                                                (group) => ({
                                                    value:
                                                        group.id,
                                                    label:
                                                        group.name,
                                                }),
                                            )}
                                            onChange={
                                                handleGroupChange
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className={cardClassName}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3">
                                    <Users className="h-5 w-5 text-sky-300" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Teams
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Choose the home
                                        and away teams.
                                        Group-stage
                                        selections are
                                        automatically
                                        restricted to the
                                        selected group.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <span className={labelClassName}>
                                        Home team
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Home team"
                                        value={
                                            values.home_competition_team_id
                                        }
                                        disabled={
                                            isGroupStage &&
                                            !values.group_id
                                        }
                                        placeholder="Select home team"
                                        options={availableHomeTeams.map(
                                            (team) => ({
                                                value:
                                                    team.competition_team_id,
                                                label:
                                                    formatTeamDisplayName(
                                                        team,
                                                    ),
                                            }),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'home_competition_team_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <span className={labelClassName}>
                                        Away team
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Away team"
                                        value={
                                            values.away_competition_team_id
                                        }
                                        disabled={
                                            isGroupStage &&
                                            !values.group_id
                                        }
                                        placeholder="Select away team"
                                        options={availableAwayTeams.map(
                                            (team) => ({
                                                value:
                                                    team.competition_team_id,
                                                label:
                                                    formatTeamDisplayName(
                                                        team,
                                                    ),
                                            }),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'away_competition_team_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section className={cardClassName}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3">
                                    <CalendarDays className="h-5 w-5 text-violet-300" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Kick-off
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Use the calendar
                                        for quick,
                                        reliable date
                                        selection. Manual
                                        entry remains
                                        available in
                                        DD/MM/YYYY format.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
                                <div>
                                    <span className={labelClassName}>
                                        Date
                                        <span className="ml-1 text-red-400">
                                            *
                                        </span>
                                    </span>

                                    <div className="relative mt-2">
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-left transition hover:border-[var(--organisation-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--organisation-accent)]/20"
                                            onClick={() =>
                                                setCalendarOpen(
                                                    (
                                                        current,
                                                    ) =>
                                                        !current,
                                                )
                                            }
                                        >
                                            <span>
                                                <span className="block text-sm font-bold text-white">
                                                    {formatDisplayDate(
                                                        kickoffDate,
                                                    )}
                                                </span>

                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    Click
                                                    to
                                                    open
                                                    calendar
                                                </span>
                                            </span>

                                            <CalendarDays className="h-5 w-5 shrink-0 text-[var(--organisation-accent)]" />
                                        </button>

                                        {calendarOpen && (
                                            <div className="absolute left-0 top-[calc(100%+0.65rem)] z-[90] w-full min-w-[300px] max-w-[390px] overflow-y-auto rounded-3xl border border-white/10 bg-[var(--organisation-surface)] p-4 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)]"
                                            style={{
                                                maxHeight: 'min(460px, 58vh)',
                                                scrollbarGutter: 'stable',
                                            }}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        aria-label="Previous month"
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-300 transition hover:border-[var(--organisation-accent)] hover:text-white"
                                                        onClick={() =>
                                                            changeCalendarMonth(
                                                                -1,
                                                            )
                                                        }
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>

                                                    <strong className="text-sm text-white">
                                                        {getMonthLabel(
                                                            calendarYear,
                                                            calendarMonth,
                                                        )}
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        aria-label="Next month"
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-300 transition hover:border-[var(--organisation-accent)] hover:text-white"
                                                        onClick={() =>
                                                            changeCalendarMonth(
                                                                1,
                                                            )
                                                        }
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div
                                                    className="mt-4 gap-1 text-center"
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns:
                                                            'repeat(7, minmax(0, 1fr))',
                                                    }}
                                                >
                                                    {[
                                                        'M',
                                                        'T',
                                                        'W',
                                                        'T',
                                                        'F',
                                                        'S',
                                                        'S',
                                                    ].map(
                                                        (
                                                            day,
                                                            index,
                                                        ) => (
                                                            <span
                                                                key={`${day}-${index}`}
                                                                className="py-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                                            >
                                                                {
                                                                    day
                                                                }
                                                            </span>
                                                        ),
                                                    )}

                                                    {calendarDays.map(
                                                        (
                                                            day,
                                                        ) => {
                                                            const isSelected =
                                                                day.isoDate ===
                                                                kickoffDate
                                                            const isDisabled =
                                                                Boolean(
                                                                    minimumFixtureDate &&
                                                                        day.isoDate <
                                                                            minimumFixtureDate,
                                                                )

                                                            return (
                                                                <button
                                                                    key={
                                                                        day.isoDate
                                                                    }
                                                                    type="button"
                                                                    disabled={
                                                                        isDisabled
                                                                    }
                                                                    onClick={() =>
                                                                        selectCalendarDate(
                                                                            day.isoDate,
                                                                        )
                                                                    }
                                                                    className={`aspect-square rounded-xl text-xs font-bold transition ${
                                                                        isSelected
                                                                            ? 'bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)]'
                                                                            : day.isToday
                                                                              ? 'border border-[var(--organisation-accent)] text-[var(--organisation-accent)]'
                                                                              : day.isCurrentMonth
                                                                                ? 'text-white hover:bg-white/10'
                                                                                : 'text-slate-600 hover:bg-white/5'
                                                                    } disabled:cursor-not-allowed disabled:opacity-25`}
                                                                >
                                                                    {
                                                                        day.dayNumber
                                                                    }
                                                                </button>
                                                            )
                                                        },
                                                    )}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                                                    <button
                                                        type="button"
                                                        className="text-xs font-bold text-[var(--organisation-accent)] hover:opacity-80"
                                                        onClick={() =>
                                                            selectCalendarDate(
                                                                getTodayLocalDate(),
                                                            )
                                                        }
                                                    >
                                                        Today
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="text-xs font-semibold text-slate-400 hover:text-white"
                                                        onClick={() =>
                                                            setCalendarOpen(
                                                                false,
                                                            )
                                                        }
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3">
                                        <div className="min-w-0 flex-1">
                                            <input
                                                aria-label="Manual fixture date"
                                                className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--organisation-accent)]"
                                                inputMode="numeric"
                                                placeholder="DD/MM/YYYY"
                                                value={
                                                    manualDate
                                                }
                                                onChange={(
                                                    event,
                                                ) => {
                                                    const nextValue =
                                                        event.target.value

                                                    setManualDate(
                                                        nextValue,
                                                    )
                                                    setManualDateError(
                                                        '',
                                                    )

                                                    const parsed =
                                                        parseManualDate(
                                                            nextValue,
                                                        )

                                                    if (
                                                        parsed &&
                                                        (!minimumFixtureDate ||
                                                            parsed >=
                                                                minimumFixtureDate)
                                                    ) {
                                                        selectCalendarDate(
                                                            parsed,
                                                        )
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (
                                                        manualDate.trim()
                                                    ) {
                                                        applyManualDate()
                                                    }
                                                }}
                                                onKeyDown={(
                                                    event,
                                                ) => {
                                                    if (
                                                        event.key ===
                                                        'Enter'
                                                    ) {
                                                        event.preventDefault()
                                                        applyManualDate()
                                                    }
                                                }}
                                            />

                                            {manualDateError && (
                                                <p className="mt-1 text-xs font-semibold text-red-300">
                                                    {
                                                        manualDateError
                                                    }
                                                </p>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                <label className={labelClassName}>
                                    Time
                                    <span className="ml-1 text-red-400">
                                        *
                                    </span>

                                    <div className="relative mt-2">
                                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--organisation-accent)]" />

                                        <input
                                            className="w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-[var(--organisation-accent)] focus:ring-2 focus:ring-[color:var(--organisation-accent)]/20 disabled:opacity-50"
                                            type="time"
                                            value={
                                                kickoffClockTime
                                            }
                                            disabled={
                                                !kickoffDate
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                handleKickoffTimeChange(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                        />
                                    </div>

                                    {!kickoffDate && (
                                        <span className="mt-2 block text-xs text-slate-500">
                                            Select the
                                            date first.
                                        </span>
                                    )}
                                </label>
                            </div>
                        </section>

                        <section className={cardClassName}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                                    <MapPin className="h-5 w-5 text-amber-300" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Venue
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Manual fixtures
                                        can override the
                                        normal home-venue
                                        assignment when
                                        required.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5">
                                <span className={labelClassName}>
                                    Fixture venue
                                </span>

                                <ThemedSelect
                                    ariaLabel="Fixture venue"
                                    value={values.venue_id}
                                    placeholder="To be confirmed"
                                    options={sortedVenues.map(
                                        (venue) => ({
                                            value: venue.id,
                                            label: venue.name,
                                        }),
                                    )}
                                    onChange={(value) =>
                                        updateField(
                                            'venue_id',
                                            value,
                                        )
                                    }
                                />
                            </div>
                        </section>

                        <section className={cardClassName}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                                    <Shield className="h-5 w-5 text-emerald-300" />
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        Match Officials
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-400">
                                        Appoint officials
                                        now, or leave a
                                        role unassigned
                                        and complete it
                                        later from Fixture
                                        Administration.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <span className={labelClassName}>
                                        Referee
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Referee"
                                        value={
                                            values.referee_official_id
                                        }
                                        placeholder="To Be Appointed"
                                        options={officialSelectOptions.filter(
                                            (option) =>
                                                option.value ===
                                                    values.referee_official_id ||
                                                !selectedOfficialIds.has(
                                                    option.value,
                                                ),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'referee_official_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <span className={labelClassName}>
                                        Fourth Official
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Fourth Official"
                                        value={
                                            values.fourth_official_id
                                        }
                                        placeholder="To Be Appointed"
                                        options={officialSelectOptions.filter(
                                            (option) =>
                                                option.value ===
                                                    values.fourth_official_id ||
                                                !selectedOfficialIds.has(
                                                    option.value,
                                                ),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'fourth_official_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <span className={labelClassName}>
                                        Assistant Referee 1
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Assistant Referee 1"
                                        value={
                                            values.assistant_referee_1_official_id
                                        }
                                        placeholder="To Be Appointed"
                                        options={officialSelectOptions.filter(
                                            (option) =>
                                                option.value ===
                                                    values.assistant_referee_1_official_id ||
                                                !selectedOfficialIds.has(
                                                    option.value,
                                                ),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'assistant_referee_1_official_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <span className={labelClassName}>
                                        Assistant Referee 2
                                    </span>

                                    <ThemedSelect
                                        ariaLabel="Assistant Referee 2"
                                        value={
                                            values.assistant_referee_2_official_id
                                        }
                                        placeholder="To Be Appointed"
                                        options={officialSelectOptions.filter(
                                            (option) =>
                                                option.value ===
                                                    values.assistant_referee_2_official_id ||
                                                !selectedOfficialIds.has(
                                                    option.value,
                                                ),
                                        )}
                                        onChange={(value) =>
                                            updateField(
                                                'assistant_referee_2_official_id',
                                                value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/15 p-4">
                                <p className="text-sm font-semibold text-[var(--organisation-accent)]">
                                    {
                                        activeOfficials.length
                                    }{' '}
                                    active official
                                    {activeOfficials.length ===
                                    1
                                        ? ''
                                        : 's'}{' '}
                                    available
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Officials already
                                    selected in another
                                    role on this fixture
                                    are removed from the
                                    remaining selectors.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                <footer className="relative z-20 flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[var(--organisation-surface)] px-5 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--organisation-accent)] px-5 py-3 text-sm font-black text-[var(--organisation-on-accent)] shadow-[0_14px_40px_-20px_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-700 disabled:text-slate-400"
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
