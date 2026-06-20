import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Settings, Save } from 'lucide-react'

export default function Camp_Settings() {
  const [, setSettings] = useState<any>({})
  const [form, setForm] = useState<any>({ campName: '', phone: '', address: '', email: '', reportFooter: '', logoDataUrl: '', defaultTokenPrefix: 'CAMP' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    campApi.getSettings().then((s: any) => {
      setSettings(s)
      setForm({
        campName: s?.campName || '', phone: s?.phone || '', address: s?.address || '',
        email: s?.email || '', reportFooter: s?.reportFooter || '', logoDataUrl: s?.logoDataUrl || '',
        defaultTokenPrefix: s?.defaultTokenPrefix || 'CAMP',
      })
    })
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await campApi.updateSettings(form)
      alert('Settings saved')
    } catch {}
    setSaving(false)
  }

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm({ ...form, logoDataUrl: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings className="h-6 w-6 text-emerald-600" /> Settings</h1>
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-3xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Camp Name</label>
            <input value={form.campName} onChange={e => setForm({ ...form, campName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Default Token Prefix</label>
            <input value={form.defaultTokenPrefix} onChange={e => setForm({ ...form, defaultTokenPrefix: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Report Footer</label>
            <textarea value={form.reportFooter} onChange={e => setForm({ ...form, reportFooter: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Logo</label>
            <input type="file" accept="image/*" onChange={handleLogo} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
            {form.logoDataUrl && <img src={form.logoDataUrl} alt="logo preview" className="mt-2 h-16 w-auto" />}
          </div>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
