import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { otApi } from '../../../features/hospital/ot'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, BarChart3, FileText, Calendar, Users, Clock, Printer } from 'lucide-react'
import { fmtDateTime12 } from '../../../utils/timeFormat'

function escHtml(v: any){ return String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]||c) }

type Statistics = {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
  emergency: number
  availableRooms: number
  occupiedRooms: number
  totalRooms: number
}

type Surgery = {
  _id: string
  procedure: string
  status: string
  priority: string
  scheduledAt?: string
  patientId?: { _id: string; name: string }
  surgeonId?: { _id: string; name: string }
  roomId?: { _id: string; name: string }
}

export default function OT_Reports() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Statistics | null>(null)
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const params: any = {}
      if (dateRange.from) params.from = dateRange.from
      if (dateRange.to) params.to = dateRange.to

      const [statsRes, surgRes] = await Promise.all([
        otApi.getOTStatistics(params) as any,
        otApi.getOTSurgeryReport(params) as any,
      ])
      setStats(statsRes)
      setSurgeries(surgRes?.surgeries || [])
    } catch {}
    setLoading(false)
  }

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    load()
  }

  async function exportPdf() {
    if (!stats) return
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const hospital = {
      name: s?.settings?.name || s?.name || 'Hospital',
      address: s?.settings?.address || s?.address || '',
      phone: s?.settings?.phone || s?.phone || '',
      logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl || '',
    }
    const printedAt = fmtDateTime12(new Date().toISOString())
    const filterText = `Date Range: ${dateRange.from || 'All'} to ${dateRange.to || 'All'}`

    const statsRows = [
      ['Total Surgeries', String(stats.total)],
      ['Scheduled', String(stats.scheduled)],
      ['In Progress', String(stats.inProgress)],
      ['Completed', String(stats.completed)],
      ['Cancelled', String(stats.cancelled)],
      ['Emergency', String(stats.emergency)],
      ['Available Rooms', String(stats.availableRooms)],
      ['Occupied Rooms', String(stats.occupiedRooms)],
      ['Total Rooms', String(stats.totalRooms)],
    ]

    const surgeryRows = surgeries.map((surg, idx) => `<tr>
      <td>${idx+1}</td>
      <td>${escHtml(surg.procedure)}</td>
      <td>${escHtml(surg.patientId?.name || '-')}</td>
      <td>${escHtml(surg.surgeonId?.name || '-')}</td>
      <td>${escHtml(surg.roomId?.name || '-')}</td>
      <td><span style="text-transform:capitalize">${escHtml(surg.status)}</span></td>
      <td><span style="text-transform:capitalize">${escHtml(surg.priority)}</span></td>
      <td>${escHtml(surg.scheduledAt ? new Date(surg.scheduledAt).toLocaleString() : '-')}</td>
    </tr>`).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>OT Report</title>
      <style>
        @page { size: A4 landscape; margin: 10mm }
        body{ font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial; color:#0f172a; font-size:11px; line-height:1.4 }
        .wrap{ max-width:280mm; margin:0 auto }
        .header{ border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px }
        .hdr{ display:grid; grid-template-columns: 70px 1fr 70px; align-items:center; gap:10px }
        .logo{ width:60px; height:60px; object-fit:contain }
        .hname{ font-size:16px; font-weight:800; text-align:center }
        .hmeta{ font-size:11px; text-align:center; color:#475569 }
        .title{ margin-top:8px; font-size:14px; font-weight:800 }
        .meta{ margin-top:4px; display:flex; justify-content:space-between; gap:12px; color:#334155 }
        .stats{ display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin:10px 0 }
        .stat-box{ border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center }
        .stat-label{ font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700 }
        .stat-value{ font-size:18px; font-weight:800; margin-top:4px }
        table{ width:100%; border-collapse:collapse; table-layout:fixed }
        th,td{ border:1px solid #e2e8f0; padding:6px 6px; vertical-align:top; word-wrap:break-word }
        th{ background:#f8fafc; font-weight:800; color:#334155 }
        .footer{ margin-top:10px; color:#94a3b8; font-size:10px; text-align:center }
      </style></head><body>
      <div class="wrap">
        <div class="header">
          <div class="hdr">
            ${hospital.logoDataUrl ? `<img src="${escHtml(hospital.logoDataUrl)}" class="logo" alt="logo"/>` : '<div></div>'}
            <div>
              <div class="hname">${escHtml(hospital.name)}</div>
              <div class="hmeta">${escHtml(hospital.address)} ${hospital.phone ? `| Tel: ${escHtml(hospital.phone)}` : ''}</div>
            </div>
            <div></div>
          </div>
          <div class="title">OT Report</div>
          <div class="meta"><div><b>Filters:</b> ${escHtml(filterText)}</div><div><b>Printed:</b> ${escHtml(printedAt)}</div></div>
        </div>
        <div class="stats">
          ${statsRows.map(([label, val]) => `<div class="stat-box"><div class="stat-label">${escHtml(label)}</div><div class="stat-value">${escHtml(val)}</div></div>`).join('')}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Procedure</th>
              <th>Patient</th>
              <th>Surgeon</th>
              <th>Room</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>${surgeryRows || '<tr><td colspan="8" style="text-align:center;color:#64748b">No surgery records</td></tr>'}</tbody>
        </table>
        <div class="footer">System Generated Report &bull; ${escHtml(hospital.name)}</div>
      </div>
    </body></html>`

    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      await api.printPreviewHtml(html, { printBackground: true, marginsType: 0 })
    } else {
      const w = window.open('', 'print', 'width=1100,height=750')
      if (!w) return
      w.document.write(html + '<script>window.onload=()=>{window.print();}</script>')
      w.document.close()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">OT Reports</h1>
        <button
          onClick={exportPdf}
          disabled={!stats || loading}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      {/* Date Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={handleFilter} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Apply Filter
          </button>
        </form>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Total Surgeries</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-blue-500">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Scheduled</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{stats.inProgress}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-green-500">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-red-500">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Cancelled</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-red-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Emergency</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-700">{stats.emergency}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-green-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">Available Rooms</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.availableRooms}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">Occupied Rooms</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{stats.occupiedRooms}</div>
          </div>
        </div>
      )}

      {/* Surgery List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Surgery Records</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : surgeries.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No surgery records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Procedure</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Surgeon</th>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Priority</th>
                  <th className="px-3 py-2 text-left">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {surgeries.map((s) => (
                  <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{s.procedure}</td>
                    <td className="px-3 py-2">{s.patientId?.name || '-'}</td>
                    <td className="px-3 py-2">{s.surgeonId?.name || '-'}</td>
                    <td className="px-3 py-2">{s.roomId?.name || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700' :
                        s.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                        s.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        s.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                        s.priority === 'urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {s.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
