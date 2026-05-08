import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import { RefreshCw, Printer, Scale, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Search } from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

export default function Finance_TrialBalance(){
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  async function load(){
    setLoading(true); setErr(null)
    try { setData(await financeApi.trialBalance({ from, to })) }
    catch (e: any) { setErr(e?.message || 'Failed') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [from, to])

  const allRows = (data?.rows || []).filter((r: any) => r.debits !== 0 || r.credits !== 0)
  const rows = useMemo(() => {
    if (!query.trim()) return allRows
    const q = query.toLowerCase()
    return allRows.filter((r: any) =>
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.code || '').toLowerCase().includes(q) ||
      String(r.type || '').toLowerCase().includes(q)
    )
  }, [allRows, query])

  const balanced = data && Math.abs(Number(data?.totals?.diff || 0)) < 0.01

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Scale}
        title="Trial Balance"
        subtitle={<span>All accounts with debit / credit totals from <strong>{from}</strong> to <strong>{to}</strong></span>}
        gradient="from-indigo-600 via-blue-600 to-cyan-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Trial Balance',
              subtitle: `Period ${from || '—'} → ${to || '—'}`,
              columns: [
                { header: 'Code', key: 'code' },
                { header: 'Account', key: 'name' },
                { header: 'Type', key: 'type' },
                { header: 'Debits',  render: (r: any) => fmtRs(r.debits),  align: 'right' },
                { header: 'Credits', render: (r: any) => fmtRs(r.credits), align: 'right' },
                { header: 'Balance', render: (r: any) => `${fmtRs(Math.abs(r.balance))} ${r.balance >= 0 ? 'Dr' : 'Cr'}`, align: 'right' },
              ],
              rows,
              totals: data ? [
                { label: 'Total Debits',  value: fmtRs(data.totals.debits) },
                { label: 'Total Credits', value: fmtRs(data.totals.credits) },
                { label: 'Difference',    value: fmtRs(data.totals.diff) },
              ] : [],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
        <div className="relative ml-auto w-full md:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search account / code / type…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 md:w-72 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {err && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" /> {err}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={TrendingUp} label="Total Debits" value={loading ? '…' : fmtRs(data?.totals?.debits || 0)} gradient="from-emerald-500 to-teal-600" />
          <KpiCard icon={TrendingDown} label="Total Credits" value={loading ? '…' : fmtRs(data?.totals?.credits || 0)} gradient="from-rose-500 to-pink-600" />
          <KpiCard
            icon={balanced ? CheckCircle2 : AlertTriangle}
            label="Balance Status"
            value={loading ? '…' : (balanced ? 'Balanced' : 'Unbalanced')}
            tone={balanced ? 'good' : 'bad'}
            gradient={balanced ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600'}
            hint={data ? `Diff: ${fmtRs(data.totals.diff)}` : undefined}
          />
          <KpiCard icon={Scale} label="Active Accounts" value={loading ? '…' : allRows.length} gradient="from-blue-500 to-indigo-600" />
        </div>

        <SectionCard
          title={`Accounts (${rows.length})`}
          subtitle="Accounts with activity during the selected period"
          right={data ? (
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Dr <span className="font-semibold text-emerald-600">{fmtRs(data.totals.debits)}</span></span>
              <span>Cr <span className="font-semibold text-rose-600">{fmtRs(data.totals.credits)}</span></span>
              <span>Δ <span className={`font-semibold ${balanced ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(data.totals.diff)}</span></span>
            </div>
          ) : null}
        >
          <ModernTable
            columns={[
              { key: 'code', header: 'Code', render: (r: any) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.code || '—'}</span> },
              { key: 'name', header: 'Account', render: (r: any) => <span className="font-medium">{r.name}</span> },
              { key: 'type', header: 'Type', render: (r: any) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.type || '—'}</span>
              ) },
              { key: 'debits',  header: 'Debits',  render: (r: any) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{r.debits ? fmtRs(r.debits) : '—'}</span>, className: 'text-right' },
              { key: 'credits', header: 'Credits', render: (r: any) => <span className="tabular-nums text-rose-600 dark:text-rose-400">{r.credits ? fmtRs(r.credits) : '—'}</span>, className: 'text-right' },
              { key: 'balance', header: 'Balance', render: (r: any) => (
                <span className={`tabular-nums font-semibold ${r.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmtRs(Math.abs(r.balance))} <span className="text-xs font-normal opacity-70">{r.balance >= 0 ? 'Dr' : 'Cr'}</span>
                </span>
              ), className: 'text-right' },
            ]}
            rows={rows.map((r: any, i: number) => ({ ...r, id: `${r.code}-${i}` }))}
            empty={loading ? 'Loading…' : query ? `No accounts match "${query}".` : 'No activity in period.'}
            maxHeight="calc(100vh - 32rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}
