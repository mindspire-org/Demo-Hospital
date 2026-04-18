import { useEffect, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export type ErPaymentSlipData = {
  encounterId: string
  patientName: string
  mrn?: string
  phone?: string
  cnic?: string
  address?: string
  age?: string | number
  gender?: string
  guardian?: string
  department?: string
  tokenNo?: string
  payment: { amount: number; method?: string; refNo?: string; receivedAt?: string }
  totals: { total: number; paid: number; pending: number; unallocatedAdvance?: number }
  isAdvance?: boolean
  isAdvanceReturn?: boolean
}

let settingsCache: any | null = null

function getReceptionUser(){
  try{
    const s = localStorage.getItem('reception.session')
    if (!s) return 'reception'
    const obj = JSON.parse(s)
    return obj?.username || obj?.name || 'reception'
  }catch{ return 'reception' }
}

export default function Hospital_ErPaymentSlip({ open, onClose, data, autoPrint = false, user }: { open: boolean; onClose: ()=>void; data: ErPaymentSlipData; autoPrint?: boolean; user?: string }){
  const [settings, setSettings] = useState({ name: 'Hospital Name', phone: '', address: '', logoDataUrl: '', slipFooter: 'Powered by Hospital MIS' })
  const printedRef = useRef(false)

  useEffect(() => { printedRef.current = false }, [open])

  useEffect(() => {
    let cancelled = false
    async function load(){
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
    const t = setTimeout(() => { try{ window.print() }catch{}; printedRef.current = true }, 300)
    return () => clearTimeout(t)
  }, [open, autoPrint])

  if (!open) return null

  const dt = data?.payment?.receivedAt ? new Date(data.payment.receivedAt) : new Date()
  const total = Number(data?.totals?.total || 0)
  const paid = Number(data?.totals?.paid || 0)
  const pending = Number(data?.totals?.pending || Math.max(0, total - paid))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:static">
      <div id="hospital-er-payment-receipt" className="w-[360px] rounded-md border border-slate-300 bg-white p-4 shadow print:shadow-none print:border-0 print:w-[300px]">
        <div className="text-center">
          {settings.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="mx-auto mb-2 h-10 w-10 object-contain" />}
          <div className="text-lg font-extrabold leading-tight">{settings.name}</div>
          <div className="text-xs text-slate-600 print:text-black">{settings.address}</div>
          {settings.phone && <div className="text-xs text-slate-600 print:text-black">Mobile #: {settings.phone}</div>}
        </div>

        <hr className="my-2 border-dashed" />
        <div className="text-center text-sm font-semibold underline">
          {data.isAdvanceReturn ? 'ER Advance Return Receipt' : data.isAdvance ? 'ER Advance Receipt' : 'ER Payment Slip'}
        </div>

        <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-700">
          <div>User: {user || getReceptionUser()}</div>
          <div>{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        </div>

        <hr className="my-2 border-dashed" />

        <div className="space-y-1 text-[11px] text-slate-800">
          <Row label="Patient:" value={data.patientName || '-'} />
          <Row label="Phone:" value={data.phone || '-'} />
          <Row label="MR #:" value={data.mrn || '-'} />
          <Row label="CNIC:" value={data.cnic || '-'} />
          <Row label="Token:" value={data.tokenNo || '-'} />
          <Row label="Age/Sex:" value={`${data.age || '-'}/${data.gender || '-'}`} />
          <Row label="Guardian:" value={data.guardian || '-'} />
          <Row label="Dept:" value={data.department || 'Emergency'} />
          <Row label="Address:" value={data.address || '-'} />
          <hr className="my-1 border-slate-200" />
          <Row label="Method:" value={data.payment.method || '-'} />
          {data.payment.refNo ? <Row label="Ref:" value={data.payment.refNo} /> : null}
        </div>

        <div className="my-3 rounded border border-slate-800 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {data.isAdvanceReturn ? 'Returned Amount' : data.isAdvance ? 'Advance Amount' : 'Paid Amount'}
          </div>
          <div className={`text-2xl font-extrabold tracking-widest ${data.isAdvanceReturn ? 'text-rose-600' : ''}`}>
            Rs {Number(data.payment.amount || 0).toFixed(0)}
          </div>
        </div>

        <div className="mt-4 space-y-1 rounded-md bg-slate-50 p-2 text-sm text-slate-800">
          <div className="mb-1 border-b border-slate-200 pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Ledger Summary</div>
          <LedgerRow label="Total Billing:" value={`Rs ${total.toFixed(0)}`} />
          <LedgerRow label="Total Paid:" value={`Rs ${paid.toFixed(0)}`} />
          {data.totals.unallocatedAdvance ? <LedgerRow label="Advance Bal:" value={`Rs ${Number(data.totals.unallocatedAdvance).toFixed(0)}`} /> : null}
          <LedgerRow label="Net Due:" value={pending <= 0 ? `Rs 0` : `Rs ${pending.toFixed(0)}`} boldValue />
        </div>

        <hr className="my-2 border-dashed" />
        <div className="text-center text-[11px] text-slate-600">{settings.slipFooter || 'Powered by Hospital MIS'}</div>

        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <button onClick={()=>window.print()} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Print</button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Close</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #hospital-er-payment-receipt { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; color: #000 !important }
          body * { visibility: hidden !important }
          #hospital-er-payment-receipt, #hospital-er-payment-receipt * { visibility: visible !important }
          #hospital-er-payment-receipt { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 10px 10px 0 10px !important; width: 300px !important; box-sizing: border-box !important; line-height: 1.45; overflow: visible !important; z-index: 2147483647; font-size: 14px !important; background: #fff !important }
          #hospital-er-payment-receipt, #hospital-er-payment-receipt * { color: #000 !important; background: transparent !important; background-color: transparent !important; border-color: #000 !important }
          .print\\:hidden { display: none !important }
          #hospital-er-payment-receipt .text-xs{ font-size: 13px !important }
          #hospital-er-payment-receipt .text-sm{ font-size: 14px !important }
          #hospital-er-payment-receipt .text-lg{ font-size: 18px !important }
          #hospital-er-payment-receipt .text-xl{ font-size: 20px !important }
          #hospital-er-payment-receipt .row-value{ max-width: none !important; word-break: normal !important; white-space: nowrap !important; text-align: left !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          hr { border-color: #000 !important }
          #hospital-er-payment-receipt .grid-cols-\[100px_1fr\] { grid-template-columns: 100px 1fr !important; }
          #hospital-er-payment-receipt .grid-cols-\[70px_1fr\] { grid-template-columns: 70px 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, boldValue }: { label: string; value: string; boldValue?: boolean }){
  return (
    <div className="grid grid-cols-[70px_1fr] gap-1">
      <div className="text-slate-700 whitespace-nowrap">{label}</div>
      <div className={`${boldValue ? 'font-semibold ' : ''}row-value min-w-0 whitespace-nowrap text-left overflow-hidden text-ellipsis`}>{value}</div>
    </div>
  )
}

function LedgerRow({ label, value, boldValue }: { label: string; value: string; boldValue?: boolean }){
  return (
    <div className="grid grid-cols-[100px_1fr] gap-1">
      <div className="text-slate-700 whitespace-nowrap">{label}</div>
      <div className={`${boldValue ? 'font-semibold ' : ''}row-value min-w-0 whitespace-nowrap text-left overflow-hidden text-ellipsis`}>{value}</div>
    </div>
  )
}
