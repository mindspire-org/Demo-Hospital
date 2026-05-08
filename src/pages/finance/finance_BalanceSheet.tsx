import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs, todayIso } from '../../components/finance/finance_ui'
import { RefreshCw, Printer, Building2, Landmark, PiggyBank, Wallet, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'
import DatePickerModern from '../../components/DatePickerModern'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

export default function Finance_BalanceSheet(){
  const [asOf, setAsOf] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load(){ setLoading(true); try { setData(await financeApi.balanceSheet({ asOf })) } finally { setLoading(false) } }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [asOf])

  const totalAssets = Number(data?.totals?.assets || 0)
  const totalLiab = Number(data?.totals?.liabilities || 0)
  const totalEquity = Number(data?.totals?.equity || 0)
  const diff = Number(data?.totals?.diff || 0)
  const balanced = Math.abs(diff) < 0.01

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Landmark}
        title="Balance Sheet"
        subtitle={<span>Financial snapshot as of <strong>{asOf}</strong></span>}
        gradient="from-slate-800 via-slate-700 to-indigo-700"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Balance Sheet',
              subtitle: `As of ${asOf}`,
              columns: [
                { header: 'Section', render: (r: any) => r._section },
                { header: 'Account', key: 'name' },
                { header: 'Amount',  render: (r: any) => fmtRs(r.amount), align: 'right' },
              ],
              rows: [
                ...(data?.assets      || []).map((r: any) => ({ ...r, _section: 'Assets' })),
                ...(data?.liabilities || []).map((r: any) => ({ ...r, _section: 'Liabilities' })),
                ...(data?.equity      || []).map((r: any) => ({ ...r, _section: 'Equity' })),
              ],
              totals: data ? [
                { label: 'Total Assets',      value: fmtRs(data.totals.assets) },
                { label: 'Total Liabilities', value: fmtRs(data.totals.liabilities) },
                { label: 'Total Equity',      value: fmtRs(data.totals.equity) },
                { label: 'A – (L + E)',       value: fmtRs(data.totals.diff) },
              ] : [],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">As of</span>
        <DatePickerModern value={asOf} onChange={setAsOf} placeholder="As of date" />
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Building2} label="Total Assets" value={loading ? '…' : fmtRs(totalAssets)} gradient="from-emerald-500 to-teal-600" />
          <KpiCard icon={Landmark} label="Total Liabilities" value={loading ? '…' : fmtRs(totalLiab)} gradient="from-rose-500 to-pink-600" />
          <KpiCard icon={PiggyBank} label="Total Equity" value={loading ? '…' : fmtRs(totalEquity)} gradient="from-violet-500 to-purple-600" />
          <KpiCard
            icon={balanced ? CheckCircle2 : AlertTriangle}
            label="A = L + E"
            value={loading ? '…' : (balanced ? 'Balanced' : 'Off')}
            tone={balanced ? 'good' : 'bad'}
            gradient={balanced ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600'}
            hint={data ? `Diff: ${fmtRs(diff)}` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Assets */}
          <SectionCard
            title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />Assets</span>}
            right={<span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{fmtRs(totalAssets)}</span>}
          >
            <ModernTable
              columns={[
                { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code || '—'}</span> },
                { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
                { key: 'amount', header: 'Amount', render: (r: any) => <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{fmtRs(r.amount)}</span>, className: 'text-right' },
              ]}
              rows={(data?.assets || []).map((r: any, i: number) => ({ ...r, id: `a-${r.code}-${i}` }))}
              empty={loading ? 'Loading…' : 'No assets.'}
            />
          </SectionCard>

          {/* Liabilities + Equity */}
          <SectionCard
            title={<span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-rose-600" />Liabilities &amp; Equity</span>}
            right={<span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{fmtRs(totalLiab + totalEquity)}</span>}
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              Liabilities · <span className="ml-2 normal-case">{fmtRs(totalLiab)}</span>
            </div>
            <ModernTable
              columns={[
                { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code || '—'}</span> },
                { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
                { key: 'amount', header: 'Amount', render: (r: any) => <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.amount)}</span>, className: 'text-right' },
              ]}
              rows={(data?.liabilities || []).map((r: any, i: number) => ({ ...r, id: `l-${r.code}-${i}` }))}
              empty={loading ? 'Loading…' : 'None.'}
            />
            <div className="border-y border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              Equity · <span className="ml-2 normal-case">{fmtRs(totalEquity)}</span>
            </div>
            <ModernTable
              columns={[
                { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code || '—'}</span> },
                { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
                { key: 'amount', header: 'Amount', render: (r: any) => <span className="tabular-nums font-semibold text-violet-600 dark:text-violet-400">{fmtRs(r.amount)}</span>, className: 'text-right' },
              ]}
              rows={(data?.equity || []).map((r: any, i: number) => ({ ...r, id: `e-${r.code}-${i}` }))}
              empty={'None.'}
            />
          </SectionCard>
        </div>

        {/* Balance check */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${balanced ? 'bg-linear-to-br from-emerald-500 to-teal-600' : 'bg-linear-to-br from-amber-500 to-orange-600'} text-white shadow-lg`}>
                {balanced ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Accounting Equation</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">Assets = Liabilities + Equity</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Difference</div>
              <div className={`text-2xl font-bold tabular-nums ${balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {fmtRs(diff)}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
