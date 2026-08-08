import { useEffect } from 'react'
import { Mail, MapPin, Phone, ShieldCheck, UserRound, X } from 'lucide-react'
import type { Official } from '../../types/officialTypes'

type OfficialProfileDrawerProps = { open: boolean; official: Official | null; onClose: () => void }

function formatLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
}

export default function OfficialProfileDrawer({ open, official, onClose }: OfficialProfileDrawerProps) {
    useEffect(() => {
        if (!open) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [open, onClose])

    if (!open || !official) return null

    const displayName = official.full_name?.trim() || `${official.first_name} ${official.last_name}`.trim()
    const location = [official.city, official.county, official.postcode].filter(Boolean).join(', ')

    return (
        <div className="fixed inset-0 z-[1050] bg-black/60 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
            <aside className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[var(--organisation-border)] bg-[var(--organisation-surface)] text-[var(--organisation-text)] shadow-2xl" role="dialog" aria-modal="true" aria-label={`${displayName} profile`} onMouseDown={event => event.stopPropagation()}>
                <header className="flex items-start justify-between gap-4 border-b border-[var(--organisation-border)] p-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--organisation-accent)] text-[var(--organisation-on-accent)]"><UserRound className="h-7 w-7" /></div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--organisation-accent)]">Official profile</p>
                            <h2 className="mt-1 truncate text-2xl font-bold">{displayName}</h2>
                            <p className="mt-1 text-sm text-slate-400">{formatLabel(official.role)}</p>
                        </div>
                    </div>
                    <button type="button" className="rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-2.5 text-slate-300 hover:border-[var(--organisation-accent)]" onClick={onClose} aria-label="Close official profile"><X className="h-5 w-5" /></button>
                </header>
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p><p className="mt-2 font-semibold">{formatLabel(official.status)}</p></div>
                        <div className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verification</p><p className="mt-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[var(--organisation-accent)]" />{formatLabel(official.verification_status)}</p></div>
                    </div>
                    <section className="space-y-3 rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-5">
                        <h3 className="font-bold">Contact</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-300"><Mail className="h-4 w-4 text-[var(--organisation-accent)]" /><span className="break-all">{official.email || 'Not provided'}</span></div>
                        <div className="flex items-center gap-3 text-sm text-slate-300"><Phone className="h-4 w-4 text-[var(--organisation-accent)]" /><span>{official.phone || 'Not provided'}</span></div>
                        <div className="flex items-center gap-3 text-sm text-slate-300"><MapPin className="h-4 w-4 text-[var(--organisation-accent)]" /><span>{location || 'Not provided'}</span></div>
                    </section>
                    {official.biography && <section className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] p-5"><h3 className="font-bold">Biography</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{official.biography}</p></section>}
                </div>
            </aside>
        </div>
    )
}
