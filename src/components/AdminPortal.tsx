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

const adminTabs = [
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
                            Tournament Management System
                        </span>

                        <h2>
                            Competition Management
                            Platform
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
                    Create and manage tournaments, leagues and cup
                    competitions from one unified platform. Generate
                    fixtures automatically, manage teams and venues,
                    publish results, maintain league tables and engage
                    your community through the built-in CMS.
                </p>

                <div className="adminPortalShell">
                    <aside className="adminNavPanel">
                        <strong>
                            Competition Administration
                        </strong>

                        <span className="muted">
                            Competition Management Platform
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
                                            Platform Capabilities
                                        </h4>

                                        <ul>
                                            <li>
                                                Manage tournaments,
                                                leagues and cup
                                                competitions.
                                            </li>

                                            <li>
                                                Register teams and
                                                assign home venues.
                                            </li>

                                            <li>
                                                Create groups and
                                                automatically generate
                                                fixtures.
                                            </li>

                                            <li>
                                                Record results and
                                                automatically update
                                                league tables.
                                            </li>

                                            <li>
                                                Manage goals, sponsors
                                                and sponsorship
                                                enquiries.
                                            </li>

                                            <li>
                                                Publish articles, news
                                                and media using the
                                                integrated CMS.
                                            </li>

                                            <li>
                                                Schedule fixtures
                                                manually or generate
                                                them automatically.
                                            </li>

                                            <li>
                                                Reuse competition
                                                structures for future
                                                tournaments.
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

                        {activeTab ===
                            'Auto Fixture Generator' && (
                                <TournamentGenerator />
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