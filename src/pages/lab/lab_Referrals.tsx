import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Search, RefreshCw, Download, UserCheck, FlaskConical, FileText, Filter, ChevronLeft, ChevronRight, Stethoscope, ClipboardList } from 'lucide-react'

type ReferralRow = {
  id: string
  tokenNo: string
  patientName: string
  phone: string
  referringConsultant: string
  tests: string[]
  date: string
  status: string
}

export default function Lab_Referrals() {
  const [items, setItems] = useState<ReferralRow[]>([])
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await labApi.listTokens({ q: search || undefined, from: from || undefined, to: to || undefined, page, limit })
      const rows: ReferralRow[] = (res.tokens || res.items || []).map((t: any) => ({
        id: String(t._id || t.id),
        tokenNo: t.tokenNo || t.tokenNumber || '-',
        patientName: t.patient?.fullName || t.patientName || '-',
        phone: t.patient?.phone || t.phone || '-',
        referringConsultant: t.referringConsultant || '-',
        tests: Array.isArray(t.tests) ? t.tests.map((x: any) => typeof x === 'string' ? x : x.name || x.testName || '').filter(Boolean) : [],
        date: t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : '-',
        status: t.status || '-',
      })).filter((r: ReferralRow) => r.referringConsultant && r.referringConsultant !== '-')
      setItems(rows)
      setTotal(res.total || rows.length)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      console.error('Failed to load referrals', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, limit, search, from, to])

  const exportCSV = () => {
    const header = ['Token No', 'Patient', 'Phone', 'Referring Consultant', 'Tests', 'Date', 'Status']
    const lines = [header.join(',')]
    for (const r of items) {
      const row = [r.tokenNo, r.patientName, r.phone, r.referringConsultant, r.tests.join('; '), r.date, r.status].map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g, '""')}"` : String(v))
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-referrals-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueConsultants = [...new Set(items.map(r => r.referringConsultant).filter(Boolean))]
  const totalReferrals = items.length
  const totalTests = items.reduce((s, r) => s + r.tests.length, 0)

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 transition-colors duration-300 dark:bg-slate-950 lg:p-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-slate-800 to-indigo-900 p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner ring-1 ring-white/30 transition-transform hover:rotate-3">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Lab Referrals</h1>
              <p className="mt-1 text-sm font-medium text-indigo-200 opacity-90">Track referring consultants and their lab orders</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={load} disabled={loading} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all active:scale-90 ring-1 ring-white/10 shadow-lg disabled:opacity-50">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-widest backdrop-blur-md hover:bg-white/20 transition-all active:scale-95 ring-1 ring-white/10 shadow-lg">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Referrals', value: totalReferrals, icon: ClipboardList, gradient: 'from-indigo-500 to-violet-600', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Unique Consultants', value: uniqueConsultants.length, icon: UserCheck, gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Tests', value: totalTests, icon: FlaskConical, gradient: 'from-amber-500 to-orange-600', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Avg Tests/Referral', value: totalReferrals ? (totalTests / totalReferrals).toFixed(1) : '0', icon: FileText, gradient: 'from-rose-500 to-pink-600', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((card, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Filters & Search</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">From Date</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To Date</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by patient, consultant..." className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/50" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading referrals...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Stethoscope className="h-12 w-12 opacity-10" />
            <p className="mt-2 text-sm font-bold">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Token #</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Patient</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Phone</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Referring Consultant</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Tests</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {items.map(r => (
                  <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-white">{r.tokenNo}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{r.patientName}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{r.phone}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30">
                          <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{r.referringConsultant}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {r.tests.slice(0, 3).map((t, i) => (
                          <span key={i} className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t}</span>
                        ))}
                        {r.tests.length > 3 && <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/30">+{r.tests.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{r.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        r.status === 'approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                        r.status === 'cancelled' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-900/30'
                      }`}>{r.status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Show</span>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }} className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 dark:bg-slate-800">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 dark:bg-slate-800">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
