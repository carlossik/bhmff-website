// Server-only competition directory: client-supplied addresses are never trusted.
// @ts-ignore -- Supabase Edge Functions run under Deno.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2'
export class TournamentCommunicationError extends Error {
    constructor(public status: number, message: string) { super(message) }
}
type Scope = { admin: SupabaseClient; organisationId: string; competitionId: string }
export type OfficialRecipient = {
    key: string; officialUserId: string | null; tournamentContactId?: string | null; role?: string; recipientName: string; email: string | null;
    phone: string | null; whatsappPhone: string | null; whatsappOptIn: boolean | null;
    competitionTeamIds: string[]; teamNames: string[]; playerId: null; teamId: null; contactId: null;
}
async function result<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await query
    if (error) throw new TournamentCommunicationError(500, error.message)
    return (data ?? []) as T
}
export async function requireCompetition(scope: Scope) {
    const { data, error } = await scope.admin.from('competitions').select('id,name')
        .eq('id', scope.competitionId).eq('organisation_id', scope.organisationId).maybeSingle()
    if (error) throw new TournamentCommunicationError(500, error.message)
    if (!data) throw new TournamentCommunicationError(404, 'Competition does not belong to this organisation.')
    return data
}
export async function tournamentDirectory(scope: Scope): Promise<OfficialRecipient[]> {
    const teams = await result<any[]>(scope.admin.from('competition_teams').select('id,team:teams(name)').eq('competition_id', scope.competitionId))
    const assignments = await result<any[]>(scope.admin.from('competition_team_official_assignments')
        .select('user_id,competition_team_id').eq('organisation_id', scope.organisationId).eq('competition_id', scope.competitionId))
    const valid = assignments.filter(a => teams.some(t => t.id === a.competition_team_id))
    const ids = [...new Set(valid.map(a => a.user_id))]
    const [memberships, profiles, contacts, manualContacts] = await Promise.all([
        ids.length ? result<any[]>(scope.admin.from('organisation_memberships').select('user_id,role').eq('organisation_id', scope.organisationId).eq('active', true).in('user_id', ids)) : Promise.resolve([]),
        ids.length ? result<any[]>(scope.admin.from('profiles').select('id,full_name,email').eq('active', true).in('id', ids)) : Promise.resolve([]),
        ids.length ? result<any[]>(scope.admin.from('competition_communication_contacts').select('user_id,phone_e164,whatsapp_opt_in')
            .eq('organisation_id', scope.organisationId).eq('competition_id', scope.competitionId).in('user_id', ids)) : Promise.resolve([]),
        result<any[]>(scope.admin.from('competition_external_contacts').select('id,name,role,email,phone_e164,whatsapp_opt_in')
            .eq('organisation_id', scope.organisationId).eq('competition_id', scope.competitionId).eq('active', true)),
    ])
    const assigned = profiles.filter(p => memberships.some(m => m.user_id === p.id && ['match_official', 'competition_manager', 'super_admin'].includes(m.role))).map(p => {
        const assignedTeams = [...new Set(valid.filter(a => a.user_id === p.id).map(a => a.competition_team_id))]
        const contact = contacts.find(c => c.user_id === p.id)
        return { key: `official:${p.id}`, officialUserId: p.id, recipientName: p.full_name || p.email || 'Club official',
            email: p.email?.trim().toLowerCase() || null, phone: contact?.phone_e164 || null, whatsappPhone: contact?.phone_e164 || null,
            whatsappOptIn: contact?.whatsapp_opt_in ?? null, competitionTeamIds: assignedTeams,
            teamNames: assignedTeams.map(id => { const t = teams.find(t => t.id === id); return (Array.isArray(t?.team) ? t.team[0] : t?.team)?.name || 'Team' }),
            playerId: null, teamId: null, contactId: null }
    }) as OfficialRecipient[]
    const external: OfficialRecipient[] = manualContacts.map(c => ({
        key: `contact:${c.id}`, officialUserId: null, tournamentContactId: c.id, role: c.role,
        recipientName: c.name, email: c.email || null, phone: c.phone_e164 || null,
        whatsappPhone: c.phone_e164 || null, whatsappOptIn: c.whatsapp_opt_in,
        competitionTeamIds: [], teamNames: [], playerId: null, teamId: null, contactId: null,
    }))
    return [...assigned, ...external].sort((a, b) => a.recipientName.localeCompare(b.recipientName))
}
export async function tournamentFixtures(scope: Scope) {
    const rows = await result<any[]>(scope.admin.from('fixtures').select('id,kickoff_time,status,home_competition_team_id,away_competition_team_id,home:competition_teams!fixtures_home_competition_team_fkey(team:teams(name)),away:competition_teams!fixtures_away_competition_team_fkey(team:teams(name)),venue:venues!fixtures_venue_id_fkey(name,address)')
        .eq('competition_id', scope.competitionId).order('kickoff_time', { ascending: false }))
    const relation = (value: any) => Array.isArray(value) ? value[0] : value
    return rows.filter(r => !['cancelled', 'postponed'].includes(r.status)).map(r => {
        const home = relation(relation(r.home)?.team)?.name || ''
        const away = relation(relation(r.away)?.team)?.name || ''
        const date = r.kickoff_time ? new Date(r.kickoff_time) : null
        const validDate = date && !Number.isNaN(date.getTime())
        const venue = relation(r.venue)
        return { id: r.id, competitionTeamIds: [r.home_competition_team_id, r.away_competition_team_id],
            match: home && away ? `${home} vs ${away}` : '',
            date: validDate ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : '',
            kickoff: validDate ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) : '',
            venue: [venue?.name, venue?.address].filter(Boolean).join(', ') }
    })
}
export function resolveTournamentRecipients(raw: unknown, directory: OfficialRecipient[], whatsapp: boolean): OfficialRecipient[] {
    if (!Array.isArray(raw) || !raw.length || raw.length > 50) throw new TournamentCommunicationError(400, 'Select between 1 and 50 competition contacts.')
    const resolved = new Map<string, OfficialRecipient>()
    for (const value of raw) {
        const recipient = directory.find(r => (value?.key ? r.key === value.key : Boolean(r.officialUserId && r.officialUserId === value?.officialUserId)) && (r.officialUserId ? r.officialUserId === value?.officialUserId : r.tournamentContactId === value?.tournamentContactId))
        if (!recipient) throw new TournamentCommunicationError(403, 'A selected official is no longer active or assigned to this competition. Refresh recipients.')
        if (whatsapp && recipient.whatsappOptIn !== true) throw new TournamentCommunicationError(400, `Record WhatsApp consent for ${recipient.recipientName} before sending.`)
        resolved.set(recipient.key, recipient)
    }
    return [...resolved.values()]
}
