import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOrganisation } from '../../../context/OrganisationContext'
import { supabase } from '../../../lib/supabaseClient'
import { communicationsService } from '../../../services/communicationsService'
import type { CommunicationHistoryItem, CommunicationProviderStatus, CommunicationRecipientDraft } from '../../../types/communicationTypes'
import { CommunicationComposerModal } from './CommunicationComposerModal'
import { WhatsAppConnectionPanel } from './WhatsAppConnectionPanel'

type Official = CommunicationRecipientDraft & {
    key: string; officialUserId: string | null; tournamentContactId?: string | null; role?: string; competitionTeamIds: string[]; teamNames: string[]; whatsappOptIn: boolean | null
}
type Fixture = { id: string; match: string; date?: string; kickoff?: string; competitionTeamIds: string[] }
const field = 'w-full min-w-0 rounded-xl border border-white/15 bg-[#142019] p-3 text-white'
const button = 'rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white disabled:opacity-40'

function TournamentHQModalHeader({ title }: { title: string }) {
    return (
        <div className="mb-2 flex flex-col items-center gap-3 text-center">
            <img src="/assets/tournamenthq-logo.png" alt="TournamentHQ" className="h-auto w-48 max-w-full object-contain" />
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
    )
}

export function TournamentCommunications() {
    const { currentOrganisation } = useOrganisation()
    const organisationId = currentOrganisation?.id ?? ''
    const [competitions, setCompetitions] = useState<{ id: string; name: string }[]>([])
    const [competitionId, setCompetitionId] = useState('')
    const [directory, setDirectory] = useState<Official[]>([])
    const [fixtures, setFixtures] = useState<Fixture[]>([])
    const [providers, setProviders] = useState<CommunicationProviderStatus[]>([])
    const [history, setHistory] = useState<CommunicationHistoryItem[]>([])
    const [filter, setFilter] = useState('all')
    const [selectedTeams, setSelectedTeams] = useState<string[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [message, setMessage] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState<Official | null>(null)
    const [phone, setPhone] = useState('')
    const [consent, setConsent] = useState(false)
    const [saving, setSaving] = useState(false)
    const [adding, setAdding] = useState(false)
    const [contactName, setContactName] = useState('')
    const [contactRole, setContactRole] = useState('referee')
    const [contactEmail, setContactEmail] = useState('')
    const [contactPhone, setContactPhone] = useState('')
    const [contactConsent, setContactConsent] = useState(false)
    const [editExternalId, setEditExternalId] = useState<string | null>(null)
    const [revision, setRevision] = useState(0)
    const scopeRef = useRef('')
    scopeRef.current = `${organisationId}:${competitionId}`

    useEffect(() => {
        let active = true
        setCompetitions([]); setCompetitionId(''); setError('')
        if (!organisationId) return
        void supabase.from('competitions').select('id,name').eq('organisation_id', organisationId).order('name').then(({ data, error: failure }) => {
            if (!active) return
            if (failure) setError(failure.message)
            else { setCompetitions(data ?? []); setCompetitionId(data?.[0]?.id ?? '') }
        })
        return () => { active = false }
    }, [organisationId])

    useEffect(() => {
        let active = true
        setDirectory([]); setFixtures([]); setProviders([]); setHistory([]); setSelected([])
        setFilter('all'); setSelectedTeams([]); setMessage(''); setOpen(false); setEditing(null); setError('')
        if (!organisationId || !competitionId) return
        setLoading(true)
        void Promise.all([
            communicationsService.whatsAppAction<{ recipients: Official[] }>(organisationId, 'tournament_directory', { competitionId }),
            communicationsService.whatsAppAction<{ fixtures: Fixture[] }>(organisationId, 'tournament_fixtures', { competitionId }),
            communicationsService.getProviderStatus(organisationId, competitionId),
            communicationsService.getHistory(organisationId, 60, competitionId),
        ]).then(([recipients, matches, channels, messages]) => {
            if (!active) return
            setDirectory(recipients.recipients); setFixtures(matches.fixtures); setProviders(channels); setHistory(messages)
        }).catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load competition communications.') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [organisationId, competitionId, revision])

    const refreshHistory = useCallback(async () => {
        const scope = `${organisationId}:${competitionId}`
        try { const rows = await communicationsService.getHistory(organisationId, 60, competitionId); if (scopeRef.current === scope) setHistory(rows) }
        catch (caught) { if (scopeRef.current === scope) setError(caught instanceof Error ? caught.message : 'Unable to refresh delivery history.') }
    }, [organisationId, competitionId])
    const pending = history.some(h => ['queued', 'accepted', 'sent', 'delivery_delayed'].includes(h.status))
    useEffect(() => {
        if (!pending) return
        let active = true
        const timer = window.setInterval(() => {
            void communicationsService.getHistory(organisationId, 60, competitionId).then(rows => { if (active) setHistory(rows) }).catch(() => {})
        }, 10000)
        return () => { active = false; window.clearInterval(timer) }
    }, [pending, organisationId, competitionId])

    const teams = useMemo(() => [...new Map(directory.flatMap(r => r.competitionTeamIds.map((id, i) => [id, r.teamNames[i] || 'Team'] as const))).entries()], [directory])
    const visible = useMemo(() => directory.filter(r => {
        if (filter === 'all') return true
        if (filter === 'tournament') return Boolean(r.tournamentContactId)
        if (filter === 'clubs') return r.competitionTeamIds.some(id => selectedTeams.includes(id))
        if (filter.startsWith('team:')) return r.competitionTeamIds.includes(filter.slice(5))
        const fixture = fixtures.find(f => f.id === filter.slice(8))
        return Boolean(fixture && r.competitionTeamIds.some(id => fixture.competitionTeamIds.includes(id)))
    }), [directory, filter, fixtures, selectedTeams])
    const recipients = visible.filter(r => selected.includes(r.key))
    const competitionName = competitions.find(c => c.id === competitionId)?.name ?? 'Competition'

    async function saveContact() {
        if (!editing || !editing.officialUserId) return
        setSaving(true); setError('')
        try {
            await communicationsService.whatsAppAction(organisationId, 'tournament_contact', { competitionId,
                officialUserId: editing.officialUserId, phone: phone.trim(), whatsappOptIn: consent })
            const result = await communicationsService.whatsAppAction<{ recipients: Official[] }>(organisationId, 'tournament_directory', { competitionId })
            setDirectory(result.recipients); setEditing(null)
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save contact preferences.') }
        finally { setSaving(false) }
    }
    async function saveExternal() {
        setSaving(true); setError('')
        try {
            await communicationsService.whatsAppAction(organisationId, 'tournament_external_save', {
                competitionId, tournamentContactId: editExternalId, name: contactName.trim(), role: contactRole,
                email: contactEmail.trim(), phone: contactPhone.trim(), whatsappOptIn: contactConsent,
            })
            const result = await communicationsService.whatsAppAction<{ recipients: Official[] }>(organisationId, 'tournament_directory', { competitionId })
            setDirectory(result.recipients); setAdding(false); setEditExternalId(null); setSelected([])
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save tournament contact.') }
        finally { setSaving(false) }
    }
    async function removeExternal(id: string) {
        if (!window.confirm('Remove this tournament contact from the recipient directory? Historical messages will be retained.')) return
        setSaving(true); setError('')
        try {
            await communicationsService.whatsAppAction(organisationId, 'tournament_external_delete', { competitionId, tournamentContactId: id })
            const result = await communicationsService.whatsAppAction<{ recipients: Official[] }>(organisationId, 'tournament_directory', { competitionId })
            setDirectory(result.recipients); setSelected([])
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove tournament contact.') }
        finally { setSaving(false) }
    }
    function openContact(contact?: Official) {
        setEditExternalId(contact?.tournamentContactId ?? null)
        setContactName(contact?.recipientName ?? '')
        setContactRole(contact?.role ?? 'referee')
        setContactEmail(contact?.email ?? '')
        setContactPhone(contact?.phone ?? '')
        setContactConsent(contact?.whatsappOptIn === true)
        setAdding(true); setError('')
    }
    if (!organisationId) return <p className="text-slate-300">Select an organisation first.</p>
    return <div className="min-w-0 space-y-6">
        <header className="space-y-3">
            <h2 className="text-2xl font-black text-white">Tournament communications</h2>
            <p className="text-sm text-slate-300">Message participating clubs, referees, match officials and tournament organisers. Contacts do not need TournamentHQ accounts. WhatsApp uses the tournament organiser’s connected sender.</p>
            <label className="block text-sm text-slate-300">Competition
                <select className={`${field} mt-2`} value={competitionId} disabled={saving} onChange={event => setCompetitionId(event.target.value)}>
                    {!competitions.length && <option value="">No competitions available</option>}
                    {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </label>
        </header>
        {error && <p role="alert" className="rounded-xl bg-red-900/30 p-3 text-red-200">{error}</p>}
        {competitionId && <>
            <WhatsAppConnectionPanel key={`${organisationId}:${competitionId}`} organisationId={organisationId} competitionId={competitionId} onChanged={() => setRevision(n => n + 1)} />
            <div className="grid gap-3 sm:grid-cols-3">{providers.map(p => <div key={p.channel} className="min-w-0 rounded-xl border border-white/10 p-4">
                <strong className="capitalize text-white">{p.channel}</strong>
                <span className="ml-3 text-xs text-slate-300">{p.channel === 'sms' ? 'Unavailable' : p.configured && !p.dryRun && p.provider !== 'mock' ? 'Ready' : p.configured ? 'Delivery paused' : 'Unavailable'}</span>
                <p className="mt-2 break-words text-xs text-slate-400">{p.detail}</p>
            </div>)}</div>
            <section className="space-y-4 rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-white">Tournament contacts and club officials</h3>
                    <button className={button} onClick={() => openContact()}>Add referee / organiser / contact</button></div>
                <label className="block text-sm text-slate-300">Recipients
                    <select className={`${field} mt-2`} value={filter} onChange={event => { setFilter(event.target.value); setSelected([]) }}>
                        <option value="all">All tournament contacts and participating clubs</option>
                        <option value="tournament">Referees, organisers and other tournament contacts</option>
                        <option value="clubs">Choose several clubs</option>
                        <optgroup label="Selected club">{teams.map(([id, name]) => <option key={id} value={`team:${id}`}>{name}</option>)}</optgroup>
                        <optgroup label="Officials for a fixture">{fixtures.map(f => <option key={f.id} value={`fixture:${f.id}`}>{f.match}{f.date ? ` · ${f.date} ${f.kickoff || ''}` : ''}</option>)}</optgroup>
                    </select>
                </label>
                {filter === 'clubs' && <div className="flex flex-wrap gap-3">{teams.map(([id, name]) => <label key={id} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={selectedTeams.includes(id)} onChange={event => { setSelectedTeams(ids => event.target.checked ? [...ids, id] : ids.filter(value => value !== id)); setSelected([]) }} />{name}</label>)}</div>}
                {loading ? <p className="text-slate-300">Loading officials…</p> : !visible.length ? <p className="text-sm text-slate-300">No contacts found. Add a referee or organiser here, or assign club officials to participating teams in User Access.</p> : <>
                    <button className={button} onClick={() => setSelected(visible.map(r => r.key))}>Select all shown</button>
                    <button className={`${button} ml-2`} onClick={() => setSelected([])}>Clear</button>
                    <div className="space-y-3">{visible.map(r => <div key={r.key} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 p-3">
                        <label className="flex min-w-0 items-start gap-3 text-sm text-white">
                            <input type="checkbox" checked={selected.includes(r.key)} onChange={event => setSelected(ids => event.target.checked ? [...ids, r.key] : ids.filter(id => id !== r.key))} />
                            <span className="min-w-0 break-words"><strong>{r.recipientName}</strong><span className="block text-slate-400">{r.tournamentContactId ? (r.role || 'Tournament contact').replaceAll('_', ' ') : r.teamNames.join(', ')}</span>
                                <span className="block text-xs text-slate-300">{r.email || 'No email'} · {r.phone || 'No mobile'}</span>
                                <span className="block text-xs text-slate-400">WhatsApp consent: {r.whatsappOptIn === true ? 'Recorded' : 'Not recorded'}</span></span>
                        </label>
                        <div className="flex flex-wrap gap-2">{r.tournamentContactId ? <>
                            <button className={button} onClick={() => openContact(r)}>Edit contact</button>
                            <button className={button} disabled={saving} onClick={() => void removeExternal(r.tournamentContactId!)}>Remove</button>
                        </> : <button className={button} onClick={() => { setEditing(r); setPhone(r.phone ?? ''); setConsent(r.whatsappOptIn === true) }}>Mobile / consent</button>}</div>
                    </div>)}</div>
                </>}
                <p className="text-xs text-slate-400">{recipients.length} selected. Each contact receives one message, even if listed for multiple teams. Maximum 50 per send.</p>
                <label className="block text-sm text-slate-300">Message for email or group sharing
                    <textarea className={`${field} mt-2`} rows={4} value={message} onChange={event => setMessage(event.target.value)} placeholder="Enter an operational announcement. For WhatsApp direct delivery, choose Fixture update during review." />
                </label>
                <div className="flex flex-wrap gap-3">
                    <button className={button} disabled={loading || !recipients.length || recipients.length > 50} onClick={() => setOpen(true)}>Review delivery</button>
                    <a className={`${button} ${!message.trim() ? 'pointer-events-none opacity-40' : ''}`} href={`https://wa.me/?text=${encodeURIComponent(`${competitionName}\n\n${message.trim()}`)}`} target="_blank" rel="noopener noreferrer">Share to WhatsApp group</a>
                </div>
                <p className="text-xs text-slate-400">Direct WhatsApp uses the approved fixture-update message. Group sharing opens WhatsApp on your device and is not tracked as direct delivery.</p>
            </section>
            <section className="rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold text-white">{competitionName} · Message history</h3><button className={button} onClick={() => void refreshHistory()}>Refresh status</button></div>
                {!history.length && <p className="mt-4 text-sm text-slate-400">No communications recorded for this competition yet.</p>}
                <div className="mt-4 space-y-3">{history.map(h => <div key={h.deliveryId} className="min-w-0 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                    <strong className="text-white">{h.recipientName}</strong> · {h.channel} · <span className="uppercase">{h.status === 'read' && h.channel === 'email' ? 'Opened' : h.status}</span>
                    <span className="mt-1 block text-xs">{new Date(h.updatedAt).toLocaleString('en-GB')}</span>
                    {(h.errorMessage || h.statusDetail) && <p className="mt-1 break-words text-xs">{h.errorMessage || h.statusDetail}</p>}
                </div>)}</div>
            </section>
            {open && <CommunicationComposerModal key={`${organisationId}:${competitionId}`} open organisationId={organisationId} organisationName={currentOrganisation?.name ?? competitionName}
                competitionId={competitionId} defaultTemplateCode="general_operational_message" recipients={recipients} initialMessageBody={message} title={`Message ${competitionName} contacts`}
                sourceType="competition_communication" sourceId={competitionId} onClose={() => setOpen(false)} onSent={() => void refreshHistory()} />}
        </>}
        {adding && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Tournament contact">
            <div className="w-full max-w-lg space-y-4 rounded-2xl bg-[#102018] p-6">
                <TournamentHQModalHeader title={editExternalId ? 'Edit tournament contact' : 'Add tournament contact'} />
                <label className="block text-sm text-slate-300">Name<input className={`${field} mt-2`} maxLength={120} value={contactName} onChange={e => setContactName(e.target.value)} /></label>
                <label className="block text-sm text-slate-300">Role<select className={`${field} mt-2`} value={contactRole} onChange={e => setContactRole(e.target.value)}>
                    <option value="referee">Referee</option><option value="organiser">Tournament organiser</option><option value="match_official">Match official</option><option value="other">Other contact</option>
                </select></label>
                <label className="block text-sm text-slate-300">Email (optional)<input type="email" className={`${field} mt-2`} value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></label>
                <label className="block text-sm text-slate-300">Mobile (optional, international format)<input type="tel" className={`${field} mt-2`} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+447…" /></label>
                <p className="text-xs text-slate-400">Enter at least one contact method. A TournamentHQ user account is not required.</p>
                <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={contactConsent} onChange={e => setContactConsent(e.target.checked)} />I have verified this person agreed to receive operational WhatsApp messages from this organiser.</label>
                <p className="text-xs text-slate-400">Do not check without actual consent. Email and WhatsApp messages use the tournament organisation’s sender.</p>
                {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
                <div className="flex gap-3"><button className={button} disabled={saving || !contactName.trim() || (!contactPhone.trim() && !contactEmail.trim())} onClick={() => void saveExternal()}>{saving ? 'Saving…' : 'Save contact'}</button>
                    <button className={button} disabled={saving} onClick={() => { setAdding(false); setError('') }}>Cancel</button></div>
            </div>
        </div>}
        {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Official contact preferences">
            <div className="w-full max-w-lg space-y-4 rounded-2xl bg-[#102018] p-6">
                <TournamentHQModalHeader title={`${editing.recipientName} · Mobile / consent`} />
                <label className="block text-sm text-slate-300">Mobile number (international format)<input className={`${field} mt-2`} value={phone} onChange={event => setPhone(event.target.value)} placeholder="+447…" /></label>
                <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />This official has agreed to receive operational WhatsApp messages from this organiser.</label>
                <p className="text-xs text-slate-400">Only record consent you have obtained. Unchecking this blocks direct WhatsApp messages for this official in this competition.</p>
                {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
                <div className="flex gap-3"><button className={button} disabled={saving} onClick={() => void saveContact()}>{saving ? 'Saving…' : 'Save preferences'}</button><button className={button} disabled={saving} onClick={() => setEditing(null)}>Cancel</button></div>
            </div>
        </div>}
    </div>
}
