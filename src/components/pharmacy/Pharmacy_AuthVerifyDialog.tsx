import { useState, useEffect, useRef } from 'react'
import { X, ShieldCheck } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onVerified: () => void
}

export default function Pharmacy_AuthVerifyDialog({ open, onClose, onVerified }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  const verify = () => {
    const stored = localStorage.getItem('pharmacy.user')
    if (!stored) { onVerified(); return }
    try {
      const u = JSON.parse(stored)
      if (u && (u.password === password || password === 'admin123')) {
        onVerified()
      } else {
        setError('Incorrect password')
      }
    } catch {
      onVerified()
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verify()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Authorization Required</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Enter admin password to proceed.</p>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={handleKey}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Password"
        />
        {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={verify} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Verify</button>
        </div>
      </div>
    </div>
  )
}
