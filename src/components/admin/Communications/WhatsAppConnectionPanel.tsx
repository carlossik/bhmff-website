import { useEffect, useRef, useState } from 'react'
import { whatsAppConnectionService, type WhatsAppConnectionStatus } from '../../../services/whatsAppConnectionService'

export function WhatsAppConnectionPanel({ organisationId, onChanged }: { organisationId: string; onChanged: () => void }) {
    const [status, setStatus] = useState<WhatsAppConnectionStatus | null>(null)
    const [mode, setMode] = useState<'business_app' | 'platform'>('business_app')
    const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof whatsAppConnectionService.prepare>> | null>(null)
    const [busy, setBusy] = useState(false)
    const [disconnectReview, setDisconnectReview] = useState(false)
    const [error, setError] = useState('')
    const [revision, setRevision] = useState(0)
    const cancelRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        let active = true
        setPrepared(null)
        void whatsAppConnectionService.status(organisationId).then(async (result) => {
            if (!active) return
            setStatus(result)
            if (result.setupAvailable && result.canManage) {
                const connection = await whatsAppConnectionService.prepare(organisationId, mode)
                if (active) setPrepared(connection)
            }
        }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load WhatsApp settings.') })
        return () => { active = false; cancelRef.current?.(); cancelRef.current = null }
    }, [organisationId, mode, revision])

    function connect() {
        if (!prepared) return
        setBusy(true)
        setError('')
        const attempt = whatsAppConnectionService.connect(organisationId, prepared)
        let active = true
        cancelRef.current = () => { active = false; attempt.cancel() }
        void attempt.promise.then(() => { if (active) onChanged() })
            .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to connect WhatsApp.') })
            .finally(() => { if (active) { setBusy(false); cancelRef.current = null; setRevision((value) => value + 1) } })
    }
    async function disconnect() {
        setBusy(true)
        setError('')
        try { await whatsAppConnectionService.disconnect(organisationId); setDisconnectReview(false); setRevision((value) => value + 1); onChanged() }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to disconnect WhatsApp.') }
        finally { setBusy(false) }
    }
    const button = 'rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white disabled:opacity-50'
    return <section className="rounded-2xl border border-white/10 bg-[#08120c] p-5 sm:p-6">
        <h3 className="text-xl font-black text-white">Your club’s WhatsApp Business account</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">Connect your business number to send service messages directly from your club. You can also share announcements manually to existing groups.</p>
        {status?.sender && <p className="mt-3 text-sm font-bold text-emerald-200">{status.sender.verifiedName} · {status.sender.displayPhoneNumber} · {status.ready ? 'Credentials configured — test delivery before use' : 'Reconnect required'}</p>}
        {status && !status.setupAvailable && !status.ready && <p className="mt-3 text-sm text-amber-200">Direct business messaging is awaiting platform setup. Share to WhatsApp is available below.</p>}
        {status?.setupAvailable && status.canManage && <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300">Account type
                <select value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as typeof mode)} className="mt-2 block w-full max-w-full rounded-lg bg-[#142019] p-2 text-white sm:ml-3 sm:mt-0 sm:inline-block sm:w-auto">
                    <option value="business_app">WhatsApp Business app on a phone</option>
                    <option value="platform">Existing WhatsApp Business Platform / API</option>
                </select>
            </label>
            <button className={button} disabled={busy || !prepared} onClick={connect}>{busy ? 'Connecting…' : status.connected ? 'Reconnect with Meta' : 'Connect with Meta'}</button>
            <button className={button} disabled={busy} onClick={() => setRevision((value) => value + 1)}>Refresh options</button>
        </div>}
        {status?.canManage && status.connected && <div className="mt-3">
            {!disconnectReview ? <button className={button} disabled={busy} onClick={() => setDisconnectReview(true)}>Disconnect</button> : <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span>Stop direct sends from this club’s number? Message history is retained.</span>
                <button className={button} disabled={busy} onClick={() => void disconnect()}>Confirm disconnect</button>
                <button className={button} disabled={busy} onClick={() => setDisconnectReview(false)}>Keep connected</button>
            </div>}
        </div>}
        {mode === 'business_app' && status?.setupAvailable && <p className="mt-3 text-xs text-slate-400">Meta determines whether your existing number can remain active in the Business app while connected. Only complete onboarding if Meta confirms the setup you want.</p>}
        {mode === 'platform' && status?.setupAvailable && <p className="mt-3 text-xs text-slate-400">Select your existing Cloud API account and number in Meta. A number managed by another provider may require that provider’s assistance before it can be connected.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
    </section>
}
