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

type DashboardStats = {
    clubs: number
    teams: number
    groups: number
    venues: number
    fixtures: number
    sponsors: number
}

const emptyDashboardStats: DashboardStats = {
    clubs: 0,
    teams: 0,
    groups: 0,
    venues: 0,
    fixtures: 0,
    sponsors: 0,
}

export function AdminPortal({
                                profile,
                                onLogout,
                            }: AdminPortalProps) {
    const {
        currentOrganisation,
        currentRole,
    } = useOrganisation()

    const [activeTab, setActiveTab] =
        useState<AdminModule>('Dashboard')

    const [dbTeams, setDbTeams] =
        useState<DbTeam[]>([])

    const [dashboardStats, setDashboardStats] =
        useState<DashboardStats>(
            emptyDashboardStats
        )

    const [enquiryCount, setEnquiryCount] =
        useState(0)

    const [dashboardLoading, setDashboardLoading] =
        useState(false)

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
        setDashboardStats(
            emptyDashboardStats
        )
        setEnquiryCount(0)
    }, [currentOrganisation?.id])

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

            setDbTeams(data ?? [])
        }, [
            activeRole,
            currentOrganisation,
        ])

    const loadDashboardStats =
        useCallback(async () => {
            if (!currentOrganisation) {
                setDashboardStats(
                    emptyDashboardStats
                )
                return
            }

            setDashboardLoading(true)

            const organisationId =
                currentOrganisation.id

            try {
                const [
                    clubsResponse,
                    teamsResponse,
                    groupsResponse,
                    venuesResponse,
                    fixturesResponse,
                    sponsorsResponse,
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
                        .from('groups')
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
                        .from('fixtures')
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
                        name: 'groups',
                        response: groupsResponse,
                    },
                    {
                        name: 'venues',
                        response: venuesResponse,
                    },
                    {
                        name: 'fixtures',
                        response: fixturesResponse,
                    },
                    {
                        name: 'sponsors',
                        response: sponsorsResponse,
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

                setDashboardStats({
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

                    groups:
                        groupsResponse.error
                            ? 0
                            : groupsResponse.count ??
                            0,

                    venues:
                        venuesResponse.error
                            ? 0
                            : venuesResponse.count ??
                            0,

                    fixtures:
                        fixturesResponse.error
                            ? 0
                            : fixturesResponse.count ??
                            0,

                    sponsors:
                        sponsorsResponse.error
                            ? 0
                            : sponsorsResponse.count ??
                            0,
                })
            } finally {
                setDashboardLoading(false)
            }
        }, [currentOrganisation])

    const loadEnquiryCount =
        useCallback(async () => {
            if (
                !canAccessModule(
                    activeRole,
                    'Enquiries'
                )
            ) {
                setEnquiryCount(0)
                return
            }

            const [
                sponsorResponse,
                demoResponse,
            ] = await Promise.all([
                supabase
                    .from(
                        'sponsor_enquiries'
                    )
                    .select('id', {
                        count: 'exact',
                        head: true,
                    })
                    .eq('status', 'new'),

                supabase
                    .from('demo_requests')
                    .select('id', {
                        count: 'exact',
                        head: true,
                    })
                    .eq('status', 'new'),
            ])

            if (
                sponsorResponse.error ||
                demoResponse.error
            ) {
                console.error(
                    'Failed to load enquiry count:',
                    sponsorResponse.error ??
                    demoResponse.error
                )

                setEnquiryCount(0)
                return
            }

            setEnquiryCount(
                (sponsorResponse.count ?? 0) +
                (demoResponse.count ?? 0)
            )
        }, [activeRole])

    useEffect(() => {
        if (!currentOrganisation) {
            return
        }

        void Promise.all([
            loadTeams(),
            loadDashboardStats(),
            loadEnquiryCount(),
        ])
    }, [
        currentOrganisation,
        loadTeams,
        loadDashboardStats,
        loadEnquiryCount,
    ])

    const stats = useMemo(() => {
        const items: Array<{
            label: string
            value: string | number
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
                dashboardStats.clubs,
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
                dashboardStats.teams,
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
                dashboardStats.groups,
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
                dashboardStats.venues,
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
                dashboardStats.fixtures,
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
                dashboardStats.sponsors,
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

        if (!items.length) {
            items.push(
                {
                    label: 'Results',
                    value: 'Manage',
                },
                {
                    label: 'Goals',
                    value: 'Manage',
                }
            )
        }

        return items
    }, [
        activeRole,
        dashboardStats,
        enquiryCount,
    ])

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
                        <h3>
                            Dashboard Overview
                        </h3>

                        {dashboardLoading && (
                            <p className="muted">
                                Loading dashboard
                                statistics...
                            </p>
                        )}

                        <div className="statGrid adminStats">
                            {stats.map(
                                (stat) => (
                                    <div
                                        key={
                                            stat.label
                                        }
                                    >
                                        <strong>
                                            {
                                                stat.value
                                            }
                                        </strong>

                                        <span>
                                            {
                                                stat.label
                                            }
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="adminChecklist">
                            <h4>
                                Your Access
                            </h4>

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
                                                {
                                                    tab
                                                }
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
                return <CompetitionManager />

            case 'Clubs':
                return <ClubsManager />

            case 'Teams':
                return (
                    <TeamsManager
                        teams={dbTeams}
                        onTeamCreated={
                            async () => {
                                await loadTeams()
                                await loadDashboardStats()
                            }
                        }
                    />
                )
            case 'Competition Teams':
                return <CompetitionTeamsManager />

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
                            loadDashboardStats
                        }
                    />
                )

            case 'Media':
                return <MediaManager />

            case 'Enquiries':
                return (
                    <EnquiriesManager />
                )

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
                    Your portal access is limited to
                    the modules required for your
                    assigned operational role.
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