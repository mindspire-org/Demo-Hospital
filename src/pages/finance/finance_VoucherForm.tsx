import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { financeApi } from '../../features/finance/finance.api'
import Toast, { type ToastState } from '../../components/ui/Toast'

type Account = {
  _id: string
  code?: string
  name: string
  type: string
  subType?: string
  active: boolean
}

const voucherTypes = [
  { value: 'BPV', label: 'Bank Payment Voucher (BPV)' },
  { value: 'BRV', label: 'Bank Receipt Voucher (BRV)' },
  { value: 'CPV', label: 'Cash Payment Voucher (CPV)' },
  { value: 'CRV', label: 'Cash Receipt Voucher (CRV)' },
  { value: 'CONTRA', label: 'Contra Voucher (CONTRA) — Cash/Bank Deposit or Withdraw' },
  { value: 'JV', label: 'Journal Voucher (JV)' },
]

const COST_CENTERS = [
  { value: 'opd', label: 'OPD' },
  { value: 'ipd', label: 'IPD' },
  { value: 'er', label: 'ER' },
  { value: 'lab', label: 'Lab' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'dialysis', label: 'Dialysis' },
  { value: 'aesthetic', label: 'Aesthetic' },
  { value: 'ambulance', label: 'Ambulance' },
  { value: 'general', label: 'General' },
]

const cashCodes = ['2000-101']
const bankCodes = ['2000-102', '2000-103']
const VOUCHER_MODULES = ['opd','er','ipd','lab','pharmacy','diagnostic','dialysis','aesthetic','general'] as const

