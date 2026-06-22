import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { WifiOff } from 'lucide-react'
import { superAdminApi } from '../features/superAdmin'
import { resolveSubModule, getAllModuleIds, getAllSubModules } from '../config/moduleRegistry'

const CACHE_KEY = 'jinnah.systemConfig'

export type SystemConfig = {
  modules: Record<string, { enabled: boolean; subModules: Record<string, { enabled: boolean }> }>
  homeModules: string[]
  version: number
  updatedAt?: string
}

type SystemConfigCtx = {
  config: SystemConfig | null
  isLoading: boolean
  isOffline: boolean
  refresh: () => Promise<void>
  getModuleEnabled: (moduleId: string) => boolean
  getSubModuleEnabled: (moduleId: string, subId: string) => boolean
  isPathVisible: (moduleId: string, path: string) => boolean
}

const SystemConfigContext = createContext<SystemConfigCtx | undefined>(undefined)

function readCache(): SystemConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function writeCache(config: SystemConfig) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(config)) } catch {}
}

function buildDefault(): SystemConfig {
  const modules: any = {}
  for (const modId of getAllModuleIds()) {
    modules[modId] = { enabled: false, subModules: {} }
  }
  // Default visible portals before super-admin configuration
  modules.hospital = { enabled: true, subModules: {} }
  modules.finance = { enabled: true, subModules: {} }

  // Default visible hospital sub-modules
  const defaultHospitalSubs = ['tokenGen', 'doctor', 'admin', 'dentalRx', 'eyeRx']
  for (const subId of getAllSubModules('hospital')) {
    modules.hospital.subModules[subId] = { enabled: defaultHospitalSubs.includes(subId) }
  }

  return { modules, homeModules: ['hospital', 'finance'], version: 1 }
}

export function SystemConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SystemConfig | null>(readCache)
  const [isLoading, setIsLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const mounted = useRef(true)
  const configRef = useRef<SystemConfig | null>(config)
  useEffect(() => { configRef.current = config }, [config])

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await superAdminApi.getPublicConfig()
      if (!mounted.current) return
      const next: SystemConfig = {
        modules: data.modules || {},
        homeModules: data.homeModules || getAllModuleIds(),
        version: data.version || 1,
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
      // Only update state if server config is newer or different
      const current = configRef.current
      if (!current || !current.updatedAt || current.updatedAt !== next.updatedAt || current.version !== next.version) {
        setConfig(next)
        writeCache(next)
        setIsOffline(false)
      }
    } catch (err) {
      if (!mounted.current) return
      const cached = readCache()
      if (!cached) {
        setConfig(buildDefault())
      }
      setIsOffline(true)
    } finally {
      if (mounted.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    // Initial load: use cache immediately, then revalidate
    if (!config) setConfig(buildDefault())
    fetchConfig()
    return () => { mounted.current = false }
  }, [])

  // Re-fetch when user returns to the tab
  useEffect(() => {
    const onFocus = () => fetchConfig()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchConfig])

  // Re-fetch when another tab writes or clears the cache
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY) fetchConfig()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fetchConfig])

  // Periodic background poll — keeps all tabs/clients in sync
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      fetchConfig()
    }, 30000)
    return () => clearInterval(id)
  }, [fetchConfig])

  // BroadcastChannel for instant cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel('jinnah-config-sync')
    bc.onmessage = (ev) => {
      if (ev.data?.type === 'invalidate') fetchConfig()
    }
    return () => bc.close()
  }, [fetchConfig])

  const getModuleEnabled = useCallback((moduleId: string) => {
    if (!config) return true
    return config.modules?.[moduleId]?.enabled !== false
  }, [config])

  const getSubModuleEnabled = useCallback((moduleId: string, subId: string) => {
    if (!config) return true
    const mod = config.modules?.[moduleId]
    if (!mod?.enabled) return false
    return mod.subModules?.[subId]?.enabled !== false
  }, [config])

  const isPathVisible = useCallback((moduleId: string, path: string) => {
    if (!config) return true
    if (!getModuleEnabled(moduleId)) return false
    const subId = resolveSubModule(moduleId, path)
    if (subId && !getSubModuleEnabled(moduleId, subId)) return false
    return true
  }, [config, getModuleEnabled, getSubModuleEnabled])

  const value: SystemConfigCtx = {
    config,
    isLoading,
    isOffline,
    refresh: fetchConfig,
    getModuleEnabled,
    getSubModuleEnabled,
    isPathVisible,
  }

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
      {isOffline && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1.5 shadow-md hover:bg-amber-200 transition-colors cursor-default"
          title="Running in offline mode — using cached settings"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Offline</span>
        </div>
      )}
    </SystemConfigContext.Provider>
  )
}

export function useSystemConfig(): SystemConfigCtx {
  const ctx = useContext(SystemConfigContext)
  if (!ctx) throw new Error('useSystemConfig must be used within SystemConfigProvider')
  return ctx
}
