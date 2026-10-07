import { supabase } from '../lib/supabaseClient'
import type { WhatsAppTemplate } from './whatsAppConnectionService'

export type WhatsAppFixture = { id: string; match: string; date: string; kickoff: string; venue: string }
const expectedBody = 'Your scheduled fixture has been updated.\n\nMatch: {{1}}\nDate: {{2}}\nKick-off: {{3}}\nVenue: {{4}}\n\nPlease check these updated details before travelling.'
export function fixtureUpdateTemplate(templates: WhatsAppTemplate[]): WhatsAppTemplate | null {
    return templates.find(t => t.name === 'fixture_update' && t.language === 'en' && t.category === 'UTILITY' &&
        t.components.filter(c => c.text).length === 1 &&
        t.components.some(c => c.type.toUpperCase() === 'BODY' && c.text?.replace(/\r\n/g, '\n').trim() === expectedBody)) ?? null
}
export function fixtureParameters(fixture: WhatsAppFixture): Record<string, string> {
    return { 'body:1': fixture.match, 'body:2': fixture.date, 'body:3': fixture.kickoff, 'body:4': fixture.venue }
}
export async function loadWhatsAppFixtures(organisationId: string): Promise<WhatsAppFixture[]> {
    const { data, error } = await supabase.from('club_fixtures')
        .select('id,team_id,opponent_id,fixture_date,kickoff_time,home_away,venue_name,venue_address,status')
        .eq('organisation_id', organisationId).in('status', ['scheduled', 'confirmed'])
        .order('fixture_date', { ascending: false }).order('kickoff_time')
    if (error) throw new Error(error.message)
    const rows = data ?? []
    if (!rows.length) return []
    const teamIds = [...new Set(rows.map(r => r.team_id).filter(Boolean))]
    const opponentIds = [...new Set(rows.map(r => r.opponent_id).filter(Boolean))]
    const [teams, opponents] = await Promise.all([
        teamIds.length ? supabase.from('teams').select('id,name').in('id', teamIds) : Promise.resolve({ data: [], error: null }),
        opponentIds.length ? supabase.from('club_opponents').select('id,name').eq('organisation_id', organisationId).in('id', opponentIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (teams.error || opponents.error) throw new Error((teams.error || opponents.error)!.message)
    return rows.map(r => {
        const team = teams.data?.find(t => t.id === r.team_id)?.name ?? ''
        const opponent = opponents.data?.find(t => t.id === r.opponent_id)?.name ?? ''
        return {
            id: r.id,
            match: team && opponent ? (r.home_away === 'away' ? `${opponent} vs ${team}` : `${team} vs ${opponent}`) : '',
            date: r.fixture_date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(`${r.fixture_date}T12:00:00Z`)) : '',
            kickoff: r.kickoff_time?.slice(0, 5) ?? '',
            venue: [r.venue_name, r.venue_address].filter(Boolean).join(', '),
        }
    })
}
