import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { resolveDoctorMode } from '../../utils/doctorDepartment'
import { getDepartmentModule } from '../../config/departmentModules'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'

type DoctorSession = { id: string; name: string; username: string }

type EncounterRow = {
  _id: string
  type?: string
  status?: string
  visitType?: string
  startAt?: string
  patientId?: { _id?: string; fullName?: string; mrn?: string; gender?: string; age?: string | number; phoneNormalized?: string }
  doctorId?: { _id?: string; name?: string; specialization?: string }
}

type ProgressRow = {
  _id: string
  title: string
  stage?: string
  status?: 'active' | 'completed' | 'on-hold'
  notes?: string
  date?: string
  nextDate?: string
  doctorId?: { name?: string }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-200 text-slate-600',
  'on-hold': 'bg-amber-100 text-amber-700',
}

export default function Doctor_DepartmentQueue() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [deptInfo, setDeptInfo] = useState<{ departmentId?: string; departmentName?: string; specialization?: string; doctorClinicalModule?: string; departmentClinicalModule?: string } | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [statusFilter, setStatusFilter] = useState('')
  const [rows, setRows] = useState<EncounterRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<EncounterRow | null>(null)
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [progressLoading, setProgressLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  // New progress entry form
  const emptyEntry = { title: '', stage: '', status: 'active' as const, notes: '', nextDate: '' }
  const [entry, setEntry] = useState<{ title: string; stage: string; status: 'active' | 'completed' | 'on-hold'; notes: string; nextDate: string }>(emptyEntry)

  const deptMode = useMemo(() => resolveDoctorMode(deptInfo?.departmentName, deptInfo?.specialization, {
    doctorClinicalModule: deptInfo?.doctorClinicalModule,
    departmentClinicalModule: deptInfo?.departmentClinicalModule,
  }), [deptInfo?.departmentName, deptInfo?.specialization, deptInfo?.doctorClinicalModule, deptInfo?.departmentClinicalModule])
  const activeDept = getDepartmentModule(deptMode.departmentKey)

  // Resolve logged-in doctor + department
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      if (raw) setDoc(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!doc?.id) return
      try {
        const res: any = await hospitalApi.getDoctor(doc.id)
        const d = res?.doctor || res
        setDeptInfo({ departmentId: d?.primaryDepartmentId, departmentName: d?.primaryDepartmentName || '', specialization: d?.specialization || '', doctorClinicalModule: d?.clinicalModule || '', departmentClinicalModule: d?.departmentClinicalModule || '' })
      } catch {}
    })()
  }, [doc?.id])

  async function loadQueue() {
    if (!deptInfo?.departmentId) { setRows([]); return }
    setLoading(true)
    try {
      const res: any = await hospitalApi.getDepartmentQueue({ departmentId: deptInfo.departmentId, status: statusFilter || undefined, from, to, limit: 200 })
      setRows(res?.encounters || [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() /* eslint-disable-next-line */ }, [deptInfo?.departmentId, from, to, statusFilter])

  async function selectPatient(row: EncounterRow) {
    setSelected(row)
    setEntry(emptyEntry)
    const mrn = row.patientId?.mrn
    if (!mrn) { setProgress([]); return }
    setProgressLoading(true)
    try {
      const res: any = await hospitalApi.listDepartmentProgress({ patientMrn: mrn, departmentKey: deptMode.departmentKey !== 'general' ? deptMode.departmentKey : undefined })
      setProgress(res?.progress || [])
    } catch {
      setProgress([])
    } finally {
      setProgressLoading(false)
    }
  }

  async function addProgress() {
    if (!selected?.patientId?.mrn) return
    if (!entry.title.trim()) { setToast({ type: 'error', message: 'Enter a progress title' }); return }
    try {
      await hospitalApi.createDepartmentProgress({
        patientMrn: selected.patientId.mrn,
        departmentId: deptInfo?.departmentId,
        departmentKey: deptMode.departmentKey,
        doctorId: doc?.id,
        encounterId: selected._id,
        title: entry.title.trim(),
        stage: entry.stage.trim() || undefined,
        status: entry.status,
        notes: entry.notes.trim() || undefined,
        nextDate: entry.nextDate || undefined,
        createdBy: doc?.name,
      })
      setEntry(emptyEntry)
      setToast({ type: 'success', message: 'Progress entry added' })
      selectPatient(selected)
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to add progress' })
    }
  }

  async function removeProgress(id: string) {
    try {
      await hospitalApi.deleteDepartmentProgress(id)
      setProgress(p => p.filter(x => x._id !== id))
    } catch {}
  }

  const accent = activeDept?.gradient || 'from-sky-500 to-cyan-500'
  const deptLabel = deptInfo?.departmentName || activeDept?.bannerTitle || 'My Department'

  return (
    <div className="p-4 sm:p-6">
      <div className={`mb-5 flex items-center justify-between rounded-2xl bg-linear-to-r ${accent} px-5 py-4 text-white`}>
        <div>
          <div className="text-lg font-bold">{deptLabel}</div>
          <div className="text-[12px] text-white/80">Patient list & treatment progress{activeDept ? ` · ${activeDept.bannerSubtitle}` : ''}</div>
        </div>
        <div className="text-right text-[12px] text-white/90">
          <div className="font-semibold">{rows.length} patient{rows.length === 1 ? '' : 's'}</div>
          <div>{from === to ? from : `${from} → ${to}`}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-500">From
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-500">To
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-500">Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <button onClick={loadQueue} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Refresh</button>
      </div>

      {!deptInfo?.departmentId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No primary department is set for your profile, so the department queue cannot be loaded.</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Queue table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Patient</th>
                <th className="px-3 py-2 text-left">MR #</th>
                <th className="px-3 py-2 text-left">Doctor</th>
                <th className="px-3 py-2 text-left">Visit</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No patients in this range.</td></tr>}
              {rows.map(r => (
                <tr key={r._id} onClick={() => selectPatient(r)} className={`cursor-pointer transition hover:bg-sky-50/60 ${selected?._id === r._id ? 'bg-sky-50' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-800">{r.patientId?.fullName || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{r.patientId?.mrn || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{r.doctorId?.name || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{r.visitType || r.type || '-'}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{r.status || '-'}</span></td>
                  <td className="px-3 py-2 text-slate-500">{r.startAt ? new Date(r.startAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail / progress / interlinking */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!selected && <div className="py-10 text-center text-sm text-slate-400">Select a patient to view progress and linked records.</div>}
          {selected && (
            <div className="space-y-4">
              <div>
                <div className="text-base font-bold text-slate-800">{selected.patientId?.fullName || '-'}</div>
                <div className="text-xs text-slate-500">MR # {selected.patientId?.mrn || '-'} · {selected.patientId?.gender || '-'} · {selected.patientId?.age ?? '-'}</div>
              </div>

              {/* Interlinking quick actions (Task 6 surface) */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Linked Records</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link to={`/doctor/prescription-history?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Prescriptions</Link>
                  <Link to={`/doctor/patient-search?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Patient Search</Link>
                  <Link to={`/lab/orders?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Lab Orders</Link>
                  <Link to={`/diagnostic/orders?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Diagnostics</Link>
                  <Link to={`/pharmacy/customers?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Pharmacy</Link>
                  <Link to={`/doctor/referrals?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600">Referrals</Link>
                  {/* Surgical departments get OT + IPD shortcuts */}
                  {(deptMode.departmentKey === 'omfs' || deptMode.departmentKey === 'breast-onco') && (
                    <>
                      <Link to="/hospital/ot" className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 font-medium text-violet-600 hover:border-violet-400">OT Schedule</Link>
                      <Link to={`/doctor/ipd-patients?mrn=${encodeURIComponent(selected.patientId?.mrn || '')}`} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 font-medium text-violet-600 hover:border-violet-400">IPD / Admission</Link>
                    </>
                  )}
                </div>
              </div>

              {/* Progress timeline */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Treatment Progress</div>
                {progressLoading && <div className="text-xs text-slate-400">Loading…</div>}
                {!progressLoading && progress.length === 0 && <div className="text-xs text-slate-400">No progress entries yet.</div>}
                <div className="space-y-2">
                  {progress.map(p => (
                    <div key={p._id} className="rounded-lg border border-slate-200 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{p.title} {p.stage && <span className="text-xs font-normal text-slate-500">· {p.stage}</span>}</div>
                          {p.notes && <div className="mt-0.5 text-xs text-slate-600">{p.notes}</div>}
                          <div className="mt-1 text-[11px] text-slate-400">{p.date ? new Date(p.date).toLocaleDateString() : ''}{p.nextDate ? ` · next ${new Date(p.nextDate).toLocaleDateString()}` : ''}{p.doctorId?.name ? ` · ${p.doctorId.name}` : ''}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[p.status || 'active']}`}>{p.status || 'active'}</span>
                          <button onClick={() => removeProgress(p._id)} className="rounded p-1 text-slate-300 hover:text-rose-500" title="Delete">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add progress */}
              <div className="rounded-xl border border-dashed border-slate-300 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Add Progress Entry</div>
                <div className="space-y-2">
                  <input type="text" value={entry.title} onChange={e => setEntry({ ...entry, title: e.target.value })} placeholder="Title (e.g. Chemo cycle 2/6, Post-op day 3)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={entry.stage} onChange={e => setEntry({ ...entry, stage: e.target.value })} placeholder="Stage" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <select value={entry.status} onChange={e => setEntry({ ...entry, status: e.target.value as any })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On hold</option>
                    </select>
                  </div>
                  <textarea rows={2} value={entry.notes} onChange={e => setEntry({ ...entry, notes: e.target.value })} placeholder="Notes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <label className="block text-[11px] font-semibold text-slate-500">Next visit
                    <input type="date" value={entry.nextDate} onChange={e => setEntry({ ...entry, nextDate: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                  <button onClick={addProgress} className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">Add Entry</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
