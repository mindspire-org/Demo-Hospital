import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type BioConfig = {
  enabled: boolean
  ip: string
  port: number
  commPassword: number
  deviceId: string
  pollIntervalMs: number
  duplicateWindowSec: number
  cloudApiUrl: string
  mode: 'direct' | 'cloud'
}

export default function Hospital_BiometricSettings() {
  const [bioConfig, setBioConfig] = useState<BioConfig>({
    enabled: false, ip: '', port: 4370, commPassword: 0, deviceId: 'ZK-01',
    pollIntervalMs: 15000, duplicateWindowSec: 0, cloudApiUrl: 'https://sialkotmedical.healthspire.org/api', mode: 'direct',
  })
  const [bioSaving, setBioSaving] = useState(false)
  const [bioNotice, setBioNotice] = useState<string>('')

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await (hospitalApi as any).getBiometricConfig?.()
          if (!mounted) return
          if (res) setBioConfig(prev => ({ ...prev, ...res }))
        } catch (e) { console.error(e) }
      })()
    return () => { mounted = false }
  }, [])

  const saveBioConfig = async () => {
    setBioSaving(true)
    try {
      await (hospitalApi as any).updateBiometricConfig?.(bioConfig)
      setBioNotice('Biometric settings saved')
    } catch (e: any) {
      setBioNotice(e?.message || 'Failed to save')
    } finally {
      setBioSaving(false)
      setTimeout(() => setBioNotice(''), 2500)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Biometric Settings</div>

      {/* Biometric Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Biometric Device</div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Enabled</span>
            <input type="checkbox" checked={bioConfig.enabled} onChange={e => setBioConfig(c => ({ ...c, enabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Device IP</span>
            <input value={bioConfig.ip} onChange={e => setBioConfig(c => ({ ...c, ip: e.target.value }))} placeholder="192.168.1.201" className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Port</span>
            <input type="number" value={bioConfig.port} onChange={e => setBioConfig(c => ({ ...c, port: Number(e.target.value || 4370) }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Comm Password</span>
            <input type="number" value={bioConfig.commPassword} onChange={e => setBioConfig(c => ({ ...c, commPassword: Number(e.target.value || 0) }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Device ID</span>
            <input value={bioConfig.deviceId} onChange={e => setBioConfig(c => ({ ...c, deviceId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Cloud API URL</span>
            <input value={bioConfig.cloudApiUrl} onChange={e => setBioConfig(c => ({ ...c, cloudApiUrl: e.target.value }))} placeholder="https://your-domain.com/api" className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Mode</span>
            <select value={bioConfig.mode} onChange={e => setBioConfig(c => ({ ...c, mode: e.target.value as 'direct' | 'cloud' }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
              <option value="direct">Direct (Backend polls device)</option>
              <option value="cloud">Cloud (Local fetcher pushes data)</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Poller Time (Seconds)</span>
            <input type="number" value={bioConfig.pollIntervalMs / 1000} onChange={e => setBioConfig(c => ({ ...c, pollIntervalMs: Math.max(5, Number(e.target.value || 15)) * 1000 }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
            <p className="text-[10px] text-slate-500 mt-1">Recommended: 30-60s. Lower values may busy the server/device.</p>
          </label>
          <label className="block">
            <span className="block text-xs text-slate-600 dark:text-slate-400">Duplicate Window (sec)</span>
            <input type="number" value={bioConfig.duplicateWindowSec} onChange={e => setBioConfig(c => ({ ...c, duplicateWindowSec: Number(e.target.value || 0) }))} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={saveBioConfig} disabled={bioSaving} className="btn disabled:opacity-50">{bioSaving ? 'Saving...' : 'Save Biometric Settings'}</button>
          {bioNotice && <span className={`text-sm ${bioNotice.includes('Failed') || bioNotice.includes('NOT') ? 'text-rose-600' : bioNotice.includes('Fetcher OK') ? 'text-amber-700' : 'text-emerald-600'}`}>{bioNotice}</span>}
        </div>

        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {bioConfig.mode === 'cloud'
            ? 'Cloud mode: Run the local fetcher script on the PC connected to the biometric machine. It will push attendance data to this server automatically.'
            : 'Direct mode: The backend connects directly to the biometric device. Only works when the server and device are on the same network.'}
        </div>

        {/* Cloud Mode Deployment Checklist */}
        {bioConfig.mode === 'cloud' && bioConfig.enabled && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">Cloud Mode Deployment Checklist</div>
            <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
              <li>1. Install the fetcher service on the PC next to the biometric machine:</li>
              <li className="ml-3 font-mono text-[11px]">cd scripts/biometric-fetcher && npm install && node install-service.mjs</li>
              <li>2. The fetcher will push attendance to: <span className="font-mono text-[11px]">{bioConfig.cloudApiUrl || '(not set)'}</span></li>
              <li>3. Verify the service is running: open http://localhost:4500/health</li>
              <li>4. The fetcher auto-polls the device every {bioConfig.pollIntervalMs / 1000}s and pushes attendance to the cloud</li>
            </ul>
            <div className="mt-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('http://localhost:4500/health')
                    const data = await res.json()
                    setBioNotice(data.ok ? `Fetcher OK — device: ${data.device}, cursor: ${data.cursor || 'none'}` : 'Fetcher running but not connected')
                  } catch {
                    setBioNotice('Local fetcher NOT reachable — make sure the service is running on port 4500')
                  }
                  setTimeout(() => setBioNotice(''), 5000)
                }}
                className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
              >
                Check Fetcher Status
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
