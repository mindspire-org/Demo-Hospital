/**
 * Chart of Accounts — ERP-style page that matches Image 2.
 *
 * Data model: the backend auto-seeds a complete standard COA on first list
 * call, so there's no empty state. Accounts can still be added/edited/removed.
 */
import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'
import { PageHeader, Card, Button, Input, Select, Badge, Table } from '../../components/finance/finance_ui'
import { Database, Plus, RefreshCw, BookUp, Briefcase, CreditCard, DollarSign, TrendingUp, PieChart, Printer } from 'lucide-react'
import { printFinanceReport } from '../../components/finance/finance_print'

type Account = {
  _id: string
  code?: string
  name: string
  type: 'Asset'|'Liability'|'Equity'|'Income'|'Expense'
  subType?: string
  portal?: string
  balance?: number
  active?: boolean
}

const GROUP_TILES: Array<{ type: Account['type']|'All'; label: string; icon: any; tone: string }> = [
  { type: 'All',       label: 'Accounts',    icon: Database,   tone: 'bg-slate-900 text-white' },
  { type: 'Asset',     label: 'Assets',      icon: Briefcase,  tone: 'bg-emerald-500 text-white' },
  { type: 'Liability', label: 'Liabilities', icon: CreditCard, tone: 'bg-rose-500 text-white' },
  { type: 'Income',    label: 'Revenue',     icon: TrendingUp, tone: 'bg-sky-500 text-white' },
  { type: 'Expense',   label: 'Expenses',    icon: DollarSign, tone: 'bg-amber-500 text-white' },
]

