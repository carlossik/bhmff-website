import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Mail, Plus, RefreshCw, Save, UserPlus, X } from 'lucide-react'
import { useOrganisation } from '../../../context/OrganisationContext'
import { trialistService } from '../../../services/trialistService'
import { clubFixtureService } from '../Fixtures/clubFixtureService'
import type { ClubFixtureTeamOption, ClubSeason } from '../Fixtures/clubFixtureTypes'
import type { TrialAssessment, TrialDecision, Trialist, TrialistFormValues, TrialistStatus } from '../../../types/trialistTypes'
import { TournamentHQBrand } from '../../common/TournamentHQBrand'

const emptyForm: TrialistFormValues = {
    season_id: '', team_id: '', first_name: '', last_name: '', date_of_birth: '', position: '', preferred_foot: '',
    email: '', phone: '', guardian_name: '', guardian_email: '', guardian_phone: '', previous_club: '', referred_by: '',
    trial_date: '', trial_type: 'training', venue_name: '', venue_address: '', eligible_for_match_trial: false, internal_notes: '',
}

const statuses: readonly { value: TrialistStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' }, { value: 'invited', label: 'Invited' }, { value: 'accepted', label: 'Accepted' },
    { value: 'scheduled', label: 'Trial Scheduled' }, { value: 'attended', label: 'Attended' }, { value: 'under_review', label: 'Under Review' },
    { value: 'offered', label: 'Offered Place' }, { value: 'further_trial', label: 'Further Trial' }, { value: 'unsuccessful', label: 'Unsuccessful' },
    { value: 'no_show', label: 'No Show' }, { value: 'withdrawn', label: 'Withdrawn' }, { value: 'declined', label: 'Declined' },
]

const decisions: readonly { value: Exclude<TrialDecision, null>; label: string }[] = [
    { value: 'offer_place', label: 'Offer place' }, { value: 'further_trial', label: 'Further trial required' },
    { value: 'keep_observing', label: 'Keep under observation' }, { value: 'unsuccessful', label: 'Unsuccessful' },
]

function toForm(row: Trialist): TrialistFormValues {
    return {
        season_id: row.season_id ?? '', team_id: row.team_id ?? '', first_name: row.first_name, last_name: row.last_name,
        date_of_birth: row.date_of_birth ?? '', position: row.position ?? '', preferred_foot: row.preferred_foot ?? '', email: row.email ?? '', phone: row.phone ?? '',
        guardian_name: row.guardian_name ?? '', guardian_email: row.guardian_email ?? '', guardian_phone: row.guardian_phone ?? '', previous_club: row.previous_club ?? '',
        referred_by: row.referred_by ?? '', trial_date: row.trial_date?.slice(0,16) ?? '', trial_type: row.trial_type, venue_name: row.venue_name ?? '',
        venue_address: row.venue_address ?? '', eligible_for_match_trial: row.eligible_for_match_trial, internal_notes: row.internal_notes ?? '',
    }
}

function score(value: number | undefined): number { return Math.min(5, Math.max(1, value ?? 3)) }

