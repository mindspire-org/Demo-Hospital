import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    cafeteriaApi.getSettings().then(r => { setSettings(r); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await cafeteriaApi.updateSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cafeteria configuration</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cafeteria Name</label>
          <input type="text" value={settings?.cafeteriaName || ''} onChange={e => setSettings({ ...settings, cafeteriaName: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tax Rate (%)</label>
            <input type="number" step="0.01" value={settings?.taxRate || 0} onChange={e => setSettings({ ...settings, taxRate: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
            <input type="text" value={settings?.currency || 'PKR'} onChange={e => setSettings({ ...settings, currency: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="lowStockAlerts" checked={settings?.lowStockAlerts ?? true} onChange={e => setSettings({ ...settings, lowStockAlerts: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
          <label htmlFor="lowStockAlerts" className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable low stock alerts</label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm font-medium text-green-600 dark:text-green-400">Saved successfully</span>}
        </div>
      </div>
    </div>
  )
}
