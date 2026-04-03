import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  billNo: string
  customer?: string
  lines: { name: string; qty: number; amount: number }[]
  total: number
  type?: 'Customer'|'Supplier'
  note?: string
}

export default function Lab_ReturnSlipDialog({ open, onClose, billNo, customer, lines, total, type = 'Customer', note }: Props){
  const [info, setInfo] = useState<{ labName: string; phone: string; address: string; reportFooter: string; logo: string; email?: string }>({ labName: 'LAB', phone: '', address: '', reportFooter: 'Thank you!', logo: '', email: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s: any = await labApi.getSettings()
        if (!mounted) return
        setInfo({
          labName: s.labName || 'LAB',
          phone: s.phone || '',
          address: s.address || '',
          reportFooter: s.reportFooter || 'Thank you!',
          logo: s.logoDataUrl || '',
          email: s.email || '',
        })
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  const sum = useMemo(()=> Math.round((lines || []).reduce((s,l)=>s+Number(l.amount||0),0)*100)/100, [lines])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #lab-return-slip { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; color: #000 !important }
          body * { visibility: hidden !important }
          #lab-return-slip, #lab-return-slip * { visibility: visible !important }
          #lab-return-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 384px !important; box-sizing: content-box !important; line-height: 1.25; z-index: 2147483647; background: #fff !important }
          #lab-return-slip hr { border-color: #000 !important }
          #lab-return-slip, #lab-return-slip * { color: #000 !important; background: transparent !important; background-color: transparent !important; border-color: #000 !important }
        }
      `}</style>
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-medium">Return Slip · {billNo}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-outline-navy">Print (Ctrl+P)</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          <div id="lab-return-slip" className="mx-auto w-[420px] print:w-[384px]">
            <div className="text-center">
              {info.logo ? <img src={info.logo} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
              <div className="text-xl font-bold tracking-wide">{info.labName}</div>
              {info.address && <div className="text-xs text-slate-600">{info.address}</div>}
              {(info.phone || info.email) && <div className="text-xs text-slate-600">{[info.phone, info.email].filter(Boolean).join(' · ')}</div>}
            </div>

            <hr className="my-3 border-dashed" />
            <div className="text-center font-medium">{type} Return</div>
            <div className="mt-2 text-xs text-slate-700">
              <div>Date : {new Date().toLocaleString()}</div>
              <div>Party : {customer || 'Walk-in'}</div>
              <div>Bill No: {billNo}</div>
              {note ? <div>Reason : {note}</div> : null}
            </div>

            <div className="mt-3 border-t border-dashed pt-2 text-sm">
              <div className="grid grid-cols-6 font-medium">
                <div className="col-span-3">Item</div>
                <div className="text-center">Qty</div>
                <div className="col-span-2 text-right">Amt</div>
              </div>
              <div className="mt-2 space-y-1">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-6">
                    <div className="col-span-3 truncate">{l.name}</div>
                    <div className="text-center">{l.qty}</div>
                    <div className="col-span-2 text-right">{Number(l.amount||0).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-6 border-t border-dashed pt-2">
                <div className="col-span-4 font-semibold">TOTAL RETURN</div>
                <div className="col-span-2 text-right font-semibold">Rs {(total || sum).toFixed(2)}</div>
              </div>
            </div>

            <hr className="my-3 border-dashed" />
            <div className="text-center text-xs text-slate-600">{info.reportFooter || 'Thank you!'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
