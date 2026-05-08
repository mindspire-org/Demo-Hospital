/**
 * Payroll & HR pages — Staff, Doctor, Attendance, Earnings/Deductions.
 * Staff + Doctor pages include a "Pay" action that posts to the unified journal.
 */
import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { PageHeader, Card, Button, Input, Table, fmtRs, Badge, monthIso } from '../../components/finance/finance_ui'
import { RefreshCw, Wallet, Printer } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'

export function Finance_StaffPayroll(){
  const [period, setPeriod] = useState(monthIso())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [payTarget, setPayTarget] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [err, setErr] = useState<string | null>(null)

  async function load(){ setLoading(true); try { setData(await financeApi.payrollStaff({ period })) } finally { setLoading(false) } }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [period])

  async function pay(){
    if (!payTarget || !payAmount){ return }
    setErr(null)
    try {
      await financeApi.payStaff(payTarget.id, { amount: Number(payAmount), method })
      setPayTarget(null); setPayAmount(''); await load()
    } catch (e: any) { setErr(e?.message || 'Payment failed') }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Staff Payroll" subtitle={`Period ${period}`} actions={
        <>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Staff Payroll',
            subtitle: `Period ${period}`,
            columns: [
              { header: 'Staff',   key: 'name' },
              { header: 'Role',    key: 'role' },
              { header: 'Base',    render: (r: any) => fmtRs(r.baseSalary), align: 'right' },
              { header: 'Earn',    render: (r: any) => fmtRs(r.earnings),   align: 'right' },
              { header: 'Gross',   render: (r: any) => fmtRs(r.gross),      align: 'right' },
              { header: 'Paid',    render: (r: any) => fmtRs(r.paid),       align: 'right' },
              { header: 'Net',     render: (r: any) => fmtRs(r.net),        align: 'right' },
              { header: 'Status',  key: 'status' },
            ],
            rows: data?.rows || [],
            totals: data?.totals ? [
              { label: 'Gross', value: fmtRs(data.totals.gross) },
              { label: 'Paid',  value: fmtRs(data.totals.paid) },
              { label: 'Net',   value: fmtRs(data.totals.net) },
            ] : [],
          })}><Printer className="h-4 w-4" />Print</Button>
        </>
      } />
      <div className="space-y-5 p-6">
        {err && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatBox label="Gross Payroll" value={fmtRs(data?.totals?.gross || 0)} />
          <StatBox label="Paid" value={fmtRs(data?.totals?.paid || 0)} />
          <StatBox label="Net Due" value={fmtRs(data?.totals?.net || 0)} />
        </div>
        <Card>
          <Table
            columns={[
              { key: 'name', header: 'Staff' },
              { key: 'role', header: 'Role' },
              { key: 'baseSalary', header: 'Base',   render: (r: any) => fmtRs(r.baseSalary), className: 'text-right' },
              { key: 'earnings',   header: 'Earn',   render: (r: any) => fmtRs(r.earnings),   className: 'text-right' },
              { key: 'gross',      header: 'Gross',  render: (r: any) => fmtRs(r.gross),      className: 'text-right font-medium' },
              { key: 'paid',       header: 'Paid',   render: (r: any) => fmtRs(r.paid),       className: 'text-right text-emerald-700' },
              { key: 'net',        header: 'Net',    render: (r: any) => fmtRs(r.net),        className: 'text-right font-medium' },
              { key: 'status',     header: 'Status', render: (r: any) => <Badge tone={r.status === 'Paid' ? 'good' : r.status === 'Partial' ? 'warn' : 'bad'}>{r.status}</Badge> },
              { key: 'actions',    header: '',
                render: (r: any) => r.net > 0 ? (
                  <Button onClick={() => { setPayTarget(r); setPayAmount(String(r.net)) }}><Wallet className="h-4 w-4" />Pay</Button>
                ) : <span className="text-xs text-slate-400">—</span>
              },
            ]}
            rows={(data?.rows || []).map((r: any) => r)}
            empty={loading ? 'Loading...' : 'No staff.'}
          />
        </Card>
      </div>
      {payTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Pay {payTarget.name}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500">Amount</label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Method</label>
                <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Cash</option><option>Bank</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button variant="primary" onClick={pay}>Confirm Payout</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Finance_DoctorPayroll(){
  const [data, setData] = useState<any>(null)
  const [payTarget, setPayTarget] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [memo, setMemo] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function load(){ setData(await financeApi.payrollDoctors()) }
  useEffect(() => { load() }, [])

  async function pay(){
    if (!payTarget || !payAmount){ return }
    setErr(null)
    try {
      await financeApi.payDoctor(payTarget.id, { amount: Number(payAmount), method, memo })
      setPayTarget(null); setPayAmount(''); setMemo(''); await load()
    } catch (e: any) { setErr(e?.message || 'Payment failed') }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Doctor Payroll" subtitle={`Total payable to doctors: ${fmtRs(data?.total || 0)}`} actions={
        <>
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Doctor Payroll',
            columns: [
              { header: 'Doctor',     key: 'name' },
              { header: 'Department', key: 'department' },
              { header: 'Payable',    render: (r: any) => fmtRs(r.balance), align: 'right' },
            ],
            rows: data?.rows || [],
            totals: [{ label: 'Total Payable', value: fmtRs(data?.total || 0) }],
          })}><Printer className="h-4 w-4" />Print</Button>
        </>
      } />
      <div className="p-6">
        {err && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
        <Card>
          <Table
            columns={[
              { key: 'name', header: 'Doctor' },
              { key: 'department', header: 'Department' },
              { key: 'balance', header: 'Payable', render: (r: any) => <span className={r.balance > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{fmtRs(r.balance)}</span>, className: 'text-right' },
              { key: 'actions', header: '', render: (r: any) => r.balance > 0
                ? <Button onClick={() => { setPayTarget(r); setPayAmount(String(r.balance)) }}><Wallet className="h-4 w-4" />Pay</Button>
                : <span className="text-xs text-slate-400">—</span>
              },
            ]}
            rows={data?.rows || []}
          />
        </Card>
      </div>
      {payTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Pay {payTarget.name}</h3>
            <div className="mt-4 space-y-3">
              <div><label className="text-xs text-slate-500">Amount</label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full" /></div>
              <div><label className="text-xs text-slate-500">Method</label>
                <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={method} onChange={e => setMethod(e.target.value)}><option>Cash</option><option>Bank</option></select>
              </div>
              <div><label className="text-xs text-slate-500">Memo</label><Input value={memo} onChange={e => setMemo(e.target.value)} className="w-full" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button variant="primary" onClick={pay}>Confirm Payout</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Finance_AttendanceFinance(){
  const [period, setPeriod] = useState(monthIso())
  const [data, setData] = useState<any>(null)
  async function load(){ setData(await financeApi.payrollAttendance({ period })) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [period])
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Attendance Finance" subtitle={`Attendance-based deductions for ${period}`} actions={
        <>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          <Button onClick={() => printFinanceReport({
            title: 'Attendance Finance',
            subtitle: `Period ${period}`,
            columns: [
              { header: 'Staff',      key: 'name' },
              { header: 'Role',       key: 'role' },
              { header: 'Present',    key: 'present', align: 'right' },
              { header: 'Absent',     key: 'absent',  align: 'right' },
              { header: 'Leave',      key: 'leave',   align: 'right' },
              { header: 'Per Day',    render: (r: any) => fmtRs(r.perDay), align: 'right' },
              { header: 'Deductions', render: (r: any) => fmtRs(r.deductions), align: 'right' },
              { header: 'Net',        render: (r: any) => fmtRs(r.netFromAttendance), align: 'right' },
            ],
            rows: data?.rows || [],
          })}><Printer className="h-4 w-4" />Print</Button>
        </>
      } />
      <div className="p-6">
        <Card>
          <Table
            columns={[
              { key: 'name', header: 'Staff' },
              { key: 'role', header: 'Role' },
              { key: 'present', header: 'Present', className: 'text-right' },
              { key: 'absent',  header: 'Absent',  className: 'text-right' },
              { key: 'leave',   header: 'Leave',   className: 'text-right' },
              { key: 'perDay',  header: 'Per Day', render: (r: any) => fmtRs(r.perDay), className: 'text-right' },
              { key: 'deductions', header: 'Deductions', render: (r: any) => fmtRs(r.deductions), className: 'text-right text-rose-700' },
              { key: 'netFromAttendance', header: 'Net', render: (r: any) => fmtRs(r.netFromAttendance), className: 'text-right font-medium' },
            ]}
            rows={(data?.rows || []).map((r: any) => r)}
            empty="No attendance data for this period."
          />
        </Card>
      </div>
    </div>
  )
}

export function Finance_EarningsDeductions(){
  const [period, setPeriod] = useState(monthIso())
  const [data, setData] = useState<any>(null)
  async function load(){ setData(await financeApi.payrollEarningsDeductions({ period })) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [period])
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Earnings / Deductions" subtitle={`Bonuses, lump sums and revenue-share entries for ${period}`} actions={
        <>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          <Button onClick={() => printFinanceReport({
            title: 'Earnings / Deductions',
            subtitle: `Period ${period}`,
            columns: [
              { header: 'Date',     key: 'date' },
              { header: 'Staff',    key: 'staffId' },
              { header: 'Category', key: 'category' },
              { header: 'Base',     render: (r: any) => r.base ? fmtRs(r.base) : '—', align: 'right' },
              { header: 'Rate',     render: (r: any) => r.rate ? `${r.rate}%` : '—', align: 'right' },
              { header: 'Amount',   render: (r: any) => fmtRs(r.amount), align: 'right' },
              { header: 'Notes',    key: 'notes' },
            ],
            rows: data?.rows || [],
          })}><Printer className="h-4 w-4" />Print</Button>
        </>
      } />
      <div className="p-6">
        <Card>
          <Table
            columns={[
              { key: 'date',     header: 'Date' },
              { key: 'staffId',  header: 'Staff' },
              { key: 'category', header: 'Category' },
              { key: 'base',     header: 'Base',   render: (r: any) => r.base ? fmtRs(r.base) : '—', className: 'text-right' },
              { key: 'rate',     header: 'Rate',   render: (r: any) => r.rate ? `${r.rate}%` : '—', className: 'text-right' },
              { key: 'amount',   header: 'Amount', render: (r: any) => fmtRs(r.amount), className: 'text-right font-medium' },
              { key: 'notes',    header: 'Notes' },
            ]}
            rows={(data?.rows || []).map((r: any) => ({ ...r, id: r._id }))}
            empty="No earnings recorded."
          />
        </Card>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
