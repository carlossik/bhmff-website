import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'

import { Toast } from '../../../components/common/Toast'
import { competitionTeamService } from './competitionTeamService'

import {
    MATCH_DAYS,
    type CompetitionTeam,
    type MatchDay,
    type OrganisationTeamOption,
} from './competitionTeamTypes'

const DEFAULT_MATCH_DAYS: MatchDay[] = [
    'saturday',
    'sunday',
]

const MATCH_DAY_LABELS: Record<
    MatchDay,
    string
> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
}

function isMatchDay(
    value: string
): value is MatchDay {
    return MATCH_DAYS.includes(
        value as MatchDay
    )
}

export function CompetitionTeamsManager() {
    const { currentOrganisation } =
        useOrganisation()

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

    const allowedMatchDays =
        useMemo<MatchDay[]>(() => {
            const competition =
                currentCompetition as
                    | {
                    allowed_match_days?:
                        string[] | null
                }
                    | null

            const validDays =
                (
                    competition
                        ?.allowed_match_days ??
                    []
                ).filter(isMatchDay)

            return validDays.length > 0
                ? validDays
                : DEFAULT_MATCH_DAYS
        }, [currentCompetition])

    const [
        organisationTeams,
        setOrganisationTeams,
    ] = useState<OrganisationTeamOption[]>([])

    const [
        competitionTeams,
        setCompetitionTeams,
    ] = useState<CompetitionTeam[]>([])

    const [
        selectedTeamIds,
        setSelectedTeamIds,
    ] = useState<string[]>([])

    const [
        preferredDaysByTeam,
        setPreferredDaysByTeam,
    ] = useState<
        Record<string, MatchDay[]>
    >({})

    const [searchTerm, setSearchTerm] =
        useState('')

    const [isLoading, setIsLoading] =
        useState(false)

    const [isSaving, setIsSaving] =
        useState(false)

    const [
        toastMessage,
        setToastMessage,
    ] = useState('')

    const [
        toastType,
        setToastType,
    ] = useState<
        'success' | 'error' | 'info'
    >('success')

    function showToast(
        message: string,
        type:
            | 'success'
            | 'error'
            | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    function clearData() {
        setOrganisationTeams([])
        setCompetitionTeams([])
        setSelectedTeamIds([])
        setPreferredDaysByTeam({})
        setSearchTerm('')
    }

    async function loadData(
        organisationId: string,
        competitionId: string
    ) {
        setIsLoading(true)

        try {
            const [
                organisationTeamRows,
                competitionTeamRows,
            ] = await Promise.all([
                competitionTeamService
                    .getOrganisationTeams(
                        organisationId
                    ),

                competitionTeamService
                    .getCompetitionTeams(
                        competitionId
                    ),
            ])

            setOrganisationTeams(
                organisationTeamRows
            )

            setCompetitionTeams(
                competitionTeamRows
            )

            setSelectedTeamIds(
                competitionTeamRows.map(
                    (competitionTeam) =>
                        competitionTeam.team_id
                )
            )

            setPreferredDaysByTeam(
                Object.fromEntries(
                    competitionTeamRows.map(
                        (competitionTeam) => [
                            competitionTeam.team_id,
                            competitionTeam
                                .preferred_match_days
                                .length > 0
                                ? competitionTeam
                                    .preferred_match_days
                                : allowedMatchDays,
                        ]
                    )
                )
            )
        } catch (error) {
            clearData()

            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to load competition teams.',
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        setToastMessage('')
        clearData()

        if (
            !currentOrganisation?.id ||
            !currentCompetitionId
        ) {
            setIsLoading(false)
            return
        }

        void loadData(
            currentOrganisation.id,
            currentCompetitionId
        )
    }, [
        currentOrganisation?.id,
        currentCompetitionId,
        allowedMatchDays,
    ])

    const existingTeamIds = useMemo(
        () =>
            competitionTeams.map(
                (competitionTeam) =>
                    competitionTeam.team_id
            ),
        [competitionTeams]
    )

    const savedPreferredDaysByTeam =
        useMemo(
            () =>
                Object.fromEntries(
                    competitionTeams.map(
                        (competitionTeam) => [
                            competitionTeam.team_id,
                            [
                                ...competitionTeam
                                    .preferred_match_days,
                            ].sort(),
                        ]
                    )
                ),
            [competitionTeams]
        )

    const hasUnsavedChanges = useMemo(() => {
        if (
            selectedTeamIds.length !==
            existingTeamIds.length
        ) {
            return true
        }

        const existingIds =
            new Set(existingTeamIds)

        if (
            selectedTeamIds.some(
                (teamId) =>
                    !existingIds.has(teamId)
            )
        ) {
            return true
        }

        return selectedTeamIds.some(
            (teamId) => {
                const currentDays = [
                    ...(
                        preferredDaysByTeam[
                            teamId
                            ] ?? []
                    ),
                ].sort()

                const savedDays =
                    savedPreferredDaysByTeam[
                        teamId
                        ] ?? []

                return (
                    currentDays.join('|') !==
                    savedDays.join('|')
                )
            }
        )
    }, [
        existingTeamIds,
        preferredDaysByTeam,
        savedPreferredDaysByTeam,
        selectedTeamIds,
    ])

    const filteredTeams = useMemo(() => {
        const normalisedSearch =
            searchTerm.trim().toLowerCase()

        if (!normalisedSearch) {
            return organisationTeams
        }

        return organisationTeams.filter(
            (team) => {
                const values = [
                    team.name,
                    team.club_name,
                    team.age_group,
                    team.division,
                    team.participation_status,
                ]

                return values.some(
                    (value) =>
                        value
                            ?.toLowerCase()
                            .includes(
                                normalisedSearch
                            )
                )
            }
        )
    }, [
        organisationTeams,
        searchTerm,
    ])

    const visibleTeamIds = useMemo(
        () =>
            filteredTeams.map(
                (team) => team.id
            ),
        [filteredTeams]
    )

    const selectedTeamIdSet = useMemo(
        () => new Set(selectedTeamIds),
        [selectedTeamIds]
    )

    const visibleSelectedCount =
        visibleTeamIds.filter((teamId) =>
            selectedTeamIdSet.has(teamId)
        ).length

    const allVisibleSelected =
        visibleTeamIds.length > 0 &&
        visibleSelectedCount ===
        visibleTeamIds.length

    const noVisibleSelected =
        visibleSelectedCount === 0

    const selectionPercentage =
        organisationTeams.length > 0
            ? Math.round(
                (selectedTeamIds.length /
                    organisationTeams.length) *
                100
            )
            : 0

    function toggleTeam(teamId: string) {
        setSelectedTeamIds(
            (currentSelectedTeamIds) => {
                const isSelected =
                    currentSelectedTeamIds.includes(
                        teamId
                    )

                if (!isSelected) {
                    setPreferredDaysByTeam(
                        (current) => ({
                            ...current,
                            [teamId]:
                                current[teamId] ??
                                allowedMatchDays,
                        })
                    )
                }

                return isSelected
                    ? currentSelectedTeamIds.filter(
                        (selectedTeamId) =>
                            selectedTeamId !==
                            teamId
                    )
                    : [
                        ...currentSelectedTeamIds,
                        teamId,
                    ]
            }
        )
    }

    function togglePreferredDay(
        teamId: string,
        day: MatchDay
    ) {
        setPreferredDaysByTeam(
            (current) => {
                const currentDays =
                    current[teamId] ??
                    allowedMatchDays

                const nextDays =
                    currentDays.includes(day)
                        ? currentDays.filter(
                            (currentDay) =>
                                currentDay !== day
                        )
                        : [
                            ...currentDays,
                            day,
                        ]

                return {
                    ...current,
                    [teamId]: nextDays,
                }
            }
        )
    }

    function selectAllVisibleTeams() {
        if (!visibleTeamIds.length) {
            showToast(
                'There are no visible teams to select.',
                'info'
            )
            return
        }

        setSelectedTeamIds(
            (currentSelectedTeamIds) =>
                Array.from(
                    new Set([
                        ...currentSelectedTeamIds,
                        ...visibleTeamIds,
                    ])
                )
        )

        setPreferredDaysByTeam(
            (current) => {
                const next = {
                    ...current,
                }

                visibleTeamIds.forEach(
                    (teamId) => {
                        next[teamId] =
                            next[teamId] ??
                            allowedMatchDays
                    }
                )

                return next
            }
        )

        showToast(
            `${visibleTeamIds.length} visible ${
                visibleTeamIds.length === 1
                    ? 'team'
                    : 'teams'
            } selected.`,
            'info'
        )
    }

    function clearVisibleTeams() {
        if (!visibleTeamIds.length) {
            showToast(
                'There are no visible teams to clear.',
                'info'
            )
            return
        }

        setSelectedTeamIds(
            (currentSelectedTeamIds) =>
                currentSelectedTeamIds.filter(
                    (teamId) =>
                        !visibleTeamIds.includes(
                            teamId
                        )
                )
        )

        showToast(
            `${visibleSelectedCount} visible ${
                visibleSelectedCount === 1
                    ? 'team'
                    : 'teams'
            } cleared.`,
            'info'
        )
    }

    function resetSelection() {
        setSelectedTeamIds(
            existingTeamIds
        )

        setPreferredDaysByTeam(
            Object.fromEntries(
                competitionTeams.map(
                    (competitionTeam) => [
                        competitionTeam.team_id,
                        competitionTeam
                            .preferred_match_days,
                    ]
                )
            )
        )

        setSearchTerm('')

        showToast(
            'Unsaved changes were reset.',
            'info'
        )
    }

    async function saveSelection() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before assigning teams.',
                'error'
            )
            return
        }

        const teamsWithoutDays =
            selectedTeamIds.filter(
                (teamId) =>
                    !(
                        preferredDaysByTeam[
                            teamId
                            ] ?? []
                    ).length
            )

        if (teamsWithoutDays.length > 0) {
            showToast(
                'Every selected team must have at least one preferred match day.',
                'error'
            )
            return
        }

        setIsSaving(true)

        try {
            await competitionTeamService
                .saveSelection(
                    currentCompetitionId,
                    selectedTeamIds,
                    existingTeamIds,
                    preferredDaysByTeam,
                    allowedMatchDays
                )

            if (currentOrganisation?.id) {
                await loadData(
                    currentOrganisation.id,
                    currentCompetitionId
                )
            }

            showToast(
                'Competition teams and match-day preferences updated successfully.'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to update competition teams.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    function getInitials(
        teamName: string
    ) {
        return teamName
            .split(' ')
            .filter(Boolean)
            .map((word) => word[0])
            .join('')
            .slice(0, 3)
            .toUpperCase()
    }

    if (isLoading) {
        return (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[color:var(--organisation-border)] bg-black/20">
                <p className="text-sm text-slate-400">
                    Loading competition teams...
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <section className="rounded-2xl border border-[color:var(--organisation-border)] bg-black/20 p-5 shadow-xl sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            Participant management
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-white">
                            Competition Teams
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                            Select participating teams and set their preferred group-stage match days.
                        </p>

                        {currentCompetition && (
                            <p className="mt-2 text-sm text-slate-400">
                                Managing participants for{' '}
                                <strong className="text-white">
                                    {
                                        currentCompetition
                                            .name
                                    }
                                </strong>
                            </p>
                        )}
                    </div>

                    <button
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-2.5 text-sm font-bold text-[var(--organisation-on-accent)] shadow-lg transition hover:bg-[var(--organisation-accent)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        type="button"
                        disabled={
                            !currentCompetitionId ||
                            !hasUnsavedChanges ||
                            isSaving
                        }
                        onClick={() =>
                            void saveSelection()
                        }
                    >
                        {isSaving
                            ? 'Saving...'
                            : 'Save Teams'}
                    </button>
                </div>
            </section>

            {!currentCompetitionId ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--organisation-border)] bg-black/20 px-6 py-12 text-center">
                    <h3 className="text-lg font-bold text-white">
                        No competition selected
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Select a competition before assigning teams.
                    </p>
                </div>
            ) : !organisationTeams.length ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--organisation-border)] bg-black/20 px-6 py-12 text-center">
                    <h3 className="text-lg font-bold text-white">
                        No teams available
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                        Create organisation teams first, then return here to add them to this competition.
                    </p>
                </div>
            ) : (
                <>
                    <section className="rounded-2xl border border-[color:var(--organisation-border)] bg-black/20 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="relative w-full xl:max-w-xl">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                                    ⌕
                                </span>

                                <input
                                    type="search"
                                    value={searchTerm}
                                    placeholder="Search teams, clubs, age groups or divisions..."
                                    className="min-h-11 w-full rounded-xl border border-[color:var(--organisation-border)] bg-slate-950 py-2.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[color:var(--organisation-border)] focus:ring-4 focus:ring-[color:var(--organisation-accent)]/10"
                                    onChange={(event) =>
                                        setSearchTerm(
                                            event.currentTarget
                                                .value
                                        )
                                    }
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--organisation-accent)] transition hover:bg-[var(--organisation-accent)] hover:text-[var(--organisation-on-accent)] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
                                    type="button"
                                    disabled={
                                        allVisibleSelected ||
                                        !visibleTeamIds.length
                                    }
                                    onClick={
                                        selectAllVisibleTeams
                                    }
                                >
                                    Select Visible
                                </button>

                                <button
                                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--organisation-accent)] transition hover:bg-[var(--organisation-accent)] hover:text-[var(--organisation-on-accent)] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
                                    type="button"
                                    disabled={
                                        noVisibleSelected ||
                                        !visibleTeamIds.length
                                    }
                                    onClick={
                                        clearVisibleTeams
                                    }
                                >
                                    Clear Visible
                                </button>

                                <button
                                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
                                    type="button"
                                    disabled={
                                        !hasUnsavedChanges &&
                                        !searchTerm
                                    }
                                    onClick={
                                        resetSelection
                                    }
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {searchTerm && (
                            <p className="mt-3 text-xs text-slate-400">
                                Showing{' '}
                                <strong className="text-white">
                                    {
                                        filteredTeams.length
                                    }
                                </strong>{' '}
                                of{' '}
                                <strong className="text-white">
                                    {
                                        organisationTeams.length
                                    }
                                </strong>{' '}
                                teams.
                            </p>
                        )}
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <div className="overflow-hidden rounded-2xl border border-[color:var(--organisation-border)] bg-gradient-to-br from-[color:var(--organisation-accent)]/15 to-[color:var(--organisation-primary)]/10 p-5">
                            <div className="flex items-center gap-5">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--organisation-accent)] text-2xl font-black text-[var(--organisation-on-accent)] shadow-lg">
                                    {
                                        selectedTeamIds.length
                                    }
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--organisation-accent)]">
                                        Teams selected
                                    </p>

                                    <p className="mt-1 text-xl font-bold text-white">
                                        {
                                            selectedTeamIds.length
                                        }{' '}
                                        of{' '}
                                        {
                                            organisationTeams.length
                                        }{' '}
                                        participating
                                    </p>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                                        <div
                                            className="h-full rounded-full bg-[var(--organisation-accent)] transition-all"
                                            style={{
                                                width: `${selectionPercentage}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="mt-2 text-xs text-slate-300">
                                        {selectionPercentage}% of available teams are currently selected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-sky-700/40 bg-sky-500/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
                                Competition match days
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {allowedMatchDays.map(
                                    (day) => (
                                        <span
                                            key={day}
                                            className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold text-sky-100"
                                        >
                                            {
                                                MATCH_DAY_LABELS[
                                                    day
                                                    ]
                                            }
                                        </span>
                                    )
                                )}
                            </div>

                            <p className="mt-3 text-xs leading-5 text-slate-300">
                                Group-stage preferences are used where possible. Knockout dates take priority after qualification.
                            </p>
                        </div>
                    </section>

                    {!filteredTeams.length ? (
                        <div className="rounded-2xl border border-dashed border-[color:var(--organisation-border)] bg-black/20 px-6 py-12 text-center">
                            <h3 className="text-lg font-bold text-white">
                                No matching teams
                            </h3>

                            <p className="mt-2 text-sm text-slate-400">
                                Try changing your search term.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTeams.map(
                                (team) => {
                                    const isSelected =
                                        selectedTeamIds.includes(
                                            team.id
                                        )

                                    const preferredDays =
                                        preferredDaysByTeam[
                                            team.id
                                            ] ??
                                        allowedMatchDays

                                    return (
                                        <article
                                            className={`rounded-2xl border p-4 transition ${
                                                isSelected
                                                    ? 'border-[color:var(--organisation-border)] bg-[color:var(--organisation-accent)]/10 shadow-lg shadow-black/20'
                                                    : 'border-[color:var(--organisation-border)] bg-black/20 hover:border-[color:var(--organisation-border)]'
                                            }`}
                                            key={
                                                team.id
                                            }
                                        >
                                            <label className="flex cursor-pointer items-center gap-3">
                                                {team.logo_url ? (
                                                    <img
                                                        className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                                                        src={
                                                            team.logo_url
                                                        }
                                                        alt={`${team.name} logo`}
                                                    />
                                                ) : (
                                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--organisation-accent)]/15 text-sm font-black text-[var(--organisation-accent)]">
                                                        {getInitials(
                                                            team.name
                                                        )}
                                                    </span>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <h4 className="truncate font-bold text-white">
                                                        {
                                                            team.name
                                                        }
                                                    </h4>

                                                    <p className="truncate text-sm text-slate-400">
                                                        {team.club_name ??
                                                            'Independent team'}
                                                    </p>
                                                </div>

                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-[var(--organisation-accent)] accent-[var(--organisation-accent)]"
                                                    checked={
                                                        isSelected
                                                    }
                                                    onChange={() =>
                                                        toggleTeam(
                                                            team.id
                                                        )
                                                    }
                                                />
                                            </label>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {team.age_group && (
                                                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                                        {
                                                            team.age_group
                                                        }
                                                    </span>
                                                )}

                                                {team.division && (
                                                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                                        {
                                                            team.division
                                                        }
                                                    </span>
                                                )}

                                                {team.participation_status && (
                                                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                                        {
                                                            team.participation_status
                                                        }
                                                    </span>
                                                )}

                                                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                                    {team.published
                                                        ? 'Published'
                                                        : 'Draft'}
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <div className="mt-4 border-t border-[color:var(--organisation-border)] pt-4">
                                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--organisation-accent)]">
                                                        Preferred group-stage days
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        {allowedMatchDays.map(
                                                            (
                                                                day
                                                            ) => {
                                                                const checked =
                                                                    preferredDays.includes(
                                                                        day
                                                                    )

                                                                return (
                                                                    <label
                                                                        key={
                                                                            day
                                                                        }
                                                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                                                            checked
                                                                                ? 'border-[color:var(--organisation-accent)] bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)]'
                                                                                : 'border-[color:var(--organisation-border)] bg-black/20 text-slate-300 hover:border-[color:var(--organisation-border)]'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            className="sr-only"
                                                                            checked={
                                                                                checked
                                                                            }
                                                                            onChange={() =>
                                                                                togglePreferredDay(
                                                                                    team.id,
                                                                                    day
                                                                                )
                                                                            }
                                                                        />

                                                                        {
                                                                            MATCH_DAY_LABELS[
                                                                                day
                                                                                ]
                                                                        }
                                                                    </label>
                                                                )
                                                            }
                                                        )}
                                                    </div>

                                                    {!preferredDays.length && (
                                                        <p className="mt-2 text-sm text-red-300">
                                                            Select at least one preferred day.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    )
                                }
                            )}
                        </div>
                    )}

                    <div className="sticky bottom-4 z-20 flex justify-end rounded-2xl border border-[color:var(--organisation-border)] bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
                        <button
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--organisation-accent)] px-5 py-2.5 text-sm font-bold text-[var(--organisation-on-accent)] shadow-lg transition hover:bg-[var(--organisation-accent)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            type="button"
                            disabled={
                                !hasUnsavedChanges ||
                                isSaving
                            }
                            onClick={() =>
                                void saveSelection()
                            }
                        >
                            {isSaving
                                ? 'Saving...'
                                : hasUnsavedChanges
                                    ? 'Save Competition Teams'
                                    : 'All Changes Saved'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}