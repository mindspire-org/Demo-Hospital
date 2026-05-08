/**
 * Payables pages — Vendors, Bills, Vendor Payments, AP Aging.
 */
import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import { PageHeader, Card, Button, Input, Table, fmtRs, Badge, todayIso } from '../../components/finance/finance_ui'
import { Plus, RefreshCw, Printer } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'
import DatePickerModern from '../../components/DatePickerModern'

export function Finance_Vendors(){
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [show, setShow] = useState(false)
  const [draft, setDraft] = useState<any>({ name: '' })
  async function load(){ setRows((await financeApi.listVendors({ q })) as any[] || []) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [q])
  async function create(){
    if (!draft.name){ return }
    await financeApi.createVendor(draft)
    setShow(false); setDraft({ name: '' }); await load()
  }
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Vendors" subtitle="Unified vendor directory — used by Store, Equipment, Pharmacy, Lab." actions={
        <>
          <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Vendor Directory',
            columns: [
              { header: 'Name',    key: 'name' },
              { header: 'Company', key: 'company' },
              { header: 'Phone',   key: 'phone' },
              { header: 'Email',   key: 'email' },
              { header: 'Status',  key: 'status' },
              { header: 'Outstanding', render: (r: any) => fmtRs(r.outstanding || 0), align: 'right' },
            ],
            rows,
          })}><Printer className="h-4 w-4" />Print</Button>
          <Button variant="primary" onClick={() => setShow(true)}><Plus className="h-4 w-4" />New Vendor</Button>
        </>
      } />
      <div className="p-6">
        <Card>
          <Table
            columns={[
              { key: 'name', header: 'Name', render: (r: any) => <span className="font-medium">{r.name}</span> },
              { key: 'company', header: 'Company' },
              { key: 'phone', header: 'Phone' },
              { key: 'email', header: 'Email' },
              { key: 'status', header: 'Status', render: (r: any) => <Badge tone={r.status === 'Active' ? 'good' : 'bad'}>{r.status}</Badge> },
              { key: 'outstanding', header: 'Outstanding', render: (r: any) => fmtRs(r.outstanding || 0), className: 'text-right font-medium' },
            ]}
            rows={rows.map(r => ({ ...r, id: r._id }))}
          />
        </Card>
      </div>
      {show && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">New Vendor</h3>
            <div className="mt-4 space-y-3">
              <Input placeholder="Name *" value={draft.name} onChange={e => setDraft((d: any) => ({ ...d, name: e.target.value }))} className="w-full" />
              <Input placeholder="Company" value={draft.company || ''} onChange={e => setDraft((d: any) => ({ ...d, company: e.target.value }))} className="w-full" />
              <Input placeholder="Phone" value={draft.phone || ''} onChange={e => setDraft((d: any) => ({ ...d, phone: e.target.value }))} className="w-full" />
              <Input placeholder="Email" value={draft.email || ''} onChange={e => setDraft((d: any) => ({ ...d, email: e.target.value }))} className="w-full" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setShow(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Finance_Bills(){
  const [rows, setRows] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [draft, setDraft] = useState<any>({ dateIso: todayIso(), amount: 0 })
  async function load(){ setRows((await financeApi.listBills()) as any[] || []) }
  useEffect(() => { load(); financeApi.listVendors().then((v: any) => setVendors(v || [])) }, [])
  async function create(){
    if (!draft.vendorId || !draft.amount){ return }
    const v = vendors.find(x => x._id === draft.vendorId)
    await financeApi.createBill({ vendorId: draft.vendorId, vendorName: v?.name, amount: Number(draft.amount), dateIso: draft.dateIso, memo: draft.memo })
    setShow(false); setDraft({ dateIso: todayIso(), amount: 0 }); await load()
  }
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Bills / Purchases" subtitle="Vendor bills accrued against Accounts Payable." actions={
        <>
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Vendor Bills',
            columns: [
              { header: 'Date',   key: 'dateIso' },
              { header: 'Memo',   key: 'memo' },
              { header: 'Amount', render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0)), align: 'right' },
            ],
            rows,
          })}><Printer className="h-4 w-4" />Print</Button>
          <Button variant="primary" onClick={() => setShow(true)}><Plus className="h-4 w-4" />New Bill</Button>
        </>
      } />
      <div className="p-6">
        <Card>
          <Table
            columns={[
              { key: 'dateIso', header: 'Date' },
              { key: 'memo', header: 'Memo' },
              { key: 'amount', header: 'Amount', render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0)), className: 'text-right font-medium' },
            ]}
            rows={rows.map((r, i) => ({ ...r, id: `${r._id}-${i}` }))}
          />
        </Card>
      </div>
      {show && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">New Vendor Bill</h3>
            <div className="mt-4 space-y-3">
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={draft.vendorId || ''} onChange={e => setDraft((d: any) => ({ ...d, vendorId: e.target.value }))}>
                <option value="">Select vendor</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
              <DatePickerModern value={draft.dateIso} onChange={v => setDraft((d: any) => ({ ...d, dateIso: v }))} className="w-full" />
              <Input type="number" placeholder="Amount *" value={draft.amount} onChange={e => setDraft((d: any) => ({ ...d, amount: e.target.value }))} className="w-full" />
              <Input placeholder="Memo" value={draft.memo || ''} onChange={e => setDraft((d: any) => ({ ...d, memo: e.target.value }))} className="w-full" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setShow(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Finance_VendorPayments(){
  const [rows, setRows] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [draft, setDraft] = useState<any>({ dateIso: todayIso(), amount: 0, method: 'Cash' })
  async function load(){ setRows((await financeApi.listVendorPayments()) as any[] || []) }
  useEffect(() => { load(); financeApi.listVendors().then((v: any) => setVendors(v || [])) }, [])
  async function create(){
    if (!draft.vendorId || !draft.amount){ return }
    const v = vendors.find(x => x._id === draft.vendorId)
    await financeApi.createVendorPayment({ vendorId: draft.vendorId, vendorName: v?.name, amount: Number(draft.amount), method: draft.method, dateIso: draft.dateIso })
    setShow(false); setDraft({ dateIso: todayIso(), amount: 0, method: 'Cash' }); await load()
  }
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Vendor Payments" subtitle="Cash/bank payments made to vendors." actions={
        <>
          <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
          <Button onClick={() => printFinanceReport({
            title: 'Vendor Payments',
            columns: [
              { header: 'Date',   key: 'dateIso' },
              { header: 'Memo',   key: 'memo' },
              { header: 'Amount', render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0)), align: 'right' },
            ],
            rows,
          })}><Printer className="h-4 w-4" />Print</Button>
          <Button variant="primary" onClick={() => setShow(true)}><Plus className="h-4 w-4" />New Payment</Button>
        </>
      } />
      <div className="p-6">
        <Card>
          <Table
            columns={[
              { key: 'dateIso', header: 'Date' },
              { key: 'memo', header: 'Memo' },
              { key: 'amount', header: 'Amount', render: (r: any) => fmtRs((r.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0)), className: 'text-right font-medium' },
            ]}
            rows={rows.map((r, i) => ({ ...r, id: `${r._id}-${i}` }))}
          />
        </Card>
      </div>
      {show && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">New Vendor Payment</h3>
            <div className="mt-4 space-y-3">
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={draft.vendorId || ''} onChange={e => setDraft((d: any) => ({ ...d, vendorId: e.target.value }))}>
                <option value="">Select vendor</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
              <DatePickerModern value={draft.dateIso} onChange={v => setDraft((d: any) => ({ ...d, dateIso: v }))} className="w-full" />
              <Input type="number" placeholder="Amount *" value={draft.amount} onChange={e => setDraft((d: any) => ({ ...d, amount: e.target.value }))} className="w-full" />
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={draft.method} onChange={e => setDraft((d: any) => ({ ...d, method: e.target.value }))}>
                <option>Cash</option><option>Bank</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setShow(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}>Pay</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Finance_APAging(){
  const [data, setData] = useState<any>(null)
  useEffect(() => { financeApi.payablesAging().then(setData).catch(() => setData(null)) }, [])
  const buckets = data?.buckets || { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader title="Payables Aging" subtitle={`Total AP: ${fmtRs(data?.total || 0)}`} actions={
        <Button onClick={() => printFinanceReport({
          title: 'AP Aging',
          subtitle: `As of ${new Date().toISOString().slice(0,10)}`,
          columns: [
            { header: 'Date',    key: 'dateIso' },
            { header: 'Type',    key: 'account' },
            { header: 'Vendor',  render: (r: any) => r.vendorName || r.vendorId || '—' },
            { header: 'Source',  key: 'refType' },
            { header: 'Days',    render: (r: any) => `${r.days}d` },
            { header: 'Bucket',  key: 'bucket' },
            { header: 'Balance', render: (r: any) => fmtRs(r.balance), align: 'right' },
          ],
          rows: data?.items || [],
          totals: Object.entries(data?.buckets || {}).map(([k, v]) => ({ label: k, value: fmtRs(Number(v)) })).concat([{ label: 'Total', value: fmtRs(data?.total || 0) }]),
        })}><Printer className="h-4 w-4" />Print</Button>
      } />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Object.entries(buckets).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k} days</div>
              <div className="mt-1 text-xl font-semibold">{fmtRs(Number(v))}</div>
            </div>
          ))}
        </div>
        <Card>
          <Table
            columns={[
              { key: 'dateIso', header: 'Date' },
              { key: 'account', header: 'Type' },
              { key: 'vendorName', header: 'Vendor', render: (r: any) => r.vendorName || r.vendorId || '—' },
              { key: 'refType', header: 'Source' },
              { key: 'days', header: 'Days', render: (r: any) => `${r.days}d` },
              { key: 'bucket', header: 'Bucket', render: (r: any) => <Badge tone={r.bucket === '0-30' ? 'good' : r.bucket === '31-60' ? 'warn' : 'bad'}>{r.bucket}</Badge> },
              { key: 'balance', header: 'Balance', render: (r: any) => fmtRs(r.balance), className: 'text-right font-medium' },
            ]}
            rows={(data?.items || []).map((r: any, i: number) => ({ ...r, id: `${r.refId}-${i}` }))}
          />
        </Card>
      </div>
    </div>
  )
}
