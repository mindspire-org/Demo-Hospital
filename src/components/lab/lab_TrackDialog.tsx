import { useEffect, useState } from 'react'
import { X, User, Building } from 'lucide-react'
import { labApi } from '../../utils/api'

type TimelineEvent = {
  event: string
  at: string
  by: string
  details?: string
}

type TokenData = {
  _id: string
  tokenNo: string
  labNumber?: number
  patient: {
    fullName: string
    phone?: string
    mrn?: string
    age?: string
    gender?: string
  }
  tests: Array<string | { testId: string; testName: string; price: number }>
  status: string
  barcode?: string
  generatedAt: string
  generatedBy: string
  convertedAt?: string
  convertedBy?: string
  sampleReceivedAt?: string
  sampleReceivedBy?: string
  resultEnteredAt?: string
  resultEnteredBy?: string
  approvedAt?: string
  approvedBy?: string
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  testStatuses?: Array<{
    testId: string
    testName: string
    status: string
    sampleTime?: string
    resultId?: string
  }>
  // Collection Center fields
  collectionCenterId?: string
  collectionCenterName?: string
  centerCommissionPercent?: number
  centerCommissionAmount?: number
  centerNetAmount?: number
}

type TrackDialogProps = {
  open: boolean
  onClose: () => void
  tokenId?: string
  tokenNo?: string
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString() + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const statusColors: Record<string, string> = {
  token_generated: 'bg-blue-100 text-blue-700',
  converted_to_sample: 'bg-purple-100 text-purple-700',
  sample_received: 'bg-amber-100 text-amber-700',
  sample_collected: 'bg-amber-100 text-amber-700',
  returned: 'bg-rose-100 text-rose-700',
  pending: 'bg-slate-100 text-slate-700',
  result_entered: 'bg-orange-100 text-orange-700',
  result_rejected: 'bg-red-100 text-red-700',
  result_edited: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export default function Lab_TrackDialog({ open, onClose, tokenId, tokenNo }: TrackDialogProps) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<TokenData | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [tests, setTests] = useState<Array<{ id: string; name: string }>>([])
  const [order, setOrder] = useState<{ receivedAmount?: number; receivableAmount?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setToken(null)
      setEvents([])
      setError(null)
      return
    }
    const id = tokenId || tokenNo
    if (!id) return
    
    setLoading(true)
    setError(null)
    
    ;(async () => {
      try {
        const res = await labApi.getTokenTimeline(id)
        const t = res.token || null
        if (t && res.testStatuses) {
          t.testStatuses = res.testStatuses
        }
        setToken(t)
        setEvents(res.events || [])
        setOrder(res.order || null)
        
        // Load tests for names
        const testsRes = await labApi.listTests({ limit: 1000 })
        setTests((testsRes.items || []).map((t: any) => ({ id: String(t._id), name: t.name })))
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load tracking data')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, tokenId, tokenNo])

  if (!open) return null

  const testsMap = Object.fromEntries(tests.map(t => [t.id, t.name]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-800">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div>
            <div className="text-base font-semibold text-slate-800 dark:text-slate-100">Test Tracking</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Track patient test progress</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-8 text-center text-sm text-slate-600 dark:text-slate-400">Loading...</div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && token && (
            <>
              {/* Patient Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Lab No:</span>
                    <span className="ml-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{token.labNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Token No:</span>
                    <span className="ml-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{token.tokenNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Barcode:</span>
                    <span className="ml-2 font-mono text-slate-800 dark:text-slate-200">{token.barcode || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Patient:</span>
                    <span className="ml-2 text-slate-800 dark:text-slate-200">{token.patient?.fullName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">MR No:</span>
                    <span className="ml-2 text-slate-800 dark:text-slate-200">{token.patient?.mrn || '-'}</span>
                  </div>
                  
                  {/* Collection Center Info */}
                  {token.collectionCenterId && (
                    <div className="col-span-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Collection Center</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Center:</span>
                          <span className="ml-1 font-semibold text-slate-800 dark:text-slate-200">{token.collectionCenterName || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Commission:</span>
                          <span className="ml-1 font-semibold text-blue-700 dark:text-blue-400">{token.centerCommissionPercent || 0}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Commission Amt:</span>
                          <span className="ml-1 font-semibold text-orange-600 dark:text-orange-400">Rs {Number(token.centerCommissionAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Tests Tracking:</span>
                    <div className="mt-2 space-y-2">
                      {(token.testStatuses || (token.tests || []).map(t => {
                        if (typeof t === 'object' && t !== null) {
                          return { testId: t.testId, testName: t.testName || testsMap[t.testId] || t.testId, status: token.status, sampleTime: undefined, isReturned: false }
                        }
                        return { testId: String(t), testName: testsMap[t] || String(t), status: token.status, sampleTime: undefined, isReturned: false }
                      })).map((ts: any, idx) => {
                        const isReturned = ts.isReturned || ts.status === 'returned'
                        return (
                          <div key={idx} className={`rounded-lg border p-2 text-xs dark:border-slate-700 ${isReturned ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10' : 'border-slate-100 bg-white dark:bg-slate-800'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${isReturned ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {ts.testName} {isReturned && <span className="ml-1 text-rose-600 font-bold">(Returned)</span>}
                              </span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${statusColors[ts.status] || 'bg-slate-100 text-slate-700'}`}>
                                {(ts.status || '').replace(/_/g, ' ')}
                              </span>
                            </div>
                            {ts.sampleTime && (
                              <div className="mt-1 text-[10px] text-slate-500">
                                Sample: {new Date(ts.sampleTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Overall Status:</span>
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[token.status] || 'bg-slate-100 text-slate-700'}`}>
                      {token.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Received:</span>
                    <span className="ml-2 text-slate-800 dark:text-slate-200">{Number(order?.receivedAmount || token.receivedAmount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Receivable:</span>
                    <span className="ml-2 text-slate-800 dark:text-slate-200">{Number(order?.receivableAmount || token.receivableAmount || 0).toLocaleString()}</span>
                  </div>
                  {(token.subtotal || token.net) && (
                    <>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                        <span className="ml-2 text-slate-800 dark:text-slate-200">{Number(token.subtotal || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Discount:</span>
                        <span className="ml-2 text-slate-800 dark:text-slate-200">{Number(token.discount || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Timeline (Step by Step)</div>
                
                <div className="relative space-y-3">
                  {events.map((evt, idx) => {
                    const stepNumber = idx + 1
                    const isLast = idx === events.length - 1
                    
                    return (
                      <div key={idx} className="relative flex gap-3">
                        {/* Timeline line */}
                        {!isLast && (
                          <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                        )}
                        
                        {/* Step Number */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white dark:bg-violet-500">
                          {stepNumber}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{evt.event}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(evt.at)}</div>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <User className="h-3 w-3" />
                            <span>{evt.by}</span>
                          </div>
                          {evt.details && (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{evt.details}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {events.length === 0 && (
                    <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No tracking events available
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
