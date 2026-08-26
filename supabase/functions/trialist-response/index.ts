import { createClient } from 'npm:@supabase/supabase-js@^2'

async function sha(value: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(d)).map((b)=>b.toString(16).padStart(2,'0')).join('') }
function esc(value: unknown): string { return String(value ?? '').replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c] ?? c)) }
function page(content: string, status=200): Response { return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>TournamentHQ Trial</title></head><body style="margin:0;background:#071009;color:#fff;font-family:Arial,sans-serif"><main style="max-width:680px;margin:40px auto;padding:24px"><div style="color:#8cf566;font-weight:900">TOURNAMENTHQ</div>${content}</main></body></html>`, { status, headers:{ 'Content-Type':'text/html; charset=utf-8' } }) }

Deno.serve(async (request) => {
    const url = new URL(request.url)
    const rawToken = url.searchParams.get('token') ?? ''
    if (!rawToken) return page('<h1>Invalid invitation</h1>',400)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !service) return page('<h1>Service unavailable</h1>',500)
    const admin = createClient(supabaseUrl, service)
    const tokenHash = await sha(rawToken)
    const { data: invitation } = await admin.from('club_trial_invitations').select('*,club_trialists(*)').eq('token_hash',tokenHash).maybeSingle()
    if (!invitation) return page('<h1>Invitation not found</h1>',404)
    if (new Date(String(invitation.expires_at)).getTime() < Date.now()) return page('<h1>This invitation has expired</h1>',410)
    const trialistRaw = invitation.club_trialists
    const trialist = Array.isArray(trialistRaw) ? trialistRaw[0] : trialistRaw
    if (!trialist) return page('<h1>Trial details unavailable</h1>',404)
    if (request.method === 'POST') {
        const form = await request.formData()
        const response = String(form.get('response') ?? '')
        const responder = String(form.get('responder') ?? '').trim()
        const note = String(form.get('note') ?? '').trim()
        if (!['accepted','declined'].includes(response)) return page('<h1>Invalid response</h1>',400)
        await admin.from('club_trial_invitations').update({ response, responded_by_name: responder || null, response_note: note || null, responded_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',invitation.id)
        await admin.from('club_trialists').update({ status: response === 'accepted' ? 'accepted' : 'declined', updated_at:new Date().toISOString() }).eq('id',trialist.id)
        return page(`<h1>Thank you</h1><p>Your response has been recorded as <strong>${esc(response)}</strong>.</p>`)
    }
    const trialDate = trialist.trial_date ? new Date(String(trialist.trial_date)).toLocaleString('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/London'}) : 'To be confirmed'
    return page(`<h1>Trial invitation</h1><p><strong>${esc(trialist.first_name)} ${esc(trialist.last_name)}</strong></p><p>${esc(trialDate)}<br>${esc(trialist.venue_name ?? 'Venue to be confirmed')}<br>${esc(trialist.venue_address ?? '')}</p><form method="post"><label>Your name<br><input name="responder" style="width:100%;padding:12px;margin:8px 0 16px"></label><label>Optional note<br><textarea name="note" rows="4" style="width:100%;padding:12px;margin:8px 0 16px"></textarea></label><button name="response" value="accepted" style="padding:14px 18px;background:#8cf566;border:0;border-radius:10px;font-weight:800;margin-right:8px">Accept trial</button><button name="response" value="declined" style="padding:14px 18px;background:#fff;border:0;border-radius:10px;font-weight:800">Decline</button></form>`)
})
