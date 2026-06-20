import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

interface Doctor {
  _id: string
  name: string
  phone?: string
  email?: string
  specialization?: string
  commissionPercent?: number
  active?: boolean
}

interface DoctorStat {
  doctorId: string
  doctorName: string
  totalOrders: number
  totalTests: number
  totalRevenue: number
  commissionDue: number
}

interface DetailItem {
  orderId: string
  tokenNo: string
  createdAt: string
  patient: any
  tests: Array<{ testId: string; testName: string; price: number }>
  revenue: number
  status: string
}

export default function Lab_DoctorRevenue() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [stats, setStats] = useState<DoctorStat[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  // Doctor management
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSpecialization, setFormSpecialization] = useState('')
  const [formCommission, setFormCommission] = useState('0')
  const [formActive, setFormActive] = useState(true)

  // Detail modal
  const [detailDoctor, setDetailDoctor] = useState<Doctor | null>(null)
  const [detailItems, setDetailItems] = useState<DetailItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTotalRevenue, setDetailTotalRevenue] = useState(0)
  const [detailCommission, setDetailCommission] = useState(0)
  const [detailTotalOrders, setDetailTotalOrders] = useState(0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [dRes, sRes] = await Promise.all([
        labApi.listDoctors(),
        labApi.getDoctorStats({ from: from || undefined, to: to || undefined })
      ])
      setDoctors((dRes.items || []).map((x: any) => ({ _id: x._id, name: x.name, phone: x.phone, email: x.email, specialization: x.specialization, commissionPercent: x.commissionPercent, active: x.active })))
      setStats(sRes.items || [])
    } catch (e: any) {
      setNotice(e?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [from, to])

  const today = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  const openDetail = async (doctor: Doctor) => {
    setDetailDoctor(doctor)
    setDetailLoading(true)
    try {
      const res: any = await labApi.getDoctorDetailStats(doctor._id, { from: from || undefined, to: to || undefined })
      setDetailItems(res.detail || [])
      setDetailTotalRevenue(res.totalRevenue || 0)
      setDetailCommission(res.commissionDue || 0)
      setDetailTotalOrders(res.totalOrders || 0)
    } catch (e: any) {
      setNotice(e?.message || 'Failed to load detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const openForm = (doctor?: Doctor) => {
    if (doctor) {
      setEditingId(doctor._id)
      setFormName(doctor.name || '')
      setFormPhone(doctor.phone || '')
      setFormEmail(doctor.email || '')
      setFormSpecialization(doctor.specialization || '')
      setFormCommission(String(doctor.commissionPercent || 0))
      setFormActive(doctor.active !== false)
    } else {
      setEditingId('')
      setFormName('')
      setFormPhone('')
      setFormEmail('')
      setFormSpecialization('')
      setFormCommission('0')
      setFormActive(true)
    }
    setShowForm(true)
  }

  const saveDoctor = async () => {
    if (!formName.trim()) {
      setNotice('Doctor name is required')
      return
    }
    const data = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      specialization: formSpecialization.trim(),
      commissionPercent: Number(formCommission) || 0,
      active: formActive,
    }
    try {
      if (editingId) {
        await labApi.updateDoctor(editingId, data)
        setNotice('Doctor updated')
      } else {
        await labApi.createDoctor(data)
        setNotice('Doctor created')
      }
      setShowForm(false)
      loadData()
      setTimeout(() => setNotice(''), 2000)
    } catch (e: any) {
      setNotice(e?.message || 'Failed to save doctor')
    }
  }

  const removeDoctor = async (id: string) => {
    if (!window.confirm('Delete this doctor?')) return
    try {
      await labApi.deleteDoctor(id)
      setNotice('Doctor deleted')
      loadData()
      setTimeout(() => setNotice(''), 2000)
    } catch (e: any) {
      setNotice(e?.message || 'Failed to delete doctor')
    }
  }

  const statMap = useMemo(() => {
    const m = new Map<string, DoctorStat>()
    for (const s of stats) m.set(s.doctorId, s)
    return m
  }, [stats])

  const grandTotalRevenue = stats.reduce((s, x) => s + x.totalRevenue, 0)
  const grandTotalCommission = stats.reduce((s, x) => s + x.commissionDue, 0)
  const grandTotalOrders = stats.reduce((s, x) => s + x.totalOrders, 0)
  const grandTotalTests = stats.reduce((s, x) => s + x.totalTests, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.64 1.709a.75.75 0 1 0 1.48-.244c-.37-2.135-2.452-3.827-4.76-3.152-1.736.518-2.923 2.06-3.18 3.903a.75.75 0 0 0 1.48.244c.17-1.256.93-2.332 2.04-2.764.404-.148.797-.19 1.14-.096Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Doctor Referral Revenue</h2>
      </div>

      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">To</label>
          <input type="date" value={to} max={today} onChange={e => setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={() => { setFrom(''); setTo('') }} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Reset</button>
        <button onClick={() => openForm()} className="ml-auto rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">+ Add Doctor</button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Orders</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{grandTotalOrders.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tests</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{grandTotalTests.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">Rs. {grandTotalRevenue.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Commission</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">Rs. {grandTotalCommission.toLocaleString()}</div>
        </div>
      </div>

      {/* Doctors table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Doctors</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Doctor</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Commission %</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">Orders</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">Tests</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">Revenue</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-600">Commission</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              )}
              {!loading && doctors.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No doctors found. Add a doctor to get started.</td></tr>
              )}
              {!loading && doctors.map(d => {
                const s = statMap.get(d._id)
                return (
                  <tr key={d._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-800">{d.name}</div>
                      {d.specialization && <div className="text-xs text-slate-500">{d.specialization}</div>}
                      {!d.active && <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Inactive</span>}
                    </td>
                    <td className="px-4 py-2">{d.commissionPercent || 0}%</td>
                    <td className="px-4 py-2 text-right">{s ? s.totalOrders : 0}</td>
                    <td className="px-4 py-2 text-right">{s ? s.totalTests : 0}</td>
                    <td className="px-4 py-2 text-right font-medium">Rs. {(s ? s.totalRevenue : 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium text-rose-700">Rs. {(s ? s.commissionDue : 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openDetail(d)} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Detail</button>
                        <button onClick={() => openForm(d)} className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Edit</button>
                        <button onClick={() => removeDoctor(d._id)} className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Doctor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">
              {editingId ? 'Edit Doctor' : 'Add Doctor'}
            </div>
            <div className="space-y-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Name *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Commission %</label>
                  <input type="number" min={0} max={100} value={formCommission} onChange={e => setFormCommission(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Phone</label>
                  <input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Email</label>
                  <input value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Specialization</label>
                <input value={formSpecialization} onChange={e => setFormSpecialization(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input id="formActive" type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                <label htmlFor="formActive" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={saveDoctor} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailDoctor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">{detailDoctor.name} — Referral Detail</div>
                <button onClick={() => setDetailDoctor(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Orders</div>
                  <div className="mt-1 text-lg font-bold text-slate-800">{detailTotalOrders.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</div>
                  <div className="mt-1 text-lg font-bold text-slate-800">Rs. {detailTotalRevenue.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Commission Due</div>
                  <div className="mt-1 text-lg font-bold text-rose-700">Rs. {detailCommission.toLocaleString()}</div>
                </div>
              </div>

              {detailLoading && <div className="py-8 text-center text-slate-500">Loading...</div>}

              {!detailLoading && detailItems.length === 0 && (
                <div className="py-8 text-center text-slate-500">No referral orders found for this doctor in the selected date range.</div>
              )}

              {!detailLoading && detailItems.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Token</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Patient</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Tests</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 font-mono text-slate-800">{item.tokenNo || '-'}</td>
                          <td className="px-3 py-2 text-slate-800">{item.patient?.fullName || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {item.tests.map((t, i) => (
                                <span key={i} className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{t.testName}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">Rs. {item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
