import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  receiptNo: string
  method: 'cash' | 'credit'
  lines: Array<{ name: string; qty: number; price: number; discountRs: number }>
  discountPct?: number
  lineDiscountRs?: number
  customer?: string
  customerPhone?: string
  datetime?: string
  fbr?: {
    status?: string;
    qrCode?: string;
    fbrInvoiceNo?: string;
    mode?: string;
    error?: string;
  }
}

export default function Pharmacy_POSReceiptDialog({ open, onClose, receiptNo, method, lines, discountPct, customer }: Props) {
  const withLineDiscount = useMemo(() => {
    const normalized = lines.map(l => ({
      ...l,
      discountRs: Math.round(l.discountRs * 100) / 100
    }))
    const sum = normalized.reduce((s, l) => s + Number(l.discountRs || 0), 0)
    return { lines: normalized, sum: Math.round(sum * 100) / 100 }
  }, [lines])

  const subtotal = withLineDiscount.lines.reduce((s, l) => s + l.price * l.qty, 0)
  const taxPct = 0
  const billDisc = Math.max(0, (subtotal * (discountPct || 0)) / 100)
  const tax = (subtotal - billDisc) * (taxPct / 100)
  const total = subtotal - billDisc + tax
  const [info, setInfo] = useState<{ name: string; phone: string; address: string; footer: string; logo: string }>({ name: '', phone: '', address: '', footer: '', logo: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await pharmacyApi.getSettings()
        if (!mounted) return
        setInfo({
          name: s.pharmacyName || 'PHARMACY',
          phone: s.phone || '',
          address: s.address || '',
          footer: s.billingFooter || 'Thank you for your purchase!',
          logo: s.logoDataUrl || '',
        })
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  const [silentPrint, setSilentPrint] = useState(false)
  const [selectedPrinter, setSelectedPrinter] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await pharmacyApi.getSettings()
        if (!mounted) return
        setSilentPrint(!!s.silentPrint)
        setSelectedPrinter(s.selectedPrinter || '')
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // Keyboard shortcuts for receipt dialog
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        e.stopPropagation()
        handleManualPrint()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose, silentPrint, selectedPrinter, receiptNo])

  const handleManualPrint = () => {
    if (silentPrint && (window as any).electron) {
      (window as any).electron.printReceipt(receiptNo, selectedPrinter)
        .catch(() => window.print())
    } else {
      window.print()
    }
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        #pharmacy-receipt { 
          font-family: 'Poppins', sans-serif; 
          font-weight: 300;
          line-height: 1.4; 
          color: #000; 
        }
        
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #fff !important;
            visibility: hidden;
          }
          #pharmacy-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            visibility: visible;
          }
          #pharmacy-receipt-print-area * {
            visibility: visible;
          }
          .no-print { display: none !important; }
        }
        
        .receipt-dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .receipt-bold { font-weight: 600; }
        .receipt-table-header { font-weight: 600; border-bottom: 1px dashed #000; }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 print:shadow-none print:ring-0 print:rounded-none print:max-w-none print:bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden no-print dark:border-slate-800">
            <div className="font-medium text-slate-900 dark:text-slate-100">Receipt {receiptNo}</div>
            <div className="flex items-center gap-2">
              <button onClick={handleManualPrint} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors font-medium">Print (P)</button>
              <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors font-medium">Close (Esc)</button>
            </div>
          </div>

          <div className="max-h-[85vh] overflow-y-auto px-6 py-6 print:p-0 print:overflow-visible flex justify-center bg-slate-100 dark:bg-slate-950 print:bg-white">
            <div id="pharmacy-receipt-print-area" className="w-[80mm] bg-white p-6 shadow-lg print:shadow-none">
              <div className="text-center font-bold text-2xl mb-1 tracking-tight">{info.name}</div>
              <div className="text-center text-[12px]">Tel: {info.phone}</div>
              
              <div className="receipt-dashed"></div>
              <div className="text-center font-bold text-xl my-2 tracking-[0.3em]">INVOICE</div>
              <div className="receipt-dashed"></div>

              <div className="space-y-1 text-[12px] my-4">
                <div className="flex justify-between items-start">
                  <span>DATE:</span>
                  <span className="text-right">{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span>CUSTOMER:</span>
                  <span className="receipt-bold text-right">{customer?.toUpperCase() || 'WALK-IN'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span>BILL NO:</span>
                  <span className="receipt-bold text-right">{receiptNo}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span>PAYMENT:</span>
                  <span className="receipt-bold uppercase text-right">{method}</span>
                </div>
              </div>

              <div className="receipt-dashed"></div>

              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="receipt-table-header">
                    <th className="text-left py-2 w-[45%]">ITEM</th>
                    <th className="text-center py-2">QTY</th>
                    <th className="text-right py-2">PRICE</th>
                    <th className="text-right py-2">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-200">
                  {withLineDiscount.lines.map((l, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-2 wrap-break-word leading-tight">{l.name.toUpperCase()}</td>
                      <td className="text-center py-2">{l.qty}</td>
                      <td className="text-right py-2">{l.price.toFixed(2)}</td>
                      <td className="text-right py-2 receipt-bold">{(l.qty * l.price - l.discountRs).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-dashed mt-2"></div>

              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                {billDisc > 0 && (
                  <div className="flex justify-between">
                    <span>DISCOUNT:</span>
                    <span>-{billDisc.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-black pt-2 mt-1">
                  <span>NET TOTAL:</span>
                  <span>Rs {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-dashed my-4"></div>

              <div className="text-center text-[13px] mt-4 font-bold uppercase">
                {info.footer}
              </div>
              <div className="text-center text-[10px] mt-2 text-slate-400 font-normal">
                Software by HealthSpire
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
