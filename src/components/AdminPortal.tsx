import { useEffect, useMemo, useState } from 'react'
import { articles, fixtures, sponsors, teams } from '../data/festivalData'
import { supabase } from '../lib/supabaseClient'
import { TeamsManager } from './admin/Teams/TeamsManager'
const adminTabs = ['Dashboard', 'Teams', 'Fixtures', 'Results', 'Sponsors', 'Articles', 'Media'] as const
import { FixturesManager } from './admin/Fixtures/FixturesManager'

type AdminTab = typeof adminTabs[number]

type AdminPortalProps = {
  onLogout: () => void
}

type DbTeam = {
  id: string
  name: string
  manager_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
}

export function AdminPortal({ onLogout }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('Dashboard')
  const [dbTeams, setDbTeams] = useState<DbTeam[]>([])

  async function loadTeams() {
    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load teams:', error)
      return
    }

    setDbTeams(data ?? [])
  }

  useEffect(() => {
    loadTeams()
  }, [])



  const stats = useMemo(() => [
    { label: 'Teams', value: dbTeams.length },
    { label: 'Fixtures', value: fixtures.length },
    { label: 'Sponsors', value: sponsors.length },
    { label: 'Articles', value: articles.length },
  ], [dbTeams.length])

  return (
    <section id="admin" className="section adminSection">
      <div className="container">
        <div className="adminHeader">
          <div>
            <span className="eyebrow">Festival Management System</span>
            <h2>Festival Management Dashboard</h2>
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
          Manage every aspect of the Black History Month Football Festival from one secure dashboard. Organise teams, fixtures, results, sponsors, media, articles and community content in real time.
        </p>

        <div className="adminPortalShell">
          <aside className="adminNavPanel">
            <strong>Festival Admin</strong>
            <span className="muted">CKEFA Media control room</span>
            <div className="adminTabList">
              {adminTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={activeTab === tab ? 'active' : ''}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </aside>

          <main className="adminWorkspace">
            {activeTab === 'Dashboard' && (
              <div>
                <h3>Dashboard Overview</h3>
                <div className="statGrid adminStats">
                  {stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
                </div>
                <div className="adminChecklist">
                  <h4>Next implementation steps</h4>
                  <ul>
                    <li>Connect Supabase authentication for protected organiser access.</li>
                    <li>Create database tables for teams, fixtures, results, sponsors, articles and media links.</li>
                    <li>Replace mock lists with real records from the database.</li>
                    <li>Add validation, roles and publish/unpublish controls.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'Teams' && (
                <TeamsManager teams={dbTeams}
                              onTeamCreated={loadTeams} />
            )}

            {activeTab === 'Fixtures' && <FixturesManager />}

            {activeTab === 'Results' && (
              <AdminCrud title="Update Results" description="Enter final scores, scorers and player-of-the-match details after each game." fields={['Fixture', 'Home score', 'Away score', 'Goal scorers', 'Player of the match']} records={fixtures.filter((fixture) => fixture.score).map((fixture) => `${fixture.homeTeam} ${fixture.score} ${fixture.awayTeam}`)} />
            )}

            {activeTab === 'Sponsors' && (
              <AdminCrud title="Manage Sponsors" description="Add sponsor profiles, package level, website links and logo references." fields={['Sponsor name', 'Tier', 'Website', 'Description']} records={sponsors.map((sponsor) => `${sponsor.name} — ${sponsor.tier}`)} />
            )}

            {activeTab === 'Articles' && (
              <AdminCrud title="Manage Black History Articles" description="Draft and publish articles for the Black History Hub." fields={['Article title', 'Category', 'Summary', 'Article body']} records={articles.map((article) => `${article.title} — ${article.category}`)} />
            )}

            {activeTab === 'Media' && (
              <AdminCrud title="Manage Media Links" description="Add YouTube highlights, interviews, goal clips and photo gallery links." fields={['Media title', 'YouTube URL', 'Match', 'Description']} records={["Last Year's Final Highlights", 'Goal of the Week placeholder', 'Interview Hub placeholder']} />
            )}
          </main>
        </div>
      </div>
    </section>
  )
}

type AdminCrudProps = {
  title: string
  description: string
  fields: string[]
  records: string[]
}

function AdminCrud({ title, description, fields, records }: AdminCrudProps) {
  return (
    <div>
      <div className="adminWorkspaceHeader">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <button className="btn primary small" type="button">Mock Save</button>
      </div>

      <div className="adminFormGrid">
        {fields.map((field) => (
          <label key={field}>
            <span>{field}</span>
            {field.toLowerCase().includes('body') || field.toLowerCase().includes('description') || field.toLowerCase().includes('scorers') ? (
              <textarea placeholder={`Enter ${field.toLowerCase()}`} />
            ) : (
              <input placeholder={`Enter ${field.toLowerCase()}`} />
            )}
          </label>
        ))}
      </div>

      <div className="adminRecordList">
        <h4><h4>Teams in database</h4></h4>
        {records.length ? records.map((record) => (
          <div className="adminRecord" key={record}>
            <span>{record}</span>
            <div>
              <button type="button">Edit</button>
              <button type="button">Publish</button>
            </div>
          </div>
        )) : <p className="muted">No records yet.</p>}
      </div>
    </div>
  )
}
