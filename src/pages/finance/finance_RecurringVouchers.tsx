import { useEffect, useState } from 'react'
import { financeApi, hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'

export default function Finance_RecurringVouchers() {
  const [templates, setTemplates] = useState<any[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const initialForm = {
    name: '', voucherType: 'CPV' as any, frequency: 'monthly' as any, dayOfMonth: '1',
    payee: '', narration: '', module: '', expenseCategory: '', expenseDepartment: '', costCenter: '',
    active: true
  }
  
  const [form, setForm] = useState(initialForm)
  const [lines, setLines] = useState<Array<{ accountCode: string; accountName: string; debit: number; credit: number }>>([
    { accountCode: '', accountName: '', debit: 0, credit: 0 },
    { accountCode: '', accountName: '', debit: 0, credit: 0 },
  ])
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [hospitalSettings, setHospitalSettings] = useState<{ name: string; phone: string; address: string; email: string; website: string; logoDataUrl: string }>({ name: '', phone: '', address: '', email: '', website: '', logoDataUrl: '' })

  async function loadAccounts() {
    try {
      const res: any = await financeApi.listChartOfAccounts({ active: true, limit: 1000 })
      setAccounts(res.accounts || [])
    } catch (e) { console.error('Failed to load accounts', e) }
  }

  async function fetchTemplates() {
    try {
      const res = await financeApi.listRecurringVouchers()
      setTemplates(Array.isArray(res) ? res : [])
    } catch { setTemplates([]) }
  }

  async function loadHospitalSettings() {
    try {
      const s: any = await hospitalApi.getSettings()
      if (s) setHospitalSettings({
        name: s.name || '',
        phone: s.phone || '',
        address: s.address || '',
        email: s.email || '',
        website: s.website || '',
        logoDataUrl: s.logoDataUrl || '',
      })
    } catch (e) { console.error('Failed to load hospital settings', e) }
  }

  useEffect(() => { 
    fetchTemplates()
    loadAccounts()
    loadHospitalSettings()
  }, [])

  function handleAddClick() {
    setEditingId(null)
    setForm(initialForm)
    setLines([
      { accountCode: '', accountName: '', debit: 0, credit: 0 },
      { accountCode: '', accountName: '', debit: 0, credit: 0 },
    ])
    setShowAdd(true)
  }

  function handleEditClick(t: any) {
    setEditingId(t._id)
    setForm({
      name: t.name || '',
      voucherType: t.voucherType || 'CPV',
      frequency: t.frequency || 'monthly',
      dayOfMonth: t.dayOfMonth?.toString() || '1',
      payee: t.payee || '',
      narration: t.narration || '',
      module: t.module || '',
      expenseCategory: t.expenseCategory || '',
      expenseDepartment: t.expenseDepartment || '',
      costCenter: t.costCenter || '',
      active: t.active ?? true
    })
    setLines(t.lines?.length ? t.lines : [
      { accountCode: '', accountName: '', debit: 0, credit: 0 },
      { accountCode: '', accountName: '', debit: 0, credit: 0 },
    ])
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.name || !form.voucherType || !form.frequency) {
      setToast({ type: 'error', message: 'Name, type, and frequency are required' }); return
    }
    
    const validLines = lines.filter(l => l.accountCode && (l.debit > 0 || l.credit > 0))
    if (validLines.length < 2) {
      setToast({ type: 'error', message: 'At least two valid journal lines are required' }); return
    }

    setSaving(true)
    try {
      const payload = { 
        ...form, 
        dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth) : undefined, 
        lines: validLines 
      }
      
      if (editingId) {
        await financeApi.updateRecurringVoucher(editingId, payload)
        setToast({ type: 'success', message: 'Template updated' })
      } else {
        await financeApi.createRecurringVoucher(payload)
        setToast({ type: 'success', message: 'Template created' })
      }
      
      setShowAdd(false)
      setEditingId(null)
      fetchTemplates()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    try {
      await financeApi.deleteRecurringVoucher(id)
      setToast({ type: 'success', message: 'Deleted' })
      fetchTemplates()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  function handlePrintPreview(t: any) {
    const totalDebit = (t.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0)
    const hs = hospitalSettings
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Recurring Voucher - ${t.name}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 0; padding: 20px; }
    .hospital-header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 18px; margin-bottom: 8px; position: relative; }
    .hospital-header img { position: absolute; left: 0; top: 0; width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
    .hospital-header .info h1 { margin: 0; font-size: 20px; color: #0f172a; }
    .hospital-header .info p { margin: 2px 0 0; color: #64748b; font-size: 11px; }
    .voucher-title-bar { background: #059669; color: white; padding: 8px 16px; border-radius: 6px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
    .voucher-title-bar h2 { margin: 0; font-size: 16px; font-weight: 700; }
    .voucher-title-bar span { font-size: 12px; opacity: 0.9; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; }
    .field { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; margin-bottom: 3px; }
    .field-value { font-weight: 600; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .number { text-align: right; font-family: 'Courier New', monospace; }
    .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; border-bottom: none; color: #059669; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="hospital-header">
    ${hs.logoDataUrl ? '<img src="' + hs.logoDataUrl + '" alt="Logo" />' : ''}
    <div class="info">
      <h1>${hs.name || 'Hospital'}</h1>
      <p>${[hs.address, hs.phone, hs.email, hs.website].filter(Boolean).join(' &middot; ')}</p>
    </div>
  </div>

  <div class="voucher-title-bar">
    <h2>${t.name}</h2>
    <span>${t.voucherType} &middot; ${t.frequency}${t.dayOfMonth ? ' (Day ' + t.dayOfMonth + ')' : ''} &middot; <span class="badge ${t.active !== false ? 'badge-green' : 'badge-slate'}">${t.active !== false ? 'Active' : 'Inactive'}</span></span>
  </div>

  <div class="grid">
    <div class="field"><div class="field-label">Voucher Type</div><div class="field-value">${t.voucherType}</div></div>
    <div class="field"><div class="field-label">Frequency</div><div class="field-value">${t.frequency}${t.dayOfMonth ? ' &mdash; Day ' + t.dayOfMonth : ''}</div></div>
    <div class="field"><div class="field-label">Payee / Recipient</div><div class="field-value">${t.payee || '—'}</div></div>
    <div class="field"><div class="field-label">Module</div><div class="field-value">${t.module || 'General'}</div></div>
    <div class="field"><div class="field-label">Narration</div><div class="field-value">${t.narration || '—'}</div></div>
    <div class="field"><div class="field-label">Status</div><div class="field-value"><span class="badge ${t.active !== false ? 'badge-green' : 'badge-slate'}">${t.active !== false ? 'Active' : 'Inactive'}</span></div></div>
  </div>

  <table>
    <thead><tr><th style="width:25%">Account Code</th><th>Account Name</th><th style="width:18%" class="number">Debit</th><th style="width:18%" class="number">Credit</th></tr></thead>
    <tbody>
      ${(t.lines || []).map((l: any) => `<tr><td>${l.accountCode || ''}</td><td>${l.accountName || ''}</td><td class="number">${l.debit ? l.debit.toLocaleString() : ''}</td><td class="number">${l.credit ? l.credit.toLocaleString() : ''}</td></tr>`).join('')}
    </tbody>
    <tfoot><tr class="total-row"><td colspan="2">Total</td><td class="number">${totalDebit.toLocaleString()}</td><td class="number">${totalDebit.toLocaleString()}</td></tr></tfoot>
  </table>

  <div style="margin-top:30px; text-align:center;">
    <button onclick="window.print()" style="padding:10px 30px; background:#059669; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">Print Voucher</button>
  </div>

  <div class="footer">
    <div>Generated by MindSpire HMS Finance Module</div>
    <div>${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(printContent)
      w.document.close()
    }
  }

  async function handleGenerate() {
    try {
      const res = await financeApi.generateDueRecurringVouchers()
      setToast({ type: 'success', message: `Generated ${res?.generated || 0} vouchers` })
      fetchTemplates()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed' }) }
  }

  return (
    <div className="w-full p-3 sm:p-4 space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-800">Recurring Vouchers</div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm">Generate Due Vouchers</button>
          <button onClick={handleAddClick} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 shadow-sm">+ Add Template</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-4">
            <h3 className="text-lg font-bold text-emerald-900">{editingId ? 'Edit Recurring Template' : 'New Recurring Template'}</h3>
            {editingId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-emerald-800">Active Status</span>
                <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              </label>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Template Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Rent" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Voucher Type</label>
              <select value={form.voucherType} onChange={e => setForm({ ...form, voucherType: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="CPV">CPV — Cash Payment</option><option value="BPV">BPV — Bank Payment</option>
                <option value="CRV">CRV — Cash Receipt</option><option value="BRV">BRV — Bank Receipt</option>
                <option value="JV">JV — Journal</option><option value="CONTRA">CONTRA</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="daily">Daily</option><option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Day of Month (1-31)</label>
              <input value={form.dayOfMonth} onChange={e => setForm({ ...form, dayOfMonth: e.target.value })} placeholder="1" type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Payee / Recipient</label>
              <input value={form.payee} onChange={e => setForm({ ...form, payee: e.target.value })} placeholder="Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Narration</label>
              <input value={form.narration} onChange={e => setForm({ ...form, narration: e.target.value })} placeholder="Description" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-800 ml-1">Module</label>
              <input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} placeholder="e.g. Pharmacy" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">Voucher Journal Lines</div>
              <button onClick={() => setLines([...lines, { accountCode: '', accountName: '', debit: 0, credit: 0 }])} className="text-xs font-medium text-blue-600 hover:text-blue-800">+ Add Line Item</button>
            </div>
            
            <div className="grid gap-2 sm:grid-cols-12 text-[10px] font-bold text-emerald-700 px-1 uppercase tracking-tight">
              <div className="sm:col-span-3">Account Code</div>
              <div className="sm:col-span-5">Account Name</div>
              <div className="sm:col-span-2">Debit</div>
              <div className="sm:col-span-2">Credit</div>
            </div>

            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12 items-start">
                <div className="sm:col-span-3 relative">
                  <input 
                    value={line.accountCode} 
                    onChange={e => { 
                      const val = e.target.value;
                      const n = [...lines]; 
                      const acc = accounts.find(a => a.code === val);
                      n[i] = { ...n[i], accountCode: val, accountName: acc?.name || n[i].accountName }; 
                      setLines(n) 
                    }} 
                    placeholder="Code" 
                    list={`accounts-code-${i}`}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none" 
                  />
                  <datalist id={`accounts-code-${i}`}>
                    {accounts.map(a => <option key={a._id} value={a.code}>{a.name}</option>)}
                  </datalist>
                </div>
                <div className="sm:col-span-5 relative">
                  <input 
                    value={line.accountName} 
                    onChange={e => { 
                      const val = e.target.value;
                      const n = [...lines]; 
                      const acc = accounts.find(a => a.name === val);
                      n[i] = { ...n[i], accountName: val, accountCode: acc?.code || n[i].accountCode }; 
                      setLines(n) 
                    }} 
                    placeholder="Select Account" 
                    list={`accounts-name-${i}`}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none" 
                  />
                  <datalist id={`accounts-name-${i}`}>
                    {accounts.map(a => <option key={a._id} value={a.name}>{a.code}</option>)}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <input value={line.debit || ''} onChange={e => { const n = [...lines]; n[i] = { ...n[i], debit: parseFloat(e.target.value) || 0 }; setLines(n) }} placeholder="0.00" type="number" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-right" />
                </div>
                <div className="sm:col-span-2 flex gap-1">
                  <input value={line.credit || ''} onChange={e => { const n = [...lines]; n[i] = { ...n[i], credit: parseFloat(e.target.value) || 0 }; setLines(n) }} placeholder="0.00" type="number" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-right" />
                  {lines.length > 2 && (
                    <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700 p-1">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-emerald-200 pt-4">
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Saving...' : (editingId ? 'Update Template' : 'Save Template')}
              </button>
              <button onClick={() => setShowAdd(false)} className="rounded-md border border-slate-300 px-6 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50">Cancel</button>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Debit</span>
                <span className="font-mono font-bold text-emerald-700">{lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Credit</span>
                <span className="font-mono font-bold text-emerald-700">{lines.reduce((s, l) => s + (l.credit || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {templates.map((t: any) => (
          <div key={t._id} className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg font-bold text-xs ${
                  t.voucherType === 'CPV' ? 'bg-orange-100 text-orange-700' :
                  t.voucherType === 'BPV' ? 'bg-blue-100 text-blue-700' :
                  t.voucherType === 'JV' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {t.voucherType}
                </div>
                <div>
                  <div className="font-bold text-slate-900 leading-tight">{t.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 uppercase font-medium tracking-tighter">
                    <span className="bg-white border px-1 rounded">{t.frequency}</span>
                    {t.dayOfMonth && <span>Day {t.dayOfMonth}</span>}
                    {t.payee && <span className="text-slate-400">• Payee: {t.payee}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Amount</div>
                  <div className="font-mono font-bold text-slate-700">
                    {(t.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0).toLocaleString()}
                  </div>
                </div>
                {t.active ? 
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 border border-emerald-200">Active</span> : 
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 border border-slate-200">Inactive</span>
                }
                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                <button onClick={() => handleEditClick(t)} className="px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors" title="Edit Template">
                  Edit
                </button>
                <button onClick={() => handleDelete(t._id)} className="px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors" title="Delete Template">
                  Delete
                </button>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-white border-t border-slate-100">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                {t.nextDueDate && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Next Due:</span>
                    <span className="text-blue-600 font-bold">{t.nextDueDate}</span>
                  </div>
                )}
                {t.narration && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <span className="text-slate-400 font-medium whitespace-nowrap">Narration:</span>
                    <span className="text-slate-600 truncate italic">"{t.narration}"</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                   <button 
                    onClick={() => handlePrintPreview(t)} 
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400 hover:text-navy"
                   >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    Print Preview
                   </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-400 font-medium">No recurring voucher templates found. Click + Add Template to start.</div>}
      </div>
    </div>
  )
}
