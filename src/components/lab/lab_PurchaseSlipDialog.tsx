 import { useEffect, useState } from 'react'
 import { labApi } from '../../utils/api'

 type PurchaseRow = {
  id: string
  date: string
  medicine: string
  supplier: string
  unitsPerPack: number
  totalItems: number
  buyPerPack: number
  buyPerUnit: number
  totalAmount: number
  salePerPack: number
  salePerUnit: number
  invoice: string
  expiry: string
}

type Props = {
  open: boolean
  onClose: () => void
  row?: PurchaseRow | null
}

export default function Lab_PurchaseSlipDialog({ open, onClose, row }: Props) {
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    if (!open) return
    labApi.getSettings().then(setSettings).catch(() => {})
  }, [open])

  if (!open || !row) return null
  const packs = row.unitsPerPack ? Math.floor((row.totalItems || 0) / row.unitsPerPack) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:static print:p-0 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #lab-purchase-slip { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; color: #000 !important }
          body * { visibility: hidden !important }
          #lab-purchase-slip, #lab-purchase-slip * { visibility: visible !important }
          #lab-purchase-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 384px !important; box-sizing: content-box !important; line-height: 1.25; z-index: 2147483647; background: #fff !important }
          #lab-purchase-slip, #lab-purchase-slip * { color: #000 !important; background: transparent !important; background-color: transparent !important; border-color: #000 !important }
        }
      `}</style>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Purchase Invoice {row.invoice}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-800 print:p-0 print:overflow-visible">
          <div id="lab-purchase-slip" className="rounded-xl border border-slate-200 p-5 print:border-0 print:rounded-none print:w-[384px] mx-auto">
            <div className="mb-4 flex flex-col items-center text-center">
              {settings?.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="Logo" className="mb-2 h-12 w-12 object-contain" />
              ) : null}
              <div className="text-lg font-extrabold tracking-wide">{(settings?.labName || 'Lab').toUpperCase()}</div>
              {settings?.address ? <div className="text-xs text-slate-600">{settings.address}</div> : null}
              {(settings?.phone || settings?.email) && (
                <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {settings?.phone ? <div>PHONE : {settings.phone}</div> : null}
                  {settings?.email ? <div>EMAIL : {settings.email}</div> : null}
                </div>
              )}
            </div>

            <div className="mb-3 text-center text-base font-semibold">Purchase Bill</div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">Date :</span> {row.date}</div>
              <div><span className="text-slate-500">Supplier :</span> {row.supplier}</div>
              <div><span className="text-slate-500">Invoice # :</span> {row.invoice}</div>
              <div><span className="text-slate-500">Expiry :</span> {row.expiry}</div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Medicine</th>
                    <th className="px-3 py-2 font-medium">Packs</th>
                    <th className="px-3 py-2 font-medium">Units/Pack</th>
                    <th className="px-3 py-2 font-medium">Buy/Pack</th>
                    <th className="px-3 py-2 font-medium">Buy/Unit</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-3 py-2">{row.medicine}</td>
                    <td className="px-3 py-2">{packs}</td>
                    <td className="px-3 py-2">{row.unitsPerPack}</td>
                    <td className="px-3 py-2">{row.buyPerPack.toFixed(2)}</td>
                    <td className="px-3 py-2">{row.buyPerUnit.toFixed(3)}</td>
                    <td className="px-3 py-2">Rs {row.totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end text-sm">
              <div className="w-64 space-y-1">
                <div className="flex items-center justify-between"><span className="text-slate-600">Total Amount</span><span className="font-semibold">Rs {row.totalAmount.toFixed(2)}</span></div>
              </div>
            </div>

            {settings?.reportFooter ? (
              <div className="mt-6 text-center text-sm text-slate-700">{settings.reportFooter}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Close</button>
          <button onClick={() => window.print()} className="btn">Print</button>
        </div>
      </div>
    </div>
  )
}
