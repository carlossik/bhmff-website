import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
} from 'react'
import { X } from 'lucide-react'

type EnterpriseModalProps = {
    title: string
    eyebrow?: string
    description?: string
    children: ReactNode
    onClose: () => void
    closeDisabled?: boolean
    maxWidthClassName?: string
    closeOnBackdrop?: boolean
}

const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

export function EnterpriseModal({
    title,
    eyebrow = 'TournamentHQ',
    description,
    children,
    onClose,
    closeDisabled = false,
    maxWidthClassName = 'max-w-4xl',
    closeOnBackdrop = true,
}: EnterpriseModalProps) {
    const titleId = useId()
    const descriptionId = useId()
    const dialogRef =
        useRef<HTMLElement | null>(null)

    useEffect(() => {
        const html = document.documentElement
        const body = document.body
        const previousHtmlOverflow = html.style.overflow
        const previousBodyOverflow = body.style.overflow
        const previousBodyPaddingRight = body.style.paddingRight
        const scrollbarWidth = window.innerWidth - html.clientWidth

        html.style.overflow = 'hidden'
        body.style.overflow = 'hidden'

        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`
        }

        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null

        window.requestAnimationFrame(() => {
            const firstFocusable =
                dialogRef.current?.querySelector<HTMLElement>(
                    focusableSelector,
                )
            ;(firstFocusable ?? dialogRef.current)?.focus()
        })

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !closeDisabled) {
                event.preventDefault()
                onClose()
                return
            }

            if (event.key !== 'Tab' || !dialogRef.current) {
                return
            }

            const focusableElements = [
                ...dialogRef.current.querySelectorAll<HTMLElement>(
                    focusableSelector,
                ),
            ].filter(
                (element) =>
                    !element.hasAttribute('disabled'),
            )

            if (focusableElements.length === 0) {
                event.preventDefault()
                dialogRef.current.focus()
                return
            }

            const first = focusableElements[0]
            const last =
                focusableElements[
                    focusableElements.length - 1
                ]

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {
                event.preventDefault()
                last.focus()
                return
            }

            if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault()
                first.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            html.style.overflow = previousHtmlOverflow
            body.style.overflow = previousBodyOverflow
            body.style.paddingRight = previousBodyPaddingRight
            previouslyFocused?.focus()
        }
    }, [closeDisabled, onClose])

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-black/70 p-3 font-sans backdrop-blur-sm sm:p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    closeOnBackdrop &&
                    !closeDisabled &&
                    event.target === event.currentTarget
                ) {
                    onClose()
                }
            }}
        >
            <section
                ref={dialogRef}
                aria-describedby={description ? descriptionId : undefined}
                aria-labelledby={titleId}
                aria-modal="true"
                className={`flex max-h-[calc(100dvh-1.5rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-3xl border border-[color:var(--thq-accent,#84cc16)]/30 bg-[var(--thq-surface,#0d170c)] text-[var(--thq-text,#ffffff)] shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-2rem)]`}
                role="dialog"
                tabIndex={-1}
            >
                <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[color:var(--thq-accent,#84cc16)]/20 px-5 py-4 sm:px-7 sm:py-5">
                    <div className="min-w-0">
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="mb-4 h-8 w-auto object-contain sm:h-9"
                        />

                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--thq-accent,#84cc16)]">
                            {eyebrow}
                        </p>

                        <h2
                            id={titleId}
                            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
                        >
                            {title}
                        </h2>

                        {description && (
                            <p
                                id={descriptionId}
                                className="mt-2 max-w-3xl text-sm leading-6 opacity-70"
                            >
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        aria-label={`Close ${title}`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--thq-accent,#84cc16)]/25 bg-black/10 transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={closeDisabled}
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col">
                    {children}
                </div>
            </section>
        </div>
    )
}
