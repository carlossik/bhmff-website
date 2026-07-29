import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { Toast } from '../../common/Toast'

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
        const visibleTeamIds =
            filteredTeams.map(
                (team) => team.id
            )

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
    }

    function clearVisibleTeams() {
        const visibleTeamIds =
            new Set(
                filteredTeams.map(
                    (team) => team.id
                )
            )

        setSelectedTeamIds(
            (currentSelectedTeamIds) =>
                currentSelectedTeamIds.filter(
                    (teamId) =>
                        !visibleTeamIds.has(
                            teamId
                        )
                )
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
            <p className="muted">
                Loading competition teams...
            </p>
        )
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>
                        Competition Teams
                    </h3>

                    <p className="muted">
                        Select participating teams
                        and their preferred
                        group-stage match days.
                    </p>

                    {currentCompetition && (
                        <p className="muted">
                            Managing participants for{' '}
                            <strong>
                                {
                                    currentCompetition
                                        .name
                                }
                            </strong>
                        </p>
                    )}
                </div>

                <button
                    className="btn primary"
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

            {!currentCompetitionId ? (
                <div className="teamsEmptyState">
                    <h3>
                        No competition selected
                    </h3>

                    <p>
                        Select a competition from
                        the competition selector
                        before assigning teams.
                    </p>
                </div>
            ) : !organisationTeams.length ? (
                <div className="teamsEmptyState">
                    <h3>
                        No teams available
                    </h3>

                    <p>
                        Create organisation teams
                        first, then return here to
                        add them to this competition.
                    </p>
                </div>
            ) : (
                <>
                    <div className="adminWorkspaceToolbar">
                        <input
                            type="search"
                            value={searchTerm}
                            placeholder="Search teams, clubs, age groups or divisions..."
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                        />

                        <div className="adminGroupActions">
                            <button
                                className="btn secondary small"
                                type="button"
                                onClick={
                                    selectAllVisibleTeams
                                }
                            >
                                Select Visible
                            </button>

                            <button
                                className="btn secondary small"
                                type="button"
                                onClick={
                                    clearVisibleTeams
                                }
                            >
                                Clear Visible
                            </button>

                            <button
                                className="btn secondary small"
                                type="button"
                                disabled={
                                    !hasUnsavedChanges
                                }
                                onClick={
                                    resetSelection
                                }
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="adminInfoBox">
                        <div className="adminInfoIcon">
                            ℹ
                        </div>

                        <div>
                            <p>
                                <strong>
                                    {
                                        selectedTeamIds
                                            .length
                                    }
                                </strong>{' '}
                                of{' '}
                                <strong>
                                    {
                                        organisationTeams
                                            .length
                                    }
                                </strong>{' '}
                                teams selected.
                            </p>

                            <p className="muted">
                                Group-stage preferences
                                are enforced where
                                possible. Knockout dates
                                take priority after teams
                                qualify.
                            </p>
                        </div>
                    </div>

                    <div className="adminInfoBox">
                        <div className="adminInfoIcon">
                            📅
                        </div>

                        <div>
                            <p>
                                Competition match days:{' '}
                                <strong>
                                    {allowedMatchDays
                                        .map(
                                            (day) =>
                                                MATCH_DAY_LABELS[
                                                    day
                                                    ]
                                        )
                                        .join(', ')}
                                </strong>
                            </p>
                        </div>
                    </div>

                    {!filteredTeams.length ? (
                        <div className="teamsEmptyState">
                            <h3>
                                No matching teams
                            </h3>

                            <p>
                                Try changing your
                                search term.
                            </p>
                        </div>
                    ) : (
                        <div className="adminGroupsGrid">
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
                                            className="adminGroupCard"
                                            key={
                                                team.id
                                            }
                                        >
                                            <div className="adminGroupHeader">
                                                <label
                                                    className="adminGroupTeam"
                                                    style={{
                                                        cursor:
                                                            'pointer',
                                                    }}
                                                >
                                                    {team.logo_url ? (
                                                        <img
                                                            src={
                                                                team.logo_url
                                                            }
                                                            alt={`${team.name} logo`}
                                                        />
                                                    ) : (
                                                        <span>
                                                            {getInitials(
                                                                team.name
                                                            )}
                                                        </span>
                                                    )}

                                                    <div>
                                                        <h4>
                                                            {
                                                                team.name
                                                            }
                                                        </h4>

                                                        <p className="muted">
                                                            {team.club_name ??
                                                                'Independent team'}
                                                        </p>
                                                    </div>

                                                    <input
                                                        type="checkbox"
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
                                            </div>

                                            <div className="adminGroupMeta">
                                                {team.age_group && (
                                                    <span className="badge">
                                                        {
                                                            team.age_group
                                                        }
                                                    </span>
                                                )}

                                                {team.division && (
                                                    <span className="badge">
                                                        {
                                                            team.division
                                                        }
                                                    </span>
                                                )}

                                                {team.participation_status && (
                                                    <span className="badge">
                                                        {
                                                            team.participation_status
                                                        }
                                                    </span>
                                                )}

                                                <span className="badge">
                                                    {team.published
                                                        ? 'Published'
                                                        : 'Draft'}
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <div className="mt-4 border-t border-lime-900/40 pt-4">
                                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-lime-400">
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
                                                                                ? 'border-lime-400 bg-lime-400 text-black'
                                                                                : 'border-lime-900/60 bg-black/20 text-slate-300 hover:border-lime-600'
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

                    <div className="adminWorkspaceFooter">
                        <button
                            className="btn primary"
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
                                : 'Save Competition Teams'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}