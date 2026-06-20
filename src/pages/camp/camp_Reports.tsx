import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { hospitalApi } from '../../utils/api'
import { BarChart3, Download, CalendarDays, Printer } from 'lucide-react'
import { fmtDateTime12 } from '../../utils/timeFormat'

function escHtml(v: any){ return String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]||c) }

export default function Camp_Reports() {
  const [stats, setStats] = useState<any>({})
  const [camps, setCamps] = useState<any[]>([])
  const [campId, setCampId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    campApi.getDashboardStats().then(setStats)
    campApi.listCamps({}).then((res: any) => setCamps(res?.items || []))
  }, [])

  const loadReport = async () => {
    const res: any = await campApi.getCampReport({ campId, from, to })
    setReport(res)
  }

  const exportCSV = () => {
    if (!report?.patients) return
    const headers = ['TokenNo', 'Name', 'Age', 'Gender', 'Complaint', 'Diagnosis', 'ConsultedBy', 'Prescription', 'LabOrders', 'DiagnosticOrders', 'Medicines', 'ReferredToHospital']
    const rows = report.patients.map((p: any) => [
      p.tokenNo, p.fullName, p.age, p.gender, p.chiefComplaint || '', p.diagnosis || '', p.consultedBy || '',
      p.prescription || '', (p.labOrders || []).length, (p.diagnosticOrders || []).length, (p.medicinesDispensed || []).length,
      p.referredToHospital ? 'Yes' : 'No',
    ])
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `camp-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function exportPdf() {
    if (!report) return
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const hospital = {
      name: s?.settings?.name || s?.name || 'Hospital',
      address: s?.settings?.address || s?.address || '',
      phone: s?.settings?.phone || s?.phone || '',
      logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl || '',
    }
    const printedAt = fmtDateTime12(new Date().toISOString())
    const campName = campId ? (camps.find((c: any) => c._id === campId)?.name || 'Selected Camp') : 'All Camps'
    const filterText = `Camp: ${escHtml(campName)} | From: ${from || 'All'} To: ${to || 'All'}`

    const summaryEntries = report.summary
      ? Object.entries(report.summary).map(([k, v]: [string, any]) => `<tr><td style="text-transform:capitalize">${escHtml(k.replace(/([A-Z])/g, ' $1').trim())}</td><td style="text-align:right;font-weight:700">${escHtml(String(v))}</td></tr>`).join('')
      : ''

    const diagnosisRows = report.byDiagnosis
      ? report.byDiagnosis.slice(0, 15).map((d: any, i: number) => `<tr><td>${i+1}</td><td>${escHtml(d._id || 'Unspecified')}</td><td style="text-align:right">${escHtml(String(d.count))}</td></tr>`).join('')
      : ''

    const patientRows = report.patients
      ? report.patients.map((p: any, i: number) => `<tr>
        <td>${i+1}</td>
        <td>${escHtml(p.tokenNo || '-')}</td>
        <td>${escHtml(p.fullName || '-')}</td>
        <td>${escHtml(p.age || '-')}</td>
        <td>${escHtml(p.gender || '-')}</td>
        <td>${escHtml(p.chiefComplaint || '-')}</td>
        <td>${escHtml(p.diagnosis || '-')}</td>
        <td>${escHtml(p.consultedBy || '-')}</td>
        <td style="text-align:center">${p.referredToHospital ? 'Yes' : 'No'}</td>
      </tr>`).join('')
      : ''

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Camp Report</title>
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
        .grid2{ display:grid; grid-template-columns: 1fr 2fr; gap:12px; margin:10px 0 }
        .box{ border:1px solid #e2e8f0; border-radius:8px; padding:10px }
        .box h4{ margin:0 0 6px 0; font-size:12px; color:#334155 }
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
          <div class="title">Camp Report</div>
          <div class="meta"><div><b>Filters:</b> ${filterText}</div><div><b>Printed:</b> ${escHtml(printedAt)}</div></div>
        </div>
        <div class="grid2">
          <div class="box">
            <h4>Summary</h4>
            ${summaryEntries ? `<table><tbody>${summaryEntries}</tbody></table>` : '<div style="color:#64748b">No summary data</div>'}
          </div>
          <div class="box">
            <h4>Top Diagnoses</h4>
            ${diagnosisRows ? `<table><thead><tr><th style="width:30px">#</th><th>Diagnosis</th><th style="width:60px;text-align:right">Count</th></tr></thead><tbody>${diagnosisRows}</tbody></table>` : '<div style="color:#64748b">No diagnosis data</div>'}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Token</th>
              <th>Patient</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Complaint</th>
              <th>Diagnosis</th>
              <th>Consulted By</th>
              <th style="width:60px;text-align:center">Referred</th>
            </tr>
          </thead>
          <tbody>${patientRows || '<tr><td colspan="9" style="text-align:center;color:#64748b">No patient records</td></tr>'}</tbody>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-emerald-600" /> Reports</h1>
        <div className="flex gap-2">
          <button onClick={exportPdf} disabled={!report} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"><Printer className="h-4 w-4" /> Export PDF</button>
          <button onClick={exportCSV} disabled={!report?.patients?.length} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Camps', value: stats.activeCamps || 0 },
          { label: 'Total Patients', value: stats.totalPatientsAllTime || 0 },
          { label: 'This Month', value: stats.totalPatientsThisMonth || 0 },
          { label: 'Total Camps', value: stats.totalCamps || 0 },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Camp Report</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={campId} onChange={e => setCampId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="">All Camps</option>
            {camps.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          <button onClick={loadReport} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><CalendarDays className="h-4 w-4" /> Generate</button>
        </div>

        {report?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {Object.entries(report.summary).map(([k, v]: [string, any]) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <div className="text-2xl font-bold text-slate-800">{v}</div>
                <div className="text-xs text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
              </div>
            ))}
          </div>
        )}

        {report?.byDiagnosis && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Top Diagnoses</h3>
            <div className="space-y-1">
              {report.byDiagnosis.slice(0, 10).map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{d._id || 'Unspecified'}</span>
                  <span className="font-medium text-slate-900">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
