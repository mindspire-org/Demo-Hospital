import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Printer, RefreshCw, Search, TrendingUp, Calendar, Activity, X, User, CalendarClock, MessageSquareText, Info } from 'lucide-react'
import { api } from '../../api'

type CritEvent = {
  _id: string
  parameter: string
  value: string
  unit?: string
  criticalMin?: number
  criticalMax?: number
  testName?: string
  patientName?: string
  patientPhone?: string
  status: 'open' | 'resolved'
  detectedAt: string
  doctor?: string
  comment?: string
  infoMode?: string
}

type CritParam = {
  _id?: string
  parameter: string
  testName?: string
  criticalMin?: number
  criticalMax?: number
  unit?: string
  enabled: boolean
  notes?: string
}

export default function Lab_CriticalValues() {
  const [tab, setTab] = useState<'events' | 'parameters'>('events')
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-2xl bg-linear-to-r from-rose-600 via-rose-500 to-amber-500 p-5 text-white shadow-lg shadow-rose-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Critical Lab Values</h2>
            <div className="mt-0.5 text-sm text-rose-100">Monitor and manage critical value alerts</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('events')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'events' ? 'bg-white/30 text-white backdrop-blur-sm border border-white/30' : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'}`}>
              <AlertTriangle className="h-4 w-4" /> Events
            </button>
            <button onClick={() => setTab('parameters')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'parameters' ? 'bg-white/30 text-white backdrop-blur-sm border border-white/30' : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'}`}>
              <Activity className="h-4 w-4" /> Parameters
            </button>
          </div>
        </div>
      </div>
      {tab === 'events' ? <EventsTab /> : <ParametersTab />}
    </div>
  )
}

