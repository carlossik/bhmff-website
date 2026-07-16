import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { MediaManager } from './admin/Media/MediaManager'
import { fixtures } from '../data/festivalData'
import { supabase } from '../lib/supabaseClient'
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
import {
    canAccessModule,
    formatAdminRole,
    type AdminModule,
    type AdminProfile,
} from '../services/accessControl'

const adminTabs: readonly AdminModule[] = [
    'Dashboard',
    'Teams',
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

export function AdminPortal({
                                profile,
                                onLogout,
                            }: AdminPortalProps) {
    const visibleTabs = useMemo(
        () =>
            adminTabs.filter((tab) =>
                canAccessModule(
                    profile.role,
                    tab
                )
            ),
        [profile.role]
    )

    const [activeTab, setActiveTab] =
        useState<AdminModule>('Dashboard')

    const [dbTeams, setDbTeams] =
        useState<DbTeam[]>([])

    const [articleCount, setArticleCount] =
        useState(0)

    const [enquiryCount, setEnquiryCount] =
        useState(0)

    useEffect(() => {
        if (
            !visibleTabs.includes(
                activeTab
            )
        ) {
            setActiveTab('Dashboard')
        }
    }, [activeTab, visibleTabs])

    const loadTeams = useCallback(
        async () => {
            if (
                !canAccessModule(
                    profile.role,
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
                    .order('created_at', {
                        ascending: false,
                    })

            if (error) {
                console.error(
                    'Failed to load teams:',
                    error
                )
                return
            }

            setDbTeams(data ?? [])
        },
        [profile.role]
    )

    const loadArticleCount =
        useCallback(async () => {
            if (
                !canAccessModule(
                    profile.role,
                    'Articles'
                )
            ) {
                setArticleCount(0)
                return
            }

            const { count, error } =
                await supabase
                    .from('articles')
                    .select('id', {
                        count: 'exact',
                        head: true,
                    })

            if (error) {
                console.error(
                    'Failed to load article count:',
                    error
                )
                return
            }

            setArticleCount(count ?? 0)
        }, [profile.role])

    const loadEnquiryCount =
        useCallback(async () => {
            if (
                !canAccessModule(
                    profile.role,
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
                return
            }

            setEnquiryCount(
                (sponsorResponse.count ??
                    0) +
                (demoResponse.count ??
                    0)
            )
        }, [profile.role])

    useEffect(() => {
        void Promise.all([
            loadTeams(),
            loadArticleCount(),
            loadEnquiryCount(),
        ])
    }, [
        loadTeams,
        loadArticleCount,
        loadEnquiryCount,
    ])

    const stats = useMemo(() => {
        const items: Array<{
            label: string
            value: string | number
        }> = []

        if (
            canAccessModule(
                profile.role,
                'Teams'
            )
        ) {
            items.push({
                label: 'Teams',
                value: dbTeams.length,
            })
        }

        if (
            canAccessModule(
                profile.role,
                'Fixtures'
            )
        ) {
            items.push({
                label: 'Fixtures',
                value: fixtures.length,
            })
        }

        if (
            canAccessModule(
                profile.role,
                'Articles'
            )
        ) {
            items.push({
                label: 'Articles',
                value: articleCount,
            })
        }

        if (
            canAccessModule(
                profile.role,
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
        articleCount,
        dbTeams.length,
        enquiryCount,
        profile.role,
    ])

    function renderActiveModule() {
        if (
            !canAccessModule(
                profile.role,
                activeTab
            )
        ) {
            return (
                <div className="teamsEmptyState">
                    <h3>Access denied</h3>

                    <p>
                        Your account does not have
                        permission to access this
                        module.
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
                                        profile.role
                                    )}
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

            case 'Teams':
                return (
                    <TeamsManager
                        teams={dbTeams}
                        onTeamCreated={
                            loadTeams
                        }
                    />
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
                            loadArticleCount
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
                            profile
                        }
                    />
                )
        }
    }

    return (
        <section
            id="admin"
            className="section adminSection"
        >
            <div className="container">
                <div className="adminHeader">
                    <div>
                        <span className="eyebrow">
                            TournamentHQ
                        </span>

                        <h2>
                            Professional Tournament
                            Management Platform
                        </h2>

                        <p className="muted">
                            {profile.full_name ??
                                'Administrator'}
                            {' · '}
                            {formatAdminRole(
                                profile.role
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn secondary small"
                        onClick={onLogout}
                    >
                        Logout
                    </button>
                </div>

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
                                profile.role
                            )}
                        </span>

                        <div className="adminTabList">
                            {visibleTabs.map(
                                (tab) => (
                                    <button
                                        key={
                                            tab
                                        }
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