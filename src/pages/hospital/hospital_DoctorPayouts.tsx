import { useEffect, useMemo, useState } from 'react'
import { hospitalApi, financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Hospital_DoctorPayoutSlipDialog, { type DoctorPayoutSlipData } from '../../components/hospital/Hospital_DoctorPayoutSlipDialog'

export default function Finance_DoctorPayouts(){
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [payouts, setPayouts] = useState<Array<{ id: string; dateIso: string; memo?: string; amount: number; createdByUsername?: string; doctorId?: string; doctorName?: string }>>([])
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'Cash'|'Bank'>('Cash')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipAutoPrint, setSlipAutoPrint] = useState(false)
  const [slipData, setSlipData] = useState<DoctorPayoutSlipData | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: string; code: string; name: string; subType?: string }>>([])
  const [sourceAccount, setSourceAccount] = useState('')
  const [destinationAccount] = useState('DOCTOR_PAYABLE')
  const [sourceBalance, setSourceBalance] = useState<number | null>(null)
  const [generateVoucher, setGenerateVoucher] = useState(false)

  useEffect(()=>{ loadDoctors(); loadAccounts() }, [])
  useEffect(()=>{ if (doctorId) loadBalance() }, [doctorId, tick])
  useEffect(()=>{ loadRecentPayouts() }, [tick, page, rowsPerPage, doctorId])
  useEffect(()=>{
    if (sourceAccount) loadSourceBalance()
    else setSourceBalance(null)
  }, [sourceAccount, tick])

  async function loadDoctors(){
    try {
      const res: any = await hospitalApi.listDoctors()
      const items = (res?.doctors || []).map((d:any)=> ({ id: String(d._id), name: d.name }))
      setDoctors(items)
      if (items.length && !doctorId) setDoctorId(items[0].id)
    } catch {}
  }

  async function loadAccounts(){
    try {
      const res: any = await hospitalApi.listCashBankAccounts({ active: true })
      const items = (res?.accounts || []).map((a: any)=>({ id: String(a.id || a._id), code: String(a.code || a.name), name: a.name, subType: a.subType }))
      setAccounts(items)
      if (items.length && !sourceAccount) setSourceAccount(items[0].code)
    } catch {
      setAccounts([])
    }
  }

  async function loadSourceBalance(){
    try {
      const acc = accounts.find(a=>a.code===sourceAccount)
      if (!acc) { setSourceBalance(null); return }
      const res: any = await hospitalApi.getCashBankAccountBalance(acc.id)
      setSourceBalance(Number(res?.balance || 0))
    } catch { setSourceBalance(null) }
  }

  async function loadPayouts(){
    try { const res: any = await financeApi.doctorPayouts(doctorId, 50); setPayouts(res?.payouts || []) } catch { setPayouts([]) }
  }

  async function loadBalance(){
    try { const res: any = await financeApi.doctorBalance(doctorId); setBalance(Number(res?.payable || 0)) } catch { setBalance(null) }
  }

  async function loadRecentPayouts(){
    try{
      const res: any = await (financeApi as any).listRecentDoctorPayouts({ 
        page, 
        limit: rowsPerPage, 
        type: 'Doctor Payout',
        doctorId: doctorId || undefined 
      })
      const rows = (res?.transactions || []).map((t: any) => ({
        id: String(t.id || t._id || ''),
        dateIso: String(t.dateIso || ''),
        memo: t.memo,
        amount: Number(t.totalAmount || 0),
        createdByUsername: t.createdByUsername,
        doctorId: t.doctorId ? String(t.doctorId) : undefined,
        doctorName: t.doctorName,
      }))
      setPayouts(rows)
      setTotalRows(Number(res?.total || 0))
      setTotalPages(Math.max(1, Number(res?.totalPages || 1)))
    } catch {
      // fallback to selected doctor's payouts if the aggregated endpoint is unavailable
      if (doctorId) loadPayouts()
    }
  }

  const canPay = useMemo(()=>{
    const amt = parseFloat(amount || '0')
    const hasBalance = sourceBalance == null || sourceBalance >= amt
    return doctorId && !loading && amt > 0 && hasBalance && !!sourceAccount && accounts.length > 0
  }, [doctorId, amount, loading, sourceBalance, sourceAccount, accounts.length])

  async function pay(){
    const amt = parseFloat(amount || '0')
    if (!(amt>0) || !doctorId) return
    setLoading(true)
    try {
      await financeApi.doctorPayout({ doctorId, amount: amt, method, memo: memo || undefined, sourceAccount, destinationAccount })
      if (generateVoucher) {
        try {
          const acc = accounts.find(a=>a.code===sourceAccount)
          const voucherMethod = method === 'Bank' ? 'bank' : 'cash'
          await financeApi.createExpenseVoucher({
            dateIso: new Date().toISOString().slice(0,10),
            amount: amt,
            method: voucherMethod,
            payee: doctors.find(d => d.id === doctorId)?.name || 'Doctor',
            note: memo || `Doctor payout to ${currentDoctor?.name || ''}`,
            module: 'hospital'
          })
        } catch {}
      }
      const docName = doctors.find(d => d.id === doctorId)?.name || '-'
      setSlipData({
        doctorId,
        doctorName: docName,
        amount: amt,
        method,
        memo: memo || undefined,
        createdByUsername: undefined,
        createdAt: new Date().toISOString(),
        sourceAccount,
        destinationAccount,
      })
      setSlipAutoPrint(false)
      setSlipOpen(true)
      setPayDialogOpen(false)
      setAmount('')
      setMemo('')
      setTick(t=>t+1)
      setToast({ type: 'success', message: 'Payout recorded' })
    } catch (e:any){ setToast({ type: 'error', message: e?.message || 'Failed to record payout' }) }
    finally { setLoading(false) }
  }

  function openSlipForRow(p: { id: string; dateIso: string; memo?: string; amount: number; createdByUsername?: string; doctorId?: string; doctorName?: string }){
    const docName = p.doctorName || doctors.find(d => d.id === (p.doctorId || doctorId))?.name || '-'
    setSlipData({
      doctorId: p.doctorId || doctorId,
      doctorName: docName,
      amount: Number(p.amount || 0),
      method: undefined,
      memo: p.memo || undefined,
      createdByUsername: p.createdByUsername,
      createdAt: p.dateIso ? new Date(p.dateIso).toISOString() : undefined,
    })
    setSlipAutoPrint(false)
    setSlipOpen(true)
  }

  const currentDoctor = doctors.find(d => d.id === doctorId)
  const formattedBalance = balance!=null ? `Rs ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'
  const totalPaid = useMemo(() => payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0), [payouts])
  const lastPayout = payouts[0]

  return (
    <div className="min-h-screen bg-slate-50/70 px-6 py-8 space-y-6">
      <Hospital_DoctorPayoutSlipDialog
        open={slipOpen && !!slipData}
        onClose={()=>setSlipOpen(false)}
        data={(slipData || { doctorName: '-', amount: 0 }) as any}
        autoPrint={slipAutoPrint}
      />

      <section className="rounded-3xl bg-linear-to-br from-violet-900 via-slate-900 to-slate-900 p-6 shadow-xl ring-1 ring-white/10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/60">Finance · Settlement Desk</p>
            <h1 className="mt-3 text-3xl font-semibold">Doctor Payouts</h1>
            <p className="mt-2 text-sm text-white/70">Record settlements, print slips, and audit recent payouts in one focused surface.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Current Payable</p>
            <p className="mt-1 text-3xl font-semibold">{formattedBalance}</p>
            <p className="text-xs text-white/60">{currentDoctor ? currentDoctor.name : 'Select a doctor to load balance'}</p>
            <button
              disabled={!doctorId}
              onClick={()=>setPayDialogOpen(true)}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Record payout
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Doctor
            <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
              {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total recorded here</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">Rs {totalPaid.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Recent {payouts.length} payouts</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last payout</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{lastPayout ? `Rs ${lastPayout.amount.toFixed(2)}` : '—'}</p>
            <p className="text-xs text-slate-500">{lastPayout ? new Date(lastPayout.dateIso).toLocaleString() : 'Run a payout to populate history'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pay from account
            <select value={sourceAccount} onChange={e=>setSourceAccount(e.target.value)} disabled={!accounts.length} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400">
              {accounts.length ? (
                accounts.map(a => (<option key={a.code} value={a.code}>{a.name} ({a.code})</option>))
              ) : (
                <option value="">No cash/bank accounts found</option>
              )}
            </select>
            {sourceBalance!=null && (
              <p className="mt-1 text-xs text-slate-500">Current balance: <span className={sourceBalance < parseFloat(amount||'0') ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>Rs {sourceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            )}
            {!accounts.length && (
              <p className="mt-2 text-xs text-amber-600">Setup cash/bank accounts in Finance → Chart of Accounts to unlock payouts.</p>
            )}
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            To account
            <select disabled className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
              <option>DOCTOR_PAYABLE</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">Doctor payable control account (read-only)</p>
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source balance</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{sourceBalance!=null ? `Rs ${sourceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</p>
            <p className="text-xs text-slate-500">{sourceAccount ? accounts.find(a=>a.code===sourceAccount)?.name || '' : 'Select a source account'}</p>
          </div>
        </div>
      </section>

      {payDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manual payout</p>
                <h3 className="text-lg font-semibold text-slate-900">Pay {currentDoctor?.name || 'doctor'}</h3>
              </div>
              <button onClick={()=>setPayDialogOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100" aria-label="Close dialog">✕</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <label className="text-sm font-medium text-slate-600">Amount (Rs)
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100" placeholder="0.00" />
              </label>
              <label className="text-sm font-medium text-slate-600">Method
                <select value={method} onChange={e=>{ const m=e.target.value as 'Cash'|'Bank'; setMethod(m); if(m==='Cash'){ const c=accounts.find(a=>a.name.toUpperCase().includes('CASH')); if(c) setSourceAccount(c.code) } else { const b=accounts.find(a=>a.name.toUpperCase().includes('BANK')); if(b) setSourceAccount(b.code) } }} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option>Cash</option>
                  <option>Bank</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600">Pay from account
                <select value={sourceAccount} onChange={e=>setSourceAccount(e.target.value)} disabled={!accounts.length} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400">
                  {accounts.length ? accounts.map(a => (<option key={a.code} value={a.code}>{a.name}</option>)) : <option value="">No cash/bank accounts</option>}
                </select>
                {sourceBalance!=null && (
                  <p className="mt-1 text-xs">Balance: <span className={sourceBalance < parseFloat(amount||'0') ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>Rs {sourceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                )}
                {!accounts.length && (
                  <p className="mt-1 text-xs text-amber-600">Ask finance team to seed cash & bank accounts.</p>
                )}
              </label>
              <label className="text-sm font-medium text-slate-600">Memo
                <input value={memo} onChange={e=>setMemo(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100" placeholder="Optional note" />
              </label>
              <div className="md:col-span-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={generateVoucher} onChange={e=>setGenerateVoucher(e.target.checked)} className="rounded border-slate-300 text-violet-700 focus:ring-violet-500" />
                  Generate finance voucher (auto-create CPV/BPV)
                </label>
                <div className="flex justify-end gap-2">
                  <button onClick={()=>setPayDialogOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button disabled={!canPay} onClick={pay} className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-50">{loading? 'Saving...' : 'Confirm Payout'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-800">Recent Payouts</p>
            <p className="text-xs text-slate-500">Chronological record of settlements</p>
          </div>
          <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Doctor</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Performed By</th>
                <th className="px-5 py-3">Memo</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map(p => (
                <tr key={p.id} className="group transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-sm text-slate-600">{new Date(p.dateIso).toLocaleString()}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{p.doctorName || currentDoctor?.name || '-'}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-600">Rs {p.amount.toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{p.createdByUsername || '-'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{p.memo || '-'}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={()=>openSlipForRow(p)} className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">View slip</button>
                  </td>
                </tr>
              ))}
              {payouts.length===0 && (
                <tr><td className="px-5 py-12 text-center text-slate-400" colSpan={6}>No payouts recorded for this doctor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {payouts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Rows</span>
              <select
                value={rowsPerPage}
                onChange={e=>{ setRowsPerPage(parseInt(e.target.value)); setPage(1) }}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-xs text-slate-500">
              {(() => {
                const startIdx = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1
                const endIdx = Math.min(page * rowsPerPage, totalRows)
                return `${startIdx}-${endIdx} of ${totalRows}`
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={()=>setPage(p=>Math.max(1, p-1))}
                disabled={page <= 1}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={()=>setPage(p=>Math.min(totalPages, p+1))}
                disabled={page >= totalPages}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
