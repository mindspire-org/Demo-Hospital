import { useEffect, useState } from 'react'
import { api } from '../../../api'

type Event = {
  _id: string
  parameter: string
  value: string
  criticalMin?: number
  criticalMax?: number
  unit?: string
  doctor?: string
  comment?: string
  infoMode?: string
  status: 'open' | 'resolved'
  detectedAt: string
}

type Props = {
  events: Event[]   // newly detected critical events to acknowledge
  onClose: () => void
  onDone?: () => void
}

const INFO_MODES = ['', 'Verbally', 'Phone call', 'Text message', 'Email']

export default function CriticalResultDetailModal({ events, onClose, onDone }: Props) {
  const [step, setStep] = useState<'review' | 'detail'>('review')
  const [activeIdx, setActiveIdx] = useState(0)
  const [doctor, setDoctor] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [comment, setComment] = useState('')
  const [infoMode, setInfoMode] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { if (!events?.length) onClose() }, [events])

  async function saveDetail() {
    if (!doctor.trim()) { setErr('Doctor required'); return }
    if (!comment.trim()) { setErr('Comment required'); return }
    if (!infoMode) { setErr('Information mode required'); return }
    setBusy(true); setErr('')
    try {
      const ev = events[activeIdx]
      await api(`/lab/critical-events/${ev._id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          doctor: doctor.trim(),
          comment: comment.trim(),
          infoMode: infoMode.toLowerCase().split(' ')[0], // verbally→verbal, phone call→phone, text message→text, email→email
          date: new Date(date).toISOString(),
        }),
      })
      // advance
      if (activeIdx + 1 < events.length) {
        setActiveIdx(activeIdx + 1)
        setStep('review')
        setDoctor(''); setComment(''); setInfoMode('')
      } else {
        onDone?.(); onClose()
      }
    } catch (e: any) { setErr(e?.message || 'Failed') } finally { setBusy(false) }
  }

  if (!events?.length) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Critical result detail</h3>
          <button onClick={onClose} className="text-rose-500" aria-label="close">✕</button>
        </div>

        {step === 'review' && (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-left">Test parameter</th>
                  <th className="px-2 py-1 text-left">Result value</th>
                  <th className="px-2 py-1 text-left">Critical min</th>
                  <th className="px-2 py-1 text-left">Critical max</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e._id} className={i === activeIdx ? 'bg-amber-50' : ''}>
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{e.parameter}</td>
                    <td className="px-2 py-1 font-semibold text-rose-600">{e.value}</td>
                    <td className="px-2 py-1">{e.criticalMin ?? '-'}</td>
                    <td className="px-2 py-1">{e.criticalMax ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setStep('detail')} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white">Proceed</button>
              <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
            </div>
          </>
        )}

        {step === 'detail' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Doctor *</label>
              <input value={doctor} onChange={e => setDoctor(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Date *</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Comment *</label>
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Doctor comment" className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Information mode *</label>
              <select value={infoMode} onChange={e => setInfoMode(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
                {INFO_MODES.map(m => <option key={m} value={m}>{m || '<--Please select a value-->'}</option>)}
              </select>
            </div>
            {err && <div className="text-sm text-rose-600">{err}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button disabled={busy} onClick={saveDetail} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
              <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
