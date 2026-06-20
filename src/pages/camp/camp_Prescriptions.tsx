import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Search, Printer } from 'lucide-react'

export default function Camp_Prescriptions() {
  const [patients, setPatients] = useState<any[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    campApi.listPatients({ q }).then((res: any) => setPatients((res?.items || []).filter((p: any) => p.prescription)))
  }, [q])

  const printPrescription = (p: any) => {
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
.header{text-align:center;border-bottom:2px solid #10b981;padding-bottom:12px;margin-bottom:16px}
.header h1{margin:0;font-size:20px}
.header p{margin:4px 0;font-size:12px;color:#64748b}
.section{margin-bottom:12px}
.section h3{font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px}
.patient-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px}
.pre{white-space:pre-wrap;font-size:13px;line-height:1.6;background:#f9fafb;padding:10px;border-radius:6px}
.footer{margin-top:24px;text-align:right;font-size:12px;color:#64748b}
</style></head><body>
<div class="header"><h1>Medical Camp Prescription</h1><p>Camp Management System</p></div>
<div class="section"><h3>Patient</h3><div class="patient-grid">
<div><strong>Name:</strong> ${p.fullName}</div>
<div><strong>Age/Gender:</strong> ${p.age} / ${p.gender}</div>
<div><strong>Token:</strong> ${p.tokenNo}</div>
</div></div>
<div class="section"><h3>Diagnosis</h3><div class="pre">${p.diagnosis || '-'}</div></div>
<div class="section"><h3>Prescription</h3><div class="pre">${p.prescription || '-'}</div></div>
<div class="section"><h3>Doctor</h3><p>${p.consultedBy || '-'}</p></div>
<div class="footer">Date: ${new Date().toLocaleDateString()}</div>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patients..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Token</th><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Diagnosis</th><th className="px-6 py-3 font-medium">Prescription</th><th className="px-6 py-3 font-medium">Doctor</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {patients.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No prescriptions found</td></tr> :
              patients.map((p: any) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{p.tokenNo}</td>
                  <td className="px-6 py-3">{p.fullName}</td>
                  <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{p.diagnosis || '-'}</td>
                  <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{p.prescription || '-'}</td>
                  <td className="px-6 py-3 text-slate-500">{p.consultedBy || '-'}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => printPrescription(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Printer className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
