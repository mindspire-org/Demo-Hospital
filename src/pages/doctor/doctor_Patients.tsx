import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { corporateApi, diagnosticApi, hospitalApi, labApi } from '../../utils/api'
import { 
  Users, 
  Search, 
  Filter, 
  History as HistoryIcon, 
  Calendar, 
  Clock, 
  ArrowRight,
  Activity,
  ChevronRight,
  MoreVertical,
  X,
  FileText,
  Microscope,
  Stethoscope,
  BadgeDollarSign,
  RotateCcw
} from 'lucide-react'
import DatePickerModern from '../../components/DatePickerModern'

type DoctorSession = { id: string; name: string; username: string }

type Token = {
  _id: string
  createdAt: string
  patientName: string
  mrNo: string
  encounterId?: string
  doctorId?: string
  doctorName?: string
  department?: string
  fee: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
}

type DrawerTab = 'visits'|'prescriptions'|'lab'|'diagnostics'|'finance'

export default function Doctor_Patients() {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [list, setList] = useState<Token[]>([])
  const [presEncounterIds, setPresEncounterIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('visits')
  const [drawerToken, setDrawerToken] = useState<Token | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [histVisits, setHistVisits] = useState<Token[]>([])
  const [histPres, setHistPres] = useState<any[]>([])
  const [histLab, setHistLab] = useState<any[]>([])
  const [histDiag, setHistDiag] = useState<any[]>([])
  const [histFinance, setHistFinance] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'queued'|'in-progress'|'completed'|'returned'|'cancelled'>('all')
  const [sortBy, setSortBy] = useState<'date'|'name'|'status'>('date')
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      // Compat: if legacy id (not 24-hex), try to resolve to backend _id by username/name
      const hex24 = /^[a-f\d]{24}$/i
      if (sess && !hex24.test(String(sess.id||''))) {
        ;(async () => {
          try {
            const res = await hospitalApi.listDoctors() as any
            const docs: any[] = res?.doctors || []
            const match = docs.find(d => String(d.username||'').toLowerCase() === String(sess.username||'').toLowerCase()) ||
                          docs.find(d => String(d.name||'').toLowerCase() === String(sess.name||'').toLowerCase())
            if (match) {
              const fixed = { ...sess, id: String(match._id || match.id) }
              try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
              setDoc(fixed)
            }
          } catch {}
        })()
      }
    } catch {}
  }, [])

  useEffect(() => { setPage(1) }, [doc?.id, from, to, filter])
  useEffect(() => { load() }, [doc?.id, from, to, page, limit])
  useEffect(() => {
    if (!doc?.id) return
    const id = setInterval(() => { load() }, 15000)
    return () => clearInterval(id)
  }, [doc?.id])

  // Refresh immediately when a prescription is saved elsewhere
  useEffect(() => {
    const handler = () => { load() }
    window.addEventListener('doctor:pres-saved', handler as any)
    return () => window.removeEventListener('doctor:pres-saved', handler as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  async function load(){
    try {
      if (!doc?.id) { setList([]); setPresEncounterIds([]); setTotal(0); return }
      const params: any = { doctorId: doc.id, page, limit }
      if (from) params.from = from
      if (to) params.to = to
      const [tokRes, presRes] = await Promise.all([
        hospitalApi.listTokens(params) as any,
        hospitalApi.listPrescriptions({ doctorId: doc.id, from, to, page: 1, limit: 200 }) as any,
      ])
      const totalCount = tokRes?.total || 0
      setTotal(totalCount)
      const items: Token[] = (tokRes.tokens || []).map((t: any) => ({
        _id: t._id,
        createdAt: t.createdAt,
        patientName: t.patientName || '-',
        mrNo: t.mrn || '-',
        encounterId: String(t.encounterId || ''),
        doctorId: t.doctorId?._id || String(t.doctorId || ''),
        doctorName: t.doctorId?.name || '',
        department: t.departmentId?.name || '',
        fee: Number(t.fee || 0),
        status: t.status,
      }))
      const presIds: string[] = (presRes.prescriptions || []).map((p: any) => String(p.encounterId?._id || p.encounterId || ''))
      setList(items)
      setPresEncounterIds(presIds)
    } catch {
      // backend likely down; keep current list
    }
  }

  async function openHistory(t: Token){
    setDrawerToken(t)
    setDrawerOpen(true)
    setDrawerTab('visits')
    setDrawerBusy(true)
    try {
      const mrn = String(t.mrNo || '').trim()
      const drId = doc?.id
      const [tokRes, presRes, labRes, diagRes, finRes] = await Promise.all([
        drId ? (hospitalApi.listTokens({ doctorId: drId, from: from || undefined, to: to || undefined }) as any) : Promise.resolve({ tokens: [] }),
        mrn ? (hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 50 }) as any) : Promise.resolve({ prescriptions: [] }),
        mrn ? (labApi.listOrders({ q: mrn, page: 1, limit: 50 }) as any) : Promise.resolve({ orders: [] }),
        mrn ? (diagnosticApi.listOrders({ q: mrn, page: 1, limit: 50 }) as any) : Promise.resolve({ orders: [] }),
        mrn ? (corporateApi.listTransactions({ patientMrn: mrn, page: 1, limit: 50 }) as any) : Promise.resolve({ transactions: [] }),
      ])

      const tokensAll: any[] = tokRes?.tokens || []
      const visits: Token[] = tokensAll
        .filter(x => String(x?.mrn || x?.mrNo || '').trim() === mrn)
        .map(x => ({
          _id: String(x._id || x.id),
          createdAt: String(x.createdAt || ''),
          patientName: String(x.patientName || '-'),
          mrNo: String(x.mrn || '-'),
          encounterId: String(x.encounterId || ''),
          doctorId: x.doctorId?._id || String(x.doctorId || ''),
          doctorName: x.doctorId?.name || '',
          department: x.departmentId?.name || '',
          fee: Number(x.fee || 0),
          status: x.status,
        }))
        .sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())

      setHistVisits(visits)
      setHistPres(presRes?.prescriptions || [])
      setHistLab(labRes?.orders || [])
      setHistDiag(diagRes?.orders || [])
      setHistFinance(finRes?.transactions || [])
    } catch {
      setHistVisits([])
      setHistPres([])
      setHistLab([])
      setHistDiag([])
      setHistFinance([])
    } finally {
      setDrawerBusy(false)
    }
  }

  const filteredPatients = useMemo(() => {
    const presSet = new Set(presEncounterIds.filter(Boolean))
    let patients = (list || []).filter(t => t.doctorId === doc?.id)
    
    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'queued') {
        // For queued, exclude those with prescriptions
        patients = patients.filter(t => t.status === 'queued' && (!t.encounterId || !presSet.has(String(t.encounterId))))
      } else {
        patients = patients.filter(t => t.status === filter)
      }
    } else {
      // For 'all', exclude those with prescriptions from queued patients
      patients = patients.filter(t => !(t.status === 'queued' && t.encounterId && presSet.has(String(t.encounterId))))
    }
    
    // Apply search filter
    const q = query.trim().toLowerCase()
    if (q) {
      patients = patients.filter(t => [t.patientName, t.mrNo]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q)))
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'name':
        patients.sort((a, b) => a.patientName.localeCompare(b.patientName))
        break
      case 'status':
        patients.sort((a, b) => a.status.localeCompare(b.status))
        break
      case 'date':
      default:
        patients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }
    
    return patients
  }, [list, doc, presEncounterIds, filter, sortBy, query])


  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="rounded-3xl bg-linear-to-br from-[#0f172a] to-[#1e293b] p-8 text-white shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-blue-400/20">
              <Users size={12} /> Patient Directory
            </div>
            <h1 className="text-3xl font-black tracking-tight">Manage Your Patients</h1>
            <p className="max-w-md text-sm font-medium text-slate-400">
              View history, track progress, and manage consultations for all your assigned patients.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
              <DatePickerModern value={from} onChange={setFrom} placeholder="From Date" className="border-none bg-transparent" />
              <div className="h-4 w-px bg-white/10" />
              <DatePickerModern value={to} onChange={setTo} placeholder="To Date" className="border-none bg-transparent" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { const t = new Date().toISOString().slice(0, 10); setFrom(t); setTo(t) }}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold transition-all hover:bg-white/20 active:scale-95"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => { setFrom(''); setTo('') }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all hover:bg-rose-500/20 hover:text-rose-400 active:scale-95"
                title="Reset Filters"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, MR# or contact..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="lg:col-span-3">
          <div className="relative h-12">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Activity size={18} />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="h-full w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="queued">Waiting in Queue</option>
              <option value="in-progress">Currently Consulting</option>
              <option value="completed">Consultation Done</option>
              <option value="returned">Returned / On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
              <ChevronRight size={18} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="relative h-12">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Filter size={18} />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="h-full w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="date">Newest First</option>
              <option value="name">Patient A-Z</option>
              <option value="status">By Status</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
              <ChevronRight size={18} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex h-12 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{total}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Limit</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{limit}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-slate-800 font-medium">Patient List</div>
          <div className="text-sm text-slate-500">
            Showing {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total}
          </div>
        </div>
        <div className="divide-y divide-slate-100 overflow-hidden">
          {filteredPatients.map((t: Token, idx: number) => (
            <div
              key={t._id}
              className="group relative flex items-center justify-between gap-4 p-5 transition-all hover:bg-slate-50"
            >
              <div 
                className="flex flex-1 cursor-pointer items-center gap-4"
                onClick={() => navigate(`/doctor/prescription?tokenId=${encodeURIComponent(t._id)}`)}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {(page - 1) * limit + idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-bold text-slate-900 dark:text-white">{t.patientName}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">MR: {t.mrNo}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.createdAt).toLocaleDateString()}</span>
                    {t.department && <span className="flex items-center gap-1"><Stethoscope size={12} /> {t.department}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  t.status === 'in-progress' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 
                  t.status === 'completed' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 
                  t.status === 'queued' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 
                  'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                }`}>
                  <Activity size={10} />
                  {t.status.replace('-', ' ')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async (e) => { e.stopPropagation(); await openHistory(t) }}
                    className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  >
                    <HistoryIcon size={14} /> History
                  </button>
                  
                  {t.status === 'queued' && (
                    <button
                      type="button"
                      onClick={async (e) => { e.stopPropagation(); try { await hospitalApi.updateTokenStatus(t._id, 'in-progress'); await load() } catch {} }}
                      className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                    >
                      Start
                    </button>
                  )}

                  {t.status === 'in-progress' && (
                    <button
                      type="button"
                      onClick={async (e) => { e.stopPropagation(); try { await hospitalApi.updateTokenStatus(t._id, 'completed'); await load() } catch {} }}
                      className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95"
                    >
                      Complete
                    </button>
                  )}

                  <div className="relative group/menu">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <div className="invisible absolute right-0 top-full z-10 mt-2 w-40 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl transition-all group-hover/menu:visible group-hover/menu:opacity-100 dark:border-slate-800 dark:bg-slate-900">
                      <button
                        onClick={async (e) => { e.stopPropagation(); try { await hospitalApi.updateTokenStatus(t._id, t.status === 'returned' ? 'queued' : 'returned'); await load() } catch {} }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      >
                        <RotateCcw size={14} /> {t.status === 'returned' ? 'Recall Patient' : 'Hold / Return'}
                      </button>
                      <button
                        onClick={async (e) => { e.stopPropagation(); try { await hospitalApi.updateTokenStatus(t._id, 'cancelled'); await load() } catch {} }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <X size={14} /> Cancel Visit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredPatients.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">
              {filter === 'all' ? 'No patients found' : `No patients with status '${filter}' found`}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded px-3 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-slate-600">
                Page {page} of {Math.ceil(total / limit) || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit) || 1, p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="rounded px-3 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerOpen && drawerToken && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-[#0f172a]/40 backdrop-blur-sm transition-all">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setDrawerOpen(false)} aria-label="Close" />
          <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:bg-slate-900">
            {/* Drawer Header */}
            <div className="border-b border-slate-100 p-6 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg shadow-blue-500/20">
                    {drawerToken.patientName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{drawerToken.patientName}</h2>
                    <div className="mt-1 flex items-center gap-3 text-xs font-bold text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">MR: {drawerToken.mrNo}</span>
                      {drawerToken.department && <span className="flex items-center gap-1"><Stethoscope size={12} /> {drawerToken.department}</span>}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 active:scale-95 dark:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  { id: 'visits', label: 'Visits', icon: Calendar, color: 'blue' },
                  { id: 'prescriptions', label: 'Prescriptions', icon: FileText, color: 'violet' },
                  { id: 'lab', label: 'Lab Reports', icon: Microscope, color: 'sky' },
                  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope, color: 'emerald' },
                  { id: 'finance', label: 'Financials', icon: BadgeDollarSign, color: 'amber' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      drawerTab === tab.id 
                        ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-500/20` 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {drawerBusy ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  <span className="text-xs font-bold text-slate-400">Retrieving medical history...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {drawerTab === 'visits' && (
                    <>
                      {histVisits.map(v => (
                        <div key={v._id} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                                <Calendar size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{new Date(v.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] font-bold text-slate-400">{new Date(v.createdAt).toLocaleTimeString()}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee Paid</div>
                              <div className="text-sm font-black text-slate-900 dark:text-white">PKR {v.fee}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{v.status}</span>
                            <span className="text-[10px] font-bold text-slate-400">•</span>
                            <span className="text-[10px] font-bold text-slate-500">{v.department || 'General'}</span>
                          </div>
                        </div>
                      ))}
                      {histVisits.length === 0 && <EmptyState icon={Calendar} label="No previous visits found" />}
                    </>
                  )}

                  {drawerTab === 'prescriptions' && (
                    <>
                      {histPres.map((p: any, i: number) => (
                        <div key={p._id || i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                                <FileText size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{new Date(p.createdAt || p.updatedAt).toLocaleDateString()}</div>
                                <div className="text-[10px] font-bold text-slate-400">{p.prescriptionMode || 'Electronic'}</div>
                              </div>
                            </div>
                            <button className="flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[10px] font-bold text-slate-600 hover:bg-violet-600 hover:text-white transition-all dark:bg-slate-800">
                              View PDF <ArrowRight size={12} />
                            </button>
                          </div>
                          <div className="mt-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Diagnosis</div>
                            <div className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">{p.diagnosis || 'Clinical evaluation pending'}</div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(p.items || []).slice(0, 5).map((it: any, idx: number) => (
                              <span key={idx} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800">{it.name}</span>
                            ))}
                            {(p.items || []).length > 5 && <span className="text-[10px] font-bold text-slate-400">+{p.items.length - 5} more</span>}
                          </div>
                        </div>
                      ))}
                      {histPres.length === 0 && <EmptyState icon={FileText} label="No prescriptions found" />}
                    </>
                  )}

                  {drawerTab === 'lab' && (
                    <>
                      {histLab.map((o: any, i: number) => (
                        <div key={o._id || i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                                <Microscope size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{o.tokenNo || o.orderNo}</div>
                                <div className="text-[10px] font-bold text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600 dark:bg-emerald-900/20">{o.status}</span>
                          </div>
                          <div className="mt-3 space-y-1">
                            {Array.isArray(o.tests) ? o.tests.map((t: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                <div className="h-1 w-1 rounded-full bg-sky-400" /> {t}
                              </div>
                            )) : <div className="text-xs font-bold text-slate-600">{o.testsText}</div>}
                          </div>
                        </div>
                      ))}
                      {histLab.length === 0 && <EmptyState icon={Microscope} label="No lab reports found" />}
                    </>
                  )}

                  {drawerTab === 'diagnostics' && (
                    <>
                      {histDiag.map((o: any, i: number) => (
                        <div key={o._id || i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                                <Stethoscope size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{o.tokenNo || o.orderNo}</div>
                                <div className="text-[10px] font-bold text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600 dark:bg-emerald-900/20">{o.status}</span>
                          </div>
                          <div className="mt-3 space-y-1">
                            {Array.isArray(o.tests) ? o.tests.map((t: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                <div className="h-1 w-1 rounded-full bg-emerald-400" /> {t}
                              </div>
                            )) : <div className="text-xs font-bold text-slate-600">{o.testsText}</div>}
                          </div>
                        </div>
                      ))}
                      {histDiag.length === 0 && <EmptyState icon={Stethoscope} label="No diagnostic scans found" />}
                    </>
                  )}

                  {drawerTab === 'finance' && (
                    <>
                      {histFinance.map((tr: any, i: number) => (
                        <div key={tr._id || i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                                <BadgeDollarSign size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{tr.serviceType || tr.refType}</div>
                                <div className="text-[10px] font-bold text-slate-400">{tr.createdAt ? new Date(tr.createdAt).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900 dark:text-white">PKR {tr.amount ?? tr.net ?? tr.total}</div>
                              <div className={`text-[10px] font-bold ${tr.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{tr.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {histFinance.length === 0 && <EmptyState icon={BadgeDollarSign} label="No financial records found" />}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-300">
      <Icon size={48} strokeWidth={1} />
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}
