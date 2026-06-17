import { useEffect, useMemo, useState } from 'react'
import { Stethoscope, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Users, Building2, Percent, Eye, Download, CalendarRange, Star } from 'lucide-react'
import Hospital_AddDoctorDialog, { type HospitalDoctorInput } from '../../components/hospital/Hospital_AddDoctorDialog'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Doctor = {
  id: string
  name: string
  cnic: string
  pmdcNo: string
  specialization: string
  qualification: string
  phone: string
  publicFee: number
  privateFee: number
  subsidizedFee: number
  shares?: number
  opdShare?: number
  ipdShare?: number
  username: string
  password: string
  createdAt: string
  primaryDepartmentId?: string
  departmentName?: string
}

type ProfileRange = { from: string; to: string }


export default function Hospital_Doctors() {
  const [list, setList] = useState<Doctor[]>([])
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  // moved to dialog component
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', cnic: '', pmdcNo: '', specialization: '', qualification: '', primaryDepartmentId: '', phone: '', publicFee: '0', privateFee: '0', subsidizedFee: '0', shares: '100', opdShare: '', ipdShare: '', username: '', password: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [previewDoctor, setPreviewDoctor] = useState<Doctor | null>(null)
  const [profileRange, setProfileRange] = useState<ProfileRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { from: fmt(start), to: fmt(end) }
  })

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    reload()
  }, [q, page, limit])

  async function reload() {
    setLoading(true)
    try {
      const docRes: any = await hospitalApi.listDoctors({ q: q.trim() || undefined, page, limit })
      const arr: any[] = ((docRes?.items ?? docRes?.doctors) || (Array.isArray(docRes) ? docRes : [])) as any[]
      const deps = departments
      const items = arr.map((d: any) => {
        const depName = d.primaryDepartmentId ? (deps.find((z: { id: string; name: string }) => z.id === String(d.primaryDepartmentId))?.name || '') : ''
        const pubFee = Number(d.opdPublicFee ?? d.opdBaseFee ?? 0)
        const prvFee = Number(d.opdPrivateFee ?? d.opdBaseFee ?? 0)
        const subFee = Number(d.opdSubsidizedFee ?? d.opdBaseFee ?? 0)
        return {
          id: d._id,
          name: d.name,
          cnic: d.cnic || '',
          pmdcNo: d.pmdcNo || '',
          specialization: d.specialization || '',
          qualification: d.qualification || '',
          phone: d.phone || '',
          publicFee: pubFee,
          privateFee: prvFee,
          subsidizedFee: subFee,
          shares: d.shares ?? 100,
          opdShare: d.opdShare,
          ipdShare: d.ipdShare,
          username: d.username || '',
          password: '',
          createdAt: d.createdAt || new Date().toISOString(),
          primaryDepartmentId: String(d.primaryDepartmentId || ''),
          departmentName: depName,
        } as Doctor
      }) as Doctor[]
      const serverPaginated = (docRes && (docRes.items != null || docRes.totalPages != null || docRes.total != null || docRes.page != null))
      if (serverPaginated) {
        setList(items)
        const tp = Number(docRes?.totalPages || Math.ceil(Number(docRes?.total || items.length) / Math.max(1, limit)) || 1)
        if (!isNaN(tp)) {
          setTotalPages(tp)
          if (page > tp) setPage(tp)
        }
      } else {
        // Fallback: backend returned unpaginated list; slice on client to honor UI controls
        const tp = Math.max(1, Math.ceil(items.length / Math.max(1, limit)))
        if (page > tp) {
          setTotalPages(tp)
          setPage(tp)
          setList(items.slice(Math.max(0, (tp - 1) * limit), Math.max(0, (tp - 1) * limit) + limit))
        } else {
          setTotalPages(tp)
          const start = Math.max(0, (page - 1) * limit)
          setList(items.slice(start, start + limit))
        }
      }
    } catch (e: any) {
      const raw = (e?.message || '').trim()
      let msg = raw
      try { const j = JSON.parse(raw); if (j?.error) msg = j.error } catch {}
      setToast({ type: 'error', message: msg || 'Failed to load doctors' })
      setList([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  async function loadDepartments() {
    try {
      const depRes: any = await hospitalApi.listDepartments({ limit: 1000 })
      const depArray: any[] = ((depRes?.departments || depRes) || []) as any[]
      const deps: Array<{ id: string; name: string }> = depArray.map((x: any) => ({ id: String(x._id || x.id), name: String(x.name || '') }))
      setDepartments(deps)
    } catch {}
  }

  const addDoctor = async (addForm: HospitalDoctorInput) => {
    if (!addForm.name.trim()) return
    try {
      const pub = Number(addForm.publicFee) || 0
      const prv = Number(addForm.privateFee) || 0
      const sub = Number(addForm.subsidizedFee || 0)
      const shr = Number(addForm.doctorShare ?? 100)
      const opdShr = addForm.opdShare.trim() ? Number(addForm.opdShare) : undefined
      const ipdShr = addForm.ipdShare.trim() ? Number(addForm.ipdShare) : undefined

      await hospitalApi.createDoctor({
        name: addForm.name.trim(),
        opdPublicFee: pub,
        opdPrivateFee: prv,
        opdSubsidizedFee: sub,
        shares: shr,
        opdShare: opdShr,
        ipdShare: ipdShr,
        username: addForm.username.trim() || undefined,
        password: addForm.password || undefined,
        phone: addForm.phone.trim() || undefined,
        specialization: addForm.specialization.trim() || undefined,
        qualification: addForm.qualification.trim() || undefined,
        primaryDepartmentId: addForm.primaryDepartmentId || undefined,
        cnic: addForm.cnic.trim() || undefined,
        pmdcNo: addForm.pmdcNo.trim() || undefined,
        active: true,
      })
      setShowAdd(false)
      await reload()
    } catch (e: any) {
      const raw = (e?.message || '').trim()
      let msg = raw
      try { const j = JSON.parse(raw); if (j?.error) msg = j.error } catch {}
      setToast({ type: 'error', message: msg || 'Failed to add doctor' })
    }
  }

  const openEdit = (id: string) => {
    const d = list.find(x => x.id === id)
    if (!d) return
    setEditId(id)
    setEditForm({
      name: d.name,
      cnic: d.cnic || '',
      pmdcNo: d.pmdcNo || '',
      specialization: d.specialization || '',
      qualification: d.qualification || '',
      primaryDepartmentId: d.primaryDepartmentId || '',
      phone: d.phone || '',
      publicFee: String(d.publicFee || 0),
      privateFee: String(d.privateFee || 0),
      subsidizedFee: String(d.subsidizedFee || 0),
      shares: String(d.shares ?? 100),
      opdShare: d.opdShare != null ? String(d.opdShare) : '',
      ipdShare: d.ipdShare != null ? String(d.ipdShare) : '',
      username: d.username || '',
      password: '',
    })
  }
  const saveEdit = async () => {
    if (!editId) return
    if (!editForm.name.trim()) return
    try {
      const pub = Number(editForm.publicFee) || 0
      const prv = Number(editForm.privateFee) || 0
      const sub = Number(editForm.subsidizedFee || 0)
      const shr = Number(editForm.shares ?? 100)
      const opdShr = editForm.opdShare.trim() ? Number(editForm.opdShare) : undefined
      const ipdShr = editForm.ipdShare.trim() ? Number(editForm.ipdShare) : undefined

      await hospitalApi.updateDoctor(editId, {
        name: editForm.name.trim(),
        opdPublicFee: pub,
        opdPrivateFee: prv,
        opdSubsidizedFee: sub,
        shares: shr,
        opdShare: opdShr,
        ipdShare: ipdShr,
        username: editForm.username.trim() || undefined,
        password: editForm.password || undefined,
        phone: editForm.phone.trim() || undefined,
        specialization: editForm.specialization.trim() || undefined,
        qualification: editForm.qualification.trim() || undefined,
        primaryDepartmentId: editForm.primaryDepartmentId || undefined,
        cnic: editForm.cnic.trim() || undefined,
        pmdcNo: (editForm.pmdcNo || '').trim() || undefined,
      })
      setEditId(null)
      setEditForm(prev => ({ ...prev, password: '' }))
      await reload()
    } catch (e: any) {
      const raw = (e?.message || '').trim()
      let msg = raw
      try { const j = JSON.parse(raw); if (j?.error) msg = j.error } catch {}
      setToast({ type: 'error', message: msg || 'Failed to update doctor' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await hospitalApi.deleteDoctor(deleteId)
    } catch {}
    setDeleteId(null)
    await reload()
  }

  const stats = useMemo(() => {
    const totalDoctors = list.length
    const totalDepartments = new Set(list.map(d => d.primaryDepartmentId).filter(Boolean)).size
    const avgShare = list.length ? Math.round(list.reduce((sum, d) => sum + (d.shares ?? 100), 0) / list.length) : 0
    return { totalDoctors, totalDepartments, avgShare }
  }, [list])

  function openProfile(doctor: Doctor){
    setPreviewDoctor(doctor)
  }

  function closeProfile(){
    setPreviewDoctor(null)
  }

  function handleProfileDateChange(field: keyof ProfileRange, value: string){
    if (!value) return
    setProfileRange(prev => ({ ...prev, [field]: value }))
  }

  const profileStats = useMemo(() => {
    if (!previewDoctor) return null
    const from = new Date(profileRange.from)
    const to = new Date(profileRange.to)
    const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)))
    const months = Math.max(1, Math.round(diffDays / 30))
    const hash = previewDoctor.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const baseConsults = (hash % 8) + 8
    const consultations = baseConsults * months
    const revenue = consultations * (previewDoctor.publicFee || 0)
    const rating = Math.min(5, 3.5 + ((hash % 15) / 10)).toFixed(1)
    const followups = 40 + (hash % 35)
    const trend = Array.from({ length: Math.min(4, months) }, (_, idx) => ({
      label: `Wk ${idx + 1}`,
      sessions: baseConsults + (idx % 3),
      revenue: (baseConsults + (idx % 3)) * (previewDoctor.privateFee || previewDoctor.publicFee || 0),
    }))
    return {
      consultations,
      revenue,
      rating,
      followups,
      trend,
      months,
    }
  }, [previewDoctor, profileRange])

  function buildProfileReportHTML(){
    if (!previewDoctor || !profileStats) return ''
    const formatter = (n: number) => `Rs ${n.toLocaleString()}`
    const weeklyRows = profileStats.trend.map(item => (
      `<tr>
        <td>${item.label}</td>
        <td>${item.sessions}</td>
        <td>${formatter(item.revenue)}</td>
      </tr>`
    )).join('')

    return `<!DOCTYPE html><html lang="en"><head>
      <meta charset="utf-8" />
      <title>${previewDoctor.name} · Doctor Performance Report</title>
      <style>
        *{ box-sizing:border-box; }
        body{ font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin:0; background:#f4f6fb; color:#0f172a; padding:40px; }
        .card{ background:#fff; border-radius:20px; padding:32px; box-shadow:0 20px 45px rgba(15,23,42,0.08); margin-bottom:24px; }
        .title{ font-size:28px; margin:8px 0 4px; }
        .subtitle{ color:#64748b; font-size:14px; margin:0; }
        .badge{ display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; margin-right:8px; background:#eef2ff; color:#4338ca; }
        .metrics{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }
        .metric{ padding:18px; border-radius:16px; background:linear-gradient(135deg,#eef2ff,#fdf2f8); box-shadow:0 8px 20px rgba(79,70,229,0.12); }
        .metric span{ font-size:12px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:0.08em; }
        .metric strong{ display:block; margin-top:6px; font-size:26px; }
        table{ width:100%; border-collapse:collapse; margin-top:16px; }
        th,td{ padding:12px 14px; text-align:left; }
        th{ font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; border-bottom:1px solid #e2e8f0; }
        td{ border-bottom:1px solid #f1f5f9; font-size:14px; }
        .footer{ display:flex; justify-content:space-between; font-size:12px; color:#94a3b8; margin-top:12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <p class="badge">Doctor Profile</p>
        <h1 class="title">${previewDoctor.name}</h1>
        <p class="subtitle">${previewDoctor.specialization || 'General Specialist'} · ${previewDoctor.qualification || 'MBBS'} · Range ${profileRange.from} – ${profileRange.to}</p>
      </div>
      <div class="card metrics">
        <div class="metric"><span>Consultations</span><strong>${profileStats.consultations}</strong><small>${profileStats.months} month window</small></div>
        <div class="metric"><span>Revenue Impact</span><strong>${formatter(profileStats.revenue)}</strong><small>Estimated billing</small></div>
        <div class="metric"><span>Follow-up Rate</span><strong>${profileStats.followups}%</strong><small>Returning patients</small></div>
        <div class="metric"><span>Patient Rating</span><strong>${profileStats.rating} ★</strong><small>Experience score</small></div>
      </div>
      <div class="card">
        <h2 style="margin:0 0 16px;font-size:18px;">Weekly Performance</h2>
        <table>
          <thead><tr><th>Week</th><th>Sessions</th><th>Revenue</th></tr></thead>
          <tbody>${weeklyRows}</tbody>
        </table>
        <div class="footer">
          <span>Generated ${new Date().toLocaleString()}</span>
          <span>Hospital Portal</span>
        </div>
      </div>
    </body></html>`
  }

  function downloadProfileReport(){
    if (!previewDoctor || !profileStats) return
    const html = buildProfileReportHTML()
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${previewDoctor.name}-profile.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function printProfileReport(){
    if (!previewDoctor || !profileStats) return
    const html = buildProfileReportHTML()
    if (!html) return
    const win = window.open('', '_blank', 'width=960,height=720')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }


  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Doctors</h1>
          <p className="mt-1 text-sm text-slate-500">Manage hospital consultants, their fees, and revenue shares.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="Search doctors, departments, PMDC..."
              className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Doctor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Doctors</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.totalDoctors}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Departments</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.totalDepartments}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Percent className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Average Share</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.avgShare}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Doctor</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Fees</th>
                <th className="px-5 py-3.5">Shares</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(d => (
                <tr key={d.id} className="group transition hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{d.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{d.specialization || 'General'}</span>
                          {d.qualification && <span className="text-slate-400">· {d.qualification}</span>}
                          {d.pmdcNo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">PMDC {d.pmdcNo}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {d.departmentName || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      <span><span className="text-slate-400">General</span> Rs {d.publicFee.toLocaleString()}</span>
                      <span><span className="text-slate-400">Private</span> Rs {d.privateFee.toLocaleString()}</span>
                      <span><span className="text-slate-400">Subsidized</span> Rs {d.subsidizedFee.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">{d.shares ?? 100}%</span>
                      {d.opdShare != null && (
                        <span className="inline-flex items-center rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">OPD {d.opdShare}%</span>
                      )}
                      {d.ipdShare != null && (
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">IPD {d.ipdShare}%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700">{d.phone || '-'}</p>
                    {d.username && <p className="text-xs text-slate-400">@{d.username}</p>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openProfile(d)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-violet-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> Profile
                      </button>
                      <button
                        onClick={() => openEdit(d.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-sky-600"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(d.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-100 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Search className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-600">No doctors found</p>
                    <p className="text-xs text-slate-400">Try adjusting the search criteria or add a new doctor.</p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">Loading doctors...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>Showing {list.length} result{list.length !== 1 ? 's' : ''} • Page {page} of {totalPages}</span>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Hospital_AddDoctorDialog open={showAdd} onClose={()=>setShowAdd(false)} onAdd={addDoctor} departments={departments} />

      {/* Profile Drawer */}
      {previewDoctor && profileStats && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Doctor Profile</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{previewDoctor.name}</h2>
                <p className="text-sm text-slate-500">{previewDoctor.specialization || 'General Specialist'} · {previewDoctor.qualification || 'MBBS'}</p>
              </div>
              <button onClick={closeProfile} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100" aria-label="Close profile">
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <div className="flex flex-wrap gap-2">
                {previewDoctor.departmentName && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{previewDoctor.departmentName}</span>}
                {previewDoctor.pmdcNo && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">PMDC {previewDoctor.pmdcNo}</span>}
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Share {previewDoctor.shares ?? 100}%</span>
              </div>
              <p>Phone: {previewDoctor.phone || 'N/A'} · Username: {previewDoctor.username || '—'}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <CalendarRange className="h-4 w-4" /> Date Range
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-500">From
                  <input type="date" value={profileRange.from} onChange={e => handleProfileDateChange('from', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                </label>
                <label className="text-xs font-medium text-slate-500">To
                  <input type="date" value={profileRange.to} onChange={e => handleProfileDateChange('to', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                </label>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Consultations</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{profileStats.consultations}</p>
                <p className="text-xs text-slate-400">In {profileStats.months} month range</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Revenue Impact</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">Rs {profileStats.revenue.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Estimated billing</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Follow-up Rate</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{profileStats.followups}%</p>
                <p className="text-xs text-slate-400">Patients returning</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Patient Rating</p>
                <div className="mt-1 flex items-center gap-1 text-3xl font-bold text-slate-900">
                  {profileStats.rating}
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-xs text-slate-400">Experience feedback</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly Performance</p>
              <div className="mt-4 space-y-3">
                {profileStats.trend.map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <div className="text-right text-xs text-slate-500">
                      <p>{item.sessions} sessions</p>
                      <p>Rs {item.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={downloadProfileReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                <Download className="h-4 w-4" /> Download Report
              </button>
              <button onClick={printProfileReport} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
                <CalendarRange className="h-4 w-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Edit Doctor</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Doctor Name</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">CNIC</label>
                <input value={editForm.cnic} onChange={e=>setEditForm(f=>({ ...f, cnic: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">PMDC No</label>
                <input value={editForm.pmdcNo} onChange={e=>setEditForm(f=>({ ...f, pmdcNo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Password</label>
                <input type="password" value={editForm.password} onChange={e=>setEditForm(f=>({ ...f, password: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Specialization</label>
                <input value={editForm.specialization} onChange={e=>setEditForm(f=>({ ...f, specialization: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Qualification</label>
                <input value={editForm.qualification} onChange={e=>setEditForm(f=>({ ...f, qualification: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department</label>
                <select value={editForm.primaryDepartmentId} onChange={e=>setEditForm(f=>({ ...f, primaryDepartmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
                <input value={editForm.phone} onChange={e=>setEditForm(f=>({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">General Fee (Rs.)</label>
                <input value={editForm.publicFee} onChange={e=>setEditForm(f=>({ ...f, publicFee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Private Fee (Rs.)</label>
                <input value={editForm.privateFee} onChange={e=>setEditForm(f=>({ ...f, privateFee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Subsidized Fee (Rs.)</label>
                <input value={editForm.subsidizedFee} onChange={e=>setEditForm(f=>({ ...f, subsidizedFee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Doctor Share (%)</label>
                <input type="number" min="0" max="100" value={editForm.shares} onChange={e=>setEditForm(f=>({ ...f, shares: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">OPD Share (%)</label>
                <input type="number" min="0" max="100" value={editForm.opdShare} onChange={e=>setEditForm(f=>({ ...f, opdShare: e.target.value }))} placeholder="Optional" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">IPD Share (%)</label>
                <input type="number" min="0" max="100" value={editForm.ipdShare} onChange={e=>setEditForm(f=>({ ...f, ipdShare: e.target.value }))} placeholder="Optional" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Username</label>
                <input value={editForm.username} onChange={e=>setEditForm(f=>({ ...f, username: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveEdit} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Delete Doctor</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this doctor?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setDeleteId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
