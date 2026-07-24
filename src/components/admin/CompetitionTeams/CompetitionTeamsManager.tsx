import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { Toast } from '../../common/Toast'

import { competitionTeamService } from './competitionTeamService'

import type {
    CompetitionTeam,
    OrganisationTeamOption,
} from './competitionTeamTypes'

export function CompetitionTeamsManager() {
    const { currentOrganisation } =
        useOrganisation()

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

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
    ])

    const existingTeamIds = useMemo(
        () =>
            competitionTeams.map(
                (competitionTeam) =>
                    competitionTeam.team_id
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

        return selectedTeamIds.some(
            (teamId) =>
                !existingIds.has(teamId)
        )
    }, [
        existingTeamIds,
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
            (currentSelectedTeamIds) =>
                currentSelectedTeamIds.includes(
                    teamId
                )
                    ? currentSelectedTeamIds.filter(
                        (selectedTeamId) =>
                            selectedTeamId !==
                            teamId
                    )
                    : [
                        ...currentSelectedTeamIds,
                        teamId,
                    ]
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
    }

    async function saveSelection() {
        if (!currentCompetitionId) {
            showToast(
                'Select a competition before assigning teams.',
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
                    existingTeamIds
                )

            if (currentOrganisation?.id) {
                await loadData(
                    currentOrganisation.id,
                    currentCompetitionId
                )
            }

            showToast(
                'Competition teams updated successfully.'
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
                        Select which organisation
                        teams are participating in
                        the selected competition.
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
                                teams selected for
                                this competition.
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

                                    return (
                                        <label
                                            className="adminGroupCard"
                                            key={
                                                team.id
                                            }
                                            style={{
                                                cursor:
                                                    'pointer',
                                            }}
                                        >
                                            <div className="adminGroupHeader">
                                                <div className="adminGroupTeam">
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
                                        </label>
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