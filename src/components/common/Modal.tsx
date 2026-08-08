import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
} from 'react'
import { X } from 'lucide-react'


type ModalProps = {
    title: string
    children: ReactNode
    onClose: () => void
}

export function Modal({
    title,
    children,
    onClose,
}: ModalProps) {
    const titleId = useId()
    const dialogRef =
        useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow = 'hidden'

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        dialogRef.current?.focus()

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose()
                }
            }}
        >
            <div
                ref={dialogRef}
                className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] text-[var(--organisation-text)] shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <header className="flex items-start justify-between gap-4 border-b border-[var(--organisation-border)] px-6 py-5 sm:px-8">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">
                            TournamentHQ
                        </p>

                        <h2 id={titleId}>
                            {title}
                        </h2>
                    </div>

                    <button
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--organisation-border)] bg-[var(--organisation-background)] text-[var(--organisation-text)] transition hover:border-[var(--organisation-accent)]"
                        type="button"
                        aria-label={`Close ${title}`}
                        onClick={onClose}
                    >
                        <X size={22} />
                    </button>
                </header>

                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-6 sm:px-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
