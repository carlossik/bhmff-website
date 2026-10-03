
import { useEffect, useState } from 'react'
import { getSaasAnalyticsConsent } from '../../lib/saasAnalytics'
import {
    getVisitorIdentity,
    getPageEventIdentity,
} from '../../lib/siteVisitorIdentity'
import {
    getPublicVisitorCount,
    normaliseVisitorPath,
    recordVisitorPage,
} from '../../services/siteVisitorService'
export function PublicVisitorCounter({ organisationId, path, navigationKey, showCount }: { organisationId: string; path: string; navigationKey: string; showCount: boolean }) {
    const [count, setCount] = useState<number | null>(null)
    useEffect(() => {
        let disposed = false
        setCount(null)
        const refresh = async () => { try { const value = await getPublicVisitorCount(organisationId); if (!disposed) setCount(value) } catch { /* omit an unavailable count */ } }
        const track = async () => {
            if (getSaasAnalyticsConsent() !== 'granted' || /bot|crawler|spider|headless/i.test(navigator.userAgent)) return
            try {
                const uuid = () => crypto.randomUUID()
                const visitorId = getVisitorIdentity(localStorage, organisationId, uuid)
                const reload = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload'
                const eventId = getPageEventIdentity(sessionStorage, organisationId, navigationKey, normaliseVisitorPath(path), reload, uuid)
                await recordVisitorPage(organisationId, visitorId, eventId, path)
                if (!disposed && showCount) await refresh()
            } catch { /* analytics must never interrupt the public website */ }
        }
        void track()
        if (showCount) void refresh()
        const consentChanged = () => { void track() }
        window.addEventListener('thq-analytics-consent-changed', consentChanged)
        const timer = showCount ? window.setInterval(() => { if (!document.hidden) void refresh() }, 60000) : null
        return () => { disposed = true; window.removeEventListener('thq-analytics-consent-changed', consentChanged); if (timer !== null) window.clearInterval(timer) }
    }, [organisationId, path, navigationKey, showCount])
    if (!showCount || count === null) return null
    return <div className="mx-auto w-full max-w-[1240px] px-4 py-3 text-center text-xs opacity-70" title="Anonymous browsers recorded with analytics consent since tracking began">Recorded visitors: <strong>{count.toLocaleString('en-GB')}</strong></div>
}
