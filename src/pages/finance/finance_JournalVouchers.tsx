/**
 * Journal Vouchers — list and create balanced manual journals.
 */
import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { Button, Input, Select, fmtRs, todayIso } from '../../components/finance/finance_ui'
import { Plus, RefreshCw, Trash2, Printer, BookOpenCheck, Filter, CheckCircle2, XCircle, Receipt, Scale, X } from 'lucide-react'
import DateRangeFilter from '../../components/finance/finance_DateRange'
import { printFinanceReport } from '../../components/finance/finance_print'
import DatePickerModern from '../../components/DatePickerModern'
import { HeroHeader, HeroButton, KpiCard, Toolbar, SectionCard, ModernTable } from '../../components/finance/finance_modern'

type Line = { account: string; debit?: number; credit?: number }

export default function Finance_JournalVouchers(){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [refType, setRefType] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [dateIso, setDateIso] = useState(todayIso())
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<Line[]>([{ account: '', debit: 0 }, { account: '', credit: 0 }])
  const [accounts, setAccounts] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)

  async function load(){
    setLoading(true); setErr(null)
    try {
      const res: any = await financeApi.listJournalVouchers({ from, to, refType, limit: 100 })
      setRows(res?.rows || [])
    } catch (e: any) { setErr(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [from, to, refType])
  useEffect(() => { (async () => {
    try { const a: any = await financeApi.listChartOfAccounts(); setAccounts(Array.isArray(a) ? a : []) } catch {}
  })() }, [])

  const debitTotal = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const creditTotal = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  const balanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0

  async function submit(){
    if (!balanced) { setErr('Journal must balance'); return }
    try {
      await financeApi.createJournalVoucher({ dateIso, memo, lines: lines.filter(l => l.account) })
      setShowNew(false); setLines([{ account: '', debit: 0 }, { account: '', credit: 0 }]); setMemo('')
      await load()
    } catch (e: any) { setErr(e?.message || 'Create failed') }
  }

  // Aggregated KPIs
  const totalDr = useMemo(() => rows.reduce((s, r: any) => s + (r.lines || []).reduce((x: number, l: any) => x + Number(l.debit || 0), 0), 0), [rows])
  const totalCr = useMemo(() => rows.reduce((s, r: any) => s + (r.lines || []).reduce((x: number, l: any) => x + Number(l.credit || 0), 0), 0), [rows])
  const activeCount = rows.filter((r: any) => r.status !== 'reversed').length
  const reversedCount = rows.length - activeCount

  const SOURCE_TYPES: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Sources' },
    { value: 'opd_token', label: 'OPD Token' },
    { value: 'ipd_payment', label: 'IPD Payment' },
    { value: 'er_billing', label: 'ER Payment' },
    { value: 'lab_order', label: 'Lab Order' },
    { value: 'pharmacy_sale', label: 'Pharmacy Sale' },
    { value: 'indoorpharmacy_dispense', label: 'Indoor Pharmacy' },
    { value: 'diagnostic_order', label: 'Diagnostic' },
    { value: 'aesthetic_token', label: 'Aesthetic' },
    { value: 'expense', label: 'Expense' },
    { value: 'vendor_bill', label: 'Vendor Bill' },
    { value: 'vendor_payment', label: 'Vendor Payment' },
    { value: 'staff_payout', label: 'Staff Payout' },
    { value: 'doctor_payout', label: 'Doctor Payout' },
    { value: 'manual_journal', label: 'Manual Journal' },
  ]

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <HeroHeader
        icon={BookOpenCheck}
        title="Journal Vouchers"
        subtitle="Every balanced double-entry posted across the hospital"
        gradient="from-violet-600 via-purple-600 to-fuchsia-600"
        actions={
          <>
            <HeroButton icon={RefreshCw} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </HeroButton>
            <HeroButton icon={Printer} onClick={() => printFinanceReport({
            title: 'Journal Vouchers',
            subtitle: `Period ${from || '—'} → ${to || '—'}${refType ? ' · ' + refType : ''}`,
            columns: [
              { header: 'Date',    key: 'dateIso' },
              { header: 'Source',  key: 'refType' },
              { header: 'Memo',    key: 'memo' },
              { header: 'Dr',      render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0)), align: 'right' },
              { header: 'Cr',      render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0)), align: 'right' },
              { header: 'Status',  render: (r: any) => r.status === 'reversed' ? 'Reversed' : 'Active' },
            ],
            rows,
          })}>Print</HeroButton>
            <HeroButton icon={Plus} variant="solid" onClick={() => setShowNew(true)}>New Voucher</HeroButton>
          </>
        }
      />

      <Toolbar>
        <DateRangeFilter value={{ from, to }} onChange={r => { setFrom(r.from); setTo(r.to) }} />
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <Select value={refType} onChange={e => setRefType(e.target.value)} className="min-w-[160px]">
            {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
      </Toolbar>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {err && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <XCircle className="h-4 w-4" /> {err}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Receipt} label="Total Vouchers" value={loading ? '…' : rows.length} gradient="from-violet-500 to-purple-600" />
          <KpiCard icon={CheckCircle2} label="Active" value={loading ? '…' : activeCount} gradient="from-emerald-500 to-teal-600" tone="good" />
          <KpiCard icon={XCircle} label="Reversed" value={loading ? '…' : reversedCount} gradient="from-rose-500 to-pink-600" tone={reversedCount > 0 ? 'bad' : 'neutral'} />
          <KpiCard icon={Scale} label="Total Amount" value={loading ? '…' : fmtRs(totalDr)} gradient="from-blue-500 to-indigo-600" hint={`Dr = Cr ${Math.abs(totalDr - totalCr) < 0.01 ? '✓' : '✗'}`} />
        </div>

        <SectionCard
          title={`Vouchers (${rows.length})`}
          subtitle="Balanced double-entry journal records"
        >
          <ModernTable
            columns={[
              { key: 'dateIso', header: 'Date', render: (r: any) => <span className="tabular-nums">{r.dateIso || '—'}</span> },
              { key: 'refType', header: 'Source', render: (r: any) => (
                <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{r.refType || '—'}</span>
              ) },
              { key: 'memo', header: 'Memo', render: (r: any) => <span className="text-slate-700 dark:text-slate-200">{r.memo || '—'}</span> },
              { key: 'debit', header: 'Dr', render: (r: any) => <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0))}</span>, className: 'text-right' },
              { key: 'credit', header: 'Cr', render: (r: any) => <span className="tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0))}</span>, className: 'text-right' },
              { key: 'status', header: 'Status', render: (r: any) => r.status === 'reversed'
                ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><XCircle className="h-3 w-3" />Reversed</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />Active</span>
              },
            ]}
            rows={rows.map(r => ({ ...r, id: r._id }))}
            empty={loading ? 'Loading…' : 'No vouchers found for the selected filters.'}
            maxHeight="calc(100vh - 32rem)"
          />
        </SectionCard>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* gradient header */}
            <div className="relative overflow-hidden bg-linear-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                    <BookOpenCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">New Journal Voucher</h3>
                    <p className="text-xs text-white/80">Record a balanced double-entry</p>
                  </div>
                </div>
                <button onClick={() => setShowNew(false)} className="rounded-lg p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
                  <DatePickerModern value={dateIso} onChange={setDateIso} className="w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Memo</label>
                  <Input value={memo} onChange={e => setMemo(e.target.value)} className="w-full" placeholder="Short description…" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-12 gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <div className="col-span-6">Account</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-2 text-right">Credit</div>
                  <div className="col-span-2"></div>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Select className="col-span-6" value={l.account} onChange={e => setLines(prev => prev.map((p, pi) => pi === i ? { ...p, account: e.target.value } : p))}>
                      <option value="">— pick account —</option>
                      {accounts.map(a => <option key={a._id} value={a.name}>{a.code ? `${a.code} · ` : ''}{a.name}</option>)}
                    </Select>
                    <Input className="col-span-2 text-right tabular-nums" type="number" value={l.debit ?? 0}
                      onChange={e => setLines(prev => prev.map((p, pi) => pi === i ? { ...p, debit: Number(e.target.value), credit: 0 } : p))} />
                    <Input className="col-span-2 text-right tabular-nums" type="number" value={l.credit ?? 0}
                      onChange={e => setLines(prev => prev.map((p, pi) => pi === i ? { ...p, credit: Number(e.target.value), debit: 0 } : p))} />
                    <button onClick={() => setLines(prev => prev.filter((_, pi) => pi !== i))}
                      className="col-span-2 flex items-center justify-center rounded-lg border border-slate-200 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-950/30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setLines(prev => [...prev, { account: '', debit: 0 }])}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-violet-950/30"
                >
                  <Plus className="h-4 w-4" /> Add Line
                </button>
              </div>

              <div className={`mt-5 flex items-center justify-between rounded-xl p-4 ${balanced ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
                <div className="flex items-center gap-4 text-sm">
                  <div>Debits: <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmtRs(debitTotal)}</span></div>
                  <div className="text-slate-400">|</div>
                  <div>Credits: <span className="font-bold tabular-nums text-rose-700 dark:text-rose-400">{fmtRs(creditTotal)}</span></div>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${balanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'}`}>
                  {balanced ? <><CheckCircle2 className="h-3 w-3" /> Balanced</> : <><XCircle className="h-3 w-3" /> Out of balance</>}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button onClick={() => setShowNew(false)}>Cancel</Button>
                <Button variant="primary" onClick={submit} disabled={!balanced}>Post Voucher</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
