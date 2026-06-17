import { useEffect, useState } from 'react'
import Toast, { type ToastState } from './Toast'

type AlertEvent = { message: string }

export default function GlobalToast() {
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AlertEvent>).detail
      if (detail?.message) {
        setToast({ type: 'error', message: detail.message })
      }
    }
    window.addEventListener('app:alert', handler)
    return () => window.removeEventListener('app:alert', handler)
  }, [])

  return <Toast toast={toast} onClose={() => setToast(null)} durationMs={5000} />
}
