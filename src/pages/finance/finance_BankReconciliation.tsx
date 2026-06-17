import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

export default function Finance_BankReconciliation() {
  const [records, setRecords] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ bankAccountCode: '2000-102', bankAccountName: '', statementDate: '', statementBalance: '' })
  const [saving, setSaving] = useState(false)

  async function fetchRecords() {
    try {
      const res = await financeApi.listBankReconciliations()
      setRecords(Array.isArray(res) ? res : [])
    } catch { setRecords([]) }
  }

  useEffect(() => { fetchRecords() }, [])

  async function handleCreate() {
    if (!form.bankAccountCode || !form.statementDate || !form.statementBalance) {
      setToast({ type: 'error', message: 'All fields are required' }); return
    }
    setSaving(true)
    try {
      await financeApi.createBankReconciliation({ ...form, statementBalance: parseFloat(form.statementBalance) })
      setToast({ type: 'success', message: 'Reconciliation created' })
      setShowAdd(false)
      fetchRecords()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
    finally { setSaving(false) }
  }

  async function handleAutoMatch(id: string) {
    try {
      const res = await financeApi.autoMatchBankReconciliation(id)
      setToast({ type: 'success', message: `Matched ${res?.matchedCount || 0} of ${res?.totalCount || 0} items` })
      fetchRecords()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  async function handleReconcile(id: string) {
    if (!confirm('Finalize this reconciliation?')) return
    try {
      await financeApi.reconcileBankReconciliation(id)
      setToast({ type: 'success', message: 'Reconciled' })
      fetchRecords()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  const statusColor: Record<string, string> = { draft: 'bg-slate-100 text-slate-700', reconciled: 'bg-emerald-100 text-emerald-700' }

  return (
    <div className="w-full p-3 sm:p-4 space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-800">Bank Reconciliation</div>
        <button onClick={() => setShowAdd(!showAdd)} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">+ New Reconciliation</button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <select value={form.bankAccountCode} onChange={e => setForm({ ...form, bankAccountCode: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="2000-102">2000-102 — Albaraka Bank</option>
              <option value="2000-103">2000-103 — Meezan Bank</option>
            </select>
            <input type="date" value={form.statementDate} onChange={e => setForm({ ...form, statementDate: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white" />
            <input value={form.statementBalance} onChange={e => setForm({ ...form, statementBalance: e.target.value })} placeholder="Statement Balance" type="number" className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white" />
            <button onClick={handleCreate} disabled={saving} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {records.map((r: any) => (
          <div key={r._id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">{r.bankAccountCode}</span>
                <span className="ml-2 text-sm text-slate-500">{r.statementDate}</span>
                <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${statusColor[r.status] || ''}`}>{r.status.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'draft' && (
                  <>
                    <button onClick={() => handleAutoMatch(r._id)} className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600">Auto Match</button>
                    <button onClick={() => handleReconcile(r._id)} className="rounded bg-emerald-500 px-2 py-1 text-xs text-white hover:bg-emerald-600">Reconcile</button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">Statement:</span> <span className="font-medium">PKR {Number(r.statementBalance).toLocaleString()}</span></div>
              <div><span className="text-slate-500">System:</span> <span className="font-medium">PKR {Number(r.systemBalance || 0).toLocaleString()}</span></div>
              <div><span className="text-slate-500">Difference:</span> <span className={`font-medium ${Number(r.difference || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>PKR {Number(r.difference || 0).toLocaleString()}</span></div>
            </div>
          </div>
        ))}
        {records.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">No reconciliations yet</div>}
      </div>
    </div>
  )
}
