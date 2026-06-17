import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../features/superAdmin'
import { ArrowLeft, Home, Save, Loader2, Building2 } from 'lucide-react'

export default function ClientProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const data = await superAdminApi.getClientProfile()
      setProfile(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await superAdminApi.updateClientProfile(profile)
      setSuccess('Profile updated successfully')
      await loadProfile()
    } catch (err: any) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function updateField(key: string, value: any) {
    setProfile((prev: any) => prev ? { ...prev, [key]: value } : prev)
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/super-admin')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Home">
              <Home className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Client Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6">
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : profile ? (
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">License Key</label>
                <input readOnly value={profile.licenseKey || ''} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Installation Date</label>
                <input readOnly value={profile.installationDate ? new Date(profile.installationDate).toLocaleDateString() : ''} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name *</label>
                <input required value={profile.clientName || ''} onChange={e => updateField('clientName', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hospital Name *</label>
                <input required value={profile.hospitalName || ''} onChange={e => updateField('hospitalName', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                <input value={profile.contactPerson || ''} onChange={e => updateField('contactPerson', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                <input value={profile.contactPhone || ''} onChange={e => updateField('contactPhone', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                <input type="email" value={profile.contactEmail || ''} onChange={e => updateField('contactEmail', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Users</label>
                <input type="number" value={profile.maxUsers || 0} onChange={e => updateField('maxUsers', parseInt(e.target.value, 10))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input value={profile.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input value={profile.city || ''} onChange={e => updateField('city', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
                <input value={profile.country || ''} onChange={e => updateField('country', e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 text-sm transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">No client profile found.</div>
        )}
      </main>
    </div>
  )
}
