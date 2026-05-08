import { useEffect, useMemo, useState } from 'react'
import { Filter, Printer, RefreshCw, Search } from 'lucide-react'
import { api } from '../../api'
import { openPatientCardPrint } from '../../components/lab/PatientCardPrint'

type Card = {
  _id: string
  patientId: string
  cardKind: string
  cardNo: string
  issuedAt: string
  expiresAt?: string
  validVisits: number
  visitsUsed: number
  scheme?: string
  status: 'active' | 'expired' | 'cancelled'
}

export default function Lab_PatientCards() {
  const [items, setItems] = useState<Card[]>([])
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    const q = new URLSearchParams()
    if (kind) q.set('kind', kind)
    if (status) q.set('status', status)
    const r = await api(`/lab/patient-cards?${q}`)
    setItems(r.items || [])
  }
  useEffect(() => { load() }, [kind, status])

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return items
    return items.filter(c => String(c.cardNo || '').toLowerCase().includes(f) || String((c as any).patientName || '').toLowerCase().includes(f) || String((c as any).mrn || '').toLowerCase().includes(f) || String((c as any).hospitalRegistrationNumber || '').toLowerCase().includes(f))
  }, [items, q])

  function print(c: Card) {
    openPatientCardPrint({
      fullName: (c as any).patientName || '',
      mrn: (c as any).mrn,
      hospitalRegistrationNumber: (c as any).hospitalRegistrationNumber,
      cardNo: c.cardNo,
      cardKind: c.cardKind,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      validVisits: c.validVisits,
    })
    api(`/lab/patient-cards/${c._id}/printed`, { method: 'POST', body: JSON.stringify({}) })
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Patient Cards</h2>
            <div className="mt-0.5 text-sm text-sky-100">Print and track issued patient cards</div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-sky-700">Total Cards</div>
            <div className="text-3xl font-extrabold tracking-tight text-sky-900">{items.length}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Active</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{items.filter(x => x.status === 'active').length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-amber-700">Expired</div>
            <div className="text-3xl font-extrabold tracking-tight text-amber-900">{items.filter(x => x.status === 'expired').length}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <label className="block">
            <span className="text-xs text-slate-600">Kind</span>
            <select value={kind} onChange={e => setKind(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">All</option>
              <option value="gynae9m">Gynaecology (9 m)</option>
              <option value="hep3m">Hepatitis (3 m)</option>
              <option value="tb2y">TB (2 y)</option>
              <option value="mdrtb2y">MDR-TB (2 y)</option>
              <option value="admitted">Admitted</option>
              <option value="general">General</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-600">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search card#, patient, MRN, HRN..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Card #</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Visits</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No cards found.</td></tr>}
            {rows.map(c => (
              <tr key={c._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{c.cardNo}</td>
                <td className="px-4 py-3 text-slate-700">{c.cardKind}</td>
                <td className="px-4 py-3 text-slate-700">{new Date(c.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-700">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-slate-700">{c.visitsUsed} / {c.validVisits || '∞'}</td>
                <td className="px-4 py-3">
                  {c.status === 'active' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                  ) : c.status === 'expired' ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">Expired</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">Cancelled</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button onClick={() => print(c)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

