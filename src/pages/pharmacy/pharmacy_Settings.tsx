import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'

export default function Pharmacy_Settings() {
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'system'>('pharmacy')

  // Pharmacy Settings form state
  const [pharmacyName, setPharmacyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [billingFooter, setBillingFooter] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [silentPrint, setSilentPrint] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])

  // System Settings form state
  const [taxRate, setTaxRate] = useState<number>(0)
  const [discountRate, setDiscountRate] = useState<number>(0)
  const [currency, setCurrency] = useState<string>('PKR')
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY')
  const [toast, setToast] = useState<{type: 'success'|'error', message: string} | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await pharmacyApi.getSettings()
        if (!mounted) return
        setPharmacyName(s.pharmacyName || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setEmail(s.email || '')
        setBillingFooter(s.billingFooter || '')
        setLogoDataUrl(s.logoDataUrl || null)
        setSelectedPrinter(s.selectedPrinter || '')
        setSilentPrint(!!s.silentPrint)
      } catch (e) {
        console.error(e)
      }
    })()

    // Try to get system printers if running in a supported environment (like Electron)
    // or just provide common defaults for web
    if ((window as any).electron) {
      ;(window as any).electron.getPrinters().then((list: any[]) => {
        setPrinters(list.map(p => p.name))
      }).catch(() => {})
    } else {
      setPrinters(['Default Printer', 'Thermal Printer 58mm', 'Thermal Printer 80mm', 'Microsoft Print to PDF'])
    }

    return () => { mounted = false }
  }, [])

  const savePharmacy = async () => {
    await pharmacyApi.updateSettings({ 
      pharmacyName, phone, address, email, billingFooter, 
      logoDataUrl: logoDataUrl || '',
      selectedPrinter,
      silentPrint
    })
    setToast({ type: 'success', message: 'Pharmacy settings saved' })
  }

  const saveSystem = () => {
    console.log({ taxRate, discountRate, currency, dateFormat })
    setToast({ type: 'success', message: 'System settings saved (demo)' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0 0 0 1.765 1.765 2.25 2.25 0 0 1 1.424 2.941 2.25 2.25 0 0 0 1.212 2.682 2.25 2.25 0 0 1-.495 2.318 2.25 2.25 0 0 0-1.212 2.682 2.25 2.25 0 0 1-1.424 2.941 2.25 2.25 0 0 0-1.765 1.765 2.25 2.25 0 0 1-2.941 1.424 2.25 2.25 0 0 0-2.682 1.212 2.25 2.25 0 0 1-2.318-.495 2.25 2.25 0 0 0-3.294 0 2.25 2.25 0 0 1-2.318.495 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1-1.424-2.941 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1 .495-2.318 2.25 2.25 0 0 0 1.212-2.682 2.25 2.25 0 0 1 1.424-2.941 2.25 2.25 0 0 0 1.765-1.765 2.25 2.25 0 0 1 2.941-1.424 2.25 2.25 0 0 0 2.682-1.212 2.25 2.25 0 0 1 2.318.495 2.25 2.25 0 0 0 3.294 0Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setActiveTab('pharmacy')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='pharmacy' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Pharmacy Settings</button>
        <button type="button" onClick={() => setActiveTab('system')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='system' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>System Settings</button>
      </div>

      {activeTab === 'pharmacy' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Pharmacy Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Pharmacy Name</label>
                <input value={pharmacyName} onChange={e=>setPharmacyName(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="+92-21-1234567" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Pharmacy Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Billing Footer</label>
              <textarea value={billingFooter} onChange={e=>setBillingFooter(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Pharmacy Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e=>{
                  const file = e.target.files?.[0]
                  if (!file) { setLogoDataUrl(null); return }
                  const reader = new FileReader()
                  reader.onload = () => setLogoDataUrl(String(reader.result || ''))
                  reader.readAsDataURL(file)
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
              />
              {logoDataUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <img src={logoDataUrl} alt="Logo preview" className="h-10 w-10 rounded border" />
                  <span>Preview</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-sky-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821L2.25 12l4.47-1.821L12 7.5l5.28 2.679L21.75 12l-4.47 1.821L12 16.5l-5.28-2.679z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V21m0 0l-1.5-1.5M12 21l1.5-1.5" />
                </svg>
                Printing Preferences
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Target Printer</label>
                  <select 
                    value={selectedPrinter} 
                    onChange={e => setSelectedPrinter(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">System Default</option>
                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500 italic">Select the hardware printer for POS receipts</p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setSilentPrint(!silentPrint)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${silentPrint ? 'bg-sky-600' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${silentPrint ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Silent Printing</span>
                    <span className="text-[10px] text-slate-500">Bypass Windows print dialog (Requires Local Agent)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="button" onClick={savePharmacy} className="btn">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">System Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Tax Rate (%)</label>
                <input type="number" value={taxRate} onChange={e=>setTaxRate(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Discount Rate (%)</label>
                <input type="number" value={discountRate} onChange={e=>setDiscountRate(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Currency</label>
                <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Date Format</label>
                <select value={dateFormat} onChange={e=>setDateFormat(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="button" onClick={saveSystem} className="btn">Save Settings</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast toast={toast} onClose={()=>setToast(null)} />}
    </div>
  )
}
