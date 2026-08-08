import { useEffect } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

type ToastProps = {
    message: string
    type?: ToastType
    onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
    useEffect(() => {
        if (!message) return
        const timeoutId = window.setTimeout(onClose, 5000)
        return () => window.clearTimeout(timeoutId)
    }, [message, onClose])

    if (!message) return null

    const Icon = type === 'error' ? CircleAlert : type === 'info' ? Info : CheckCircle2
    const stateClasses = type === 'error'
        ? 'border-red-700/60 text-red-200'
        : type === 'info'
          ? 'border-sky-700/60 text-sky-200'
          : 'border-[var(--organisation-accent)] text-[var(--organisation-text)]'

    return (
        <div className={`fixed right-4 top-4 z-[1200] flex w-[min(92vw,26rem)] items-start gap-3 rounded-2xl border bg-[var(--organisation-surface)] p-4 shadow-2xl ${stateClasses}`} role="status" aria-live="polite">
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="min-w-0 flex-1 text-sm font-medium leading-6">{message}</p>
            <button type="button" className="rounded-lg p-1 text-slate-400 transition hover:bg-[var(--organisation-background)] hover:text-[var(--organisation-text)]" onClick={onClose} aria-label="Dismiss notification">
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
