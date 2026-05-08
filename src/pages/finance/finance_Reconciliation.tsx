import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { PageHeader, Card, Button, fmtRs } from '../../components/finance/finance_ui'
import { RefreshCw, Printer } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'

export default function Finance_Reconciliation(){
  const [data, setData] = useState<any>(null)
  async function load(){ setData(await financeApi.reconciliation()) }
  useEffect(() => { load() }, [])
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Reconciliation" subtitle="Journal cash vs physical cash counts & handovers." actions={
        <>
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Cash Reconciliation',
            subtitle: `As of ${new Date().toISOString().slice(0,10)}`,
            columns: [
              { header: 'Account', key: 'name' },
              { header: 'Amount',  render: (r: any) => fmtRs(r.value), align: 'right' },
            ],
            rows: [
              { name: 'CASH (journal)',   value: data?.cashBalance || 0 },
              { name: 'BANK (journal)',   value: data?.bankBalance || 0 },
              { name: 'Physical counts',  value: data?.countsTotal || 0 },
              { name: 'Difference',       value: data?.diff || 0 },
            ],
          })}><Printer className="h-4 w-4" />Print</Button>
        </>
      } />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
        <Box label="CASH (journal)" value={fmtRs(data?.cashBalance || 0)} />
        <Box label="BANK (journal)" value={fmtRs(data?.bankBalance || 0)} />
        <Box label="Counts total"   value={fmtRs(data?.countsTotal || 0)} />
        <Card className="md:col-span-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Difference (cash journal − counts)</span>
            <span className={Math.abs(data?.diff || 0) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}>{fmtRs(data?.diff || 0)}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
function Box({ label, value }: { label: string; value: string }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
