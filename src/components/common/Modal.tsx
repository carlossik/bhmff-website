import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
} from 'react'
import { X } from 'lucide-react'

import './Modal.css'

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
            className="modalOverlay"
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
                className="modalCard"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <header className="modalHeader">
                    <div>
                        <p className="modalEyebrow">
                            TournamentHQ
                        </p>

                        <h2 id={titleId}>
                            {title}
                        </h2>
                    </div>

                    <button
                        className="modalCloseButton"
                        type="button"
                        aria-label={`Close ${title}`}
                        onClick={onClose}
                    >
                        <X size={22} />
                    </button>
                </header>

                <div className="modalBody">
                    {children}
                </div>
            </div>
        </div>
    )
}
