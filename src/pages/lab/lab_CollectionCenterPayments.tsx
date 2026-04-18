import { useEffect, useState } from 'react'
import { labApi } from '../../features/lab/lab.api'
import {
  CreditCard,
  History,
  X,
  CheckCircle,
  DollarSign,
  Building,
  Coins,
  TrendingUp,
} from 'lucide-react'

type PaymentRecord = {
  _id: string
  date: string
  amount: number
  note?: string
  recordedBy?: string
}

type CenterDetail = {
  _id: string
  name: string
  code: string
  commissionPercent: number
  balanceDue: number
  totalCommission: number
  totalRevenue: number
  totalTokens: number
  paymentHistory: PaymentRecord[]
}

type CenterSummary = {
  _id: string
  name: string
  code: string
  commissionPercent: number
  totalTokens: number
  totalRevenue: number
  totalCommission: number
  balanceDue: number
  paymentHistory: PaymentRecord[]
}

export default function Lab_CollectionCenterPayments() {
  const [centers, setCenters] = useState<CenterSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentCenter, setPaymentCenter] = useState<CenterDetail | null>(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  
  // History dialog state
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  
  // Recent payments across all centers
  const [recentPayments, setRecentPayments] = useState<{centerName: string, payment: PaymentRecord}[]>([])

  useEffect(() => {
    loadCenters()
  }, [])

  async function loadCenters() {
    try {
      setLoading(true)
      const res: any = await labApi.listCollectionCenters({ limit: 100 })
      const items = res.items || []
      setCenters(items)
      
      // Build recent payments list (last 10 across all centers)
      const allPayments: {centerName: string, payment: PaymentRecord}[] = []
      items.forEach((center: CenterSummary) => {
        if (center.paymentHistory && center.paymentHistory.length > 0) {
          center.paymentHistory.forEach(p => {
            allPayments.push({ centerName: center.name, payment: p })
          })
        }
      })
      // Sort by date descending and take last 10
      const sorted = allPayments
        .sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime())
        .slice(0, 10)
      setRecentPayments(sorted)
    } catch (err) {
      console.error('Failed to load centers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openPaymentDialog(centerId: string) {
    try {
      const res: any = await labApi.getCollectionCenterPaymentHistory(centerId)
      const centerInfo = centers.find(c => c._id === centerId)
      setPaymentCenter({
        _id: centerId,
        name: res.center?.name || centerInfo?.name || 'Unknown',
        code: res.center?.code || '',
        commissionPercent: centerInfo?.commissionPercent || 0,
        balanceDue: centerInfo?.balanceDue || 0,
        totalCommission: centerInfo?.totalCommission || 0,
        totalRevenue: centerInfo?.totalRevenue || 0,
        totalTokens: centerInfo?.totalTokens || 0,
        paymentHistory: res.payments || [],
      })
      setPaymentAmount(String(centerInfo?.balanceDue || 0))
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentNote('')
      setShowPaymentDialog(true)
    } catch (err) {
      console.error('Failed to load center details:', err)
    }
  }

  async function submitPayment() {
    if (!paymentCenter || !paymentAmount) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return

    setPaymentSubmitting(true)
    try {
      await labApi.recordCollectionCenterPayment(paymentCenter._id, {
        date: paymentDate,
        amount,
        note: paymentNote || undefined,
      })
      setShowPaymentDialog(false)
      await loadCenters()
    } catch (err: any) {
      console.error('Failed to record payment:', err)
      alert(err?.message || 'Failed to record payment')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  async function openHistoryDialog(centerId: string) {
    try {
      const res: any = await labApi.getCollectionCenterPaymentHistory(centerId)
      const centerInfo = centers.find(c => c._id === centerId)
      setPaymentCenter({
        _id: centerId,
        name: res.center?.name || centerInfo?.name || 'Unknown',
        code: res.center?.code || '',
        commissionPercent: centerInfo?.commissionPercent || 0,
        balanceDue: centerInfo?.balanceDue || 0,
        totalCommission: centerInfo?.totalCommission || 0,
        totalRevenue: centerInfo?.totalRevenue || 0,
        totalTokens: centerInfo?.totalTokens || 0,
        paymentHistory: res.payments || [],
      })
      setPaymentHistory(res.payments || [])
      setShowHistoryDialog(true)
    } catch (err) {
      console.error('Failed to load payment history:', err)
    }
  }

  // Calculate summary stats
  const stats = {
    totalCommission: centers.reduce((sum, c) => sum + (c.totalCommission || 0), 0),
    totalPaid: centers.reduce((sum, c) => {
      const paid = (c.paymentHistory || []).reduce((pSum, p) => pSum + (p.amount || 0), 0)
      return sum + paid
    }, 0),
    totalBalanceDue: centers.reduce((sum, c) => sum + (c.balanceDue || 0), 0),
    activeCenters: centers.filter(c => c.totalCommission && c.totalCommission > 0).length,
  }

  return (
    <div className="p-4 md:p-6 w-full min-h-[calc(100dvh-3.5rem)] bg-slate-50 dark:bg-slate-900/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            Collection Center Payments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage commission payments to collection centers</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-blue-600">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Total Commission
          </p>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-2">Rs {stats.totalCommission.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Earned by all centers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Total Paid
          </p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">Rs {stats.totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Payments made to centers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-orange-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Coins className="h-4 w-4" /> Balance Due
          </p>
          <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-2">Rs {stats.totalBalanceDue.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">Pending payments</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm border-t-4 border-t-indigo-500">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building className="h-4 w-4" /> Active Centers
          </p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{stats.activeCenters}</p>
          <p className="text-[10px] text-slate-400 mt-1 italic">With commission earned</p>
        </div>
      </div>

      {/* Centers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md mb-8">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Center Balances
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Click "Pay Now" to record a commission payment</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
              <span className="text-lg font-bold text-slate-400 mt-4">Loading centers...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Center</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Commission %</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Commission</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Balance Due</th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {centers.filter(c => c.totalCommission && c.totalCommission > 0).map((center) => {
                  const totalPaid = (center.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0)
                  return (
                    <tr key={center._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-white">{center.name}</span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">({center.code})</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{center.commissionPercent || 0}%</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          Rs {Number(center.totalCommission || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          Rs {totalPaid.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-bold ${(center.balanceDue || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          Rs {Number(center.balanceDue || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openHistoryDialog(center._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </button>
                          {(center.balanceDue || 0) > 0 && (
                            <button
                              onClick={() => openPaymentDialog(center._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {centers.filter(c => c.totalCommission && c.totalCommission > 0).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500 font-medium">No centers with commission yet</p>
                        <p className="text-slate-400 text-sm">Commission will appear here when tokens are generated at collection centers</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Recent Payments
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Last 10 payments across all centers</p>
        </div>
        <div className="overflow-x-auto">
          {recentPayments.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Center</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Note</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentPayments.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {new Date(item.payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white">{item.centerName}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      Rs {Number(item.payment.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{item.payment.note || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.payment.recordedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium mt-2">No payments recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && paymentCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Record Payment
              </h3>
              <button onClick={() => setShowPaymentDialog(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Center</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{paymentCenter.name}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">Balance Due:</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">Rs {Number(paymentCenter.balanceDue || 0).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Amount (Rs)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white font-medium text-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Note (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., Bank transfer, Cash, Cheque #123"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {paymentSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Dialog */}
      {showHistoryDialog && paymentCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Payment History - {paymentCenter.name}
              </h3>
              <button onClick={() => setShowHistoryDialog(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Total Commission</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">Rs {Number(paymentCenter.totalCommission || 0).toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold">Total Paid</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs {paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <p className="text-xs text-orange-600 dark:text-orange-400 uppercase font-bold">Balance Due</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">Rs {Number(paymentCenter.balanceDue || 0).toLocaleString()}</p>
                </div>
              </div>
              {paymentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Note</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {paymentHistory.map((payment) => (
                        <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                          <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                            Rs {Number(payment.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{payment.note || '-'}</td>
                          <td className="px-3 py-3 text-sm text-slate-500">{payment.recordedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">No payments recorded yet</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => { setShowHistoryDialog(false); openPaymentDialog(paymentCenter._id); }}
                disabled={(paymentCenter.balanceDue || 0) <= 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Record Payment
              </button>
              <button
                onClick={() => setShowHistoryDialog(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
