import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hospitalApi } from '../../utils/api'
import { previewHospitalRxPdf } from '../../utils/hospitalRxPdf'

export type TokenSlipData = {
  tokenNo: string
  departmentName: string
  doctorName?: string
  patientName: string
  phone?: string
  age?: string
  gender?: string
  mrn?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  address?: string
  amount: number
  discount: number
  payable: number
  createdAt?: string
  fbr?: { status?: string; qrCode?: string; fbrInvoiceNo?: string; mode?: string; error?: string }
  corporateCompanyName?: string
  corporatePreAuthNo?: string
  corporateCoPayPercent?: number
  tokenType?: string
  isReprint?: boolean
  doctorQualification?: string
  doctorSpecialization?: string
}

let settingsCache: any | null = null

function getCurrentUser() {
  try {
    const r = localStorage.getItem('reception.session')
    if (r) return (JSON.parse(r)?.username || JSON.parse(r)?.name || '').toString()
  } catch {}
  try {
    const h = localStorage.getItem('hospital.session')
    if (h) return (JSON.parse(h)?.username || JSON.parse(h)?.name || '').toString()
  } catch {}
  try {
    const d = localStorage.getItem('doctor.session')
    if (d) return (JSON.parse(d)?.username || JSON.parse(d)?.name || '').toString()
  } catch {}
  return 'admin'
}

