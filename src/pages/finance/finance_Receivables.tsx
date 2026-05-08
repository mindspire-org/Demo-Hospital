/**
 * Receivables pages — Patient AR, Corporate AR, AR Aging.
 * All three derive from the unified journal's AR / AR_CORPORATE accounts.
 */
import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { fmtRs } from '../../components/finance/finance_ui'
import { Printer, RefreshCw, Users, Building2, Clock, AlertTriangle, DollarSign, FileText, Hourglass } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable, BucketCard } from '../../components/finance/finance_modern'

function toneFor(bucket: string): 'good' | 'warn' | 'bad' {
  return bucket === '0-30' ? 'good' : bucket === '31-60' ? 'warn' : 'bad'
}

function BucketBadge({ bucket }: { bucket: string }){
  const tone = toneFor(bucket)
  const palette = {
    good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    warn: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    bad:  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${palette}`}>{bucket}</span>
}

function DaysBadge({ days }: { days: number }){
  const tone = days <= 30 ? 'good' : days <= 60 ? 'warn' : 'bad'
  const palette = {
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad:  'text-rose-600 dark:text-rose-400',
  }[tone]
  return <span className={`inline-flex items-center gap-1 font-medium ${palette}`}><Hourglass className="h-3 w-3" />{days}d</span>
}

export function Finance_PatientAR(){
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])
  const items = (data?.items || []).filter((i: any) => i.account === 'AR')
  const totalAR = items.reduce((s: number, r: any) => s + r.balance, 0)
  const overdue = items.filter((r: any) => r.days > 30)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Users}
        title="Patient AR"
        subtitle={`Outstanding from patients: ${fmtRs(totalAR)}`}
        gradient="from-blue-600 via-indigo-600 to-purple-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={() => {
              setLoading(true)
              financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
            }} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Patient AR',
              subtitle: `Outstanding from patients as of ${new Date().toISOString().slice(0,10)}`,
              columns: [
                { header: 'Date',    key: 'dateIso' },
                { header: 'Patient', render: (r: any) => r.patientName || '—' },
                { header: 'MRN',     render: (r: any) => r.mrn || '—' },
                { header: 'Source',  key: 'refType' },
                { header: 'Days',    render: (r: any) => `${r.days}d` },
                { header: 'Bucket',  key: 'bucket' },
                { header: 'Balance', render: (r: any) => fmtRs(r.balance), align: 'right' },
              ],
              rows: items,
              totals: [{ label: 'Total', value: fmtRs(totalAR) }],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <span className="text-sm text-slate-500 dark:text-slate-400">Data as of {new Date().toLocaleDateString()}</span>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={DollarSign} label="Total Outstanding" value={loading ? '…' : fmtRs(totalAR)} gradient="from-blue-500 to-indigo-600" />
          <KpiCard icon={Users} label="Patient Accounts" value={loading ? '…' : items.length} gradient="from-violet-500 to-purple-600" />
          <KpiCard icon={AlertTriangle} label="Overdue (>30d)" value={loading ? '…' : overdue.length} gradient="from-amber-500 to-orange-600" tone={overdue.length > 0 ? 'bad' : 'good'} />
        </div>

        <SectionCard
          title="Patient Accounts Receivable"
          subtitle={`${items.length} outstanding balances`}
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'patientName', header: 'Patient', render: (r: any) => <span className="font-medium">{r.patientName || '—'}</span> },
              { key: 'mrn', header: 'MRN', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.mrn || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{r.refType || '—'}</span>
              ) },
              { key: 'days', header: 'Days', render: (r: any) => <DaysBadge days={r.days} /> },
              { key: 'bucket', header: 'Bucket', render: (r: any) => <BucketBadge bucket={r.bucket} /> },
              { key: 'balance', header: 'Balance', render: (r: any) => (
                <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.balance)}</span>
              ), className: 'text-right' },
            ]}
            rows={items.map((r: any, i: number) => ({ ...r, id: `${r.refId}-${i}` }))}
            empty={loading ? 'Loading…' : 'No outstanding patient receivables.'}
            maxHeight="calc(100vh - 28rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}

export function Finance_CorporateAR(){
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])
  const items = (data?.items || []).filter((i: any) => i.account === 'AR_CORPORATE')
  const totalAR = items.reduce((s: number, r: any) => s + r.balance, 0)
  const overdue = items.filter((r: any) => r.days > 30)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Building2}
        title="Corporate AR"
        subtitle={`Outstanding from companies: ${fmtRs(totalAR)}`}
        gradient="from-teal-600 via-emerald-600 to-cyan-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={() => {
              setLoading(true)
              financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
            }} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'Corporate AR',
              subtitle: 'Outstanding from companies',
              columns: [
                { header: 'Date',    key: 'dateIso' },
                { header: 'Company', render: (r: any) => r.companyId || '—' },
                { header: 'Source',  key: 'refType' },
                { header: 'Days',    render: (r: any) => `${r.days}d` },
                { header: 'Bucket',  key: 'bucket' },
                { header: 'Balance', render: (r: any) => fmtRs(r.balance), align: 'right' },
              ],
              rows: items,
              totals: [{ label: 'Total', value: fmtRs(totalAR) }],
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <span className="text-sm text-slate-500 dark:text-slate-400">Data as of {new Date().toLocaleDateString()}</span>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={DollarSign} label="Total Outstanding" value={loading ? '…' : fmtRs(totalAR)} gradient="from-teal-500 to-emerald-600" />
          <KpiCard icon={Building2} label="Corporate Accounts" value={loading ? '…' : items.length} gradient="from-cyan-500 to-blue-600" />
          <KpiCard icon={AlertTriangle} label="Overdue (>30d)" value={loading ? '…' : overdue.length} gradient="from-amber-500 to-orange-600" tone={overdue.length > 0 ? 'bad' : 'good'} />
        </div>

        <SectionCard
          title="Corporate Accounts Receivable"
          subtitle={`${items.length} outstanding corporate balances`}
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'companyId', header: 'Company', render: (r: any) => <span className="font-medium">{r.companyId || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{r.refType || '—'}</span>
              ) },
              { key: 'days', header: 'Days', render: (r: any) => <DaysBadge days={r.days} /> },
              { key: 'bucket', header: 'Bucket', render: (r: any) => <BucketBadge bucket={r.bucket} /> },
              { key: 'balance', header: 'Balance', render: (r: any) => (
                <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.balance)}</span>
              ), className: 'text-right' },
            ]}
            rows={items.map((r: any, i: number) => ({ ...r, id: `${r.refId}-${i}` }))}
            empty={loading ? 'Loading…' : 'No outstanding corporate receivables.'}
            maxHeight="calc(100vh - 28rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}

export function Finance_ARAging(){
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])
  const buckets = data?.buckets || { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const allItems = data?.items || []
  const totalAR = Number(data?.total || 0)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={Clock}
        title="AR Aging"
        subtitle={`Total AR: ${fmtRs(totalAR)}`}
        gradient="from-amber-600 via-orange-600 to-rose-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={() => {
              setLoading(true)
              financeApi.receivablesAging().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
            }} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} variant="solid" onClick={() => printFinanceReport({
              title: 'AR Aging',
              subtitle: `As of ${new Date().toISOString().slice(0, 10)}`,
              columns: [
                { header: 'Date',    key: 'dateIso' },
                { header: 'Type',    key: 'account' },
                { header: 'Party',   render: (r: any) => r.patientName || r.companyId || '—' },
                { header: 'Source',  key: 'refType' },
                { header: 'Days',    render: (r: any) => `${r.days}d` },
                { header: 'Bucket',  key: 'bucket' },
                { header: 'Balance', render: (r: any) => fmtRs(r.balance), align: 'right' },
              ],
              rows: allItems,
              totals: Object.entries(buckets).map(([k, v]) => ({ label: k, value: fmtRs(Number(v)) })).concat([{ label: 'Total', value: fmtRs(totalAR) }]),
            })}>
              Print
            </HeroButton>
          </>
        }
      />

      <Toolbar>
        <span className="text-sm text-slate-500 dark:text-slate-400">Aging as of {new Date().toLocaleDateString()}</span>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Total AR banner */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-600 via-orange-600 to-rose-600 p-8 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <div className="text-sm font-medium uppercase tracking-widest text-white/80">Total Accounts Receivable</div>
                <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">{fmtRs(totalAR)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Aging bucket cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(buckets).map(([k, v]) => (
            <BucketCard key={k} label={`${k} days`} value={fmtRs(Number(v))} tone={toneFor(k)} />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard icon={FileText} label="Total Items" value={loading ? '…' : allItems.length} gradient="from-amber-500 to-orange-600" />
          <KpiCard icon={AlertTriangle} label="Overdue (>30d)" value={loading ? '…' : allItems.filter((r: any) => r.days > 30).length} gradient="from-rose-500 to-red-600" tone={allItems.filter((r: any) => r.days > 30).length > 0 ? 'bad' : 'good'} />
        </div>

        <SectionCard
          title="All Receivables"
          subtitle={`${allItems.length} outstanding items across all AR accounts`}
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'account', header: 'Type', render: (r: any) => (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.account === 'AR' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'}`}>
                  {r.account === 'AR' ? 'Patient' : 'Corporate'}
                </span>
              ) },
              { key: 'patientName', header: 'Party', render: (r: any) => <span className="font-medium">{r.patientName || r.companyId || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.refType || '—'}</span>
              ) },
              { key: 'days', header: 'Days', render: (r: any) => <DaysBadge days={r.days} /> },
              { key: 'bucket', header: 'Bucket', render: (r: any) => <BucketBadge bucket={r.bucket} /> },
              { key: 'balance', header: 'Balance', render: (r: any) => (
                <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs(r.balance)}</span>
              ), className: 'text-right' },
            ]}
            rows={allItems.map((r: any, i: number) => ({ ...r, id: `${r.refId}-${i}` }))}
            empty={loading ? 'Loading…' : 'No outstanding receivables.'}
            maxHeight="calc(100vh - 36rem)"
          />
        </SectionCard>
      </div>
    </div>
  )
}
