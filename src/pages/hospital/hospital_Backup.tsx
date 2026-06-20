import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CalendarClock,
  HardDrive,
  FileJson,
  Clock,
  CheckCircle2,
  Activity,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const LAST_BACKUP_KEY = 'hospital_last_backup'
const AUTO_SETTINGS_KEY = 'hospital_backup_settings'

type AutoSettings = {
  enabled: boolean
  minutes: number
  folderPath: string
}

export default function Hospital_Backup() {
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem(LAST_BACKUP_KEY))
  const [settings, setSettings] = useState<AutoSettings>(() => {
    try { const raw = localStorage.getItem(AUTO_SETTINGS_KEY); return raw ? JSON.parse(raw) : { enabled: false, minutes: 60, folderPath: '' } }
    catch { return { enabled: false, minutes: 60, folderPath: '' } }
  })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [purging, setPurging] = useState(false)
  const [showPurge, setShowPurge] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<{ dbName: string; totalCollections: number; totalDocs: number; collections: { name: string; count: number }[]; at: string } | null>(null)
  const [showAllCollections, setShowAllCollections] = useState(false)

  const [autoBackups, setAutoBackups] = useState<{ file: string; size: number; createdAt: string }[]>([])
  const [autoBackupsLoading, setAutoBackupsLoading] = useState(false)

  useEffect(() => { localStorage.setItem(AUTO_SETTINGS_KEY, JSON.stringify(settings)) }, [settings])

  useEffect(() => {
    if (!settings.enabled) return
    const id = setInterval(() => {
      const now = Date.now()
      const last = Number(localStorage.getItem(LAST_BACKUP_KEY) || 0)
      const interval = settings.minutes * 60 * 1000
      if (now - last >= interval) {
        adminApi.exportAll().then((data) => {
          localStorage.setItem(LAST_BACKUP_KEY, String(now))
          setLastBackup(String(now))
          try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `auto-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`
            a.click()
            URL.revokeObjectURL(url)
          } catch {}
        }).catch(() => {})
      }
    }, 60000)
    return () => clearInterval(id)
  }, [settings])

  const loadStats = async () => {
    setStatsLoading(true)
    try { const res = await adminApi.dbStats(); setStats(res) }
    catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to load snapshot' }) }
    setStatsLoading(false)
  }

  const loadAutoBackups = async () => {
    setAutoBackupsLoading(true)
    try { const res = await adminApi.listAutoBackups(); setAutoBackups(res.backups || []) }
    catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to load auto backups' }) }
    setAutoBackupsLoading(false)
  }

  useEffect(() => { loadStats(); loadAutoBackups() }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await adminApi.exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`
      a.click()
      URL.revokeObjectURL(url)
      localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
      setLastBackup(String(Date.now()))
      setToast({ type: 'success', message: 'Backup downloaded successfully' })
      loadAutoBackups()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Export failed' }) }
    setExporting(false)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await adminApi.restoreAll(data)
      setToast({ type: 'success', message: 'Data restored successfully' })
      setFile(null)
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Restore failed' }) }
    setImporting(false)
  }

  const handlePurge = async () => {
    setPurging(true)
    try {
      await adminApi.purgeAll()
      setToast({ type: 'success', message: 'All data purged' })
      setShowPurge(false)
      loadStats(); loadAutoBackups()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Purge failed' }) }
    setPurging(false)
  }

  const lastDate = useMemo(() => {
    if (!lastBackup) return '-'
    try { return new Date(Number(lastBackup)).toLocaleString() } catch { return '-' }
  }, [lastBackup])

  const nextAutoIn = useMemo(() => {
    if (!settings.enabled || !lastBackup) return null
    const elapsed = Date.now() - Number(lastBackup)
    const remaining = settings.minutes * 60 * 1000 - elapsed
    if (remaining <= 0) return 'Due now'
    const mins = Math.ceil(remaining / 60000)
    return `${mins} min${mins > 1 ? 's' : ''}`
  }, [settings, lastBackup])

  const topCollections = useMemo(() => {
    if (!stats) return []
    return showAllCollections ? stats.collections : stats.collections.slice(0, 8)
  }, [stats, showAllCollections])

  const formatBytes = (b?: number) => {
    if (!b) return '0 B'
    const kb = b / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="rounded-2xl bg-linear-to-r from-sky-600 to-indigo-600 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold">Backup &amp; Restore</div>
            <div className="mt-1 text-sm text-white/90">Protect your hospital data with scheduled backups and instant snapshots.</div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Last backup: <span className="font-semibold">{lastDate}</span></span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <Database className="h-3.5 w-3.5" /> Database
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">{stats?.dbName || '—'}</div>
          <div className="mt-1 text-xs text-slate-500">{stats ? `${stats.totalCollections} collections` : statsLoading ? 'Loading…' : '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <HardDrive className="h-3.5 w-3.5" /> Total Documents
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">{stats ? stats.totalDocs.toLocaleString() : statsLoading ? '…' : '—'}</div>
          <div className="mt-1 text-xs text-slate-500">across all collections</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" /> Auto Backup
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">{settings.enabled ? 'On' : 'Off'}</div>
          <div className="mt-1 text-xs text-slate-500">{settings.enabled ? `Every ${settings.minutes} min` : 'Disabled'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Next Auto
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">{nextAutoIn || '—'}</div>
          <div className="mt-1 text-xs text-slate-500">{settings.enabled && lastBackup ? 'Counting down' : 'N/A'}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={handleExport} disabled={exporting} className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md disabled:opacity-50">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-600 transition group-hover:bg-sky-100">
            <Download className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-semibold text-slate-800">Export Backup</div>
          <div className="mt-1 text-xs text-slate-500">Download full database as JSON.</div>
          <div className="mt-3 text-xs font-medium text-sky-600">{exporting ? 'Creating backup…' : 'Click to export →'}</div>
        </button>

        <label className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md cursor-pointer">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition group-hover:bg-emerald-100">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-3 text-base font-semibold text-slate-800">Restore Backup</div>
          <div className="mt-1 text-xs text-slate-500">Upload a JSON backup to restore data.</div>
          <input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setToast({ type: 'info', message: `Selected: ${f.name}` }) } }} />
          <div className="mt-3 text-xs font-medium text-emerald-600">{file ? file.name : 'Choose file →'}</div>
        </label>

        {file && (
          <button onClick={handleImport} disabled={importing} className="flex flex-col items-start rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:bg-emerald-100 disabled:opacity-50">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Save className="h-5 w-5" /></div>
            <div className="mt-3 text-base font-semibold text-slate-800">Confirm Restore</div>
            <div className="mt-1 text-xs text-slate-500">This will overwrite existing data.</div>
            <div className="mt-3 text-xs font-medium text-emerald-700">{importing ? 'Restoring…' : 'Click to restore →'}</div>
          </button>
        )}

        {!file && (
          <button onClick={() => setShowPurge(true)} className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-rose-300 hover:shadow-md">
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600 transition group-hover:bg-rose-100">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-base font-semibold text-slate-800">Purge Data</div>
            <div className="mt-1 text-xs text-slate-500">Permanently delete all records.</div>
            <div className="mt-3 text-xs font-medium text-rose-600">Danger zone →</div>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-600" />
            <div className="text-sm font-extrabold text-slate-800">Database Snapshot</div>
          </div>
          <button onClick={loadStats} disabled={statsLoading} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="px-5 py-4">
          {statsLoading && !stats && <div className="py-8 text-center text-sm text-slate-500">Loading snapshot…</div>}
          {stats && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-500">Collections</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">{stats.totalCollections}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-500">Total Documents</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">{stats.totalDocs.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-500">Snapshot Time</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{new Date(stats.at).toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="space-y-2">
                {topCollections.map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-28 truncate text-xs font-medium text-slate-600">{c.name}</div>
                    <div className="flex-1 rounded-full bg-slate-100">
                      <div className="h-2.5 rounded-full bg-sky-500" style={{ width: `${stats.totalDocs ? (c.count / stats.totalDocs) * 100 : 0}%` }} />
                    </div>
                    <div className="w-16 text-right text-xs font-semibold text-slate-700">{c.count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {stats.collections.length > 8 && (
                <button onClick={() => setShowAllCollections(v => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700">
                  {showAllCollections ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {stats.collections.length} collections</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-emerald-600" />
            <div className="text-sm font-extrabold text-slate-800">Auto Backup Files</div>
          </div>
          <button onClick={loadAutoBackups} disabled={autoBackupsLoading} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${autoBackupsLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="px-5 py-4">
          {autoBackupsLoading && !autoBackups.length && <div className="py-8 text-center text-sm text-slate-500">Loading backups…</div>}
          {!autoBackupsLoading && autoBackups.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No auto backup files found yet.</div>}
          {autoBackups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">File</th>
                    <th className="px-3 py-2 text-left">Size</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {autoBackups.map(b => (
                    <tr key={b.file} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-xs">{b.file}</td>
                      <td className="px-3 py-2 text-xs">{formatBytes(b.size)}</td>
                      <td className="px-3 py-2 text-xs">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
          <CalendarClock className="h-4 w-4 text-sky-600" /> Auto Backup Settings
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 cursor-pointer">
            <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 transition" style={{ backgroundColor: settings.enabled ? '#0ea5e9' : undefined }}>
              <input type="checkbox" className="sr-only" checked={settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Enable automatic backups</span>
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Interval (minutes)</label>
            <input type="number" min={5} value={settings.minutes} onChange={e => setSettings(s => ({ ...s, minutes: Math.max(5, Number(e.target.value) || 60) }))} className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
          </div>
          <div className="text-xs text-slate-500">Backups are saved to the server backup folder and can be viewed above.</div>
        </div>
      </div>

      {showPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <div className="text-base font-bold">Purge All Data</div>
            </div>
            <p className="mt-2 text-sm text-slate-600">This will permanently delete ALL records across every collection. This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowPurge(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handlePurge} disabled={purging} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                {purging ? 'Purging…' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
