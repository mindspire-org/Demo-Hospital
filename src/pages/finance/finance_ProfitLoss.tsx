import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import { RefreshCw, Printer, TrendingUp, TrendingDown, DollarSign, Percent, LineChart } from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

export default function Finance_ProfitLoss(){
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load(){ setLoading(true); try { setData(await financeApi.profitLoss({ from, to })) } finally { setLoading(false) } }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [from, to])

  const income = Number(data?.totals?.income || 0)
  const expense = Number(data?.totals?.expense || 0)
  const net = Number(data?.totals?.net || 0)
  const margin = income > 0 ? (net / income) * 100 : 0
  const profitable = net >= 0

  // Simple bar viz for income vs expense
  const max = Math.max(income, expense, 1)
  const incomePct = (income / max) * 100
  const expensePct = (expense / max) * 100

  const incomeRows = useMemo(() => (data?.income || []).slice().sort((a: any, b: any) => b.amount - a.amount), [data])
  const expenseRows = useMemo(() => (data?.expense || []).slice().sort((a: any, b: any) => b.amount - a.amount), [data])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={LineChart}
        title="Profit & Loss"
        subtitle={<span>Revenue vs. expenses from <strong>{from}</strong> to <strong>{to}</strong></span>}
        gradient={profitable ? 'from-emerald-600 via-teal-600 to-cyan-600' : 'from-rose-600 via-red-600 to-orange-600'}
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Profit & Loss',
              subtitle: `Period ${from || '—'} → ${to || '—'}`,
              columns: [
                { header: 'Section',  render: (r: any) => r._section },
                { header: 'Code', key: 'code' },
                { header: 'Account', key: 'name' },
                { header: 'Amount', render: (r: any) => fmtRs(r.amount), align: 'right' },
              ],
              rows: [
                ...(data?.income || []).map((r: any) => ({ ...r, _section: 'Income' })),
                ...(data?.expense || []).map((r: any) => ({ ...r, _section: 'Expense' })),
              ],
              totals: data ? [
                { label: 'Total Income',  value: fmtRs(data.totals.income) },
                { label: 'Total Expense', value: fmtRs(data.totals.expense) },
                { label: 'Net Income',    value: fmtRs(data.totals.net) },
              ] : [],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={TrendingUp} label="Total Income" value={loading ? '…' : fmtRs(income)} gradient="from-emerald-500 to-teal-600" tone="good" />
          <KpiCard icon={TrendingDown} label="Total Expense" value={loading ? '…' : fmtRs(expense)} gradient="from-rose-500 to-pink-600" tone="bad" />
          <KpiCard
            icon={DollarSign}
            label="Net Income"
            value={loading ? '…' : fmtRs(net)}
            tone={profitable ? 'good' : 'bad'}
            gradient={profitable ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'}
            hint={profitable ? 'Profit' : 'Loss'}
          />
          <KpiCard
            icon={Percent}
            label="Net Margin"
            value={loading ? '…' : `${margin.toFixed(1)}%`}
            tone={profitable ? 'good' : 'bad'}
            gradient="from-violet-500 to-purple-600"
            hint={income > 0 ? 'Net / Income' : 'No income'}
          />
        </div>

        {/* Income vs Expense visual bars */}
        <SectionCard title="Income vs. Expense" subtitle="Relative scale of the period">
          <div className="space-y-5 p-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400"><TrendingUp className="h-4 w-4" />Income</span>
                <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{fmtRs(income)}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-600 transition-all" style={{ width: `${incomePct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-400"><TrendingDown className="h-4 w-4" />Expenses</span>
                <span className="tabular-nums font-bold text-rose-700 dark:text-rose-400">{fmtRs(expense)}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/30">
                <div className="h-full rounded-full bg-linear-to-r from-rose-500 to-pink-600 transition-all" style={{ width: `${expensePct}%` }} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard
            title={<span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Income Accounts</span>}
            right={<span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{fmtRs(income)}</span>}
          >
            <ModernTable
              columns={[
                { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code}</span> },
                { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
                { key: 'amount', header: 'Amount', render: (r: any) => {
                  const pct = income > 0 ? (r.amount / income) * 100 : 0
                  return (
                    <div className="text-right">
                      <div className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{fmtRs(r.amount)}</div>
                      <div className="text-[10px] text-slate-400">{pct.toFixed(1)}%</div>
                    </div>
                  )
                }, className: 'text-right' },
              ]}
              rows={incomeRows.map((r: any, i: number) => ({ ...r, id: `i-${r.code}-${i}` }))}
              empty={loading ? 'Loading…' : 'No income in the period.'}
            />
          </SectionCard>

          <SectionCard
            title={<span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-600" />Expense Accounts</span>}
            right={<span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{fmtRs(expense)}</span>}
          >
            <ModernTable
              columns={[
                { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code}</span> },
                { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
                { key: 'amount', header: 'Amount', render: (r: any) => {
                  const pct = expense > 0 ? (r.amount / expense) * 100 : 0
                  return (
                    <div className="text-right">
                      <div className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.amount)}</div>
                      <div className="text-[10px] text-slate-400">{pct.toFixed(1)}%</div>
                    </div>
                  )
                }, className: 'text-right' },
              ]}
              rows={expenseRows.map((r: any, i: number) => ({ ...r, id: `e-${r.code}-${i}` }))}
              empty={loading ? 'Loading…' : 'No expenses in the period.'}
            />
          </SectionCard>
        </div>

        {/* NET INCOME banner */}
        <div className={`relative overflow-hidden rounded-2xl p-8 text-white shadow-xl ${profitable ? 'bg-linear-to-br from-emerald-600 via-teal-600 to-cyan-700' : 'bg-linear-to-br from-rose-600 via-red-600 to-orange-700'}`}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium uppercase tracking-widest text-white/80">Net {profitable ? 'Profit' : 'Loss'}</div>
              <div className="mt-1 text-4xl font-bold tracking-tight md:text-5xl tabular-nums">{fmtRs(net)}</div>
              <div className="mt-1 text-sm text-white/80">Margin: {margin.toFixed(2)}%</div>
            </div>
            <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20`}>
              {profitable ? <TrendingUp className="h-10 w-10" /> : <TrendingDown className="h-10 w-10" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
