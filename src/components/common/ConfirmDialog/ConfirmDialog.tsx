import {
    type ReactNode,
    useEffect,
} from 'react'

import './ConfirmDialog.css'

type ConfirmDialogProps = {
    open: boolean
    title: string
    message: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    processingLabel?: string
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
                                  processingLabel = 'Deleting...',
                                  isProcessing = false,
                                  onConfirm,
                                  onCancel,
                              }: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) {
            return
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (
                event.key === 'Escape' &&
                !isProcessing
            ) {
                onCancel()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [
        open,
        isProcessing,
        onCancel,
    ])

    if (!open) {
        return null
    }

    async function handleConfirm() {
        if (isProcessing) {
            return
        }

        await onConfirm()
    }

    return (
        <div
            className="confirmDialogOverlay"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
                    !isProcessing
                ) {
                    onCancel()
                }
            }}
        >
            <div
                className="confirmDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                <div className="confirmDialogIcon">
                    !
                </div>

                <div className="confirmDialogContent">
                    <h3 id="confirm-dialog-title">
                        {title}
                    </h3>

                    <div id="confirm-dialog-message">
                        {message}
                    </div>
                </div>

                <div className="confirmDialogActions">
                    <button
                        type="button"
                        className="confirmDialogCancelButton"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className="confirmDialogConfirmButton"
                        onClick={() =>
                            void handleConfirm()
                        }
                        disabled={isProcessing}
                    >
                        {isProcessing
                            ? processingLabel
                            : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}