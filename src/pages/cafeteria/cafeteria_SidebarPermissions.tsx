import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'

export default function Cafeteria_SidebarPermissions() {
  const [items, setItems] = useState<{ key: string; label: string; visible: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    cafeteriaApi.getSidebarPermissions().then((r: any) => {
      setItems(r?.items || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, visible: !i.visible } : i))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await cafeteriaApi.updateSidebarPermissions({ items })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {} finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sidebar Permissions</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Control which menu items are visible</p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
            <button
              onClick={() => toggle(item.key)}
              className={`relative h-6 w-11 rounded-full transition-colors ${item.visible ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              role="switch"
              aria-checked={item.visible}
              aria-label={`Toggle ${item.label}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
        {saved && <span className="text-sm font-medium text-green-600 dark:text-green-400">Saved successfully</span>}
      </div>
    </div>
  )
}
