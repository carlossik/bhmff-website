import { useMemo, useState } from 'react'
import { articles, fixtures, sponsors, teams } from '../data/festivalData'

const adminTabs = ['Dashboard', 'Teams', 'Fixtures', 'Results', 'Sponsors', 'Articles', 'Media'] as const

type AdminTab = typeof adminTabs[number]

export function AdminPortal() {
  const [activeTab, setActiveTab] = useState<AdminTab>('Dashboard')

  const stats = useMemo(() => [
    { label: 'Teams', value: teams.length },
    { label: 'Fixtures', value: fixtures.length },
    { label: 'Sponsors', value: sponsors.length },
    { label: 'Articles', value: articles.length },
  ], [])

  return (
    <section id="admin" className="section adminSection">
      <div className="container">
        <p className="eyebrow">Phase 2 Build</p>
        <h2>Admin Portal</h2>
        <p className="lead">
          This is the first working admin interface. It is currently mock-based, so it gives us the screen flow,
          content structure and management journey before we connect Supabase for secure login and live data.
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
              <AdminCrud title="Manage Teams" description="Add participating clubs, managers and team profile information." fields={['Team name', 'Manager name', 'Club contact email']} records={teams.map((team) => `${team.name} — ${team.manager}`)} />
            )}

            {activeTab === 'Fixtures' && (
              <AdminCrud title="Manage Fixtures" description="Create fixture slots for each October weekend and assign venues." fields={['Home team', 'Away team', 'Date', 'Kick-off time', 'Venue']} records={fixtures.map((fixture) => `${fixture.homeTeam} vs ${fixture.awayTeam} — ${fixture.date}`)} />
            )}

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
        <h4>Current mock records</h4>
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
