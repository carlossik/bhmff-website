import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import CompetitionManager from './admin/Competitions/CompetitionManager'
import { MediaManager } from './admin/Media/MediaManager'
import { supabase } from '../lib/supabaseClient'
import { ClubsManager } from './admin/Clubs/ClubsManager'
import { TeamsManager } from './admin/Teams/TeamsManager'
import { FixturesManager } from './admin/Fixtures/FixturesManager'
import { VenuesManager } from './admin/Venues/VenuesManager'
import { ResultsManager } from './admin/Results/ResultsManager'
import type { DbTeam } from './admin/Teams/teamTypes'
import { GoalsManager } from './admin/Goals/GoalsManager'
import { GroupsManager } from './admin/Groups/GroupsManager'
import { SponsorsManager } from './admin/Sponsors/SponsorsManager'
import { ArticlesManager } from './admin/Articles/ArticlesManager'
import { EnquiriesManager } from './admin/Enquiries/EnquiriesManager'
import { TournamentGenerator } from './admin/TournamentGenerator/TournamentGenerator'
import { UserManagement } from './admin/Users/UserManagement'
import OrganisationManager from './admin/Organisations/OrganisationManager'
import { AdminHeader } from './admin/AdminHeader'
import { CompetitionTeamsManager } from './admin/CompetitionTeams/CompetitionTeamsManager'

import {
    canAccessModule,
    formatAdminRole,
    type AdminModule,
    type AdminProfile,
} from '../services/accessControl'

import { useOrganisation } from '../context/OrganisationContext'
import { useCompetition } from '../contexts/CompetitionContext'

const adminTabs: readonly AdminModule[] = [
    'Dashboard',
    'Organisations',
    'Competitions',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'Auto Fixture Generator',
    'Venues',
    'Fixtures',
    'Results',
    'Goals',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
    'User Access',
]

type AdminPortalProps = {
    profile: AdminProfile
    onLogout: () => void
}

type OrganisationDashboardStats = {
    clubs: number
    teams: number
    venues: number
    sponsors: number
    articles: number
    media: number
}

type CompetitionDashboardStats = {
    competitionTeams: number
    groups: number
    fixtures: number
    results: number
    goals: number
}

const emptyOrganisationStats: OrganisationDashboardStats = {
    clubs: 0,
    teams: 0,
    venues: 0,
    sponsors: 0,
    articles: 0,
    media: 0,
}

const emptyCompetitionStats: CompetitionDashboardStats = {
    competitionTeams: 0,
    groups: 0,
    fixtures: 0,
    results: 0,
    goals: 0,
}

