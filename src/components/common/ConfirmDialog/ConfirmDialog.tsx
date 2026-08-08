import { useEffect } from 'react'

type ConfirmDialogProps = {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    isProcessing?: boolean
    onConfirm: () => void | Promise<void>
    onCancel: () => void
}

export function ConfirmDialog({
                                  open,
                                  title,
                                  message,
                                  confirmLabel = 'Confirm',
                                  cancelLabel = 'Cancel',
                                  isProcessing = false,
                                  onConfirm,
                                  onCancel,
                              }: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isProcessing) {
                onCancel()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [open, isProcessing, onCancel])

    if (!open) {
        return null
    }

    async function handleConfirm() {
        if (isProcessing) return

        await onConfirm()
    }

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !isProcessing
                ) {
                    onCancel()
                }
            }}
        >
            <div
                className="w-full max-w-md rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-6 text-[var(--organisation-text)] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-xl font-black text-amber-300">
                    !
                </div>

                <div className="mt-4 [&_h3]:text-xl [&_h3]:font-bold [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-slate-400">
                    <h3 id="confirm-dialog-title">
                        {title}
                    </h3>

                    <p id="confirm-dialog-message">
                        {message}
                    </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] px-4 py-2.5 font-semibold text-[var(--organisation-text)] hover:border-[var(--organisation-accent)] disabled:opacity-50"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-500 disabled:opacity-50"
                        onClick={handleConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing
                            ? 'Deleting...'
                            : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}