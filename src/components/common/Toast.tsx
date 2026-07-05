import { useEffect } from 'react'

type ToastProps = {
    message: string
    type?: 'success' | 'error' | 'info'
    onClose: () => void
}

export function Toast({
                          message,
                          type = 'success',
                          onClose
                      }: ToastProps) {

    useEffect(() => {
        if (!message) return

        const timer = setTimeout(() => {
            onClose()
        }, 3000)

        return () => clearTimeout(timer)

    }, [message, onClose])

    if (!message) return null

    return (
        <div className={`toast toast-${type}`}>
            {message}
        </div>
    )
}