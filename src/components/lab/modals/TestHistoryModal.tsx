import { useEffect, useState } from 'react'
import { api } from '../../../api'

type Row = { at: string; testName: string; parameter: string; value?: string; unit?: string; flag?: string }

export default function TestHistoryModal({
  patientId,
  testId,
  testName,
  onClose,
}: {
  patientId: string
  testId?: string
  testName?: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const q = new URLSearchParams({ patientId })
        if (testId) q.set('testId', testId)
        else if (testName) q.set('testName', testName)
        const r = await api(`/lab/results/history/list?${q}`)
        if (!alive) return
        setRows(r.items || [])
      } catch (e: any) { setErr(e?.message || 'Failed') }
      finally { setLoading(false) }
    })()
    return () => { alive = false }
  }, [patientId, testId, testName])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Test history</h3>
          <button onClick={onClose} className="text-rose-500">✕</button>
        </div>
        {loading && <div className="py-6 text-center text-sm text-slate-500">Loading…</div>}
        {err && <div className="text-sm text-rose-600">{err}</div>}
        {!loading && !rows.length && <div className="py-6 text-center text-sm text-slate-500">No history found.</div>}
        {!!rows.length && (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1 text-left">Test performed on</th>
                <th className="px-2 py-1 text-left">Parameter</th>
                <th className="px-2 py-1 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                  <td className="px-2 py-1">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-2 py-1">{r.parameter}</td>
                  <td className={`px-2 py-1 ${r.flag === 'critical' ? 'text-rose-600 font-semibold' : ''}`}>{r.value || '-'} {r.unit || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-right"><button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button></div>
      </div>
    </div>
  )
}
