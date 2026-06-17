import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { previewGatePassPdf } from '../../utils/hospital_documents'

type BedLocation = {
  floor: string
  type: 'room' | 'ward'
  location: string
  bed: string
}

type ErDischarge = {
  id: string
  encounterId: string
  tokenNo: string
  mrn: string
  patientName: string
  phone?: string
  age?: string
  gender?: string
  doctor?: string
  triage?: string
  arrivalMode?: string
  startAt: string
  endAt: string
  disposition?: string
  bedLabel?: string
  bedLocation?: BedLocation
}

function formatBedLocation(bedLoc?: BedLocation) {
  if (!bedLoc) return '-'
  return `${bedLoc.floor} / ${bedLoc.location} / Bed: ${bedLoc.bed}`
}

function toCsv(rows: ErDischarge[]) {
  const headers = ['Token No', 'MRN', 'Patient Name', 'Phone', 'Age', 'Gender', 'Doctor', 'Triage', 'Arrival', 'Bed', 'Start', 'Discharged', 'Disposition']
  const body = rows.map(r => [
    r.tokenNo, r.mrn, r.patientName, r.phone || '', r.age || '', r.gender || '',
    r.doctor || '', r.triage || '', r.arrivalMode || '', formatBedLocation(r.bedLocation), r.startAt, r.endAt, r.disposition || ''
  ])
  return [headers, ...body].map(arr => arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Hospital_ErDischarged() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [tick, setTick] = useState(0)
  const [serverRows, setServerRows] = useState<ErDischarge[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const apiBase = useMemo(() => {
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
    const envBase = (import.meta as any).env?.VITE_API_URL
    return envBase || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await hospitalApi.listEREncounters({ status: 'discharged', limit: 500 }) as any
        const rows: any[] = res?.encounters || []
        if (cancelled) return
        const mapped: ErDischarge[] = rows.map((enc: any) => ({
          id: String(enc._id),
          encounterId: String(enc._id),
          tokenNo: String(enc.tokenId?.tokenNo || enc.tokenNo || enc.displayTokenNo || '-'),
          mrn: String(enc.patientId?.mrn || enc.mrn || '-'),
          patientName: String(enc.patientId?.fullName || enc.patientName || '-'),
          phone: String(enc.patientId?.phoneNormalized || enc.phone || '-'),
          age: String(enc.patientId?.age || ''),
          gender: String(enc.patientId?.gender || ''),
          doctor: String(enc.doctorId?.fullName || enc.doctorId?.name || enc.doctorName || '-'),
          triage: String(enc.triage || ''),
          arrivalMode: String(enc.arrivalMode || ''),
          startAt: String(enc.startAt || enc.createdAt || ''),
          endAt: String(enc.endAt || ''),
          disposition: String(enc.disposition || 'discharged'),
          bedLabel: enc.bedLabel || enc.bed?.label || enc.bedId?.label || '-',
          bedLocation: enc.bedLocation || enc.bedId || enc.bed || undefined,
        }))
        setServerRows(mapped)
      } catch (e: any) {
        if (!cancelled) setToast({ type: 'error', message: e?.message || 'Failed to load discharged ER patients' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tick])

  const all = useMemo(() =>
    serverRows.sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime()),
    [serverRows]
  )

  const filtered = useMemo(() => {
    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null
    return all.filter(r => {
      if (fromDate && new Date(r.endAt) < fromDate) return false
      if (toDate && new Date(r.endAt) > new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1)) return false
      if (q) {
        const hay = `${r.patientName} ${r.mrn} ${r.tokenNo} ${r.doctor || ''} ${r.phone || ''} ${formatBedLocation(r.bedLocation)}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [all, from, to, q])

  const openPrintPreview = async (fullUrl: string) => {
    const api: any = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function') {
      try {
        const token = localStorage.getItem('hospital.token') || localStorage.getItem('token') || ''
        const res = await fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        if (!res.ok) {
          const txt = await res.text().catch(() => 'Failed to load document')
          setToast({ type: 'error', message: txt.slice(0, 200) || 'Failed to load document' })
          return
        }
        const html = await res.text()
        await api.printPreviewHtml(html, {})
        return
      } catch {}
    }
    try { window.open(fullUrl, '_blank') } catch {}
  }

  const printMedicalRecord = (encounterId: string) => {
    openPrintPreview(`${apiBase}/hospital/er/encounters/${encodeURIComponent(encounterId)}/medical-record/print`)
  }

  const printInvoice = (encounterId: string) => {
    openPrintPreview(`${apiBase}/hospital/er/encounters/${encodeURIComponent(encounterId)}/final-invoice/print`)
  }

  const printGatePass = async (r: ErDischarge) => {
    try {
      const s = await hospitalApi.getSettings()
      await previewGatePassPdf({
        settings: {
          name: s?.name,
          address: s?.address,
          phone: s?.phone,
          logoDataUrl: s?.logoDataUrl,
        },
        patient: {
          name: r.patientName,
          mrn: r.mrn,
          age: r.age,
          gender: r.gender,
          department: 'Emergency',
          bed: formatBedLocation(r.bedLocation),
          admitDate: r.startAt,
          dischargeDate: r.endAt,
          dischargeTime: new Date(r.endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        }
      })
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to generate gate pass' })
    }
  }

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `er_discharged_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (s: string) => {
    if (!s) return '-'
    return new Date(s).toLocaleString()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">ER Discharged Patients</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTick(t => t + 1)} className="btn-outline-navy">Refresh</button>
          <button onClick={exportCsv} className="btn-outline-navy">Export CSV</button>
          <Link to="/hospital/emergency" className="btn-outline-navy">ER Queue</Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid items-end gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="token#, name, MRN, phone, doctor" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Rows</label>
            <select value={rowsPerPage} onChange={e => setRowsPerPage(parseInt(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/50 text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Token #</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">MRN</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Doctor</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Triage</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Arrival</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Bed</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Check In</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Discharged</th>
                <th className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-500">No discharged ER patients found</td></tr>
              ) : (
                filtered.slice(0, rowsPerPage).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                    <td className="px-4 py-2">{r.mrn || '-'}</td>
                    <td className="px-4 py-2 capitalize">
                      <div>{r.patientName}</div>
                      <div className="text-xs text-slate-500">{r.age} / {r.gender}</div>
                    </td>
                    <td className="px-4 py-2">{r.phone || '-'}</td>
                    <td className="px-4 py-2">{r.doctor || '-'}</td>
                    <td className="px-4 py-2">
                      {r.triage && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.triage === 'red' ? 'bg-rose-100 text-rose-700' :
                          r.triage === 'yellow' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.triage.toUpperCase()}
                        </span>
                      ) || '-'}
                    </td>
                    <td className="px-4 py-2">{r.arrivalMode || '-'}</td>
                    <td className="px-4 py-2">{formatBedLocation(r.bedLocation)}</td>
                    <td className="px-4 py-2 text-xs">{formatDate(r.startAt)}</td>
                    <td className="px-4 py-2 text-xs">{formatDate(r.endAt)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => printMedicalRecord(r.encounterId)} className="btn-outline-navy text-xs">Medical Record</button>
                        <button onClick={() => printInvoice(r.encounterId)} className="btn-outline-navy text-xs">Invoice</button>
                        <button onClick={() => printGatePass(r)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"><LogOut className="h-3.5 w-3.5" />Gate Pass</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
