import { ReactNode } from 'react'

type ModalProps = {
    title: string
    children: ReactNode
    onClose: () => void
}

export function Modal({ title, children, onClose }: ModalProps) {
    return (
        <div className="modalOverlay" onClick={onClose}>
            <div
                className="modalCard"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modalHeader">
                    <h2>{title}</h2>

                    <button
                        className="btn secondary small"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}