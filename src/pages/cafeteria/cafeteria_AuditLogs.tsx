import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await cafeteriaApi.listAuditLogs({ page, limit: 50 })
      setLogs(r?.items || [])
      setTotalPages(r?.totalPages || 1)
    } catch {} finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">System activity log</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-500">Actor</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Detail</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400">No logs found</td></tr>
            ) : logs.map((l, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{l.actor}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{l.action}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.detail}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{l.at ? new Date(l.at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      )}
    </div>
  )
}
