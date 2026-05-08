import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import { getLocalDate } from '../../utils/date'
import Store_ConfirmDialog from '../../components/hospital/Store_ConfirmDialog'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { Activity, HeartPulse, RefreshCw, Siren, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type EmergencyStatus = 'active' | 'admitted' | 'discharged'

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

type EmergencyRow = {
  id: string
  tokenNo: string
  time: string
  mrn: string
  patientName: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  status: EmergencyStatus
  triage?: 'red'|'yellow'|'green'
  arrivalMode?: string
  encounterId?: string
  bedLabel?: string
  bedLocation?: BedLocation
}

function Badge({ tone, children }: { tone: 'slate'|'amber'|'emerald'|'rose'|'violet'; children: React.ReactNode }){
  const map: Record<string,string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

export default function Hospital_EmergencyQueue(){
  const navigate = useNavigate()
  const [rows, setRows] = useState<EmergencyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All'|EmergencyStatus>('All')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRow, setConfirmRow] = useState<EmergencyRow | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [from, setFrom] = useState(() => getLocalDate())
  const [to, setTo] = useState(() => getLocalDate())
  const [dashData, setDashData] = useState<{
    active: number; admitted: number; discharged: number
    triageRed: number; triageYellow: number; triageGreen: number
    walkIn: number; ambulance: number; referral: number
    hourly: Array<{ hour: string; count: number }>
  }>({ active: 0, admitted: 0, discharged: 0, triageRed: 0, triageYellow: 0, triageGreen: 0, walkIn: 0, ambulance: 0, referral: 0, hourly: [] })

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try{
        const deps: any = await hospitalApi.listDepartments() as any
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        const departmentId = er?._id || er?.id
        if (!departmentId){
          if (!cancelled) setRows([])
          return
        }
        const res: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'queued', from, to })
        const res2: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'in-progress', from, to })
        const toks: any[] = [...(res?.tokens || []), ...(res2?.tokens || [])]
        const mapped: EmergencyRow[] = toks.map((t: any) => {
          const p = t.patientId || {}
          const docName = t.doctorId?.name || t.doctorId?.fullName || t.doctorId?.username || ''
          const when = t.createdAt ? new Date(t.createdAt) : null
          const time = when ? fmt12(`${String(when.getHours()).padStart(2,'0')}:${String(when.getMinutes()).padStart(2,'0')}`) : ''
          const st: EmergencyStatus = (t.status === 'queued' || t.status === 'in-progress') ? 'active' : (t.status === 'completed' ? 'discharged' : 'active')
          const enc = t.encounterId || t.encounter || {}
          return {
            id: String(t._id || t.id),
            tokenNo: String(t.tokenNo || ''),
            time,
            mrn: String(p.mrn || t.mrn || ''),
            patientName: String(p.fullName || t.patientName || ''),
            age: String(p.age || ''),
            gender: String(p.gender || ''),
            phone: String(p.phoneNormalized || ''),
            doctor: docName ? String(docName) : undefined,
            status: st,
            triage: enc.triage || t.triage || undefined,
            arrivalMode: enc.arrivalMode || t.arrivalMode || undefined,
            encounterId: t.encounterId?._id || t.encounterId || undefined,
            bedLabel: enc.bedLabel || t.bedLabel || t.bed?.label || '-',
            bedLocation: enc.bedLocation || t.bedLocation || undefined,
          }
        })
        if (!cancelled) setRows(mapped)
        // Dashboard analytics from mapped rows
        if (!cancelled) {
          const active = mapped.filter(r => r.status === 'active').length
          const admitted = mapped.filter(r => r.status === 'admitted').length
          const discharged = mapped.filter(r => r.status === 'discharged').length
          const triageRed = mapped.filter(r => r.triage === 'red').length
          const triageYellow = mapped.filter(r => r.triage === 'yellow').length
          const triageGreen = mapped.filter(r => r.triage === 'green').length
          const walkIn = mapped.filter(r => (r.arrivalMode || '').toLowerCase() === 'walk-in').length
          const ambulance = mapped.filter(r => (r.arrivalMode || '').toLowerCase() === 'ambulance').length
          const referral = mapped.filter(r => (r.arrivalMode || '').toLowerCase() === 'referral').length
          // Hourly distribution
          const hourMap: Record<number, number> = {}
          for (let h = 0; h < 24; h++) hourMap[h] = 0
          for (const r of mapped) {
            if (!r.time) continue
            const parts = r.time.match(/(\d{1,2}):(\d{2})/)
            if (!parts) continue
            let hr = parseInt(parts[1], 10)
            if (r.time.toLowerCase().includes('pm') && hr !== 12) hr += 12
            if (r.time.toLowerCase().includes('am') && hr === 12) hr = 0
            hourMap[hr] = (hourMap[hr] || 0) + 1
          }
          const hourly = Object.entries(hourMap).map(([h, c]) => ({
            hour: `${String(Number(h) % 12 || 12)}${Number(h) < 12 ? 'a' : 'p'}`,
            count: c,
          }))
          setDashData({ active, admitted, discharged, triageRed, triageYellow, triageGreen, walkIn, ambulance, referral, hourly })
        }
      }catch{
        if (!cancelled) setRows([])
      }finally{
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [from, to])

  function formatBedLocation(bedLoc?: BedLocation) {
    if (!bedLoc) return '-'
    return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
  }

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== 'All' && r.status !== status) return false
      if (!qq) return true
      const hay = [r.tokenNo, r.mrn, r.patientName, r.phone, r.time, r.gender, r.status, r.triage, r.arrivalMode, formatBedLocation(r.bedLocation)].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [q, rows, status])

  const openChart = (r: EmergencyRow) => {
    navigate(`/hospital/emergency/${encodeURIComponent(r.id)}`)
  }

  const handleDischarge = (r: EmergencyRow) => {
    setConfirmRow(r)
    setConfirmOpen(true)
  }

  const onConfirmDischarge = async () => {
    if (!confirmRow) return
    if (!confirmRow.encounterId) {
      setToast({ type: 'error', message: 'No encounter found for this token' })
      setConfirmOpen(false)
      setConfirmRow(null)
      return
    }
    setConfirmOpen(false)
    try {
      await hospitalApi.dischargeER(confirmRow.encounterId, { disposition: 'discharged' })
      setRows(prev => prev.map(row => row.id === confirmRow.id ? { ...row, status: 'discharged' } : row))
      setToast({ type: 'success', message: 'Patient discharged successfully' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to discharge' })
    } finally {
      setConfirmRow(null)
    }
  }

  const onCancelDischarge = () => {
    setConfirmOpen(false)
    setConfirmRow(null)
  }

  const triageTone = (t?: EmergencyRow['triage']) => {
    if (t === 'red') return 'rose'
    if (t === 'yellow') return 'amber'
    if (t === 'green') return 'emerald'
    return 'slate'
  }

  const statusTone = (s: EmergencyRow['status']) => {
    if (s === 'active') return 'violet'
    if (s === 'admitted') return 'amber'
    return 'emerald'
  }

  const triageChart = useMemo(() => [
    { name: 'Red', value: dashData.triageRed, fill: '#ef4444' },
    { name: 'Yellow', value: dashData.triageYellow, fill: '#f59e0b' },
    { name: 'Green', value: dashData.triageGreen, fill: '#10b981' },
  ].filter(d => d.value > 0), [dashData])

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-rose-600 via-red-500 to-orange-500 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Emergency Department</h1>
            <p className="mt-1 text-sm/6 opacity-90">Real-time patient queue, triage analytics & activity monitoring.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.reload()} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/15">
               <RefreshCw className="h-4 w-4" />
            </button>
            <Siren className="hidden h-10 w-10 opacity-20 sm:block" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</div>
              <div className="mt-0.5 text-xl font-bold text-violet-700">{dashData.active}</div>
            </div>
            <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 ring-1 ring-violet-100"><Activity className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admitted</div>
              <div className="mt-0.5 text-xl font-bold text-amber-700">{dashData.admitted}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 ring-1 ring-amber-100"><Users className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Discharged</div>
              <div className="mt-0.5 text-xl font-bold text-emerald-700">{dashData.discharged}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100"><HeartPulse className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Red</div>
              <div className="mt-0.5 text-xl font-bold text-rose-700">{dashData.triageRed}</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 ring-1 ring-rose-100"><Siren className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Yellow</div>
              <div className="mt-0.5 text-xl font-bold text-amber-700">{dashData.triageYellow}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 ring-1 ring-amber-100"><Activity className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Green</div>
              <div className="mt-0.5 text-xl font-bold text-emerald-700">{dashData.triageGreen}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100"><HeartPulse className="h-4 w-4" /></div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Triage Breakdown</div>
          <div className="text-[10px] text-slate-500">Patient severity distribution</div>
          {triageChart.length === 0 ? (
            <div className="mt-4 flex h-[180px] items-center justify-center text-xs text-slate-400">No triage data</div>
          ) : (
            <div className="mt-2 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={triageChart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {triageChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Red</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Yellow</div>
            <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Green</div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Hourly Arrivals</div>
          <div className="text-[10px] text-slate-500">Patient distribution by hour of day</div>
          <div className="mt-2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashData.hourly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">Patient Queue</div>
          <div className="text-xs text-slate-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
          />
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search by token#, MR#, patient, phone..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
          />
          <select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm">
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
          </select>
          <div className="flex items-center justify-end text-xs text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Time</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Token</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Triage</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Arrival Mode</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Bed</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Status</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{r.time}</td>
                  <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                  <td className="px-4 py-2">{r.mrn}</td>
                  <td className="px-4 py-2">{r.patientName}</td>
                  <td className="px-4 py-2">
                    <Badge tone={triageTone(r.triage) as any}>{String(r.triage || '—').toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2">{r.arrivalMode || '—'}</td>
                  <td className="px-4 py-2">{formatBedLocation(r.bedLocation)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(r.status) as any}>{r.status.toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>openChart(r)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Open</button>
                      {(r.status === 'active' || r.status === 'admitted') && (
                        <button onClick={()=>handleDischarge(r)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">Discharge</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Store_ConfirmDialog
        open={confirmOpen}
        title="Discharge Patient"
        message={confirmRow ? `Are you sure you want to discharge ${confirmRow.patientName}?` : ''}
        onCancel={onCancelDischarge}
        onConfirm={onConfirmDischarge}
        confirmText="Discharge"
        confirmStyle="primary"
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