export default function Hospital_TokenSlip({
  open, onClose, data, autoPrint = false, user
}: {
  open: boolean
  onClose: () => void
  data: TokenSlipData
  autoPrint?: boolean
  user?: string
}) {
  const [settings, setSettings] = useState({
    name: 'Hospital Name', phone: '', address: '', logoDataUrl: '', slipFooter: 'Powered by Hospital MIS'
  })
  const printedRef = useRef(false)

  useEffect(() => { printedRef.current = false }, [open])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (!settingsCache) settingsCache = await hospitalApi.getSettings()
        if (!cancelled && settingsCache) {
          const s: any = settingsCache
          setSettings({
            name: s.name || 'Hospital Name',
            phone: s.phone || '',
            address: s.address || '',
            logoDataUrl: s.logoDataUrl || '',
            slipFooter: s.slipFooter || 'Powered by Hospital MIS',
          })
        }
      } catch {}
    }
    if (open) load()
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open || !autoPrint || printedRef.current) return
    const t = setTimeout(() => { window.print(); printedRef.current = true }, 400)
    return () => clearTimeout(t)
  }, [open, autoPrint, settings.name, settings.address, settings.phone, settings.logoDataUrl, settings.slipFooter])

  if (!open) return null

  async function handlePrintRx() {
    try {
      const s = await hospitalApi.getSettings()

      // Fetch doctor details to get qualification and specialization
      let docRec: any = null
      if (data.doctorName) {
        try {
          const res: any = await hospitalApi.listDoctors({ q: data.doctorName })
          docRec = (res?.doctors || res || []).find((d: any) =>
            String(d.name || '').toLowerCase() === String(data.doctorName || '').toLowerCase()
          )
        } catch {}
      }

      await previewHospitalRxPdf({
        settings: {
          name: s?.name || s?.settings?.name || 'Hospital',
          address: s?.address || s?.settings?.address || '',
          phone: s?.phone || s?.settings?.phone || '',
          logoDataUrl: s?.logoDataUrl || s?.settings?.logoDataUrl || '',
        },
        doctor: {
          name: data.doctorName || '-',
          departmentName: data.departmentName || '-',
          specialization: data.doctorSpecialization || docRec?.specialization || '',
          qualification: data.doctorQualification || docRec?.qualification || '',
        },
        patient: {
          name: data.patientName || '-',
          mrn: data.mrn || '-',
          fatherName: data.guardianName,
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          address: data.address,
          cnic: data.cnic,
        },
        tokenNo: data.tokenNo,
        mrn: data.mrn,
        visitCategory: data.tokenType === 'Private' ? 'private' : 'public',
        corporatePanelName: data.corporateCompanyName,
        corporatePreAuthNo: data.corporatePreAuthNo,
        items: [],
        createdAt: data.createdAt || new Date().toISOString(),
        isReprint: data.isReprint,
      } as any)
    } catch (e: any) {
      alert('Failed to print Rx: ' + (e?.message || 'Unknown error'))
    }
  }

  const dt = data.createdAt ? new Date(data.createdAt) : new Date()
  const fbrStatus = String(data?.fbr?.status || '').toUpperCase().trim()
  const isFbrSuccess = fbrStatus === 'SUCCESS' && Boolean(data?.fbr?.qrCode)

  const slip = (
    <>
      {/* ── MODAL OVERLAY (screen only) ── */}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 print:hidden">
        <div
          className="max-h-[80vh] w-[360px] overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <SlipBody
            data={data} settings={settings} dt={dt}
            isFbrSuccess={isFbrSuccess}
            user={user}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button onClick={handlePrintRx} className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800">Print Rx</button>
            <button onClick={() => window.print()} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Print</button>
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Close</button>
          </div>
        </div>
      </div>

      {/* ── PRINT-ONLY RECEIPT ── rendered directly in body via portal so CSS can isolate it */}
      <div id="hospital-print-portal">
        <div id="hospital-receipt">
          <SlipBody
            data={data} settings={settings} dt={dt}
            isFbrSuccess={isFbrSuccess}
            user={user}
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #hospital-receipt { font-family: 'Poppins', Arial, sans-serif; }

        /* Hide the print portal on screen */
        #hospital-print-portal { display: none; }

        @media print {
          @page { size: 80mm auto; margin: 0; }

          /* Hide EVERYTHING that is a direct child of body except our portal */
          body > *:not(#hospital-print-portal) { display: none !important; }

          /* Show only our portal */
          #hospital-print-portal {
            display: block !important;
            position: static !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #hospital-receipt {
            font-family: 'Poppins', Arial, sans-serif;
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 auto !important;
            padding: 8px 10px 4px 10px !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
            color: #000 !important;
            background: #fff !important;
            box-sizing: border-box !important;
          }

          #hospital-receipt * {
            color: #000 !important;
            background: transparent !important;
            border-color: #000 !important;
          }

          #hospital-receipt .text-xs  { font-size: 12px !important; }
          #hospital-receipt .text-sm  { font-size: 13px !important; }
          #hospital-receipt .text-lg  { font-size: 17px !important; }
          #hospital-receipt .text-xl  { font-size: 19px !important; }
          #hospital-receipt .text-\[11px\] { font-size: 11px !important; }

          #hospital-receipt .row-value {
            text-align: left !important;
            word-break: break-word !important;
            white-space: normal !important;
          }

          hr { border-color: #000 !important; }
        }
      `}</style>
    </>
  )

  // Portal renders our nodes as direct children of <body>
  return createPortal(slip, document.body)
}

/* ── Shared slip body (rendered twice: modal + print portal) ── */
function SlipBody({ data, settings, dt, isFbrSuccess, user }: {
  data: TokenSlipData
  settings: any
  dt: Date
  isFbrSuccess: boolean
  user?: string
}) {
  return (
    <>
      <div className="text-center">
        {settings.logoDataUrl && (
          <img src={settings.logoDataUrl} alt="logo" className="mx-auto mb-2 h-10 w-10 object-contain" />
        )}
        <div className="text-lg font-extrabold leading-tight">{settings.name}</div>
        <div className="text-xs text-slate-600">{settings.address}</div>
        {settings.phone && <div className="text-xs text-slate-600">Mobile #: {settings.phone}</div>}
      </div>

      <hr className="my-2 border-dashed" />

      <div className="text-center text-sm font-semibold underline">
        {data.departmentName ? `${data.departmentName} Token` : 'Token'}
        {data.isReprint ? ' (REPRINTED)' : ''}
      </div>

      <div className="mt-2 flex flex-col gap-0.5 text-xs text-slate-700">
        <div>{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        <div>User: {user || getCurrentUser()}</div>
      </div>

      <hr className="my-2 border-dashed" />

      <div className="my-2 rounded border border-slate-800 p-3 text-center text-xl font-extrabold tracking-widest">
        {data.tokenNo}
      </div>

      <div className="space-y-1 text-sm text-slate-800">
        {data.mrn && <Row label="MR #:" value={data.mrn} />}
        <Row label="Patient Name:" value={data.patientName || '-'} />
        {(data.guardianName || data.guardianRel) && (
          <Row label="Guardian:" value={`${data.guardianRel ? data.guardianRel + ' ' : ''}${data.guardianName || ''}`.trim()} />
        )}
        {data.tokenType && <Row label="Token Type:" value={data.tokenType} />}
        {data.age && <Row label="Age:" value={data.age} />}
        {data.gender && <Row label="Gender:" value={data.gender} />}
        {data.cnic && <Row label="CNIC:" value={data.cnic} />}
        {data.address && <Row label="Address:" value={data.address} />}
        {data.phone && <Row label="Mobile #:" value={data.phone} boldValue />}
        {data.doctorName && <Row label="Doctor Name:" value={data.doctorName} />}
        {data.departmentName && <Row label="Department:" value={data.departmentName} />}
        {data.corporateCompanyName && <Row label="Panel:" value={data.corporateCompanyName} />}
        {data.corporatePreAuthNo && <Row label="Pre-Auth #:" value={data.corporatePreAuthNo} />}
        {typeof data.corporateCoPayPercent === 'number' && (
          <Row label="Co-Pay %:" value={`${data.corporateCoPayPercent}%`} />
        )}
      </div>

      <div className="space-y-1 text-sm text-slate-800">
        <Row label="Total Amount:" value={data.amount.toFixed(2)} />
        {Number(data.discount || 0) > 0 ? (
          <Row label="Discount:" value={(data.discount || 0).toFixed(2)} />
        ) : null}
        <Row label="Net Amount:" value={data.payable.toFixed(2)} boldValue />
      </div>

      {isFbrSuccess && (
        <>
          <hr className="my-2 border-dashed" />
          <div className="text-center text-sm font-semibold underline">FBR</div>
          <div className="mt-2 text-center">
            <img src={data.fbr!.qrCode} alt="FBR QR" className="mx-auto h-24 w-24 object-contain" />
          </div>
          <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
            <div>FBR No: {data?.fbr?.fbrInvoiceNo || '—'}</div>
            <div>Mode: {data?.fbr?.mode || '—'}</div>
          </div>
        </>
      )}

      <hr className="my-2 border-dashed" />

      <div className="text-center text-[11px] text-slate-600">
        {settings.slipFooter || 'Powered by Hospital MIS'}
      </div>
    </>
  )
}

function Row({ label, value, boldValue }: { label: string; value: string; boldValue?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <div className="text-slate-700">{label}</div>
      <div className={`row-value break-words text-left${boldValue ? ' font-semibold' : ''}`}>{value}</div>
    </div>
  )
}