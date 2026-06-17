import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { diagnosticApi } from '../../utils/api'
import { fmtDateTime12 } from '../../utils/timeFormat'

export type DiagnosticTokenSlipData = {
  tokenNo: string
  patientName: string
  phone?: string
  age?: string
  gender?: string
  mrn?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  address?: string
  tests: Array<{ name: string; price: number }>
  subtotal: number
  discount: number
  payable: number
  received?: number
  remaining?: number
  createdAt?: string
  corporateCompanyName?: string
  corporatePreAuthNo?: string
  corporateCoPayPercent?: number
}

function getCurrentUser() {
  try {
    const s = localStorage.getItem('diagnostic.session')
    if (s) return (JSON.parse(s)?.username || JSON.parse(s)?.name || '').toString()
  } catch {}
  return 'admin'
}

export default function Diagnostic_TokenSlip({
  open, onClose, data, autoPrint = false, user
}: {
  open: boolean
  onClose: () => void
  data: DiagnosticTokenSlipData
  autoPrint?: boolean
  user?: string
}) {
  const [settings, setSettings] = useState({
    name: 'Diagnostic Center', phone: '', address: '', logoDataUrl: '', slipFooter: 'Powered by Hospital MIS'
  })
  const printedRef = useRef(false)

  useEffect(() => { printedRef.current = false }, [open])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await diagnosticApi.getSettings() as any
        if (!mounted) return
        setSettings({
          name: s?.diagnosticName || 'Diagnostic Center',
          phone: s?.phone || '',
          address: s?.address || '',
          logoDataUrl: s?.logoDataUrl || '',
          slipFooter: s?.reportFooter || 'Powered by Hospital MIS',
        })
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!open || !autoPrint || printedRef.current) return
    const t = setTimeout(() => { window.print(); printedRef.current = true }, 400)
    return () => clearTimeout(t)
  }, [open, autoPrint])

  useEffect(() => {
    if (!open) return
    const onAfterPrint = () => { onClose() }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [open, onClose])

  if (!open) return null

  const dt = data.createdAt ? new Date(data.createdAt) : new Date()

  const slip = (
    <>
      {/* ── MODAL OVERLAY (screen only) ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
        <div
          className="max-h-[85vh] w-[384px] overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow"
          onClick={e => e.stopPropagation()}
        >
          <SlipBody data={data} settings={settings} dt={dt} user={user} />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── PRINT-ONLY PORTAL (direct child of body) ── */}
      <div id="diagnostic-print-portal">
        <div id="diagnostic-receipt">
          <SlipBody data={data} settings={settings} dt={dt} user={user} />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #diagnostic-receipt { font-family: 'Poppins', Arial, sans-serif; }

        /* Hide print portal on screen */
        #diagnostic-print-portal { display: none; }

        @media print {
          @page { size: 80mm auto; margin: 0; }

          /* Hide everything except our portal */
          body > *:not(#diagnostic-print-portal) { display: none !important; }

          #diagnostic-print-portal {
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

          #diagnostic-receipt {
            font-family: 'Poppins', Arial, sans-serif;
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 auto !important;
            padding: 8px 10px 4px 10px !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            color: #000 !important;
            background: #fff !important;
            box-sizing: border-box !important;
          }

          #diagnostic-receipt * {
            color: #000 !important;
            background: transparent !important;
            border-color: #000 !important;
          }

          #diagnostic-receipt .text-xs     { font-size: 12px !important; }
          #diagnostic-receipt .text-sm     { font-size: 13px !important; }
          #diagnostic-receipt .text-lg     { font-size: 17px !important; }
          #diagnostic-receipt .text-xl     { font-size: 19px !important; }
          #diagnostic-receipt .text-\[11px\] { font-size: 11px !important; }

          #diagnostic-receipt .row-value {
            text-align: left !important;
            word-break: break-word !important;
            white-space: normal !important;
          }

          #diagnostic-receipt .test-item-name {
            word-break: break-word !important;
            white-space: normal !important;
          }

          hr { border-color: #000 !important; }
        }
      `}</style>
    </>
  )

  return createPortal(slip, document.body)
}

/* ── Shared slip body ── */
function SlipBody({ data, settings, dt, user }: {
  data: DiagnosticTokenSlipData
  settings: { name: string; phone: string; address: string; logoDataUrl: string; slipFooter: string }
  dt: Date
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
      <div className="text-center text-sm font-semibold underline">Diagnostic Token</div>

      <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-700">
        <div>User: {user || getCurrentUser()}</div>
        <div>{fmtDateTime12(dt)}</div>
      </div>

      <hr className="my-2 border-dashed" />

      <div className="space-y-1 text-sm text-slate-800">
        {data.mrn && <Row label="MR #:" value={data.mrn} />}
        <Row label="Patient Name:" value={data.patientName || '-'} />
        {(data.guardianName || data.guardianRel) && (
          <Row label="Guardian:" value={`${data.guardianRel ? data.guardianRel + ' ' : ''}${data.guardianName || ''}`.trim()} />
        )}
        {data.age && <Row label="Age:" value={data.age} />}
        {data.gender && <Row label="Gender:" value={data.gender} />}
        {data.cnic && <Row label="CNIC:" value={data.cnic} />}
        {data.address && <Row label="Address:" value={data.address} />}
        {data.phone && <Row label="Mobile #:" value={data.phone} boldValue />}
        {data.corporateCompanyName && <Row label="Panel:" value={data.corporateCompanyName} />}
        {data.corporatePreAuthNo && <Row label="Pre-Auth #:" value={data.corporatePreAuthNo} />}
        {typeof data.corporateCoPayPercent === 'number' && (
          <Row label="Co-Pay %:" value={`${data.corporateCoPayPercent}%`} />
        )}
      </div>

      <div className="my-3 rounded border border-slate-800 p-3 text-center text-xl font-extrabold tracking-widest">
        {data.tokenNo}
      </div>

      <div className="mb-2 text-sm font-semibold">Tests</div>
      <div className="mb-2 divide-y divide-slate-200 text-sm">
        {data.tests.map((t, i) => (
          <div key={i} className="grid grid-cols-[auto_auto] gap-4 py-1.5">
            <div className="test-item-name">{t.name}</div>
            <div>PKR {Number(t.price || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm text-slate-800">
        <Row label="Total Amount:" value={`PKR ${data.subtotal.toLocaleString()}`} />
        <Row label="Discount:" value={`PKR ${Number(data.discount || 0).toLocaleString()}`} />
        <Row label="Net Amount:" value={`PKR ${data.payable.toLocaleString()}`} boldValue />
        <Row label="Received:" value={`PKR ${Number(data.received || 0).toLocaleString()}`} />
        <Row label="Pending:" value={`PKR ${Number(data.remaining || 0).toLocaleString()}`} />
      </div>

      <hr className="my-2 border-dashed" />
      <div className="text-center text-[11px] text-slate-600">{settings.slipFooter}</div>
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