export function AdminPortal({
                                profile,
                                onLogout,
                            }: AdminPortalProps) {
    const {
        currentOrganisation,
        currentRole,
    } = useOrganisation()

    const {
        currentCompetition,
        currentCompetitionId,
    } = useCompetition()

    const [activeTab, setActiveTab] =
        useState<AdminModule>('Dashboard')

    const [dbTeams, setDbTeams] =
        useState<DbTeam[]>([])

    const [
        organisationStats,
        setOrganisationStats,
    ] = useState<OrganisationDashboardStats>(
        emptyOrganisationStats
    )

    const [
        competitionStats,
        setCompetitionStats,
    ] = useState<CompetitionDashboardStats>(
        emptyCompetitionStats
    )

    const [enquiryCount, setEnquiryCount] =
        useState(0)

    const [
        organisationStatsLoading,
        setOrganisationStatsLoading,
    ] = useState(false)

    const [
        competitionStatsLoading,
        setCompetitionStatsLoading,
    ] = useState(false)

    const effectiveProfile =
        useMemo<AdminProfile>(
            () => ({
                ...profile,
                role:
                    currentRole ??
                    profile.role,
            }),
            [
                currentRole,
                profile,
            ]
        )

    const activeRole =
        effectiveProfile.role

    const visibleTabs = useMemo(
        () =>
            adminTabs.filter((tab) =>
                canAccessModule(
                    activeRole,
                    tab
                )
            ),
        [activeRole]
    )

    useEffect(() => {
        if (
            !visibleTabs.includes(
                activeTab
            )
        ) {
            setActiveTab('Dashboard')
        }
    }, [
        activeTab,
        visibleTabs,
    ])

    useEffect(() => {
        setActiveTab('Dashboard')
        setDbTeams([])
        setOrganisationStats(
            emptyOrganisationStats
        )
        setCompetitionStats(
            emptyCompetitionStats
        )
        setEnquiryCount(0)
    }, [currentOrganisation?.id])

    useEffect(() => {
        setCompetitionStats(
            emptyCompetitionStats
        )
    }, [currentCompetitionId])

    const loadTeams =
        useCallback(async () => {
            if (
                !currentOrganisation ||
                !canAccessModule(
                    activeRole,
                    'Teams'
                )
            ) {
                setDbTeams([])
                return
            }

            const { data, error } =
                await supabase
                    .from('teams')
                    .select('*')
                    .eq(
                        'organisation_id',
                        currentOrganisation.id
                    )
                    .order('created_at', {
                        ascending: false,
                    })

            if (error) {
                console.error(
                    'Failed to load teams:',
                    error
                )

                setDbTeams([])
                return
            }

            setDbTeams(
                (data ?? []) as DbTeam[]
            )
        }, [
            activeRole,
            currentOrganisation,
        ])

    const loadOrganisationStats =
        useCallback(async () => {
            if (!currentOrganisation?.id) {
                setOrganisationStats(
                    emptyOrganisationStats
                )
                return
            }

            setOrganisationStatsLoading(true)

            const organisationId =
                currentOrganisation.id

            try {
                const [
                    clubsResponse,
                    teamsResponse,
                    venuesResponse,
                    sponsorsResponse,
                    articlesResponse,
                    mediaResponse,
                ] = await Promise.all([
                    supabase
                        .from('clubs')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),

                    supabase
                        .from('teams')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),

                    supabase
                        .from('venues')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),

                    supabase
                        .from('sponsors')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),

                    supabase
                        .from('articles')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),

                    supabase
                        .from('media_items')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'organisation_id',
                            organisationId
                        ),
                ])

                const responses = [
                    {
                        name: 'clubs',
                        response: clubsResponse,
                    },
                    {
                        name: 'teams',
                        response: teamsResponse,
                    },
                    {
                        name: 'venues',
                        response: venuesResponse,
                    },
                    {
                        name: 'sponsors',
                        response: sponsorsResponse,
                    },
                    {
                        name: 'articles',
                        response: articlesResponse,
                    },
                    {
                        name: 'media',
                        response: mediaResponse,
                    },
                ]

                responses.forEach(
                    ({
                         name,
                         response,
                     }) => {
                        if (response.error) {
                            console.error(
                                `Failed to load ${name} count:`,
                                response.error
                            )
                        }
                    }
                )

                setOrganisationStats({
                    clubs:
                        clubsResponse.error
                            ? 0
                            : clubsResponse.count ??
                            0,

                    teams:
                        teamsResponse.error
                            ? 0
                            : teamsResponse.count ??
                            0,

                    venues:
                        venuesResponse.error
                            ? 0
                            : venuesResponse.count ??
                            0,

                    sponsors:
                        sponsorsResponse.error
                            ? 0
                            : sponsorsResponse.count ??
                            0,

                    articles:
                        articlesResponse.error
                            ? 0
                            : articlesResponse.count ??
                            0,

                    media:
                        mediaResponse.error
                            ? 0
                            : mediaResponse.count ??
                            0,
                })
            } finally {
                setOrganisationStatsLoading(false)
            }
        }, [currentOrganisation?.id])

    const loadCompetitionStats =
        useCallback(async () => {
            if (!currentCompetitionId) {
                setCompetitionStats(
                    emptyCompetitionStats
                )
                return
            }

            setCompetitionStatsLoading(true)

            try {
                const [
                    competitionTeamsResponse,
                    groupsResponse,
                    fixturesResponse,
                ] = await Promise.all([
                    supabase
                        .from('competition_teams')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),

                    supabase
                        .from('groups')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),

                    supabase
                        .from('fixtures')
                        .select('id', {
                            count: 'exact',
                        })
                        .eq(
                            'competition_id',
                            currentCompetitionId
                        ),
                ])

                if (
                    competitionTeamsResponse.error
                ) {
                    console.error(
                        'Failed to load competition teams count:',
                        competitionTeamsResponse.error
                    )
                }

                if (groupsResponse.error) {
                    console.error(
                        'Failed to load groups count:',
                        groupsResponse.error
                    )
                }

                if (fixturesResponse.error) {
                    console.error(
                        'Failed to load fixtures count:',
                        fixturesResponse.error
                    )
                }

                const fixtureIds =
                    fixturesResponse.error
                        ? []
                        : (
                            fixturesResponse.data ??
                            []
                        ).map(
                            (fixture) =>
                                fixture.id
                        )

                let resultsCount = 0
                let goalsCount = 0

                if (fixtureIds.length > 0) {
                    const [
                        resultsResponse,
                        goalsResponse,
                    ] = await Promise.all([
                        supabase
                            .from('results')
                            .select('id', {
                                count: 'exact',
                                head: true,
                            })
                            .in(
                                'fixture_id',
                                fixtureIds
                            ),

                        supabase
                            .from('goals')
                            .select('id', {
                                count: 'exact',
                                head: true,
                            })
                            .in(
                                'fixture_id',
                                fixtureIds
                            ),
                    ])

                    if (
                        resultsResponse.error
                    ) {
                        console.error(
                            'Failed to load results count:',
                            resultsResponse.error
                        )
                    } else {
                        resultsCount =
                            resultsResponse.count ??
                            0
                    }

                    if (goalsResponse.error) {
                        console.error(
                            'Failed to load goals count:',
                            goalsResponse.error
                        )
                    } else {
                        goalsCount =
                            goalsResponse.count ??
                            0
                    }
                }

                setCompetitionStats({
                    competitionTeams:
                        competitionTeamsResponse.error
                            ? 0
                            : competitionTeamsResponse.count ??
                            0,

                    groups:
                        groupsResponse.error
                            ? 0
                            : groupsResponse.count ??
                            0,

                    fixtures:
                        fixturesResponse.error
                            ? 0
                            : fixturesResponse.count ??
                            0,

                    results: resultsCount,
                    goals: goalsCount,
                })
            } finally {
                setCompetitionStatsLoading(false)
            }
        }, [currentCompetitionId])

    const loadEnquiryCount =
        useCallback(async () => {
            if (
                !currentOrganisation?.id ||
                !canAccessModule(
                    activeRole,
                    'Enquiries'
                )
            ) {
                setEnquiryCount(0)
                return
            }

            const {
                count,
                error,
            } = await supabase
                .from('sponsor_enquiries')
                .select('id', {
                    count: 'exact',
                    head: true,
                })
                .eq(
                    'organisation_id',
                    currentOrganisation.id
                )
                .eq('status', 'new')

            if (error) {
                console.error(
                    'Failed to load enquiry count:',
                    error
                )

                setEnquiryCount(0)
                return
            }

            setEnquiryCount(count ?? 0)
        }, [
            activeRole,
            currentOrganisation?.id,
        ])

    useEffect(() => {
        if (!currentOrganisation?.id) {
            return
        }

        void Promise.all([
            loadTeams(),
            loadOrganisationStats(),
            loadEnquiryCount(),
        ])
    }, [
        currentOrganisation?.id,
        loadTeams,
        loadOrganisationStats,
        loadEnquiryCount,
    ])

    useEffect(() => {
        void loadCompetitionStats()
    }, [loadCompetitionStats])

    const organisationStatItems =
        useMemo(() => {
            const items: Array<{
                label: string
                value: number
            }> = []

            if (
                canAccessModule(
                    activeRole,
                    'Clubs'
                )
            ) {
                items.push({
                    label: 'Clubs',
                    value:
                    organisationStats.clubs,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Teams'
                )
            ) {
                items.push({
                    label: 'Teams',
                    value:
                    organisationStats.teams,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Venues'
                )
            ) {
                items.push({
                    label: 'Venues',
                    value:
                    organisationStats.venues,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Sponsors'
                )
            ) {
                items.push({
                    label: 'Sponsors',
                    value:
                    organisationStats.sponsors,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Articles'
                )
            ) {
                items.push({
                    label: 'Articles',
                    value:
                    organisationStats.articles,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Media'
                )
            ) {
                items.push({
                    label: 'Media',
                    value:
                    organisationStats.media,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Enquiries'
                )
            ) {
                items.push({
                    label: 'New Enquiries',
                    value: enquiryCount,
                })
            }

            return items
        }, [
            activeRole,
            organisationStats,
            enquiryCount,
        ])

    const competitionStatItems =
        useMemo(() => {
            const items: Array<{
                label: string
                value: number
            }> = []

            if (
                canAccessModule(
                    activeRole,
                    'Competition Teams'
                )
            ) {
                items.push({
                    label:
                        'Competition Teams',
                    value:
                    competitionStats.competitionTeams,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Groups'
                )
            ) {
                items.push({
                    label: 'Groups',
                    value:
                    competitionStats.groups,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Fixtures'
                )
            ) {
                items.push({
                    label: 'Fixtures',
                    value:
                    competitionStats.fixtures,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Results'
                )
            ) {
                items.push({
                    label: 'Results',
                    value:
                    competitionStats.results,
                })
            }

            if (
                canAccessModule(
                    activeRole,
                    'Goals'
                )
            ) {
                items.push({
                    label: 'Goals',
                    value:
                    competitionStats.goals,
                })
            }

            return items
        }, [
            activeRole,
            competitionStats,
        ])

    function renderStatGrid(
        items: Array<{
            label: string
            value: number
        }>
    ) {
        if (!items.length) {
            return (
                <p className="muted">
                    No statistics are available
                    for your current access level.
                </p>
            )
        }

        return (
            <div className="statGrid adminStats">
                {items.map((stat) => (
                    <div key={stat.label}>
                        <strong>
                            {stat.value}
                        </strong>

                        <span>
                            {stat.label}
                        </span>
                    </div>
                ))}
            </div>
        )
    }

    function renderActiveModule() {
        if (
            !canAccessModule(
                activeRole,
                activeTab
            )
        ) {
            return (
                <div className="teamsEmptyState">
                    <h3>Access denied</h3>

                    <p>
                        Your account does not have
                        permission to access this
                        module for the selected
                        organisation.
                    </p>
                </div>
            )
        }

        switch (activeTab) {
            case 'Dashboard':
                return (
                    <div>
                        <div className="adminWorkspaceHeader">
                            <div>
                                <h3>
                                    Dashboard Overview
                                </h3>

                                <p className="muted">
                                    Overview for{' '}
                                    <strong>
                                        {
                                            currentOrganisation
                                                .name
                                        }
                                    </strong>
                                    .
                                </p>
                            </div>
                        </div>

                        <section>
                            <h4>
                                Organisation Statistics
                            </h4>

                            {organisationStatsLoading && (
                                <p className="muted">
                                    Loading organisation
                                    statistics...
                                </p>
                            )}

                            {renderStatGrid(
                                organisationStatItems
                            )}
                        </section>

                        <section className="adminChecklist">
                            <h4>
                                Competition Statistics
                            </h4>

                            {currentCompetition ? (
                                <>
                                    <p>
                                        Selected competition:{' '}
                                        <strong>
                                            {
                                                currentCompetition.name
                                            }
                                        </strong>
                                    </p>

                                    {competitionStatsLoading && (
                                        <p className="muted">
                                            Loading competition
                                            statistics...
                                        </p>
                                    )}

                                    {renderStatGrid(
                                        competitionStatItems
                                    )}
                                </>
                            ) : (
                                <div className="teamsEmptyState">
                                    <h3>
                                        No competition selected
                                    </h3>

                                    <p>
                                        Select or create a
                                        competition to view
                                        competition-specific
                                        statistics.
                                    </p>
                                </div>
                            )}
                        </section>

                        <div className="adminChecklist">
                            <h4>Your Access</h4>

                            <p>
                                Signed in as{' '}
                                <strong>
                                    {formatAdminRole(
                                        activeRole
                                    )}
                                </strong>{' '}
                                for{' '}
                                <strong>
                                    {
                                        currentOrganisation
                                            .name
                                    }
                                </strong>
                                .
                            </p>

                            <ul>
                                {visibleTabs
                                    .filter(
                                        (tab) =>
                                            tab !==
                                            'Dashboard'
                                    )
                                    .map(
                                        (tab) => (
                                            <li
                                                key={
                                                    tab
                                                }
                                            >
                                                {tab}
                                            </li>
                                        )
                                    )}
                            </ul>
                        </div>
                    </div>
                )

            case 'Organisations':
                return (
                    <OrganisationManager />
                )

            case 'Competitions':
                return (
                    <CompetitionManager />
                )

            case 'Clubs':
                return <ClubsManager />

            case 'Teams':
                return (
                    <TeamsManager
                        teams={dbTeams}
                        onTeamCreated={
                            async () => {
                                await loadTeams()
                                await loadOrganisationStats()
                            }
                        }
                    />
                )

            case 'Competition Teams':
                return (
                    <CompetitionTeamsManager />
                )

            case 'Groups':
                return <GroupsManager />

            case 'Auto Fixture Generator':
                return (
                    <TournamentGenerator />
                )

            case 'Venues':
                return <VenuesManager />

            case 'Fixtures':
                return <FixturesManager />

            case 'Results':
                return <ResultsManager />

            case 'Goals':
                return <GoalsManager />

            case 'Sponsors':
                return <SponsorsManager />

            case 'Articles':
                return (
                    <ArticlesManager
                        onArticlesChanged={
                            loadOrganisationStats
                        }
                    />
                )

            case 'Media':
                return <MediaManager />

            case 'Enquiries':
                return <EnquiriesManager />

            case 'User Access':
                return (
                    <UserManagement
                        currentProfile={
                            effectiveProfile
                        }
                    />
                )
        }
    }

    if (!currentOrganisation) {
        return (
            <section className="section adminSection">
                <div className="container">
                    <p className="muted">
                        Loading organisation...
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section
            id="admin"
            className="section adminSection"
        >
            <div className="container">
                <AdminHeader
                    profile={
                        effectiveProfile
                    }
                    onLogout={onLogout}
                />

                <p className="lead">
                    Your portal access is limited
                    to the modules required for
                    your assigned operational role.
                </p>

                <div className="adminPortalShell">
                    <aside className="adminNavPanel">
                        <strong>
                            Competition
                            Administration
                        </strong>

                        <span className="muted">
                            {formatAdminRole(
                                activeRole
                            )}
                        </span>

                        <div className="adminTabList">
                            {visibleTabs.map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={
                                            activeTab ===
                                            tab
                                                ? 'active'
                                                : ''
                                        }
                                        onClick={() =>
                                            setActiveTab(
                                                tab
                                            )
                                        }
                                    >
                                        {tab}

                                        {tab ===
                                            'Enquiries' &&
                                            enquiryCount >
                                            0 && (
                                                <span className="adminTabCount">
                                                    {
                                                        enquiryCount
                                                    }
                                                </span>
                                            )}
                                    </button>
                                )
                            )}
                        </div>
                    </aside>

                    <main className="adminWorkspace">
                        {renderActiveModule()}
                    </main>
                </div>
            </div>
        </section>
    )
}