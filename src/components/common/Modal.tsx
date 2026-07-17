import {
    useEffect,
    type ReactNode,
} from 'react'
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
            onMouseDown={onClose}
        >
            <div
                className="modalCard"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="modalHeader">
                    <h2 id="modal-title">
                        {title}
                    </h2>

                    <button
                        className="btn secondary small modalCloseButton"
                        type="button"
                        aria-label={`Close ${title}`}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="modalBody">
                    {children}
                </div>
            </div>
        </div>
    )
}