function EventsTab() {
  const [items, setItems] = useState<CritEvent[]>([])
  const [status, setStatus] = useState<'all' | 'open' | 'resolved'>('open')
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [q, setQ] = useState('')
  const [resolveTarget, setResolveTarget] = useState<CritEvent | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const r = await api(`/lab/critical-events${qs}`)
      setItems(r.items || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [status, from, to])

  const filtered = useMemo(() => {
    if (!q) return items
    const lq = q.toLowerCase()
    return items.filter(e => (e.patientName || '').toLowerCase().includes(lq) || (e.parameter || '').toLowerCase().includes(lq) || (e.testName || '').toLowerCase().includes(lq))
  }, [items, q])

  const openCount = items.filter(e => e.status === 'open').length
  const resolvedCount = items.filter(e => e.status === 'resolved').length
  const totalCount = items.length

  const paramCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of items) { m[e.parameter] = (m[e.parameter] || 0) + 1 }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [items])
  const maxParamCount = paramCounts.length > 0 ? Math.max(...paramCounts.map(p => p[1])) : 1

  const printReport = () => {
    const win = window.open('', 'print', 'width=1000,height=700')
    if (!win) return
    const rowsHtml = filtered.map(e => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${new Date(e.detectedAt).toLocaleString()}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${e.patientName || '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${e.testName || '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${e.parameter}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:700">${e.value} ${e.unit || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${e.criticalMin ?? '-'} – ${e.criticalMax ?? '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${e.status === 'open' ? 'Open' : 'Resolved'}</td>
    </tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Critical Values Report</title>
      <style>body{font-family:system-ui;padding:24px;color:#0f172a}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1}</style>
    </head><body>
    <h1>Critical Lab Values Report</h1>
    <div style="font-size:12px;color:#475569;margin-bottom:12px">From: ${from} To: ${to} | Open: ${openCount} | Resolved: ${resolvedCount} | Total: ${totalCount} | Printed: ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>Detected</th><th>Patient</th><th>Test</th><th>Parameter</th><th>Value</th><th>Critical Range</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`)
    win.document.close(); win.focus(); win.print()
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-linear-to-br from-rose-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600"><AlertTriangle className="h-4 w-4" /> OPEN ALERTS</div>
          <div className="mt-1 text-3xl font-extrabold text-rose-700">{openCount}</div>
          <div className="mt-1 text-xs text-rose-500">Require immediate attention</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> RESOLVED</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-700">{resolvedCount}</div>
          <div className="mt-1 text-xs text-emerald-500">Successfully notified</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><TrendingUp className="h-4 w-4" /> TOTAL EVENTS</div>
          <div className="mt-1 text-3xl font-extrabold text-slate-700">{totalCount}</div>
          <div className="mt-1 text-xs text-slate-500">In selected period</div>
        </div>
      </div>

      {/* Chart */}
      {paramCounts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Critical Events by Parameter</div>
          <div className="flex items-end gap-3" style={{ minHeight: 120 }}>
            {paramCounts.map(([param, count]) => (
              <div key={param} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-xs font-bold text-rose-700">{count}</div>
                <div className="w-full rounded-t-md bg-rose-500 transition-all" style={{ height: `${Math.max(8, (count / maxParamCount) * 100)}px` }} />
                <div className="mt-1 text-[10px] text-slate-600 text-center leading-tight" style={{ maxWidth: 80, wordBreak: 'break-word' }}>{param}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900" />
            <span className="text-slate-400">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient, test, parameter..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={printReport} disabled={loading || filtered.length === 0} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Detected</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Parameter</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Critical Range</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>}
            {!loading && !filtered.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No critical events found</td></tr>}
            {filtered.map(e => (
              <tr key={e._id} className={`hover:bg-slate-50/60 ${e.status === 'open' ? 'bg-rose-50/30' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" />{new Date(e.detectedAt).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{e.patientName || '-'}</div>
                  {e.patientPhone && <div className="text-xs text-slate-500">{e.patientPhone}</div>}
                </td>
                <td className="px-4 py-3 text-slate-700">{e.testName || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{e.parameter}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-700"><AlertTriangle className="h-3 w-3" /> {e.value} {e.unit || ''}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{e.criticalMin ?? '-'} – {e.criticalMax ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{e.doctor || '-'}</td>
                <td className="px-4 py-3">
                  {e.status === 'open' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200"><AlertTriangle className="h-3 w-3" /> Open</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 className="h-3 w-3" /> Resolved</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {e.status === 'open' ? (
                      <button
                        onClick={() => setResolveTarget(e)}
                        className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </button>
                    ) : (
                      <button
                        onClick={() => setResolveTarget(e)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolveTarget && (
        <ResolveModal
          value={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={() => { setResolveTarget(null); load() }}
        />
      )}
    </>
  )
}

function ResolveModal({ value, onClose, onResolved }: { value: CritEvent; onClose: () => void; onResolved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [doctor, setDoctor] = useState(value.doctor || '')
  const [comment, setComment] = useState(value.comment || '')
  const [infoMode, setInfoMode] = useState<string>(value.infoMode || 'verbal')
  const [date, setDate] = useState(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  })

  const resolve = async () => {
    setBusy(true)
    try {
      await api(`/lab/critical-events/${value._id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ doctor: doctor.trim() || undefined, comment: comment.trim() || undefined, infoMode, date: date ? new Date(date).toISOString() : undefined }),
      })
      onResolved()
    } catch {
      alert('Failed to resolve')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/60 p-5">
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900">Critical result detail</div>
            <div className="mt-1 truncate text-xs text-slate-500">{value.patientName || '-'} · {value.testName || '-'} · {value.parameter}</div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Close"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 sm:col-span-1">
              <div className="text-xs font-semibold text-rose-700">Critical Value</div>
              <div className="mt-1 text-lg font-extrabold text-rose-700">{value.value} {value.unit || ''}</div>
              <div className="mt-1 text-xs text-rose-700/80">Range: {value.criticalMin ?? '-'} – {value.criticalMax ?? '-'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Event</div>
              <div className="mt-1 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" />Detected: {new Date(value.detectedAt).toLocaleString()}</div>
                <div className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" />Status: {value.status === 'open' ? 'Open' : 'Resolved'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Doctor <span className="text-rose-600">*</span></span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={doctor}
                  onChange={e => setDoctor(e.target.value)}
                  readOnly={value.status !== 'open'}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:opacity-60"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Date <span className="text-rose-600">*</span></span>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="datetime-local"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  readOnly={value.status !== 'open'}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:opacity-60"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Comment <span className="text-rose-600">*</span></span>
            <div className="relative">
              <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                readOnly={value.status !== 'open'}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Information mode <span className="text-rose-600">*</span></span>
            <div className="relative">
              <Info className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={infoMode}
                onChange={e => setInfoMode(e.target.value)}
                disabled={value.status !== 'open'}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:opacity-60"
              >
                <option value="verbal">Verbal</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          {value.status === 'open' && (
            <button
              disabled={busy}
              onClick={resolve}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ParametersTab() {
  const [items, setItems] = useState<CritParam[]>([])
  const [editing, setEditing] = useState<CritParam | null>(null)

  async function load() {
    try {
      const r = await api('/lab/critical-parameters')
      setItems(r.items || [])
    } catch {
      setItems([])
    }
  }
  useEffect(() => { load() }, [])

  async function save(p: CritParam) {
    if (p._id) await api(`/lab/critical-parameters/${p._id}`, { method: 'PUT', body: JSON.stringify(p) })
    else await api('/lab/critical-parameters', { method: 'POST', body: JSON.stringify(p) })
    setEditing(null); load()
  }
  async function del(id?: string) {
    if (!id || !confirm('Delete this parameter?')) return
    await api(`/lab/critical-parameters/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">{items.length} critical parameters configured</div>
        <button
          onClick={() => setEditing({ parameter: '', enabled: true })}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:bg-violet-700"
        >
          <Activity className="h-4 w-4" /> Add Parameter
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Parameter</th>
              <th className="px-4 py-3">Test Scope</th>
              <th className="px-4 py-3">Critical Min</th>
              <th className="px-4 py-3">Critical Max</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!items.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No critical parameters configured.</td>
              </tr>
            )}
            {items.map(p => (
              <tr key={p._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.parameter}</td>
                <td className="px-4 py-3 text-slate-600">{p.testName || <span className="italic text-slate-400">Any</span>}</td>
                <td className="px-4 py-3"><span className="font-mono text-rose-600">{p.criticalMin ?? '-'}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-rose-600">{p.criticalMax ?? '-'}</span></td>
                <td className="px-4 py-3 text-slate-600">{p.unit || ''}</td>
                <td className="px-4 py-3">
                  {p.enabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> On
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">Off</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditing(p)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                    <button onClick={() => del(p._id)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ParamEditor value={editing} onClose={() => setEditing(null)} onSave={save} />}
    </>
  )
}

function ParamEditor({ value, onClose, onSave }: { value: CritParam; onClose: () => void; onSave: (p: CritParam) => void }) {
  const [v, setV] = useState<CritParam>(value)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4 shadow-xl">
        <h3 className="mb-3 font-semibold">{v._id ? 'Edit' : 'Add'} critical parameter</h3>
        <div className="space-y-2 text-sm">
          <Input label="Parameter *" value={v.parameter} onChange={x => setV({ ...v, parameter: x })} />
          <Input label="Test name (optional)" value={v.testName || ''} onChange={x => setV({ ...v, testName: x })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Critical min" type="number" value={v.criticalMin ?? ''} onChange={x => setV({ ...v, criticalMin: x === '' ? undefined : Number(x) })} />
            <Input label="Critical max" type="number" value={v.criticalMax ?? ''} onChange={x => setV({ ...v, criticalMax: x === '' ? undefined : Number(x) })} />
          </div>
          <Input label="Unit" value={v.unit || ''} onChange={x => setV({ ...v, unit: x })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.enabled} onChange={e => setV({ ...v, enabled: e.target.checked })} /> Enabled</label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onSave(v)} className="rounded bg-blue-700 px-4 py-1.5 text-sm text-white">Save</button>
          <button onClick={onClose} className="rounded border px-4 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: any) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-600">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
    </label>
  )
}
