import { useEffect, useRef, useState } from 'react'
import { logAudit } from '../../utils/hospital_audit'
import { adminApi } from '../../utils/api'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import {
  Download, Upload, Trash2, Camera, RefreshCw, Database, HardDrive,
  Clock, Shield, AlertTriangle, CheckCircle2, XCircle, FileJson,
  Server, Layers, ChevronUp
} from 'lucide-react'

type Snapshot = { filename: string; size: number; modified: string }
type BackupStatus = {
  autoBackup: {
    enabled: boolean; cronExpression: string; lastRun: string | null;
    running: boolean; retentionCount: number; backupDir: string;
  }
  snapshotCount: number; totalSizeBytes: number;
  dbStats: {
    name: string; collections: number; totalDocs: number;
    collectionStats: { name: string; count: number }[]
  }
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'Never'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

const LAST_BACKUP_KEY = 'hospital_last_backup'

export default function Hospital_Backup() {
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem(LAST_BACKUP_KEY))
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [purgeStep, setPurgeStep] = useState(0) // 0=closed, 1=first confirm, 2=type PURGE, 3=final confirm
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState<{ filename: string } | null>(null)
  const [confirmSnapDeleteOpen, setConfirmSnapDeleteOpen] = useState<{ filename: string } | null>(null)
  const [showCollections, setShowCollections] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showBanner = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 3000)
  }

  const refresh = async () => {
    try {
      const [s, sn] = await Promise.all([adminApi.getStatus(), adminApi.listSnapshots()])
      setStatus(s as any)
      setSnapshots((sn as any)?.snapshots || [])
    } catch {}
  }

  useEffect(() => { refresh() }, [])

  // ── Actions ──────────────────────────────────────────────────────

  const doExport = async () => {
    setBusy('export')
    try {
      const payload = await adminApi.exportAll() as any
      const ts = String(payload?._meta?.ts || new Date().toISOString())
      const stamp = ts.replace(/[:T]/g, '-').slice(0, 19)
      const dbName = String(payload?._meta?.db || 'hospital_dev')
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `backup-${dbName}-${stamp}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      localStorage.setItem(LAST_BACKUP_KEY, ts)
      setLastBackup(ts)
      showBanner('success', 'Backup exported successfully')
      logAudit('user_edit', 'backup exported')
      refresh()
    } catch { showBanner('error', 'Export failed') }
    finally { setBusy(null) }
  }

  const doCreateSnapshot = async () => {
    setBusy('snapshot')
    try {
      await adminApi.createSnapshot()
      showBanner('success', 'Snapshot created on server')
      logAudit('user_edit', 'snapshot created')
      refresh()
    } catch { showBanner('error', 'Snapshot creation failed') }
    finally { setBusy(null) }
  }

  const doDownloadSnapshot = async (filename: string) => {
    setBusy('dl-' + filename)
    try {
      const payload = await adminApi.downloadSnapshot(filename) as any
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
      showBanner('success', 'Snapshot downloaded')
    } catch { showBanner('error', 'Download failed') }
    finally { setBusy(null) }
  }

  const doRestoreSnapshot = async (filename: string) => {
    setBusy('restore-' + filename)
    try {
      await adminApi.restoreSnapshot(filename)
      showBanner('success', 'Snapshot restored — reloading…')
      logAudit('user_edit', `snapshot restored: ${filename}`)
      setTimeout(() => { try { window.location.reload() } catch {} }, 1200)
    } catch { showBanner('error', 'Restore failed') }
    finally { setBusy(null); setConfirmRestoreOpen(null) }
  }

  const doDeleteSnapshot = async (filename: string) => {
    setBusy('del-' + filename)
    try {
      await adminApi.deleteSnapshot(filename)
      showBanner('success', 'Snapshot deleted')
      logAudit('user_delete', `snapshot deleted: ${filename}`)
      refresh()
    } catch { showBanner('error', 'Delete failed') }
    finally { setBusy(null); setConfirmSnapDeleteOpen(null) }
  }

  const triggerImport = () => fileInputRef.current?.click()

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy('import')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await adminApi.restoreAll(data)
      showBanner('success', 'Backup imported — reloading…')
      logAudit('user_edit', 'backup imported (file)')
      setTimeout(() => { try { window.location.reload() } catch {} }, 1200)
    } catch { showBanner('error', 'Invalid backup file or import failed') }
    finally { setBusy(null); e.target.value = '' }
  }

  const [purgeInput, setPurgeInput] = useState('')

  const confirmPurgeAll = async () => {
    setPurgeStep(0)
    setPurgeInput('')
    setBusy('purge')
    try {
      await adminApi.purgeAll()
      setLastBackup(null)
      showBanner('success', 'All data purged — reloading…')
      logAudit('user_delete', 'purge all data')
      setTimeout(() => { try { window.location.reload() } catch {} }, 1200)
    } catch { showBanner('error', 'Purge failed') }
    finally { setBusy(null) }
  }

  const cancelPurge = () => { setPurgeStep(0); setPurgeInput('') }

  const auto = status?.autoBackup
  const db = status?.dbStats
  const snapshotCount = snapshots.length
  const snapshotTotalSize = snapshots.reduce((sum, s) => sum + (Number(s.size) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-linear-to-r from-slate-800 via-slate-700 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Backup & Recovery</h2>
            <p className="mt-0.5 text-sm font-medium text-white/70">Full database backup, snapshots, import/export & disaster recovery</p>
          </div>
        </div>
      </div>

      {/* Banner Toast */}
      {banner && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm ${banner.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {banner.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {banner.msg}
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Database className="h-3.5 w-3.5" /> Database
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{db?.name || '—'}</div>
          <div className="mt-1 text-xs text-slate-500">{db?.collections || 0} collections • {db?.totalDocs?.toLocaleString() || 0} docs</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Camera className="h-3.5 w-3.5" /> Snapshots
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{status ? snapshotCount : '—'}</div>
          <div className="mt-1 text-xs text-slate-500">{fmtBytes(snapshotTotalSize)} total</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-3.5 w-3.5" /> Auto-Backup
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${auto?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${auto?.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {auto?.enabled ? 'Active' : 'Off'}
            </span>
            <span className="text-sm font-bold text-slate-700">{auto?.cronExpression || '—'}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Last: {fmtDate(auto?.lastRun)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <HardDrive className="h-3.5 w-3.5" /> Last Export
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{lastBackup ? fmtDate(lastBackup) : 'Never'}</div>
          <div className="mt-1 text-xs text-slate-500">Retention: {auto?.retentionCount || 30} files</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Layers className="h-4 w-4 text-violet-500" /> Quick Actions
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button onClick={doExport} disabled={!!busy}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50">
              <Download className="h-5 w-5" />
              Export Backup
            </button>
            <button onClick={doCreateSnapshot} disabled={!!busy}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50">
              <Camera className="h-5 w-5" />
              {busy === 'snapshot' ? 'Creating…' : 'New Snapshot'}
            </button>
            <button onClick={triggerImport} disabled={!!busy}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
              <Upload className="h-5 w-5" />
              Import Backup
            </button>
            <button onClick={refresh} disabled={!!busy}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-5 w-5 ${busy === 'export' ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => setShowCollections(v => !v)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700">
              <Server className="h-5 w-5" />
              Collections
            </button>
            <button onClick={() => setPurgeStep(1)} disabled={!!busy}
              className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-white p-4 text-sm font-bold text-rose-600 transition-all hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50">
              <Trash2 className="h-5 w-5" />
              Purge All
            </button>
          </div>
          <input ref={fileInputRef} onChange={onImportFile} type="file" accept="application/json" className="hidden" />
        </div>
      </div>

      {/* Collection Stats (collapsible) */}
      {showCollections && db && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Server className="h-4 w-4 text-amber-500" /> Database Collections
            </div>
            <button onClick={() => setShowCollections(false)} className="text-xs text-slate-500 hover:text-slate-700">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-64 overflow-y-auto">
              {(db.collectionStats || []).map(c => (
                <div key={c.name} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-xs font-bold text-slate-700 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.count.toLocaleString()} docs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Backup Info */}
      {auto && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-emerald-50/60 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <Clock className="h-4 w-4" /> Server Auto-Backup
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${auto.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-sm font-bold text-slate-800">{auto.enabled ? 'Running' : 'Disabled'}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Cron Schedule</div>
                <div className="mt-1 text-sm font-bold text-slate-800 font-mono">{auto.cronExpression}</div>
                <div className="text-xs text-slate-400">{auto.cronExpression === '0 2 * * *' ? 'Daily at 02:00 AM' : 'Custom schedule'}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Auto-Backup</div>
                <div className="mt-1 text-sm font-bold text-slate-800">{fmtDate(auto.lastRun)}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Backup Directory</div>
                <div className="mt-1 text-sm font-bold text-slate-800 truncate font-mono">{auto.backupDir}</div>
                <div className="text-xs text-slate-400">Keeps last {auto.retentionCount} files</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Camera className="h-4 w-4 text-violet-500" /> Server Snapshots
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{snapshotCount}</span>
        </div>
        <div className="p-5">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Camera className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500">No snapshots yet</p>
              <p className="text-xs text-slate-400">Create your first snapshot to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snapshots.map(s => (
                <div key={s.filename} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-violet-300 hover:shadow-md">
                  <div className="bg-linear-to-r from-violet-50 to-sky-50 px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-violet-500" />
                      <div className="text-xs font-bold text-slate-700 truncate">{s.filename}</div>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Size</span>
                      <span className="font-bold text-slate-700">{fmtBytes(s.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Date</span>
                      <span className="font-bold text-slate-700">{fmtDate(s.modified)}</span>
                    </div>
                  </div>
                  <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                    <button onClick={() => doDownloadSnapshot(s.filename)} disabled={busy === 'dl-' + s.filename}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-50">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                    <button onClick={() => setConfirmRestoreOpen({ filename: s.filename })} disabled={!!busy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                      <Upload className="h-3.5 w-3.5" /> Restore
                    </button>
                    <button onClick={() => setConfirmSnapDeleteOpen({ filename: s.filename })} disabled={!!busy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm">
        <div className="border-b border-rose-200 bg-rose-50/60 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Purge All Data</div>
              <div className="text-xs text-slate-500">Permanently delete all data from every module. User accounts are preserved. This cannot be undone.</div>
            </div>
            <button onClick={() => setPurgeStep(1)} disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Purge Database
            </button>
          </div>
        </div>
      </div>

      {/* Triple-Verification Purge Dialogs */}
      {/* Step 1: Initial warning */}
      <ConfirmDialog
        open={purgeStep === 1}
        title="⚠️ Step 1 of 3 — Purge All Data"
        message="This will permanently delete ALL data from every module (except user accounts). This action CANNOT be undone. Do you want to proceed?"
        confirmText="Yes, Continue"
        onCancel={cancelPurge}
        onConfirm={() => setPurgeStep(2)}
      />
      {/* Step 2: Type PURGE to confirm */}
      {purgeStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-base font-semibold text-rose-800">⚠️ Step 2 of 3 — Type PURGE to Confirm</div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-700">To confirm, type <span className="font-black text-rose-600 tracking-wider">PURGE</span> in the box below:</p>
              <input
                value={purgeInput}
                onChange={e => setPurgeInput(e.target.value)}
                placeholder="Type PURGE here"
                autoFocus
                className="w-full rounded-lg border-2 border-rose-300 px-4 py-2.5 text-center text-lg font-black tracking-widest outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={cancelPurge} className="btn-outline-navy">Cancel</button>
              <button type="button" disabled={purgeInput !== 'PURGE'} onClick={() => setPurgeStep(3)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed">Proceed to Final Step</button>
            </div>
          </div>
        </div>
      )}
      {/* Step 3: Final confirmation */}
      <ConfirmDialog
        open={purgeStep === 3}
        title="🔴 Step 3 of 3 — FINAL CONFIRMATION"
        message="This is your LAST chance. All data will be permanently destroyed and cannot be recovered. There is no undo. Proceed with purge?"
        confirmText="🔴 PURGE ALL DATA NOW"
        onCancel={cancelPurge}
        onConfirm={confirmPurgeAll}
      />
      <ConfirmDialog
        open={!!confirmRestoreOpen}
        title="⚠️ Restore Snapshot"
        message={`Restoring "${confirmRestoreOpen?.filename}" will REPLACE all current data with the snapshot data. This cannot be undone. Continue?`}
        confirmText="Restore Snapshot"
        onCancel={() => setConfirmRestoreOpen(null)}
        onConfirm={() => confirmRestoreOpen && doRestoreSnapshot(confirmRestoreOpen.filename)}
      />
      <ConfirmDialog
        open={!!confirmSnapDeleteOpen}
        title="Delete Snapshot"
        message={`Permanently delete "${confirmSnapDeleteOpen?.filename}" from the server?`}
        confirmText="Delete"
        onCancel={() => setConfirmSnapDeleteOpen(null)}
        onConfirm={() => confirmSnapDeleteOpen && doDeleteSnapshot(confirmSnapDeleteOpen.filename)}
      />
    </div>
  )
}
