import { ArrowLeft, ArrowRight } from 'lucide-react'

type SetupWizardNavigationProps = { canGoBack: boolean; canGoForward: boolean; nextLabel?: string; busy?: boolean; onBack: () => void; onNext: () => void }

export function SetupWizardNavigation({ canGoBack, canGoForward, nextLabel = 'Continue', busy = false, onBack, onNext }: SetupWizardNavigationProps) {
    return (
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" disabled={!canGoBack || busy} onClick={onBack} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>
            <button type="button" disabled={!canGoForward || busy} onClick={onNext} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--organisation-accent,#84cc16)] px-6 py-3 text-sm font-black text-[var(--organisation-on-accent,#071006)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Please wait...' : nextLabel}{!busy && <ArrowRight className="h-4 w-4" />}</button>
        </div>
    )
}
