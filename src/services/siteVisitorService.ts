import { supabase } from '../lib/supabaseClient'
export type VisitorStats = { visitors_today: number; visitors_month: number; visitors_total: number; views_today: number; views_month: number; views_total: number; started_at: string | null; popular: { path: string; title: string; views: number }[] }
export function normaliseVisitorPath(path: string): string {
    return (path.split(/[?#]/)[0].replace(/\/+$/, '') || '/').slice(0, 240)
}
export async function getPublicVisitorCount(organisationId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_public_visitor_count', { p_organisation_id: organisationId })
    if (error) throw error
    return Number(data || 0)
}
export async function getVisitorStats(organisationId: string): Promise<VisitorStats> {
    const { data, error } = await supabase.rpc('get_site_visitor_stats', { p_organisation_id: organisationId })
    if (error) throw error
    return data as VisitorStats
}
export async function recordVisitorPage(organisationId: string, visitorId: string, eventId: string, path: string): Promise<void> {
    const { error } = await supabase.rpc('record_public_site_visit', { p_organisation_id: organisationId, p_visitor_id: visitorId, p_event_id: eventId, p_path: normaliseVisitorPath(path) })
    if (error) throw error
}
