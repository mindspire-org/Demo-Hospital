import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'
import { printConsentForm } from '../../../utils/printConsentForm'
import { ArrowLeft, Printer } from 'lucide-react'

const CONSENT_NOTE_PREFIX = '[CONSENT_FORM]:'

type ConsentRow = {
  id: string
  encounterId: string
  patientName: string
  mrn: string
  age: string
  gender: string
  bedLabel: string
  doctorName: string
  guardianName: string
  relation: string
  cnic: string
  contact: string
  date: string
  time: string
  recordedAt: string
}

export default function Hospital_ConsentFormList(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteEncId, setConfirmDeleteEncId] = useState<string | null>(null)

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      // Get all active IPD admissions
      const encs: any = await hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 200 })
      const admissions = encs?.admissions || []
      const allConsents: ConsentRow[] = []

      for (const enc of admissions) {
        try {
          const res: any = await hospitalApi.listIpdNotes(String(enc._id), { limit: 200, noteType: 'nursing' } as any)
          const notes = (res.notes || []).filter((n: any) => n.note?.startsWith(CONSENT_NOTE_PREFIX))
          for (const n of notes) {
            try {
              const data = JSON.parse(n.note.substring(CONSENT_NOTE_PREFIX.length))
              allConsents.push({
                id: String(n._id),
                encounterId: String(enc._id),
                patientName: data.patientName || enc.patientId?.fullName || '-',
                mrn: data.mrn || enc.patientId?.mrn || '-',
                age: data.age || enc.patientId?.age || '',
                gender: data.gender || enc.patientId?.gender || '',
                bedLabel: data.bedLabel || enc.bedLabel || enc.bedId || '',
                doctorName: data.doctorName || enc.doctorId?.name || '',
                guardianName: data.guardianName || '',
                relation: data.relation || data.guardianRel || '',
                cnic: data.cnic || '',
                contact: data.contact || '',
                date: data.date || '',
                time: data.time || '',
                recordedAt: String(n.createdAt || n.recordedAt || ''),
              })
            } catch {}
          }
        } catch {}
      }

      setRows(allConsents)
    } catch {} finally { setLoading(false) }
  }

  const filtered = q
    ? rows.filter(r =>
        r.patientName.toLowerCase().includes(q.toLowerCase()) ||
        r.mrn.toLowerCase().includes(q.toLowerCase()) ||
        r.guardianName.toLowerCase().includes(q.toLowerCase()) ||
        r.cnic.includes(q)
      )
    : rows

  async function deleteConsent(){
    if (!confirmDeleteId || !confirmDeleteEncId) return
    try {
      await hospitalApi.deleteIpdNote(confirmDeleteEncId, confirmDeleteId)
      setConfirmDeleteId(null)
      setConfirmDeleteEncId(null)
      await load()
    } catch(e: any){ alert(e?.message || 'Failed to delete') }
  }

  const printRow = (r: ConsentRow) => {
    void printConsentForm(r)
  }

  const printAllForms = async () => {
    const formsToPrint = filtered.length > 0 ? filtered : rows
    if (formsToPrint.length === 0) { alert('No consent forms to print.'); return }
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const hospitalName = String(s?.name || 'Hospital')
    const hospitalAddress = String(s?.address || '')
    const hospitalPhone = String(s?.phone || '')
    const hospitalLogo = String(s?.logoDataUrl || '')
    const esc = (v?: string) => (v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

    const formsHtml = formsToPrint.map((r, idx) => `
      <div style="page-break-after:always;${idx === formsToPrint.length-1 ? 'page-break-after:auto;' : ''}">
        <div style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin-bottom:16px;">
          <div style="background:#0f172a;color:#fff;padding:14px 16px;text-align:center;">
            <div style="font-size:18px;font-weight:900;">${esc(hospitalName)}</div>
            <div style="font-size:12px;opacity:0.9;margin-top:2px;">IPD Consent Form #${idx+1}</div>
          </div>
          <div style="padding:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:12px;color:#0f172a;">
              <div><b>Patient:</b> ${esc(r.patientName)}</div>
              <div><b>MRN:</b> ${esc(r.mrn)}</div>
              <div><b>Age/Gender:</b> ${esc(r.age)}${r.gender ? ' / '+esc(r.gender) : ''}</div>
              <div><b>Bed:</b> ${esc(r.bedLabel)}</div>
              <div><b>Doctor:</b> ${esc(r.doctorName)}</div>
              <div><b>Guardian:</b> ${esc(r.guardianName)}${r.relation ? ' ('+esc(r.relation)+')' : ''}</div>
              <div><b>CNIC:</b> ${esc(r.cnic)}</div>
              <div><b>Contact:</b> ${esc(r.contact)}</div>
              <div style="grid-column:1/-1"><b>Date:</b> ${esc(r.date || new Date(r.recordedAt).toLocaleDateString())} ${r.time ? esc(r.time) : ''}</div>
            </div>
            <div style="margin-top:20px;text-align:center;font-size:11px;color:#94a3b8;">— signature area —</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
              <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;min-height:60px;"><div style="font-size:10px;font-weight:700;color:#64748b;">Patient / Guardian Signature</div></div>
              <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;min-height:60px;"><div style="font-size:10px;font-weight:700;color:#64748b;">Doctor Signature & Stamp</div></div>
            </div>
          </div>
        </div>
      </div>
    `).join('')

    const w = window.open('', '_blank')
    if (!w) { alert('Please allow popups to print.'); return }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Consent Forms - ${esc(hospitalName)}</title><style>
      @page{size:A4;margin:12mm}
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;font-size:13px;margin:0;padding:20px;}
      @media print{body{padding:0}div{page-break-inside:avoid}}
    </style></head><body>
      <div style="text-align:center;margin-bottom:20px;">
        ${hospitalLogo ? `<img src="${esc(hospitalLogo)}" alt="logo" style="height:50px;border-radius:8px;object-fit:contain;" />` : ''}
        <div style="font-size:20px;font-weight:900;margin-top:8px;">${esc(hospitalName)}</div>
        ${hospitalAddress ? `<div style="font-size:12px;color:#64748b;">${esc(hospitalAddress)}</div>` : ''}
        ${hospitalPhone ? `<div style="font-size:12px;color:#64748b;">Phone: ${esc(hospitalPhone)}</div>` : ''}
        <div style="font-size:14px;font-weight:700;margin-top:8px;">All Consent Forms (${formsToPrint.length})</div>
      </div>
      ${formsHtml}
      <script>setTimeout(()=>window.print(),300)</script>
    </body></html>`)
    w.document.close(); w.focus()
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            aria-label="Previous"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <h1 className="text-lg font-bold text-slate-900">Consent Forms</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={printAllForms}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" /> Print All Forms
          </button>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by name, MRN, CNIC..."
            className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-400 py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No consent forms found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">MRN</th>
                <th className="px-4 py-3">Age/Gender</th>
                <th className="px-4 py-3">Bed</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.patientName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.mrn}</td>
                  <td className="px-4 py-3 text-slate-600">{r.age}{r.gender ? ` / ${r.gender}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{r.bedLabel}</td>
                  <td className="px-4 py-3 text-slate-600">{r.doctorName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.guardianName}{r.relation ? ` (${r.relation})` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{r.date || new Date(r.recordedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => navigate(`/hospital/patient/${r.encounterId}`)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">View</button>
                      <button onClick={() => printRow(r)} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white hover:bg-sky-700 transition">Print</button>
                      <button onClick={() => { setConfirmDeleteId(r.id); setConfirmDeleteEncId(r.encounterId) }} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Consent Form"
        message="Are you sure you want to delete this consent form? This action cannot be undone."
        confirmText="Delete"
        onCancel={()=>{ setConfirmDeleteId(null); setConfirmDeleteEncId(null) }}
        onConfirm={deleteConsent}
      />
    </div>
  )
}
