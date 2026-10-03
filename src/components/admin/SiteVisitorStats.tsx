import { useEffect, useState } from 'react'
import {
    getVisitorStats,
    type VisitorStats,
} from '../../services/siteVisitorService'
export function SiteVisitorStats({ organisationId }: { organisationId: string }) {
    const [stats, setStats] = useState<VisitorStats | null>(null)
    const [error, setError] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)
    useEffect(() => {
        let disposed = false
        setStats(null); setError('')
        getVisitorStats(organisationId).then(value => { if (!disposed) setStats(value) }).catch(() => { if (!disposed) setError('Visitor statistics are unavailable. Check that the visitor migration has been applied and your account has administrator access.') })
        return () => { disposed = true }
    }, [organisationId, refreshKey])
    return <section className="my-6 rounded-2xl border border-[var(--organisation-border)] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-xl font-bold">Website visitors</h4><button type="button" onClick={() => setRefreshKey(value => value + 1)}>Refresh statistics</button></div>
        <p className="my-3 text-sm opacity-70">Anonymous browsers with analytics consent. Repeat visits from the same browser count once per period; refreshes do not add page views. Dates use UK time.</p>
        {error ? <p role="alert">{error}</p> : !stats ? <p role="status">Loading visitor statistics…</p> : <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['Visitors today', stats.visitors_today], ['Visitors this month', stats.visitors_month], ['Total visitors', stats.visitors_total], ['Page views today', stats.views_today], ['Page views this month', stats.views_month], ['Total page views', stats.views_total]].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--organisation-border)] p-4"><p className="text-sm opacity-70">{label}</p><strong className="text-2xl">{Number(value).toLocaleString('en-GB')}</strong></div>)}</div>
            <p className="my-4 text-xs opacity-70">{stats.started_at ? `Recorded since ${new Date(stats.started_at).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}` : 'Counting begins with the first consenting visitor.'}</p>
            <h5 className="font-bold">Popular articles and media this month</h5>{stats.popular.length ? <div className="overflow-x-auto"><table className="mt-3 w-full text-left"><thead><tr><th>Content</th><th>Page views</th></tr></thead><tbody>{stats.popular.map(item => <tr key={item.path}><td className="py-2 break-words">{item.title || item.path}</td><td>{item.views.toLocaleString('en-GB')}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm opacity-70">No article or media visits recorded this month.</p>}
        </>}
    </section>
}
