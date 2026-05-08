import { useEffect, useState } from 'react'
import { CloudUpload, Download, FileSpreadsheet, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../../api'

type Imp = {
  _id: string
  fileName: string
  fileType: 'json' | 'xlsx' | 'csv'
  uploadedAt: string
  uploadedBy?: string
  totalRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  status: 'pending_review' | 'committed' | 'cancelled'
  wardId?: string
  departmentId?: string
  emergencyDayId?: string
}

export default function Lab_WardImports() {
  const [items, setItems] = useState<Imp[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [wardId, setWardId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [emergencyDayId, setEmergencyDayId] = useState('')

  async function load() {
    const r = await api('/lab/ward-imports')
    setItems(r.items || [])
  }
  useEffect(() => { load() }, [])

  async function upload(file: File) {
    setBusy(true); setError('')
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const fileType = ext === 'json' ? 'json' : (ext === 'csv' ? 'csv' : 'xlsx')
      const base64 = await fileToBase64(file)
      await api('/lab/ward-imports/upload', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileType, base64, wardId, departmentId, emergencyDayId }),
      })
      load()
    } catch (e: any) { setError(e?.message || 'Upload failed') }
    finally { setBusy(false) }
  }

  async function commit(id: string) {
    if (!confirm('Commit this import? This will create patients and tokens.')) return
    await api(`/lab/ward-imports/${id}/commit`, { method: 'POST', body: JSON.stringify({}) })
    load()
  }
  async function cancel(id: string) {
    if (!confirm('Cancel this import?')) return
    await api(`/lab/ward-imports/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) })
    load()
  }

  function downloadTemplate(kind: 'json' | 'xlsx') {
    if (kind === 'json') {
      const sample = {
        wardId, departmentId, emergencyDayId,
        patients: [
          { fullName: 'John Doe', age: '45', gender: 'Male', phone: '03001234567', cnic: '3520112345678', address: 'Lahore', hospitalRegistrationNumber: 'HRN-001', tests: ['CBC', 'LFT'] },
        ],
      }
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ward-template.json'; a.click()
    } else {
      // CSV is fine (xlsx parser handles it)
      const csv = 'fullName,age,gender,phone,cnic,address,hospitalRegistrationNumber,tests\nJohn Doe,45,Male,03001234567,3520112345678,Lahore,HRN-001,"CBC,LFT"\n'
      const blob = new Blob([csv], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ward-template.csv'; a.click()
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Ward Imports (Offline)</h2>
            <div className="mt-0.5 text-sm text-sky-100">Upload ward batches from JSON / CSV / XLSX</div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-4 rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 text-sm">
          <div className="mb-2 inline-flex items-center gap-2 font-semibold text-sky-800">
            <ShieldCheck className="h-4 w-4" /> Workflow
          </div>
          <ol className="ml-5 list-decimal text-xs leading-5 text-slate-700">
            <li>Download a template and have ward staff fill it offline.</li>
            <li>Receive the file via USB / email.</li>
            <li>Upload here. Rows are reviewed first, then committed.</li>
            <li>Each committed row creates a patient + token (sample not received yet).</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => downloadTemplate('json')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="h-4 w-4" /> <Download className="h-4 w-4" /> JSON template
            </button>
            <button onClick={() => downloadTemplate('xlsx')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" /> <Download className="h-4 w-4" /> CSV template
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <label className="block"><span className="text-xs text-slate-600">Ward ID (optional)</span><input value={wardId} onChange={e => setWardId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
          <label className="block"><span className="text-xs text-slate-600">Department ID</span><input value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
          <label className="block"><span className="text-xs text-slate-600">Emergency day</span><input value={emergencyDayId} onChange={e => setEmergencyDayId(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-800">Upload batch file</div>
          {busy && <div className="text-xs text-slate-500">Uploading…</div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <CloudUpload className="h-4 w-4" /> Choose file
            <input type="file" className="hidden" accept=".json,.xlsx,.csv" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
          </label>
          <div className="text-xs text-slate-500">Accepted: .json, .csv, .xlsx</div>
        </div>
        {error && <div className="mt-2 text-sm font-semibold text-rose-600">{error}</div>}
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Imported</th>
              <th className="px-4 py-3">Skipped</th>
              <th className="px-4 py-3">Errors</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!items.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No imports uploaded yet.</td></tr>}
            {items.map(i => (
              <tr key={i._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{new Date(i.uploadedAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{i.fileName}</td>
                <td className="px-4 py-3 text-slate-600">{i.uploadedBy}</td>
                <td className="px-4 py-3 text-slate-700">{i.totalRows}</td>
                <td className="px-4 py-3 text-slate-700">{i.importedRows}</td>
                <td className="px-4 py-3 text-slate-700">{i.skippedRows}</td>
                <td className="px-4 py-3 text-slate-700">{i.errorRows}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${i.status === 'committed' ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : i.status === 'cancelled' ? 'bg-rose-100 text-rose-700 ring-rose-200' : 'bg-amber-100 text-amber-700 ring-amber-200'}`}>{i.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs">
                    {i.status === 'pending_review' && (
                      <>
                        <button onClick={() => commit(i._id)} className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100">Commit</button>
                        <button onClick={() => cancel(i._id)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100">Cancel</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || '').split(',').pop() || '')
    r.onerror = reject
    r.readAsDataURL(f)
  })
}