export default function Finance_ChartOfAccounts2(){
  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [portal, setPortal] = useState('')
  const [type, setType] = useState('')
  const [active, setActive] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<Partial<Account>>({ type: 'Asset' })

  async function load(){
    setLoading(true); setErr(null)
    try {
      const res: any = await financeApi.listChartOfAccounts()
      setRows(Array.isArray(res) ? res : (res?.accounts || []))
    } catch (e: any) { setErr(e?.message || 'Failed to load accounts') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function seedStandard(){
    setErr(null)
    try { await financeApi.seedChartOfAccounts(); await load() }
    catch (e: any) { setErr(e?.message || 'Seed failed') }
  }

  async function createAccount(){
    if (!draft.name || !draft.type){ setErr('Name and type are required'); return }
    try {
      await financeApi.createChartOfAccount({
        code: draft.code,
        name: draft.name!,
        type: draft.type!,
        subType: draft.subType,
        portal: draft.portal,
      })
      setShowAdd(false); setDraft({ type: 'Asset' }); await load()
    } catch (e: any) { setErr(e?.message || 'Failed to create account') }
  }

  async function remove(id: string){
    if (!confirm('Delete this account? (only allowed when balance is zero)')) return
    try { await financeApi.deleteChartOfAccount(id); await load() }
    catch (e: any) { setErr(e?.message || 'Delete failed') }
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (portal && r.portal !== portal) return false
    if (type && r.type !== type) return false
    if (active === 'true' && !r.active) return false
    if (active === 'false' && r.active) return false
    if (q){
      const s = q.toLowerCase()
      return (r.code || '').toLowerCase().includes(s) || (r.name || '').toLowerCase().includes(s) || (r.portal || '').toLowerCase().includes(s)
    }
    return true
  }), [rows, q, portal, type, active])

  const counts = useMemo(() => {
    const out: Record<string, number> = { All: rows.length, Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 }
    for (const r of rows) out[r.type] = (out[r.type] || 0) + 1
    return out
  }, [rows])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Structured by code, type, and portal for ERP-ready finance operations."
        actions={
          <>
            <Button onClick={load}><RefreshCw className="h-4 w-4" />Refresh</Button>
            <Button onClick={() => printFinanceReport({
              title: 'Chart of Accounts',
              columns: [
                { header: 'Code',    key: 'code' },
                { header: 'Name',    key: 'name' },
                { header: 'Type',    key: 'type' },
                { header: 'Subtype', key: 'subType' },
                { header: 'Portal',  key: 'portal' },
                { header: 'Status',  render: (r: any) => r.active === false ? 'Inactive' : 'Active' },
              ],
              rows: filtered,
            })}><Printer className="h-4 w-4" />Print</Button>
            <Button onClick={seedStandard}><BookUp className="h-4 w-4" />Load Standard COA</Button>
            <Button variant="primary" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />New Account</Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        {/* Banner like Image 2 */}
        <div className="rounded-xl bg-slate-900 p-6 text-white">
          <div className="text-xs font-medium uppercase tracking-widest text-white/60">Finance ERP · Chart of Accounts</div>
          <div className="mt-2 text-3xl font-semibold">Standardized Chart of Accounts</div>
          <div className="mt-2 max-w-3xl text-sm text-white/70">
            Manage a complete ERP-ready chart of accounts with structured codes, clean classification,
            and quick access to seed the standard hospital chart anytime.
          </div>
        </div>

        {err && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}

        {/* Group tiles */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {GROUP_TILES.map(g => (
            <button
              key={g.label}
              onClick={() => setType(g.type === 'All' ? '' : g.type)}
              className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${g.tone}`}>
                <g.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{g.label}</div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts[g.type] || 0}</div>
              </div>
            </button>
          ))}
          <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
              <PieChart className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Net Balance</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{rows.reduce((s, r) => s + Number(r.balance || 0), 0)}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search code, name, portal..." value={q} onChange={e => setQ(e.target.value)} className="w-full md:w-80" />
          <Select value={portal} onChange={e => setPortal(e.target.value)}>
            <option value="">All Portals</option>
            <option value="hospital">hospital</option>
            <option value="lab">lab</option>
            <option value="pharmacy">pharmacy</option>
            <option value="diagnostic">diagnostic</option>
            <option value="aesthetic">aesthetic</option>
            <option value="dialysis">dialysis</option>
            <option value="finance">finance</option>
          </Select>
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
          </Select>
          <Select value={active} onChange={e => setActive(e.target.value)}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>

        {/* Directory */}
        <Card title="Accounts Directory" right={<span className="text-xs text-slate-500">{filtered.length} visible</span>}>
          <Table
            columns={[
              { key: 'code',    header: 'Code',    render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.code || '—'}</span> },
              { key: 'name',    header: 'Name',    render: (r: any) => <span className="font-medium">{r.name}</span> },
              { key: 'type',    header: 'Type' },
              { key: 'subType', header: 'Subtype', render: (r: any) => r.subType || '—' },
              { key: 'portal',  header: 'Portal',  render: (r: any) => r.portal || '—' },
              { key: 'balance', header: 'Balance', render: (r: any) => (Number(r.balance || 0)).toLocaleString(), className: 'text-right' },
              { key: 'status',  header: 'Status',  render: (r: any) => r.active === false ? <Badge tone="bad">Inactive</Badge> : <Badge tone="good">Active</Badge> },
              { key: 'actions', header: 'Actions', render: (r: any) => (
                <button onClick={() => remove(r._id)} className="text-xs text-rose-600 hover:underline">Delete</button>
              ) },
            ]}
            rows={filtered.map(r => ({ id: r._id, ...r }))}
            empty={loading ? 'Loading accounts...' : 'No accounts match the filters.'}
          />
        </Card>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold">New Account</h3>
            <div className="mt-4 space-y-3">
              <div><label className="text-xs text-slate-500">Code</label><Input value={draft.code || ''} onChange={e => setDraft(d => ({ ...d, code: e.target.value }))} className="w-full" /></div>
              <div><label className="text-xs text-slate-500">Name *</label><Input value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="w-full" /></div>
              <div><label className="text-xs text-slate-500">Type *</label>
                <Select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as any }))} className="w-full">
                  <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
                </Select>
              </div>
              <div><label className="text-xs text-slate-500">Subtype</label><Input value={draft.subType || ''} onChange={e => setDraft(d => ({ ...d, subType: e.target.value }))} className="w-full" /></div>
              <div><label className="text-xs text-slate-500">Portal</label><Input value={draft.portal || ''} onChange={e => setDraft(d => ({ ...d, portal: e.target.value }))} className="w-full" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" onClick={createAccount}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
