import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../features/superAdmin'
import { MODULE_REGISTRY, getAllModuleIds, getAllSubModules } from '../../config/moduleRegistry'
import { ArrowLeft, Home, Check, X, Save, Loader2 } from 'lucide-react'

export default function ModuleManager() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const data = await superAdminApi.getSystemConfig()
      setConfig(data.config)
    } catch (err: any) {
      setError(err?.message || 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await superAdminApi.updateSystemConfig({
        modules: config.modules,
        homeModules: config.homeModules,
        version: config.version,
      })
      setSuccess('Configuration saved successfully')
      // Invalidate cache so other tabs/pages pick up the new config
      localStorage.removeItem('jinnah.systemConfig')
      // Refresh to get new version
      await loadConfig()
      // Broadcast invalidation to all open tabs/clients
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('jinnah-config-sync')
        bc.postMessage({ type: 'invalidate' })
        bc.close()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function toggleModule(moduleId: string) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const next = { ...prev, modules: { ...prev.modules } }
      next.modules[moduleId] = {
        ...next.modules[moduleId],
        enabled: !next.modules[moduleId]?.enabled,
      }
      // Update homeModules
      const homeSet = new Set(next.homeModules || [])
      if (next.modules[moduleId].enabled) homeSet.add(moduleId)
      else homeSet.delete(moduleId)
      next.homeModules = Array.from(homeSet)
      return next
    })
  }

  function toggleSubModule(moduleId: string, subId: string) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const next = { ...prev, modules: { ...prev.modules } }
      const mod = { ...next.modules[moduleId], subModules: { ...next.modules[moduleId]?.subModules } }
      mod.subModules[subId] = {
        ...mod.subModules?.[subId],
        enabled: !mod.subModules?.[subId]?.enabled,
      }
      next.modules[moduleId] = mod
      return next
    })
  }

  const moduleIds = getAllModuleIds()

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/super-admin')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Home">
              <Home className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Module Manager</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !config}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Module List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modules</h2>
              {moduleIds.map(modId => {
                const enabled = config?.modules?.[modId]?.enabled !== false
                const label = (MODULE_REGISTRY as any)[modId]?.label || modId
                return (
                  <div
                    key={modId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedModule(modId)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedModule(modId) } }}
                    className={`w-full text-left rounded-lg border px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${
                      selectedModule === modId
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleModule(modId) }}
                      className={`rounded-full p-1 transition-colors ${
                        enabled
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                      }`}
                    >
                      {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Sub-modules */}
            <div className="lg:col-span-2">
              {selectedModule ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                    {(MODULE_REGISTRY as any)[selectedModule]?.label || selectedModule} — Sub-modules
                  </h2>
                  <div className="space-y-3">
                    {getAllSubModules(selectedModule).map(subId => {
                      const sub = (MODULE_REGISTRY as any)[selectedModule]?.subModules?.[subId]
                      const enabled = config?.modules?.[selectedModule]?.subModules?.[subId]?.enabled !== false
                      const modEnabled = config?.modules?.[selectedModule]?.enabled !== false
                      return (
                        <div
                          key={subId}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                            modEnabled ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800 opacity-50'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{sub?.label || subId}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {sub?.pathPrefixes?.slice(0, 2).join(', ')}{sub?.pathPrefixes?.length > 2 ? '...' : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSubModule(selectedModule, subId)}
                            disabled={!modEnabled}
                            className={`rounded-full p-1 transition-colors ${
                              enabled
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}
                          >
                            {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
                  Select a module to manage its sub-modules
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
