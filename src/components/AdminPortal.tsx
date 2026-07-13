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

const adminTabs = [
    'Dashboard',
    'Teams',
    'Groups',
    'Venues',
    'Fixtures',
    'Results',
    'Goals',
    'Sponsors',
    'Articles',
    'Media',
    'Enquiries',
] as const

type AdminTab = (typeof adminTabs)[number]

type AdminPortalProps = {
    onLogout: () => void
}

export function AdminPortal({
                                onLogout,
                            }: AdminPortalProps) {
    const [activeTab, setActiveTab] =
        useState<AdminTab>('Dashboard')

    const [dbTeams, setDbTeams] =
        useState<DbTeam[]>([])

    const [articleCount, setArticleCount] =
        useState(0)

    const [enquiryCount, setEnquiryCount] =
        useState(0)

    const loadTeams = useCallback(async () => {
        const { data, error } = await supabase
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
    }, [])

    const loadArticleCount =
        useCallback(async () => {
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
        }, [])

    const loadEnquiryCount =
        useCallback(async () => {
            const { count, error } =
                await supabase
                    .from('sponsor_enquiries')
                    .select('id', {
                        count: 'exact',
                        head: true,
                    })
                    .eq('status', 'new')

            if (error) {
                console.error(
                    'Failed to load enquiry count:',
                    error
                )
                return
            }

            setEnquiryCount(count ?? 0)
        }, [])

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

    const stats = useMemo(
        () => [
            {
                label: 'Teams',
                value: dbTeams.length,
            },
            {
                label: 'Fixtures',
                value: fixtures.length,
            },
            {
                label: 'Articles',
                value: articleCount,
            },
            {
                label: 'New Enquiries',
                value: enquiryCount,
            },
        ],
        [
            dbTeams.length,
            articleCount,
            enquiryCount,
        ]
    )

    return (
        <section
            id="admin"
            className="section adminSection"
        >
            <div className="container">
                <div className="adminHeader">
                    <div>
                        <span className="eyebrow">
                            Festival Management System
                        </span>

                        <h2>
                            Festival Management
                            Dashboard
                        </h2>
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
                    Manage teams, venues, fixtures,
                    results, sponsors, enquiries,
                    media and community content from
                    one secure dashboard.
                </p>

                <div className="adminPortalShell">
                    <aside className="adminNavPanel">
                        <strong>
                            Festival Admin
                        </strong>

                        <span className="muted">
                            CKEFA Media control room
                        </span>

                        <div className="adminTabList">
                            {adminTabs.map((tab) => (
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
                            ))}
                        </div>
                    </aside>

                    <main className="adminWorkspace">
                        {activeTab ===
                            'Dashboard' && (
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
                                            Current delivery
                                            plan
                                        </h4>

                                        <ul>
                                            <li>
                                                Manage teams,
                                                groups, venues
                                                and fixtures.
                                            </li>

                                            <li>
                                                Publish results
                                                and update league
                                                tables.
                                            </li>

                                            <li>
                                                Manage sponsors
                                                and partnership
                                                visibility.
                                            </li>

                                            <li>
                                                Review and
                                                progress
                                                sponsorship
                                                enquiries.
                                            </li>

                                            <li>
                                                Create and publish
                                                Black History
                                                articles and
                                                media.
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                        {activeTab === 'Teams' && (
                            <TeamsManager
                                teams={dbTeams}
                                onTeamCreated={
                                    loadTeams
                                }
                            />
                        )}

                        {activeTab === 'Groups' && (
                            <GroupsManager />
                        )}

                        {activeTab === 'Venues' && (
                            <VenuesManager />
                        )}

                        {activeTab ===
                            'Fixtures' && (
                                <FixturesManager />
                            )}

                        {activeTab === 'Results' && (
                            <ResultsManager />
                        )}

                        {activeTab === 'Goals' && (
                            <GoalsManager />
                        )}

                        {activeTab ===
                            'Sponsors' && (
                                <SponsorsManager />
                            )}

                        {activeTab ===
                            'Articles' && (
                                <ArticlesManager
                                    onArticlesChanged={
                                        loadArticleCount
                                    }
                                />
                            )}

                        {activeTab === 'Media' && (
                            <MediaManager />
                        )}

                        {activeTab ===
                            'Enquiries' && (
                                <EnquiriesManager />
                            )}
                    </main>
                </div>
            </div>
        </section>
    )
}