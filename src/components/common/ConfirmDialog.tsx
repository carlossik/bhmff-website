import { Modal } from './Modal'

type ConfirmDialogProps = {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onCancel: () => void
    onConfirm: () => void
}

export function ConfirmDialog({
                                  title,
                                  message,
                                  confirmText = 'Delete',
                                  cancelText = 'Cancel',
                                  onCancel,
                                  onConfirm
                              }: ConfirmDialogProps) {
    return (
        <Modal title={title} onClose={onCancel}>
            <p className="muted">{message}</p>

            <div className="modalActions">
                <button
                    type="button"
                    className="btn secondary"
                    onClick={onCancel}
                >
                    {cancelText}
                </button>

                <button
                    type="button"
                    className="btn danger"
                    onClick={onConfirm}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    )
}