export function TrialCentreManager() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? null
    const [rows, setRows] = useState<Trialist[]>([])
    const [seasons, setSeasons] = useState<ClubSeason[]>([])
    const [teamOptions, setTeamOptions] = useState<ClubFixtureTeamOption[]>([])
    const [selected, setSelected] = useState<Trialist | null>(null)
    const [form, setForm] = useState<TrialistFormValues>(emptyForm)
    const [assessment, setAssessment] = useState<TrialAssessment | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!organisationId) return
        const [trialists, seasonRows] = await Promise.all([
            trialistService.list(organisationId),
            clubFixtureService.getSeasons(organisationId),
        ])
        setRows(trialists)
        setSeasons(seasonRows)
    }, [organisationId])

    useEffect(() => { void load().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load Trial Centre.')) }, [load])
    useEffect(() => {
        if (!organisationId || !form.season_id) { setTeamOptions([]); return }
        void clubFixtureService.getTeamOptions(organisationId, form.season_id)
            .then(setTeamOptions)
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load teams for this season.'))
    }, [organisationId, form.season_id])

    const counts = useMemo(() => ({
        total: rows.length,
        invited: rows.filter((r) => ['invited','accepted','scheduled'].includes(r.status)).length,
        reviewing: rows.filter((r) => ['attended','under_review'].includes(r.status)).length,
        offered: rows.filter((r) => r.status === 'offered').length,
    }), [rows])

    function openCreate() { setSelected(null); setForm(emptyForm); setAssessment(null); setShowForm(true); setError(null) }
    async function openEdit(row: Trialist) {
        setSelected(row); setForm(toForm(row)); setShowForm(true); setError(null)
        try { setAssessment(await trialistService.getAssessment(row.id)) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load assessment.') }
    }
    function update<K extends keyof TrialistFormValues>(key: K, value: TrialistFormValues[K]) { setForm((current) => ({ ...current, [key]: value })) }

    async function saveTrialist() {
        if (!organisationId || !form.first_name.trim() || !form.last_name.trim()) { setError('First name and last name are required.'); return }
        try {
            setSaving(true); setError(null)
            if (selected) await trialistService.update(selected.id, form)
            else await trialistService.create(organisationId, form)
            setNotice(selected ? 'Trialist updated.' : 'Trialist created.')
            setShowForm(false); await load()
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save trialist.') } finally { setSaving(false) }
    }

    async function changeStatus(row: Trialist, status: TrialistStatus) {
        try { setSaving(true); await trialistService.setStatus(row.id, status); await load(); setNotice(`Trialist moved to ${statuses.find((x) => x.value === status)?.label ?? status}.`) }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to update status.') } finally { setSaving(false) }
    }

    async function sendInvite(row: Trialist) {
        if (!organisationId) return
        try { setSaving(true); await trialistService.sendInvitation(organisationId, row.id); await load(); setNotice('Trial invitation sent.') }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to send trial invitation.') } finally { setSaving(false) }
    }

    async function sendReport(row: Trialist) {
        if (!organisationId) return
        try { setSaving(true); await trialistService.sendReport(organisationId, row.id); setNotice('Trial report sent to the player/parent contact.') }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to send trial report.') } finally { setSaving(false) }
    }

    async function offerPlace(row: Trialist) {
        try {
            setSaving(true)
            await trialistService.addToSquadAsTrialist(row)
            await trialistService.setStatus(row.id, 'offered', 'offer_place')
            await load()
            setNotice('Place offered and player retained in the squad as a trialist until registration is completed.')
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to offer place.') } finally { setSaving(false) }
    }

    async function addToSquad(row: Trialist) {
        try { setSaving(true); await trialistService.addToSquadAsTrialist(row); await load(); setNotice('Trialist added to the team squad as a trialist. No registration fee was generated.') }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to add trialist to squad.') } finally { setSaving(false) }
    }

    async function saveAssessment() {
        if (!selected || !organisationId) return
        const base = assessment
        const recommendation = base?.recommendation ?? 'keep_observing'
        try {
            setSaving(true)
            await trialistService.saveAssessment({
                trialist_id: selected.id, organisation_id: organisationId,
                technical: score(base?.technical), tactical: score(base?.tactical), physical: score(base?.physical), attitude: score(base?.attitude),
                coachability: score(base?.coachability), teamwork: score(base?.teamwork), strengths: base?.strengths ?? null,
                development_areas: base?.development_areas ?? null, coach_notes: base?.coach_notes ?? null, public_feedback: base?.public_feedback ?? null,
                recommendation,
            })
            setNotice('Trial assessment saved.'); setAssessment(await trialistService.getAssessment(selected.id)); await load()
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save assessment.') } finally { setSaving(false) }
    }

    if (!organisationId) return <div className="rounded-2xl border border-white/10 bg-[#0b1510] p-8 text-slate-400">Select a club before opening Trial Centre.</div>

    return <div className="space-y-5">
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1510] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8cf566]">Club Recruitment</p><h2 className="mt-1 text-2xl font-black text-white">Trial Centre</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Invite trialists, track attendance, assess performance, record decisions and move successful players into the squad without losing their trial history.</p></div>
            <div className="flex gap-2"><button onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white"><RefreshCw className="mr-2 inline h-4 w-4"/>Refresh</button><button onClick={openCreate} className="rounded-xl bg-[#8cf566] px-4 py-3 text-sm font-black text-black"><Plus className="mr-2 inline h-4 w-4"/>Invite Trialist</button></div>
        </section>
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {notice && <div className="rounded-xl border border-[#8cf566]/30 bg-[#8cf566]/10 p-4 text-sm text-[#c7ffb2]">{notice}</div>}
        <section className="grid gap-3 sm:grid-cols-4">{[['Trialists',counts.total],['Active invitations',counts.invited],['Under review',counts.reviewing],['Offered places',counts.offered]].map(([label,value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-[#0b1510] p-4"><span className="text-xs font-bold uppercase text-slate-500">{label}</span><strong className="mt-1 block text-2xl text-white">{value}</strong></div>)}</section>
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1510]"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 bg-black/20 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Player</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Trial</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Match trial</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-white/10">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-bold text-white">{row.first_name} {row.last_name}<div className="text-xs font-normal text-slate-500">{row.guardian_email ?? row.email ?? row.guardian_phone ?? row.phone ?? 'No contact'}</div></td><td className="px-4 py-3 text-slate-300">{row.position ?? '—'}</td><td className="px-4 py-3 text-slate-300">{row.trial_date ? new Date(row.trial_date).toLocaleString('en-GB') : 'Not scheduled'}</td><td className="px-4 py-3"><select value={row.status} disabled={saving} onChange={(e) => void changeStatus(row, e.target.value as TrialistStatus)} className="rounded-lg border border-white/10 bg-[#071009] px-2 py-2 text-white">{statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td><td className="px-4 py-3 text-slate-300">{row.eligible_for_match_trial ? 'Eligible' : 'No'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => void openEdit(row)} className="rounded-lg border border-white/10 px-3 py-2 font-bold text-white">Review</button><button onClick={() => void sendInvite(row)} disabled={saving || !(row.guardian_email ?? row.email)} className="rounded-lg border border-white/10 px-3 py-2 font-bold text-white disabled:opacity-40"><Mail className="mr-1 inline h-4 w-4"/>Invite</button>{['attended','under_review','further_trial'].includes(row.status) && <button onClick={() => void offerPlace(row)} disabled={saving || !row.team_id || !row.season_id} className="rounded-lg bg-white px-3 py-2 font-black text-black disabled:opacity-40">Offer place</button>}{row.eligible_for_match_trial && !row.linked_squad_member_id && <button onClick={() => void addToSquad(row)} disabled={saving || !row.team_id || !row.season_id} className="rounded-lg bg-[#8cf566] px-3 py-2 font-black text-black disabled:opacity-40"><UserPlus className="mr-1 inline h-4 w-4"/>Add to squad</button>}</div></td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No trialists yet.</td></tr>}</tbody></table></div></section>

        {showForm && <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4"><section className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1510]"><header className="flex items-center justify-between border-b border-white/10 p-5"><div className="flex items-center gap-4"><TournamentHQBrand variant="compact" size="sm"/><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8cf566]">Trial Centre</p><h3 className="text-xl font-black text-white">{selected ? 'Review Trialist' : 'Invite Trialist'}</h3></div></div><button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-white"/></button></header><div className="overflow-y-auto p-6"><div className="grid gap-4 md:grid-cols-2">
            {([['first_name','First name'],['last_name','Last name'],['position','Position'],['preferred_foot','Preferred foot'],['email','Player email'],['phone','Player phone'],['guardian_name','Parent/guardian'],['guardian_email','Guardian email'],['guardian_phone','Guardian phone'],['previous_club','Previous/current club'],['referred_by','Referred by'],['venue_name','Trial venue'],['venue_address','Venue address']] as const).map(([key,label]) => <label key={key} className="text-sm font-semibold text-slate-300">{label}<input value={String(form[key])} onChange={(e) => update(key,e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"/></label>)}
            <label className="text-sm font-semibold text-slate-300">Season<select value={form.season_id} onChange={(e)=>{ update('season_id',e.target.value); update('team_id','') }} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"><option value="">Select season</option>{seasons.map((season)=><option key={season.id} value={season.id}>{season.season_label || season.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-300">Team<select value={form.team_id} disabled={!form.season_id} onChange={(e)=>update('team_id',e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white disabled:opacity-50"><option value="">Select team</option>{teamOptions.map((team)=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-300">Date of birth<input type="date" value={form.date_of_birth} onChange={(e)=>update('date_of_birth',e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"/></label>
            <label className="text-sm font-semibold text-slate-300">Trial date/time<input type="datetime-local" value={form.trial_date} onChange={(e)=>update('trial_date',e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"/></label>
            <label className="text-sm font-semibold text-slate-300">Trial type<select value={form.trial_type} onChange={(e)=>update('trial_type',e.target.value as TrialistFormValues['trial_type'])} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"><option value="training">Training</option><option value="match">Match</option><option value="other">Other</option></select></label>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-300"><input type="checkbox" checked={form.eligible_for_match_trial} onChange={(e)=>update('eligible_for_match_trial',e.target.checked)}/>Eligible for match-trial RSVP</label>
            <label className="md:col-span-2 text-sm font-semibold text-slate-300">Private recruitment notes<textarea value={form.internal_notes} onChange={(e)=>update('internal_notes',e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-[#071009] p-3 text-white"/></label>
        </div>
        {selected && <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5"><div className="mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[#8cf566]"/><h4 className="font-black text-white">Coach Assessment</h4></div><div className="grid gap-4 md:grid-cols-3">{(['technical','tactical','physical','attitude','coachability','teamwork'] as const).map((key)=><label key={key} className="text-sm font-semibold capitalize text-slate-300">{key}<input type="number" min={1} max={5} value={assessment?.[key] ?? 3} onChange={(e)=>setAssessment((a)=>({...(a ?? { id:'', trialist_id:selected.id, organisation_id:organisationId, strengths:null, development_areas:null, coach_notes:null, public_feedback:null, recommendation:'keep_observing', created_at:'', updated_at:'', technical:3,tactical:3,physical:3,attitude:3,coachability:3,teamwork:3 }),[key]:Number(e.target.value)}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white"/></label>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2">{(['strengths','development_areas','coach_notes','public_feedback'] as const).map((key)=><label key={key} className="text-sm font-semibold capitalize text-slate-300">{key.replace('_',' ')}<textarea value={assessment?.[key] ?? ''} onChange={(e)=>setAssessment((a)=>({...(a ?? { id:'', trialist_id:selected.id, organisation_id:organisationId, strengths:null, development_areas:null, coach_notes:null, public_feedback:null, recommendation:'keep_observing', created_at:'', updated_at:'', technical:3,tactical:3,physical:3,attitude:3,coachability:3,teamwork:3 }),[key]:e.target.value}))} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-[#071009] p-3 text-white"/></label>)}</div><label className="mt-4 block text-sm font-semibold text-slate-300">Recommendation<select value={assessment?.recommendation ?? 'keep_observing'} onChange={(e)=>setAssessment((a)=>({...(a ?? { id:'', trialist_id:selected.id, organisation_id:organisationId, strengths:null, development_areas:null, coach_notes:null, public_feedback:null, recommendation:'keep_observing', created_at:'', updated_at:'', technical:3,tactical:3,physical:3,attitude:3,coachability:3,teamwork:3 }),recommendation:e.target.value as Exclude<TrialDecision,null>}))} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#071009] px-3 text-white">{decisions.map((d)=><option key={d.value} value={d.value}>{d.label}</option>)}</select></label><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void saveAssessment()} disabled={saving} className="rounded-xl border border-[#8cf566]/40 px-4 py-3 font-black text-[#8cf566]"><Save className="mr-2 inline h-4 w-4"/>Save assessment</button><button onClick={() => void sendReport(selected)} disabled={saving || !assessment || !(selected.guardian_email ?? selected.email)} className="rounded-xl border border-white/10 px-4 py-3 font-black text-white disabled:opacity-40"><Mail className="mr-2 inline h-4 w-4"/>Send trial report</button></div></div>}
        </div><footer className="flex justify-end gap-2 border-t border-white/10 p-5"><button onClick={()=>setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-3 font-bold text-white">Cancel</button><button onClick={()=>void saveTrialist()} disabled={saving} className="rounded-xl bg-[#8cf566] px-5 py-3 font-black text-black"><Save className="mr-2 inline h-4 w-4"/>{saving ? 'Saving…' : 'Save Trialist'}</button></footer></section></div>}
    </div>
}
