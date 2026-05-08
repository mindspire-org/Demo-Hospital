import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { Select, fmtRs, firstOfMonth, todayIso } from '../../components/finance/finance_ui'
import { RefreshCw, Printer, BookOpen, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

export default function Finance_LedgerExplorer(){
  const [account, setAccount] = useState('CASH')
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(todayIso())
  const [data, setData] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { (async () => {
    try { const a: any = await financeApi.listChartOfAccounts(); setAccounts(Array.isArray(a) ? a : []) } catch {}
  })() }, [])

  async function load(){ setLoading(true); try { setData(await financeApi.ledgerExplorer({ account, from, to })) } finally { setLoading(false) } }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [account, from, to])

  const ledger = data?.ledger || []
  const { totalDr, totalCr } = useMemo(() => ({
    totalDr: ledger.reduce((s: number, r: any) => s + Number(r.debit || 0), 0),
    totalCr: ledger.reduce((s: number, r: any) => s + Number(r.credit || 0), 0),
  }), [ledger])
  const closing = Number(data?.closing || 0)
  const accountMeta = accounts.find(a => a.name === account)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={BookOpen}
        title="Ledger Explorer"
        subtitle={<span>Every journal line touching <strong>{accountMeta?.code ? `${accountMeta.code} · ` : ''}{account}</strong></span>}
        gradient="from-cyan-600 via-blue-600 to-indigo-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: `Ledger — ${account}`,
              subtitle: `Period ${from || '—'} → ${to || '—'}`,
              columns: [
                { header: 'Date',    key: 'dateIso' },
                { header: 'Source',  key: 'refType' },
                { header: 'Memo',    key: 'memo' },
                { header: 'Dr',      render: (r: any) => r.debit  ? fmtRs(r.debit)  : '', align: 'right' },
                { header: 'Cr',      render: (r: any) => r.credit ? fmtRs(r.credit) : '', align: 'right' },
                { header: 'Running', render: (r: any) => fmtRs(r.balance), align: 'right' },
              ],
              rows: ledger,
              totals: data ? [{ label: 'Closing Balance', value: fmtRs(closing) }] : [],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account</span>
        <Select value={account} onChange={e => setAccount(e.target.value)} className="min-w-[200px]">
          {accounts.map(a => <option key={a._id} value={a.name}>{a.code ? `${a.code} · ` : ''}{a.name}</option>)}
        </Select>
        <div className="ml-auto">
          <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
        </div>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={TrendingUp} label="Total Debits" value={loading ? '…' : fmtRs(totalDr)} gradient="from-emerald-500 to-teal-600" hint={`${ledger.filter((r: any) => r.debit).length} entries`} />
          <KpiCard icon={TrendingDown} label="Total Credits" value={loading ? '…' : fmtRs(totalCr)} gradient="from-rose-500 to-pink-600" hint={`${ledger.filter((r: any) => r.credit).length} entries`} />
          <KpiCard
            icon={Wallet}
            label="Closing Balance"
            value={loading ? '…' : fmtRs(Math.abs(closing))}
            tone={closing >= 0 ? 'good' : 'bad'}
            gradient={closing >= 0 ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'}
            hint={closing >= 0 ? 'Debit balance' : 'Credit balance'}
          />
          <KpiCard icon={BookOpen} label="Total Entries" value={loading ? '…' : ledger.length} gradient="from-blue-500 to-indigo-600" />
        </div>

        <SectionCard
          title={<span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-600" />Ledger for {account}</span>}
          subtitle={`${ledger.length} entries from ${from} to ${to}`}
          right={data ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
              Closing: {fmtRs(closing)}
            </span>
          ) : null}
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.refType || '—'}</span>
              ) },
              { key: 'memo',    header: 'Memo', render: (r: any) => <span className="text-slate-700 dark:text-slate-200">{r.memo || '—'}</span> },
              { key: 'debit',   header: 'Dr', render: (r: any) => r.debit ? (
                <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />{fmtRs(r.debit)}
                </span>
              ) : <span className="text-slate-300">—</span>, className: 'text-right' },
              { key: 'credit',  header: 'Cr', render: (r: any) => r.credit ? (
                <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="h-3 w-3" />{fmtRs(r.credit)}
                </span>
              ) : <span className="text-slate-300">—</span>, className: 'text-right' },
              { key: 'balance', header: 'Running', render: (r: any) => (
                <span className={`tabular-nums font-bold ${r.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtRs(r.balance)}</span>
              ), className: 'text-right' },
            ]}
            rows={ledger.map((r: any, i: number) => ({ ...r, id: `${r._id}-${i}` }))}
            empty={loading ? 'Loading…' : 'No entries in the selected period.'}
            maxHeight="calc(100vh - 28rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}
