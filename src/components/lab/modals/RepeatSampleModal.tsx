import { useState } from 'react'
import { api } from '../../../api'

type Props = {
  resultId: string
  testName?: string
  onClose: () => void
  onDone?: () => void
}

export default function RepeatSampleModal({ resultId, testName, onClose, onDone }: Props) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!reason.trim()) { setErr('Please enter a reason.'); return }
    setBusy(true); setErr('')
    try {
      await api(`/lab/results/${resultId}/repeat`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      onDone?.(); onClose()
    } catch (e: any) {
      setErr(e?.message || 'Failed to repeat')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-rose-600">Reperform test {testName ? `- (${testName})` : ''}</h3>
          <button onClick={onClose} className="text-rose-500 hover:text-rose-700" aria-label="close">✕</button>
        </div>
        <label className="mb-1 block text-sm font-medium">Reperform reason</label>
        <input
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reperform reason"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            disabled={busy}
            onClick={submit}
            className="rounded bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Reperform'}
          </button>
          <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
