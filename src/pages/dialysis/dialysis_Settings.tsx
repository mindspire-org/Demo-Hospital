import { useEffect, useState } from 'react'
import { dialysisApi } from '../../utils/api'

export default function Dialysis_Settings() {
  const [activeTab, setActiveTab] = useState<'center' | 'system'>('center')
  
  // Center Settings
  const [centerName, setCenterName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [reportFooter, setReportFooter] = useState('')
  const [sessionCharge, setSessionCharge] = useState('')
  
  // System Settings
  const [currency, setCurrency] = useState('PKR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await dialysisApi.getSettings()
        if (!mounted) return
        setCenterName(s.centerName || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setEmail(s.email || '')
        setLogoDataUrl(s.logoDataUrl || null)
        setReportFooter(s.reportFooter || '')
        setSessionCharge(s.sessionCharge || '')
        setCurrency(s.currency || 'PKR')
        setDateFormat(s.dateFormat || 'DD/MM/YYYY')
      } catch (e) { /* ignore */ }
    })()
    return () => { mounted = false }
  }, [])

  const saveCenterSettings = async () => {
    setSaving(true)
    try {
      await dialysisApi.updateSettings({
        centerName,
        phone,
        address,
        email,
        logoDataUrl: logoDataUrl || undefined,
        reportFooter,
        sessionCharge,
        currency,
        dateFormat,
      })
      setNotice('Center settings saved successfully')
      setTimeout(() => setNotice(''), 2500)
    } catch (e) {
      setNotice('Failed to save settings')
      setTimeout(() => setNotice(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  const saveSystemSettings = () => {
    try {
      localStorage.setItem('dialysis.currency', currency)
      localStorage.setItem('dialysis.dateFormat', dateFormat)
      setNotice('System settings saved successfully')
      setTimeout(() => setNotice(''), 2500)
    } catch {}
  }

  const onUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoDataUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const onRemoveLogo = () => setLogoDataUrl(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-teal-600">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
          <path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0 0 0 1.765 1.765 2.25 2.25 0 0 1 1.424 2.941 2.25 2.25 0 0 0 1.212 2.682 2.25 2.25 0 0 1-.495 2.318 2.25 2.25 0 0 0-1.212 2.682 2.25 2.25 0 0 1-1.424 2.941 2.25 2.25 0 0 0-1.765 1.765 2.25 2.25 0 0 1-2.941 1.424 2.25 2.25 0 0 0-2.682 1.212 2.25 2.25 0 0 1-2.318-.495 2.25 2.25 0 0 0-3.294 0 2.25 2.25 0 0 1-2.318.495 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1-1.424-2.941 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1 .495-2.318 2.25 2.25 0 0 0 1.212-2.682 2.25 2.25 0 0 1 1.424-2.941 2.25 2.25 0 0 0 1.765-1.765 2.25 2.25 0 0 1 2.941-1.424 2.25 2.25 0 0 0 2.682-1.212 2.25 2.25 0 0 1 2.318.495 2.25 2.25 0 0 0 3.294 0Z" clipRule="evenodd"/>
        </svg>
        <h2 className="text-xl font-bold">Dialysis Settings</h2>
      </div>
      
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('center')}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            activeTab === 'center'
              ? 'border-slate-300 bg-white text-slate-900'
              : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Center Settings
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            activeTab === 'system'
              ? 'border-slate-300 bg-white text-slate-900'
              : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          System Settings
        </button>
      </div>

      {activeTab === 'center' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>🏥</span>
              <span>Dialysis Center Information</span>
            </div>
          </div>
          
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Center Name
                </label>
                <input
                  value={centerName}
                  onChange={e => setCenterName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  placeholder="Mindspire Dialysis Center"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  placeholder="+92-21-1234567"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Center Address
              </label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                rows={3}
                placeholder="123 Medical Street, City, Country"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="dialysis@center.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Session Charge (Default)
              </label>
              <input
                value={sessionCharge}
                onChange={e => setSessionCharge(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="5000"
              />
              <p className="mt-1 text-xs text-slate-500">Default charge per dialysis session</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Report Footer
              </label>
              <textarea
                value={reportFooter}
                onChange={e => setReportFooter(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                rows={2}
                placeholder="Powered by Dialysis Management System"
              />
              <p className="mt-1 text-xs text-slate-500">Shown at the bottom of reports and receipts</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Center Logo
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  <input type="file" accept="image/*" onChange={onUploadLogo} className="hidden" />
                  Upload Logo
                </label>
                {logoDataUrl && (
                  <>
                    <img src={logoDataUrl} alt="Logo" className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
                    <button
                      type="button"
                      onClick={onRemoveLogo}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 pt-4">
              <button
                onClick={saveCenterSettings}
                disabled={saving}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>⚙️</span>
              <span>System Preferences</span>
            </div>
          </div>
          
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Currency
                </label>
                <input
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  placeholder="PKR"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 pt-4">
              <button
                onClick={saveSystemSettings}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Save System Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