export default function Finance_VoucherForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const isExpenseMode = searchParams.get('mode') === 'expense'
  const moduleParam = searchParams.get('module') || ''

  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [voucherNo, setVoucherNo] = useState('')
  const [expenseAmount, setExpenseAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')
  const [cancelMemo, setCancelMemo] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const [formData, setFormData] = useState({
    voucherType: (isExpenseMode ? 'CPV' : 'JV') as 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA',
    dateIso: new Date().toISOString().slice(0, 10),
    payee: '',
    chequeNo: '',
    chequeDate: '',
    narration: '',
    module: moduleParam as string,
    status: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'posted' | 'cancelled',
    isExpense: isExpenseMode,
    expenseAccountCode: '',
    expenseAccountName: '',
    costCenter: moduleParam || '' as string,
    taxAmount: 0,
    taxType: 'none' as 'none' | 'sales_tax' | 'withholding',
    lines: [] as Array<{ accountCode: string; accountName: string; debit: number; credit: number }>,
  })

  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE')

  const totalDebit = formData.lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = formData.lines.reduce((s, l) => s + (l.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  // Load accounts
  useEffect(() => {
    loadAccounts()
    if (isEdit) loadVoucher()
    else loadNextVoucherNo()
  }, [id])

  // Auto-setup expense mode: no need to pre-fill lines, the simple form handles it
  useEffect(() => {
    if (isExpenseMode && !isEdit && accounts.length > 0) {
      loadNextVoucherNo('CPV')
    }
  }, [isExpenseMode, isEdit, accounts.length])

  async function loadAccounts() {
    try {
      const res: any = await financeApi.listChartOfAccounts({ active: true, limit: 500 })
      setAccounts(res.accounts || [])
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load accounts' })
    }
  }

  async function loadNextVoucherNo(type?: string) {
    try {
      const res: any = await financeApi.nextVoucherNo(type || formData.voucherType)
      setVoucherNo(res.voucherNo)
    } catch (e: any) {
      console.error('Failed to load voucher number:', e)
    }
  }

  async function loadVoucher() {
    setLoading(true)
    try {
      const res: any = await financeApi.getVoucher(id!)
      setVoucherNo(res.voucherNo)
      setFormData({
        voucherType: res.voucherType as 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA',
        dateIso: res.dateIso,
        payee: res.payee || '',
        chequeNo: res.chequeNo || '',
        chequeDate: res.chequeDate || '',
        narration: res.narration || '',
        module: res.module || '',
        status: res.status || 'draft',
        isExpense: res.isExpense || false,
        expenseAccountCode: res.expenseAccountCode || '',
        expenseAccountName: res.expenseAccountName || '',
        costCenter: res.costCenter || '',
        taxAmount: res.taxAmount || 0,
        taxType: res.taxType || 'none',
        lines: res.lines || [],
      })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load voucher' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    // Expense mode: use the simple createExpense endpoint
    if (isExpenseMode && !isEdit) {
      if (!formData.expenseAccountCode) {
        setToast({ type: 'error', message: 'Please select an expense account' })
        return
      }
      if (!expenseAmount || expenseAmount <= 0) {
        setToast({ type: 'error', message: 'Please enter a valid amount' })
        return
      }
      setLoading(true)
      try {
        await financeApi.createExpenseVoucher({
          dateIso: formData.dateIso,
          expenseAccountCode: formData.expenseAccountCode,
          costCenter: formData.costCenter || formData.module || undefined,
          amount: expenseAmount,
          method: paymentMethod,
          note: formData.narration || `${formData.expenseAccountName} payment`,
          payee: formData.payee || undefined,
          module: formData.module || undefined,
          taxAmount: formData.taxAmount || 0,
          taxType: formData.taxType || 'none',
        })
        setToast({ type: 'success', message: 'Expense voucher created successfully' })
        navigate('/finance/vouchers')
      } catch (e: any) {
        setToast({ type: 'error', message: e?.message || 'Failed to create expense voucher' })
      } finally {
        setLoading(false)
      }
      return
    }

    // Non-expense mode or editing: use the generic voucher flow
    if (!isBalanced) {
      setToast({ type: 'error', message: `Debits (${totalDebit}) must equal Credits (${totalCredit})` })
      return
    }
    if (formData.lines.length === 0) {
      setToast({ type: 'error', message: 'At least one line is required' })
      return
    }

    // Validate voucher type rules
    const error = validateVoucherRules()
    if (error) {
      setToast({ type: 'error', message: error })
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        ...formData,
        createdBy: 'system',
      }
      // Include expense fields if applicable (editing expense voucher)
      if (formData.isExpense) {
        payload.isExpense = true
        payload.expenseAccountCode = formData.expenseAccountCode || undefined
        payload.expenseAccountName = formData.expenseAccountName || undefined
        payload.costCenter = formData.costCenter || formData.module || undefined
        payload.taxAmount = formData.taxAmount || 0
        payload.taxType = formData.taxType || 'none'
      }
      if (isEdit) {
        await financeApi.updateVoucher(id!, payload)
        setToast({ type: 'success', message: 'Voucher updated successfully' })
      } else {
        await financeApi.createVoucher(payload)
        setToast({ type: 'success', message: 'Voucher created successfully' })
      }
      navigate('/finance/vouchers')
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to save voucher' })
    } finally {
      setLoading(false)
    }
  }

  async function handlePost() {
    if (!isEdit) {
      setToast({ type: 'error', message: 'Please save the voucher first' })
      return
    }
    setLoading(true)
    try {
      await financeApi.postVoucher(id!)
      setToast({ type: 'success', message: 'Voucher posted successfully' })
      loadVoucher()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to post voucher' })
    } finally {
      setLoading(false)
    }
  }

  function openCancelDialog() {
    setCancelMemo('')
    setShowCancelDialog(true)
  }

  async function handleCancel() {
    if (!cancelMemo.trim()) {
      setToast({ type: 'error', message: 'Please enter a cancellation reason' })
      return
    }
    setLoading(true)
    try {
      await financeApi.cancelVoucher(id!, cancelMemo.trim())
      setToast({ type: 'success', message: 'Voucher cancelled successfully' })
      setShowCancelDialog(false)
      loadVoucher()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to cancel voucher' })
    } finally {
      setLoading(false)
    }
  }

  function addLine() {
    setFormData({
      ...formData,
      lines: [...formData.lines, { accountCode: '', accountName: '', debit: 0, credit: 0 }],
    })
  }

  function updateLine(index: number, field: string, value: any) {
    const newLines = [...formData.lines]
    if (field === 'accountCode') {
      const acc = accounts.find(a => a.code === value)
      newLines[index] = { ...newLines[index], accountCode: value, accountName: acc?.name || '' }
    } else {
      newLines[index] = { ...newLines[index], [field]: value }
    }
    setFormData({ ...formData, lines: newLines })
  }

  function removeLine(index: number) {
    setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) })
  }

  function validateVoucherRules(): string | null {
    const { voucherType, lines } = formData
    switch (voucherType) {
      case 'BPV': {
        const hasBankCredit = lines.some(l => bankCodes.includes(l.accountCode) && (l.credit || 0) > 0)
        if (!hasBankCredit) return 'BPV must have a BANK account on the credit side'
        break
      }
      case 'BRV': {
        const hasBankDebit = lines.some(l => bankCodes.includes(l.accountCode) && (l.debit || 0) > 0)
        if (!hasBankDebit) return 'BRV must have a BANK account on the debit side'
        break
      }
      case 'CPV': {
        const hasCashCredit = lines.some(l => cashCodes.includes(l.accountCode) && (l.credit || 0) > 0)
        if (!hasCashCredit) return 'CPV must have a CASH account on the credit side'
        break
      }
      case 'CRV': {
        const hasCashDebit = lines.some(l => cashCodes.includes(l.accountCode) && (l.debit || 0) > 0)
        if (!hasCashDebit) return 'CRV must have a CASH account on the debit side'
        break
      }
      case 'CONTRA': {
        const cashBankCodes = [...cashCodes, ...bankCodes]
        const hasCashBankDebit = lines.some(l => cashBankCodes.includes(l.accountCode) && (l.debit || 0) > 0)
        const hasCashBankCredit = lines.some(l => cashBankCodes.includes(l.accountCode) && (l.credit || 0) > 0)
        if (!hasCashBankDebit || !hasCashBankCredit) return 'CONTRA must have a Cash/Bank account on both debit and credit sides'
        break
      }
    }
    return null
  }

  function handleTypeChange(type: string) {
    const vType = type as 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV' | 'CONTRA'
    setFormData(prev => {
      const next = { ...prev, voucherType: vType }
      // Auto-add default line for the new voucher type
      if (!isEdit) {
        const bankAcc = accounts.find(a => bankCodes.includes(a.code || ''))
        const cashAcc = accounts.find(a => cashCodes.includes(a.code || ''))
        if (next.lines.length === 0) {
          if (type === 'BPV' && bankAcc) {
            next.lines = [{ accountCode: bankAcc.code || '', accountName: bankAcc.name, debit: 0, credit: 0 }]
          } else if (type === 'BRV' && bankAcc) {
            next.lines = [{ accountCode: bankAcc.code || '', accountName: bankAcc.name, debit: 0, credit: 0 }]
          } else if (type === 'CPV' && cashAcc) {
            next.lines = [{ accountCode: cashAcc.code || '', accountName: cashAcc.name, debit: 0, credit: 0 }]
          } else if (type === 'CRV' && cashAcc) {
            next.lines = [{ accountCode: cashAcc.code || '', accountName: cashAcc.name, debit: 0, credit: 0 }]
          }
        }
      }
      return next
    })
    if (!isEdit) loadNextVoucherNo(type)
  }

  // Derived: which cash/bank account is currently set in the first line (for BPV/BRV/CPV/CRV)
  const bankAccounts = accounts.filter(a => bankCodes.includes(a.code || ''))
  const cashAccounts = accounts.filter(a => cashCodes.includes(a.code || ''))
  const cashBankAccounts = accounts.filter(a => [...cashCodes, ...bankCodes].includes(a.code || ''))

  // For BPV/BRV: the bank account code from the first line that has a bank code
  const currentBankCode = formData.lines.find(l => bankCodes.includes(l.accountCode))?.accountCode || ''
  // For CPV/CRV: the cash account code from the first line that has a cash code
  const currentCashCode = formData.lines.find(l => cashCodes.includes(l.accountCode))?.accountCode || ''
  // For CONTRA: from-account (debit side cash/bank) and to-account (credit side cash/bank)
  const currentContraFromCode = formData.lines.find(l => [...cashCodes, ...bankCodes].includes(l.accountCode) && (l.debit || 0) > 0)?.accountCode || ''
  const currentContraToCode = formData.lines.find(l => [...cashCodes, ...bankCodes].includes(l.accountCode) && (l.credit || 0) > 0)?.accountCode || ''

  function handleBankAccountChange(code: string) {
    const acc = accounts.find(a => a.code === code)
    const newLines = [...formData.lines]
    const existingIdx = newLines.findIndex(l => bankCodes.includes(l.accountCode))
    if (existingIdx >= 0) {
      newLines[existingIdx] = { ...newLines[existingIdx], accountCode: code, accountName: acc?.name || '' }
    } else {
      // Insert as first line
      newLines.unshift({ accountCode: code, accountName: acc?.name || '', debit: 0, credit: 0 })
    }
    setFormData({ ...formData, lines: newLines })
  }

  function handleCashAccountChange(code: string) {
    const acc = accounts.find(a => a.code === code)
    const newLines = [...formData.lines]
    const existingIdx = newLines.findIndex(l => cashCodes.includes(l.accountCode))
    if (existingIdx >= 0) {
      newLines[existingIdx] = { ...newLines[existingIdx], accountCode: code, accountName: acc?.name || '' }
    } else {
      newLines.unshift({ accountCode: code, accountName: acc?.name || '', debit: 0, credit: 0 })
    }
    setFormData({ ...formData, lines: newLines })
  }

  function handleContraFromChange(code: string) {
    const acc = accounts.find(a => a.code === code)
    const newLines = [...formData.lines]
    const existingIdx = newLines.findIndex(l => [...cashCodes, ...bankCodes].includes(l.accountCode) && (l.debit || 0) > 0)
    if (existingIdx >= 0) {
      newLines[existingIdx] = { ...newLines[existingIdx], accountCode: code, accountName: acc?.name || '' }
    } else {
      newLines.unshift({ accountCode: code, accountName: acc?.name || '', debit: 0, credit: 0 })
    }
    setFormData({ ...formData, lines: newLines })
  }

  function handleContraToChange(code: string) {
    const acc = accounts.find(a => a.code === code)
    const newLines = [...formData.lines]
    const existingIdx = newLines.findIndex(l => [...cashCodes, ...bankCodes].includes(l.accountCode) && (l.credit || 0) > 0)
    if (existingIdx >= 0) {
      newLines[existingIdx] = { ...newLines[existingIdx], accountCode: code, accountName: acc?.name || '' }
    } else {
      newLines.push({ accountCode: code, accountName: acc?.name || '', debit: 0, credit: 0 })
    }
    setFormData({ ...formData, lines: newLines })
  }

  const isPosted = formData.status === 'posted'
  const isCancelled = formData.status === 'cancelled'
  const showBankSelector = formData.voucherType === 'BPV' || formData.voucherType === 'BRV'
  const showCashSelector = formData.voucherType === 'CPV' || formData.voucherType === 'CRV'
  const showContraSelectors = formData.voucherType === 'CONTRA'

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-lg shadow p-5 mb-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Voucher' : isExpenseMode ? 'New Expense Voucher' : 'New Voucher'}</h1>
          <p className="text-sm text-blue-100 mt-1">{isEdit ? voucherNo : isExpenseMode ? 'Record an expense payment via voucher' : 'Create a new voucher'}</p>
        </div>
        <button onClick={() => navigate('/finance/vouchers')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg">
          ← Back to List
        </button>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}

      {!loading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Voucher Type</label>
              <select
                value={formData.voucherType}
                onChange={e => handleTypeChange(e.target.value)}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              >
                {voucherTypes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Voucher No</label>
              <input type="text" value={voucherNo} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.dateIso}
                onChange={e => setFormData({ ...formData, dateIso: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Bank / Cash / Contra account selector */}
          {showBankSelector && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Account</label>
                <select
                  value={currentBankCode}
                  onChange={e => handleBankAccountChange(e.target.value)}
                  disabled={isPosted || isCancelled}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select bank account...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {showCashSelector && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Cash Account</label>
                <select
                  value={currentCashCode}
                  onChange={e => handleCashAccountChange(e.target.value)}
                  disabled={isPosted || isCancelled}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select cash account...</option>
                  {cashAccounts.map(acc => (
                    <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {showContraSelectors && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">From Account (Debit)</label>
                <select
                  value={currentContraFromCode}
                  onChange={e => handleContraFromChange(e.target.value)}
                  disabled={isPosted || isCancelled}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select from account...</option>
                  {cashBankAccounts.map(acc => (
                    <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Account (Credit)</label>
                <select
                  value={currentContraToCode}
                  onChange={e => handleContraToChange(e.target.value)}
                  disabled={isPosted || isCancelled}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Select to account...</option>
                  {cashBankAccounts.map(acc => (
                    <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Payee</label>
              <input
                type="text"
                value={formData.payee}
                onChange={e => setFormData({ ...formData, payee: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cheque No</label>
              <input
                type="text"
                value={formData.chequeNo}
                onChange={e => setFormData({ ...formData, chequeNo: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cheque Date</label>
              <input
                type="date"
                value={formData.chequeDate}
                onChange={e => setFormData({ ...formData, chequeDate: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* ─── EXPENSE MODE: Simple form (no debit/credit knowledge needed) ─── */}
          {isExpenseMode && !isEdit && (
            <div className="mb-6 p-5 bg-orange-50 border border-orange-200 rounded-lg space-y-5">
              <div className="text-sm font-semibold text-orange-800">Expense Details — Just fill in the fields below, the system handles the accounting automatically.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">What did you spend on? <span className="text-red-500">*</span></label>
                  <select
                    value={formData.expenseAccountCode}
                    onChange={e => {
                      const acc = accounts.find(a => a.code === e.target.value)
                      setFormData({ ...formData, expenseAccountCode: e.target.value, expenseAccountName: acc?.name || '' })
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select expense type...</option>
                    {expenseAccounts.map(acc => (
                      <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={expenseAmount || ''}
                    onChange={e => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Paid Via</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="bank">🏦 Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Center</label>
                  <select
                    value={formData.costCenter}
                    onChange={e => setFormData({ ...formData, costCenter: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select cost center...</option>
                    {COST_CENTERS.map(cc => <option key={cc.value} value={cc.value}>{cc.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Module</label>
                  <select
                    value={formData.module}
                    onChange={e => setFormData({ ...formData, module: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">— General —</option>
                    {VOUCHER_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Paid To (Payee)</label>
                  <input
                    type="text"
                    placeholder="e.g. Zain Electric Co."
                    value={formData.payee}
                    onChange={e => setFormData({ ...formData, payee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description / Narration</label>
                  <input
                    type="text"
                    placeholder="e.g. Electricity bill for May 2026"
                    value={formData.narration}
                    onChange={e => setFormData({ ...formData, narration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Type</label>
                  <select
                    value={formData.taxType}
                    onChange={e => setFormData({ ...formData, taxType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="none">No Tax</option>
                    <option value="sales_tax">Sales Tax</option>
                    <option value="withholding">Withholding Tax</option>
                  </select>
                </div>
                {formData.taxType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.taxAmount || ''}
                      onChange={e => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Preview of what the system will create */}
              {formData.expenseAccountCode && expenseAmount > 0 && (
                <div className="mt-3 p-3 bg-white border border-orange-300 rounded-lg">
                  <div className="text-xs font-semibold text-gray-500 mb-2">ACCOUNTING PREVIEW (auto-generated)</div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1 text-left">Account</th>
                        <th className="px-3 py-1 text-right">Debit</th>
                        <th className="px-3 py-1 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-1">{formData.expenseAccountCode} - {formData.expenseAccountName}</td>
                        <td className="px-3 py-1 text-right">{expenseAmount.toFixed(2)}</td>
                        <td className="px-3 py-1 text-right">0.00</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-1">{paymentMethod === 'bank' ? '2000-102' : '2000-101'} - {paymentMethod === 'bank' ? 'BANK' : 'CASH IN HAND'}</td>
                        <td className="px-3 py-1 text-right">0.00</td>
                        <td className="px-3 py-1 text-right">{expenseAmount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-3 py-1">Total</td>
                        <td className="px-3 py-1 text-right">{expenseAmount.toFixed(2)}</td>
                        <td className="px-3 py-1 text-right">{expenseAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="mt-1 text-xs text-green-600">✓ Balanced — Debits equal Credits</div>
                </div>
              )}
            </div>
          )}

          {/* ─── EDIT EXPENSE MODE: Show expense fields + existing lines ─── */}
          {isEdit && formData.isExpense && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
              <div className="text-sm font-semibold text-orange-800">Expense Details</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expense Account (from COA)</label>
                  <select
                    value={formData.expenseAccountCode}
                    onChange={e => {
                      const acc = accounts.find(a => a.code === e.target.value)
                      setFormData({ ...formData, expenseAccountCode: e.target.value, expenseAccountName: acc?.name || '' })
                    }}
                    disabled={isPosted || isCancelled}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  >
                    <option value="">Select expense account...</option>
                    {expenseAccounts.map(acc => (
                      <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Center</label>
                  <select
                    value={formData.costCenter}
                    onChange={e => setFormData({ ...formData, costCenter: e.target.value })}
                    disabled={isPosted || isCancelled}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  >
                    <option value="">Select cost center...</option>
                    {COST_CENTERS.map(cc => <option key={cc.value} value={cc.value}>{cc.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Type</label>
                  <select
                    value={formData.taxType}
                    onChange={e => setFormData({ ...formData, taxType: e.target.value as any })}
                    disabled={isPosted || isCancelled}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  >
                    <option value="none">No Tax</option>
                    <option value="sales_tax">Sales Tax</option>
                    <option value="withholding">Withholding Tax</option>
                  </select>
                </div>
              </div>
              {formData.taxType !== 'none' && (
                <div className="w-48">
                  <label className="block text-sm font-medium mb-1">Tax Amount</label>
                  <input
                    type="number"
                    value={formData.taxAmount || ''}
                    onChange={e => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                    disabled={isPosted || isCancelled}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* Narration (hidden in new expense mode since it's in the expense card) */}
          {!isExpenseMode && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Narration</label>
              <textarea
                value={formData.narration}
                onChange={e => setFormData({ ...formData, narration: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                rows={2}
              />
            </div>
          )}

          {/* Module selector (hidden in new expense mode since it's in the expense card) */}
          {!isExpenseMode && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Module</label>
              <select
                value={formData.module}
                onChange={e => setFormData({ ...formData, module: e.target.value })}
                disabled={isPosted || isCancelled}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              >
                <option value="">— General —</option>
                {VOUCHER_MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          )}

          {/* Voucher Lines table — hidden in new expense mode (auto-generated by backend) */}
          {!isExpenseMode && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Voucher Lines</h3>
                {!isPosted && !isCancelled && <button onClick={addLine} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ Add Line</button>}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-right w-32">Debit</th>
                      <th className="px-3 py-2 text-right w-32">Credit</th>
                      {!isPosted && !isCancelled && <th className="px-3 py-2 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            value={line.accountCode}
                            onChange={e => updateLine(idx, 'accountCode', e.target.value)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded disabled:bg-gray-100"
                          >
                            <option value="">Select account...</option>
                            {accounts.map(acc => (
                              <option key={acc._id} value={acc.code}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.debit || ''}
                            onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded text-right disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.credit || ''}
                            onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded text-right disabled:bg-gray-100"
                          />
                        </td>
                        {!isPosted && !isCancelled && (
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-800">✕</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">{totalDebit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{totalCredit.toFixed(2)}</td>
                      {!isPosted && !isCancelled && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-2 text-sm">
                {isBalanced ? <span className="text-green-600">✓ Balanced</span> : <span className="text-red-600">✗ Not balanced: difference {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>}
              </div>
            </div>
          )}

          {/* Show existing lines for edit mode (expense or regular) */}
          {isEdit && formData.lines.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Voucher Lines</h3>
                {!isPosted && !isCancelled && !isExpenseMode && <button onClick={addLine} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ Add Line</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-right w-32">Debit</th>
                      <th className="px-3 py-2 text-right w-32">Credit</th>
                      {!isPosted && !isCancelled && <th className="px-3 py-2 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            value={line.accountCode}
                            onChange={e => updateLine(idx, 'accountCode', e.target.value)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded disabled:bg-gray-100"
                          >
                            <option value="">Select account...</option>
                            {accounts.map(acc => (
                              <option key={acc._id} value={acc.code}>{acc.code} - {acc.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.debit || ''}
                            onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded text-right disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.credit || ''}
                            onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                            disabled={isPosted || isCancelled}
                            className="w-full px-2 py-1 border rounded text-right disabled:bg-gray-100"
                          />
                        </td>
                        {!isPosted && !isCancelled && (
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-800">✕</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">{totalDebit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{totalCredit.toFixed(2)}</td>
                      {!isPosted && !isCancelled && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-2 text-sm">
                {isBalanced ? <span className="text-green-600">✓ Balanced</span> : <span className="text-red-600">✗ Not balanced: difference {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!isPosted && !isCancelled && (
              <button onClick={handleSave} disabled={isExpenseMode ? !formData.expenseAccountCode || !expenseAmount : !isBalanced} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                {isExpenseMode && !isEdit ? 'Create & Save Expense' : isEdit ? 'Update' : 'Save Draft'}
              </button>
            )}
            {isEdit && !isPosted && !isCancelled && (
              <button onClick={handlePost} disabled={!isBalanced} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300">
                Post Voucher
              </button>
            )}
            {isEdit && isPosted && !isCancelled && (
              <button onClick={openCancelDialog} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Cancel Voucher
              </button>
            )}
            <button onClick={() => navigate('/finance/vouchers')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Voucher Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Cancel Voucher</h3>
            <p className="text-sm text-gray-600 mb-4">This will reverse the journal entry. Please enter a reason for cancellation.</p>
            <textarea
              value={cancelMemo}
              onChange={e => setCancelMemo(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="w-full px-3 py-2 border rounded-lg mb-4"
              rows={3}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancelDialog(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Go Back
              </button>
              <button onClick={handleCancel} disabled={!cancelMemo.trim() || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300">
                {loading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
