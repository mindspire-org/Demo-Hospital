import { useState } from 'react'
import { financeApi } from '../../utils/api'
import { PageHeader, Card, Button } from '../../components/finance/finance_ui'
import { BookUp, CheckCircle2 } from 'lucide-react'

export default function Finance_Settings(){
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function seed(){
    setBusy(true); setStatus(null)
    try {
      const r: any = await financeApi.seedChartOfAccounts()
      setStatus({ kind: 'ok', text: `Seeded ${r?.seeded || 0} default accounts.` })
    } catch (e: any) { setStatus({ kind: 'err', text: e?.message || 'Seed failed' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Settings" subtitle="Finance ERP configuration." />
      <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
        <Card title="Chart of Accounts">
          <p className="text-sm text-slate-600 dark:text-slate-300">Reseed the standard ERP chart of accounts. Existing accounts are left untouched; only missing codes are inserted.</p>
          <div className="mt-4">
            <Button variant="primary" disabled={busy} onClick={seed}>
              <BookUp className="h-4 w-4" />Load Standard COA
            </Button>
          </div>
        </Card>
        <Card title="Fiscal Period">
          <p className="text-sm text-slate-600">Period close and fiscal year configuration will live here. Periods auto-roll on calendar boundaries today.</p>
        </Card>
        {status && (
          <div className={`md:col-span-2 rounded-md border px-4 py-3 text-sm ${status.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {status.kind === 'ok' && <CheckCircle2 className="mr-2 inline-block h-4 w-4" />}
            {status.text}
          </div>
        )}
      </div>
    </div>
  )
}
