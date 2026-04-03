import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

type DoctorSession = { id: string; name: string; username: string }
type Token = { _id: string; createdAt: string; mrn?: string; patientName?: string; encounterId?: any; doctorId?: any; status?: string }
type PresRow = { id: string; patientName: string; mrNo?: string; diagnosis?: string; createdAt: string }
type Notification = { id: string; doctorId: string; message: string; createdAt: string; read?: boolean }

const apiBaseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  prescription: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  referral: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  lab: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 7"/><path d="M9 14l10 9"/><path d="M3 7h18"/>
    </svg>
  ),
  pill: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </svg>
  ),
  diag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  cal: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  clock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
}

// ── Stat Card ────────────────────────────────────────────────────────────────
type StatTone = 'blue' | 'violet' | 'teal' | 'amber'

const statConfig: Record<StatTone, { bar: string; label: string; val: string; icon: string; wrap: string }> = {
  blue:   { bar: 'bg-blue-600',   label: 'text-blue-600',   val: 'text-blue-900',   icon: 'bg-blue-100   text-blue-600',   wrap: 'hover:border-blue-200'   },
  violet: { bar: 'bg-violet-600', label: 'text-violet-600', val: 'text-violet-900', icon: 'bg-violet-100 text-violet-600', wrap: 'hover:border-violet-200' },
  teal:   { bar: 'bg-teal-600',   label: 'text-teal-600',   val: 'text-teal-900',   icon: 'bg-teal-100   text-teal-600',   wrap: 'hover:border-teal-200'   },
  amber:  { bar: 'bg-amber-500',  label: 'text-amber-600',  val: 'text-amber-900',  icon: 'bg-amber-100  text-amber-600',  wrap: 'hover:border-amber-200'  },
}

function StatCard({ title, value, tone, iconEl }: { title: string; value: number; tone: StatTone; iconEl: React.ReactNode }) {
  const c = statConfig[tone]
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors ${c.wrap}`}>
      <div className={`absolute inset-x-0 top-0 h-[3px] ${c.bar}`} />
      <p className={`text-[10px] font-semibold uppercase tracking-widest ${c.label}`}>{title}</p>
      <p className={`mt-2 text-4xl font-bold leading-none tracking-tight ${c.val}`}>{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-400">
        {value === 0 ? 'None today' : 'Active today'}
      </p>
      <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl ${c.icon}`}>
        {iconEl}
      </div>
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, color = 'bg-blue-100 text-blue-700' }: { name: string; color?: string }) {
  return (
    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>
      {getInitials(name)}
    </span>
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

  return (
    <div className="space-y-5">

      {/* ── Top header card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1f3d] via-[#1a3260] to-[#2563eb] p-6 text-white shadow-sm">
        {/* subtle decorative circle */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 rounded-full bg-white/5" />

        <p className="text-sm font-normal text-blue-200">Welcome back</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{doc?.name || 'Doctor'}</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/doctor/prescription"
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0f1f3d] shadow-sm transition hover:bg-blue-50"
          >
            {Icon.plus} New Prescription
          </Link>
          <Link
            to="/doctor/prescriptions"
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Prescription History
          </Link>
          <Link
            to="/doctor/patients"
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            My Patients
          </Link>
        </div>
      </div>

      {/* ── Date filter ── */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
          {Icon.cal}
          <input
            type="date" value={from}
            onChange={e => setFrom(e.target.value)}
            className="border-none bg-transparent text-xs text-slate-700 outline-none"
          />
          <span className="text-slate-300">|</span>
          <input
            type="date" value={to}
            onChange={e => setTo(e.target.value)}
            className="border-none bg-transparent text-xs text-slate-700 outline-none"
          />
        </div>
        <button
          onClick={() => { setFrom(''); setTo('') }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          onClick={() => { const t = new Date().toISOString().slice(0, 10); setFrom(t); setTo(t) }}
          className="rounded-lg border border-slate-200 bg-[#0f1f3d] px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#1a3260]"
        >
          Today
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Queued Patients"      value={queuedCount} tone="blue"   iconEl={Icon.users}        />
        <StatCard title="Prescriptions"        value={prescCount}  tone="violet" iconEl={Icon.prescription} />
        <StatCard title="Referrals"            value={totalRefs}   tone="teal"   iconEl={Icon.referral}     />
        <StatCard title="Unread Notifications" value={unreadCount} tone="amber"  iconEl={Icon.bell}         />
      </div>

      {/* ── Queue + Recent Prescriptions ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Queue */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <span className="text-sm font-semibold text-slate-800">Queue</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">{rangeLabel}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {queue.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No patients in queue</div>
            ) : queue.map(q => (
              <button
                key={q._id}
                type="button"
                onClick={() => navigate(`/doctor/prescription?tokenId=${encodeURIComponent(String(q._id))}`)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
              >
                <Avatar name={q.patientName || '?'} color="bg-blue-100 text-blue-700" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-medium text-slate-800">{q.patientName || '-'}</span>
                    {q.mrn && <span className="text-[11px] text-slate-400">{q.mrn}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Queued
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap">
                  {Icon.clock} {new Date(q.createdAt).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Prescriptions */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <span className="text-sm font-semibold text-slate-800">Recent Prescriptions</span>
            <Link to="/doctor/prescriptions" className="text-[11px] font-medium text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPres.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No prescriptions yet</div>
            ) : recentPres.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                <Avatar name={r.patientName} color="bg-violet-100 text-violet-700" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-medium text-slate-800">{r.patientName}</span>
                    {r.mrNo && <span className="text-[11px] text-slate-400">{r.mrNo}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {r.diagnosis || 'Issued'}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap">
                  {Icon.clock} {new Date(r.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Referrals ── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Referrals</p>
        <div className="grid gap-4 sm:grid-cols-3">

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-violet-200">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              {Icon.lab}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">Lab Referrals</p>
              <p className="text-2xl font-bold leading-tight tracking-tight text-violet-900">{labRefCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-emerald-200">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              {Icon.pill}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">Pharmacy Referrals</p>
              <p className="text-2xl font-bold leading-tight tracking-tight text-emerald-900">{phRefCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-red-200">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              {Icon.diag}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">Diagnostic Referrals</p>
              <p className="text-2xl font-bold leading-tight tracking-tight text-red-900">{diagRefCount}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
