import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

type DoctorSession = { id: string; name?: string; username?: string }

type Payout = {
  id: string
  dateIso: string
  amount: number
  memo?: string
  createdByUsername?: string
}

export default function Doctor_Finance() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
    } catch {}
  }, [])

  useEffect(() => {
    if (!doc?.id) return
    loadFinanceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  const loadFinanceData = async () => {
    if (!doc?.id) return
    setLoading(true)
    try {
      const [balanceRes, payoutsRes] = await Promise.all([
        financeApi.doctorBalance(doc.id) as any,
        financeApi.doctorPayouts(doc.id, 50) as any,
      ])
      setBalance(Number(balanceRes?.payable || 0))
      setPayouts(payoutsRes?.payouts || [])
    } catch (e: any) {
      console.error('Failed to load finance data:', e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateIso: string) => {
    try {
      const date = new Date(dateIso)
      return date.toLocaleDateString('en-PK', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateIso
    }
  }

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-600">Please login as a doctor</div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Finance</h1>
        <p className="text-sm text-slate-600">View your payouts and payables</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600">Loading...</div>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600">Current Payable</div>
                <div className="mt-1 text-3xl font-bold text-blue-800">
                  {formatCurrency(balance)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Amount pending to be paid out
                </div>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-3xl">
                💰
              </div>
            </div>
          </div>

          {/* Payouts History */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Payout History</h2>
              <p className="text-sm text-slate-600">Recent payouts received</p>
            </div>

            <div className="overflow-x-auto">
              {payouts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mb-2 text-4xl">📋</div>
                  <div className="text-slate-600">No payouts yet</div>
                  <div className="text-sm text-slate-500">Your payout history will appear here</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                        Memo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                        Processed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-800">
                          {formatDate(payout.dateIso)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payout.memo || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                          {payout.createdByUsername || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
