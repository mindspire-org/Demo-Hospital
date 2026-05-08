import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import { RefreshCw, Printer, Coins, ArrowDownCircle, ArrowUpCircle, Wallet, Activity } from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

/** Petty Cash — simply the ledger of account PETTY_CASH. */
export default function Finance_PettyCash(){
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load(){ setLoading(true); try { setData(await financeApi.ledgerExplorer({ account: 'PETTY_CASH', from, to })) } finally { setLoading(false) } }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [from, to])

  const ledger = data?.ledger || []
  const { totalIn, totalOut } = useMemo(() => ({
    totalIn: ledger.reduce((s: number, r: any) => s + Number(r.debit || 0), 0),
    totalOut: ledger.reduce((s: number, r: any) => s + Number(r.credit || 0), 0),
  }), [ledger])
  const closing = Number(data?.closing || 0)
  const net = totalIn - totalOut

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Coins}
        title="Petty Cash"
        subtitle={<span>Small cash fund ledger &bull; {from} to {to}</span>}
        gradient="from-amber-600 via-orange-600 to-rose-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Petty Cash Ledger',
              subtitle: `Period ${from || '—'} → ${to || '—'}`,
              columns: [
                { header: 'Date',   key: 'dateIso' },
                { header: 'Source', key: 'refType' },
                { header: 'Memo',   key: 'memo' },
                { header: 'In',     render: (r: any) => r.debit  ? fmtRs(r.debit)  : '', align: 'right' },
                { header: 'Out',    render: (r: any) => r.credit ? fmtRs(r.credit) : '', align: 'right' },
                { header: 'Balance', render: (r: any) => fmtRs(r.balance), align: 'right' },
              ],
              rows: ledger,
              totals: data ? [{ label: 'Closing', value: fmtRs(closing) }] : [],
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
        {/* Highlight closing balance */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-600 via-orange-600 to-rose-600 p-8 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <div className="text-sm font-medium uppercase tracking-widest text-white/80">Current Closing Balance</div>
                <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">{fmtRs(closing)}</div>
                <div className="mt-1 text-sm text-white/80">Net flow this period: {net >= 0 ? '+' : ''}{fmtRs(net)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={ArrowDownCircle} label="Cash In" value={loading ? '…' : fmtRs(totalIn)} gradient="from-emerald-500 to-teal-600" tone="good" hint={`${ledger.filter((r: any) => r.debit).length} transactions`} />
          <KpiCard icon={ArrowUpCircle} label="Cash Out" value={loading ? '…' : fmtRs(totalOut)} gradient="from-rose-500 to-pink-600" tone="bad" hint={`${ledger.filter((r: any) => r.credit).length} transactions`} />
          <KpiCard icon={Activity} label="Total Movements" value={loading ? '…' : ledger.length} gradient="from-amber-500 to-orange-600" />
        </div>

        <SectionCard
          title={<span className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-600" />Petty Cash Movements</span>}
          subtitle={`${ledger.length} entries`}
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{r.refType || '—'}</span>
              ) },
              { key: 'memo',    header: 'Memo', render: (r: any) => <span>{r.memo || '—'}</span> },
              { key: 'debit',   header: 'In', render: (r: any) => r.debit ? (
                <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowDownCircle className="h-3.5 w-3.5" />{fmtRs(r.debit)}
                </span>
              ) : <span className="text-slate-300">—</span>, className: 'text-right' },
              { key: 'credit',  header: 'Out', render: (r: any) => r.credit ? (
                <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                  <ArrowUpCircle className="h-3.5 w-3.5" />{fmtRs(r.credit)}
                </span>
              ) : <span className="text-slate-300">—</span>, className: 'text-right' },
              { key: 'balance', header: 'Balance', render: (r: any) => (
                <span className={`tabular-nums font-bold ${r.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtRs(r.balance)}</span>
              ), className: 'text-right' },
            ]}
            rows={ledger.map((r: any, i: number) => ({ ...r, id: `${r._id}-${i}` }))}
            empty={loading ? 'Loading…' : 'No petty cash movements in this period.'}
            maxHeight="calc(100vh - 36rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}
