import { useEffect, useRef, useState } from 'react'
import { dialysisApi } from '../../utils/api'

export type DialysisTokenSlipData = {
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
  sessionType?: string
  shift?: string
  machine?: string
  dialyzerType?: string
  duration?: string | number
  amount: number
  discount: number
  payable: number
  createdAt?: string
}

let settingsCache: any | null = null

function getCurrentUser() {
  try {
    const d = localStorage.getItem('dialysis.session')
    if (d) return (JSON.parse(d)?.username || JSON.parse(d)?.name || '').toString()
  } catch {}
  return 'admin'
}

export default function Dialysis_TokenSlip({
  open,
  onClose,
  data,
  autoPrint = false,
  user,
}: {
  open: boolean
  onClose: () => void
  data: DialysisTokenSlipData
  autoPrint?: boolean
  user?: string
}) {
  const [settings, setSettings] = useState({
    name: 'Dialysis Center',
    phone: '',
    address: '',
    email: '',
    logoDataUrl: '',
    slipFooter: 'Powered by Dialysis MIS',
  })
  const printedRef = useRef(false)

  useEffect(() => {
    printedRef.current = false
  }, [open])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (!settingsCache) settingsCache = await dialysisApi.getSettings()
        if (!cancelled && settingsCache) {
          const s: any = settingsCache
          setSettings({
            name: s.centerName || 'Dialysis Center',
            phone: s.phone || '',
            address: s.address || '',
            email: s.email || '',
            logoDataUrl: s.logoDataUrl || '',
            slipFooter: s.reportFooter || 'Powered by Dialysis MIS',
          })
        }
      } catch {}
    }
    if (open) load()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !autoPrint || printedRef.current) return
    const t = setTimeout(() => {
      window.print()
      printedRef.current = true
    }, 300)
    return () => clearTimeout(t)
  }, [open, autoPrint, settings.name, settings.address, settings.phone, settings.logoDataUrl, settings.slipFooter])

  if (!open) return null
  const dt = data.createdAt ? new Date(data.createdAt) : new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4 print:bg-white print:static">
      <div
        id="dialysis-receipt"
        className="max-h-[80vh] w-[360px] overflow-y-auto rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:w-[300px] print:bg-white print:dark:bg-white"
      >
        {/* Header */}
        <div className="text-center print:text-black">
          {settings.logoDataUrl && (
            <img src={settings.logoDataUrl} alt="logo" className="mx-auto mb-2 h-10 w-10 object-contain" />
          )}
          <div className="text-lg font-extrabold leading-tight dark:text-slate-100 print:text-black">{settings.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black">{settings.address}</div>
          {settings.phone && <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black">Mobile #: {settings.phone}</div>}
          {settings.email && <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black">Email: {settings.email}</div>}
        </div>

        <hr className="my-2 border-dashed border-slate-300 dark:border-slate-600 print:border-black" />

        <div className="text-center text-sm font-semibold underline dark:text-slate-200 print:text-black">Dialysis Token</div>

        <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-700 dark:text-slate-300 print:text-black">
          <div>User: {user || getCurrentUser()}</div>
          <div>
            {dt.toLocaleDateString()} {dt.toLocaleTimeString()}
          </div>
        </div>

        <hr className="my-2 border-dashed border-slate-300 dark:border-slate-600 print:border-black" />

        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200 print:text-black">
          <Row label="Patient Name:" value={data.patientName || '-'} />
          <Row label="Mobile #:" value={data.phone || '-'} boldValue />
          {data.mrn && <Row label="MR #:" value={data.mrn} />}
          {data.age && <Row label="Age:" value={data.age} />}
          {data.gender && <Row label="Sex:" value={data.gender} />}
          {(data.guardianName || data.guardianRel) && (
            <Row
              label="Guardian:"
              value={`${data.guardianRel ? data.guardianRel + ' ' : ''}${data.guardianName || ''}`.trim()}
            />
          )}
          {data.cnic && <Row label="CNIC:" value={data.cnic} />}
          {data.address && <Row label="Address:" value={data.address} />}
        </div>

        <div className="my-3 rounded border border-slate-800 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 p-3 text-center text-xl font-extrabold tracking-widest dark:text-slate-100 print:text-black print:bg-white">
          {data.tokenNo}
        </div>

        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200 print:text-black">
          {data.sessionType && <Row label="Session Type:" value={data.sessionType} />}
          {data.shift && <Row label="Shift:" value={data.shift} />}
          {data.machine && <Row label="Machine:" value={data.machine} />}
          {data.dialyzerType && <Row label="Dialyzer:" value={data.dialyzerType} />}
          {data.duration && <Row label="Duration:" value={`${data.duration} hrs`} />}
        </div>

        <hr className="my-2 border-dashed border-slate-300 dark:border-slate-600 print:border-black" />

        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200 print:text-black">
          <Row label="Total Amount:" value={data.amount.toFixed(2)} />
          <Row label="Discount:" value={(data.discount || 0).toFixed(2)} />
          <Row label="Payable Amount:" value={data.payable.toFixed(2)} boldValue />
        </div>

        <hr className="my-2 border-dashed border-slate-300 dark:border-slate-600 print:border-black" />

        <div className="text-center text-[11px] text-slate-600 dark:text-slate-400 print:text-black">
          {settings.slipFooter || 'Powered by Dialysis MIS'}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-slate-800 dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white"
          >
            Print
          </button>
          <button onClick={onClose} className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs">
            Close
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #dialysis-receipt { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          /* print only receipt */
          #dialysis-receipt, #dialysis-receipt * { visibility: visible !important }
          #dialysis-receipt { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 10px 10px 0 10px !important; width: 300px !important; box-sizing: border-box !important; line-height: 1.45; overflow: visible !important; z-index: 2147483647; font-size: 14px !important }
          #dialysis-receipt, #dialysis-receipt * { color: #000 !important }
          .print\\:hidden { display: none !important }
          #dialysis-receipt .text-xs{ font-size: 13px !important }
          #dialysis-receipt .text-sm{ font-size: 14px !important }
          #dialysis-receipt .text-lg{ font-size: 18px !important }
          #dialysis-receipt .text-xl{ font-size: 20px !important }
          #dialysis-receipt .row-value{ max-width: 62% !important; word-break: break-word !important; white-space: normal !important; text-align: right !important }
          hr { border-color: #000 !important }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, boldValue }: { label: string; value: string; boldValue?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <div className="text-slate-700 dark:text-slate-400 print:text-black">{label}</div>
      <div className={`${boldValue ? 'font-semibold ' : ''}row-value min-w-0 break-words text-right dark:text-slate-200 print:text-black`}>{value}</div>
    </div>
  )
}
