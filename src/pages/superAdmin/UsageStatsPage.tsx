import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../features/superAdmin'
import { ArrowLeft, Home, BarChart3, Loader2 } from 'lucide-react'

export default function UsageStatsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const data = await superAdminApi.getUsageStats()
      setStats(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/super-admin')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Home">
            <Home className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Usage Stats</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Super Admins</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalAdmins || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Enabled Modules</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.enabledModules?.length || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Max Users</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.maxUsers || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">License Key</div>
                <div className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-1 truncate" title={stats.licenseKey}>{stats.licenseKey?.slice(0, 8)}...</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Enabled Sub-modules</h2>
              <div className="space-y-4">
                {Object.entries(stats.enabledSubModules || {}).map(([modId, subs]: [string, any]) => (
                  <div key={modId}>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{modId}</div>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub: string) => (
                        <span key={sub} className="inline-flex rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs px-2.5 py-1 font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">No usage data available.</div>
        )}
      </main>
    </div>
  )
}
