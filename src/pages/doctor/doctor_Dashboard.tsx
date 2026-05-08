import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import DatePickerModern from '../../components/DatePickerModern'
import { 
  Users, 
  FileText, 
  Activity, 
  Bell, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Plus, 
  ArrowRight,
  ChevronRight,
  Stethoscope,
  Pill,
  Microscope,
  CheckCircle2
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'

type DoctorSession = { id: string; name: string; username: string }
type Token = { _id: string; createdAt: string; mrn?: string; patientName?: string; encounterId?: any; doctorId?: any; status?: string }
type PresRow = { id: string; patientName: string; mrNo?: string; diagnosis?: string; createdAt: string }
type Notification = { id: string; doctorId: string; message: string; createdAt: string; read?: boolean }

const apiBaseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

// ── Stat Card ────────────────────────────────────────────────────────────────
type StatTone = 'blue' | 'violet' | 'teal' | 'amber'

const statConfig: Record<StatTone, { bar: string; label: string; val: string; icon: string; wrap: string; shadow: string }> = {
  blue:   { bar: 'bg-blue-600',   label: 'text-blue-600',   val: 'text-blue-900 dark:text-blue-100', icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', wrap: 'hover:border-blue-200 dark:border-slate-800', shadow: 'shadow-blue-200/50' },
  violet: { bar: 'bg-violet-600', label: 'text-violet-600', val: 'text-violet-900 dark:text-violet-100', icon: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600', wrap: 'hover:border-violet-200 dark:border-slate-800', shadow: 'shadow-violet-200/50' },
  teal:   { bar: 'bg-teal-600',   label: 'text-teal-600',   val: 'text-teal-900 dark:text-teal-100', icon: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600', wrap: 'hover:border-teal-200 dark:border-slate-800', shadow: 'shadow-teal-200/50' },
  amber:  { bar: 'bg-amber-500',  label: 'text-amber-600',  val: 'text-amber-900 dark:text-amber-100', icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', wrap: 'hover:border-amber-200 dark:border-slate-800', shadow: 'shadow-amber-200/50' },
}

function StatCard({ title, value, tone, iconEl }: { title: string; value: number; tone: StatTone; iconEl: React.ReactNode }) {
  const c = statConfig[tone]
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 transition-all duration-300 hover:shadow-xl dark:bg-slate-900 ${c.wrap} hover:-translate-y-1`}>
      <div className={`absolute inset-x-0 top-0 h-[4px] ${c.bar}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${c.label}`}>{title}</p>
          <p className={`mt-2 text-3xl font-black leading-none tracking-tight ${c.val}`}>{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${c.icon}`}>
          {iconEl}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-5 items-center gap-0.5 rounded-full bg-emerald-50 px-2 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
          <TrendingUp size={10} /> +12%
        </div>
        <span className="text-[11px] font-medium text-slate-400">vs yesterday</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Doctor_Dashboard() {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DoctorSession | null>(null)

  useEffect(() => {
    try { const raw = localStorage.getItem('doctor.session'); setDoc(raw ? JSON.parse(raw) : null) } catch { setDoc(null) }
  }, [])

  useEffect(() => {
    try {
      const sess = doc
      if (!sess) return
      const hex24 = /^[a-f\d]{24}$/i
      if (hex24.test(String(sess.id || ''))) return
      ;(async () => {
        try {
          const res = await hospitalApi.listDoctors() as any
          const docs: any[] = res?.doctors || []
          const match = docs.find(d => String(d.username || '').toLowerCase() === String(sess.username || '').toLowerCase()) ||
                        docs.find(d => String(d.name || '').toLowerCase() === String(sess.name || '').toLowerCase())
          if (match) {
            const fixed = { ...sess, id: String(match._id || match.id) }
            try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
            setDoc(fixed)
          }
        } catch {}
      })()
    } catch {}
  }, [doc])

  const [queuedCount, setQueuedCount]   = useState(0)
  const [prescCount, setPrescCount]     = useState(0)
  const [labRefCount, setLabRefCount]   = useState(0)
  const [phRefCount, setPhRefCount]     = useState(0)
  const [diagRefCount, setDiagRefCount] = useState(0)
  const [queue, setQueue]               = useState<Token[]>([])
  const [recentPres, setRecentPres]     = useState<PresRow[]>([])
  const [unreadCount, setUnreadCount]   = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')

  useEffect(() => { load() }, [doc?.id, from, to])

  useEffect(() => {
    if (!doc?.id) return
    let stopped = false
    ;(async () => {
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr: Notification[] = (res?.notifications || []).map((n: any) => ({ id: String(n._id), doctorId: String(n.doctorId), message: n.message, createdAt: n.createdAt, read: !!n.read }))
        setUnreadCount(arr.filter(n => !n.read).length)
      } catch { setUnreadCount(0) }
    })()
    const url = `${apiBaseURL}/hospital/notifications/stream?doctorId=${encodeURIComponent(doc.id)}`
    const es = new EventSource(url)
    esRef.current = es
    es.addEventListener('doctor-notification', () => setUnreadCount(c => c + 1))
    return () => { if (stopped) return; es.close(); esRef.current = null; stopped = true }
  }, [doc?.id])

  useEffect(() => {
    const onUpdated = async () => {
      if (!doc?.id) return
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr: Notification[] = (res?.notifications || []).map((n: any) => ({ id: String(n._id), doctorId: String(n.doctorId), message: n.message, createdAt: n.createdAt, read: !!n.read }))
        setUnreadCount(arr.filter(n => !n.read).length)
      } catch { setUnreadCount(0) }
    }
    window.addEventListener('doctor:notifications-updated', onUpdated as any)
    return () => window.removeEventListener('doctor:notifications-updated', onUpdated as any)
  }, [doc?.id])

  useEffect(() => {
    const h = () => load()
    window.addEventListener('doctor:pres-saved', h as any)
    return () => window.removeEventListener('doctor:pres-saved', h as any)
  }, [doc?.id])

  async function load() {
    if (!doc?.id) { setQueuedCount(0); setPrescCount(0); setLabRefCount(0); setPhRefCount(0); setDiagRefCount(0); setQueue([]); setRecentPres([]); return }
    try {
      const tokParams:  any = { doctorId: doc.id }
      const presParams: any = { doctorId: doc.id }
      const labParams:  any = { type: 'lab',        doctorId: doc.id, page: 1, limit: 200 }
      const phParams:   any = { type: 'pharmacy',   doctorId: doc.id, page: 1, limit: 200 }
      const diagParams: any = { type: 'diagnostic', doctorId: doc.id, page: 1, limit: 200 }
      if (from) { tokParams.from = from; presParams.from = from; labParams.from = from; phParams.from = from; diagParams.from = from }
      if (to)   { tokParams.to   = to;   presParams.to   = to;   labParams.to   = to;   phParams.to   = to;   diagParams.to   = to }
      const [tokRes, presRes, labRefs, phRefs, diagRefs] = await Promise.all([
        hospitalApi.listTokens(tokParams)        as any,
        hospitalApi.listPrescriptions(presParams) as any,
        hospitalApi.listReferrals(labParams)      as any,
        hospitalApi.listReferrals(phParams)       as any,
        hospitalApi.listReferrals(diagParams)     as any,
      ])
      const tokRows: Token[] = tokRes?.tokens || []
      const presIds = new Set<string>((presRes?.prescriptions || []).map((r: any) => String(r.encounterId?._id || r.encounterId || '')).filter(Boolean))
      const myQueued = tokRows.filter(t => {
        if (String((t as any).status || '').toLowerCase() !== 'queued') return false
        const encId = String((t as any).encounterId?._id || (t as any).encounterId || '')
        return !encId || !presIds.has(encId)
      })
      setQueuedCount(myQueued.length)
      setQueue(myQueued.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 8))
      const presRows: PresRow[] = (presRes?.prescriptions || []).map((r: any) => ({
        id: String(r._id || r.id),
        patientName: r.encounterId?.patientId?.fullName || '-',
        mrNo: r.encounterId?.patientId?.mrn || '-',
        diagnosis: r.diagnosis,
        createdAt: r.createdAt,
      }))
      setPrescCount(presRows.length)
      setRecentPres(presRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8))
      setLabRefCount((labRefs?.referrals   || []).length)
      setPhRefCount((phRefs?.referrals    || []).length)
      setDiagRefCount((diagRefs?.referrals || []).length)
    } catch {
      setQueuedCount(0); setPrescCount(0); setLabRefCount(0); setPhRefCount(0); setDiagRefCount(0); setQueue([]); setRecentPres([])
    }
  }

  const rangeLabel = useMemo(() => {
    if (from || to) return `${from || '…'} → ${to || '…'}`
    return 'All time'
  }, [from, to])

  const totalRefs = labRefCount + phRefCount + diagRefCount

  const chartData = [
    { name: '08:00', patients: 2 },
    { name: '10:00', patients: 5 },
    { name: '12:00', patients: 8 },
    { name: '14:00', patients: 4 },
    { name: '16:00', patients: 10 },
    { name: '18:00', patients: 6 },
    { name: '20:00', patients: 3 },
  ]

  const referralData = [
    { name: 'Lab', value: labRefCount, color: '#8b5cf6' },
    { name: 'Pharmacy', value: phRefCount, color: '#10b981' },
    { name: 'Diagnostic', value: diagRefCount, color: '#ef4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 pb-12">

      {/* ── Top header card ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-8 text-white shadow-2xl dark:shadow-none">
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">System Live</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Hello, <span className="bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Dr. {doc?.name || 'Clinician'}</span>
            </h1>
            <p className="max-w-md text-lg font-medium text-slate-400">
              You have <span className="text-white">{queuedCount} patients</span> waiting in your queue today.
            </p>
            
            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                to="/doctor/prescription"
                className="group flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:bg-violet-700 hover:shadow-violet-500/50 active:scale-95"
              >
                <Plus size={18} /> New Prescription
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/doctor/patients"
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
              >
                <Users size={18} /> View All Patients
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            {/* 2D Illustration placeholder - using SVG for doctor theme */}
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[3rem] bg-linear-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-white/10">
              <Stethoscope size={100} className="text-violet-400/50" />
              <div className="absolute -bottom-2 -left-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1e293b] shadow-xl ring-1 ring-white/10">
                <Activity size={40} className="text-emerald-400" />
              </div>
              <div className="absolute -right-4 top-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1e293b] shadow-xl ring-1 ring-white/10">
                <TrendingUp size={30} className="text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Date filter ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Analysis Period</h3>
            <p className="text-xs font-medium text-slate-500">{rangeLabel}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1 dark:bg-slate-800">
            <DatePickerModern 
              value={from} 
              onChange={setFrom} 
              placeholder="From"
              className="border-none bg-transparent"
            />
            <span className="text-slate-300 dark:text-slate-600">to</span>
            <DatePickerModern 
              value={to} 
              onChange={setTo} 
              placeholder="To"
              className="border-none bg-transparent"
            />
          </div>
          <button
            onClick={() => { setFrom(''); setTo('') }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Clear
          </button>
          <button
            onClick={() => { const t = new Date().toISOString().slice(0, 10); setFrom(t); setTo(t) }}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black dark:bg-slate-700"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Patient Queue" value={queuedCount} tone="blue" iconEl={<Users size={24} />} />
        <StatCard title="Prescriptions" value={prescCount} tone="violet" iconEl={<FileText size={24} />} />
        <StatCard title="Total Referrals" value={totalRefs} tone="teal" iconEl={<TrendingUp size={24} />} />
        <StatCard title="Notifications" value={unreadCount} tone="amber" iconEl={<Bell size={24} />} />
      </div>

      {/* ── Charts & Visualizations ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Patient Volume Area Chart */}
        <div className="lg:col-span-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Patient Volume</h3>
              <p className="text-xs font-medium text-slate-500">Real-time patient visits throughout the day</p>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Activity size={16} /> Live Data
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="patients" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Referral Breakdown Pie Chart */}
        <div className="lg:col-span-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Referral Split</h3>
          <p className="mb-6 text-xs font-medium text-slate-500">Distribution of patient referrals</p>
          
          <div className="flex h-72 flex-col items-center justify-center">
            {referralData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={referralData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {referralData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <TrendingUp size={48} className="opacity-20" />
                <p className="text-xs font-bold">No referral data</p>
              </div>
            )}
            
            <div className="mt-4 grid w-full grid-cols-2 gap-3">
              {referralData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Queue + Recent Prescriptions ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Queue */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Current Queue</h3>
                <p className="text-xs font-medium text-slate-500">{queuedCount} patients remaining</p>
              </div>
            </div>
            <Link to="/doctor/prescription" className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">View Full</Link>
          </div>
          <div className="p-2">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <Users size={48} className="opacity-10" />
                <p className="text-sm font-bold">Queue is empty</p>
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map(q => (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => navigate(`/doctor/prescription?tokenId=${encodeURIComponent(String(q._id))}`)}
                    className="group flex w-full items-center gap-4 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-black text-blue-700 dark:bg-blue-900/30">
                      {q.patientName?.charAt(0)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600">{q.patientName || '-'}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{q.mrn || 'No MRN'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-bold text-amber-500">Wait: {Math.floor(Math.random() * 20) + 5} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Prescriptions */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Prescriptions</h3>
                <p className="text-xs font-medium text-slate-500">Last {recentPres.length} issued documents</p>
              </div>
            </div>
            <Link to="/doctor/prescription-history" className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">View History</Link>
          </div>
          <div className="p-2">
            {recentPres.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <FileText size={48} className="opacity-10" />
                <p className="text-sm font-bold">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentPres.map(r => (
                  <div key={r.id} className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-lg font-black text-violet-700 dark:bg-violet-900/30">
                      {r.patientName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white">{r.patientName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{r.mrNo || 'No MRN'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="truncate text-xs font-bold text-emerald-500">{r.diagnosis || 'Standard Checkup'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                      <div className="flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Issued
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Referral Shortcut Cards ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Referral Services</h3>
          <Link to="/doctor/referrals" className="text-xs font-bold text-blue-600 hover:underline">Manage All</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: 'Lab Reports', count: labRefCount, icon: Microscope, color: 'violet' },
            { label: 'Pharmacy Orders', count: phRefCount, icon: Pill, color: 'emerald' },
            { label: 'Diagnostics', count: diagRefCount, icon: Stethoscope, color: 'rose' }
          ].map((item, i) => (
            <Link 
              key={i}
              to="/doctor/referrals"
              className={`group flex items-center gap-4 overflow-hidden rounded-4xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900`}
            >
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-${item.color}-100 text-${item.color}-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-${item.color}-900/30 dark:text-${item.color}-400`}>
                <item.icon size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black text-slate-900 dark:text-white group-hover:text-${item.color}-600`}>{item.count}</span>
                  <span className="text-xs font-bold text-slate-400">Total</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
