import { useState, useEffect, useRef } from 'react'
import { X, Clock, CheckCircle, AlertCircle, TestTube } from 'lucide-react'
import { labApi } from '../../utils/api'

let cachedTests: any[] | null = null
let cachedTestsAt = 0
const TESTS_CACHE_TTL_MS = 5 * 60 * 1000

type Test = {
  id: string
  name: string
  status: 'pending' | 'received' | 'completed'
  resultStatus?: 'pending' | 'approved'
  result?: any
  createdAt?: string
}

type TrackingInfo = {
  tokenNo: string
  patient: string
  mrn?: string
  status: string
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
  tests: Test[]
  barcode?: string
  labNumber?: string
  createdAt?: string
  createdBy?: string
}

type Props = {
  open: boolean
  onClose: () => void
  tokenNo: string
  testId?: string
}

export default function Lab_TrackingStatusDialog({ open, onClose, tokenNo, testId }: Props) {
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    console.log('🔍 Dialog props changed:', { open, tokenNo, testId })
    if (open && tokenNo) {
      fetchTrackingInfo()
    }
  }, [open, tokenNo, testId])

  async function fetchTrackingInfo() {
    const requestSeq = ++requestSeqRef.current
    setLoading(true)
    try {
      console.log('🔍 Tracking - Fetching for tokenNo:', tokenNo)
      
      // Fetch order details
      const ordersRes: any = await labApi.listOrders({ q: tokenNo, limit: 1 })
      console.log('🔍 Tracking - Orders response:', ordersRes)
      
      if (ordersRes.items && ordersRes.items.length > 0) {
        const order = ordersRes.items[0]
        console.log('🔍 Tracking - Order found:', order)
        console.log('🔍 Tracking - Order ID:', order._id)
        
        const now = Date.now()

        // Fetch test list (cached) + results in parallel
        const testsPromise = (async () => {
          if (cachedTests && now - cachedTestsAt < TESTS_CACHE_TTL_MS) return { items: cachedTests }
          const testsRes: any = await labApi.listTests({ limit: 1000 })
          cachedTests = testsRes.items || []
          cachedTestsAt = Date.now()
          return { items: cachedTests }
        })()

        console.log('🔍 Tracking - Fetching results for orderId:', order._id)
        const [testsRes, resultsRes]: any[] = await Promise.all([
          testsPromise,
          labApi.listResults({ orderId: order._id, limit: 100 })
        ])

        console.log('🔍 Tracking - Results response:', resultsRes)
        console.log('🔍 Tracking - Results count:', resultsRes.items?.length || 0)

        const allTests = testsRes.items || []
        
        // Get the first result (there should be one result per order)
        const orderResult = resultsRes.items && resultsRes.items.length > 0 ? resultsRes.items[0] : null
        
        if (orderResult) {
          console.log('🔍 Tracking - Order result found:', {
            resultStatus: orderResult.reportStatus,
            submittedBy: orderResult.submittedBy,
            approvedBy: orderResult.approvedBy,
            createdAt: orderResult.createdAt,
            approvedAt: orderResult.approvedAt
          })
        }
        
        // Map test IDs to test details with result status
        let testDetails = (order.tests || []).map((tid: any) => {
          // Handle if tid is an object
          const testIdStr = typeof tid === 'object' && tid !== null 
            ? (tid._id || tid.id || String(tid))
            : String(tid)
          
          const test = allTests.find((t: any) => String(t._id) === testIdStr)
          
          return {
            id: testIdStr,
            name: test?.name || 'Unknown Test',
            status: order.status || 'pending',
            resultStatus: orderResult?.reportStatus || 'pending',
            result: orderResult, // All tests share the same order result
            createdAt: order.createdAt
          }
        })
        
        // If specific testId is provided, filter to show only that test
        if (testId) {
          const targetId = String(testId)
          testDetails = testDetails.filter((t: any) => String(t.id) === targetId)
        }
        
        console.log('🔍 Tracking - Final test details:', testDetails)
        
        if (requestSeqRef.current !== requestSeq) return

        setTrackingInfo({
          tokenNo: order.tokenNo || tokenNo,
          patient: order.patient?.fullName || 'Unknown',
          mrn: order.patient?.mrn,
          status: order.status || 'pending',
          sampleTime: order.sampleTime,
          reportingTime: order.reportingTime,
          referringConsultant: order.referringConsultant,
          tests: testDetails,
          barcode: order.barcode,
          labNumber: order.labNumber,
          createdAt: order.createdAt,
          createdBy: order.createdByUsername
        })
      } else {
        console.log('🔍 Tracking - No order found for token:', tokenNo)
      }
    } catch (error) {
      console.error('🔍 Tracking - Error:', error)
    } finally {
      if (requestSeqRef.current === requestSeq) {
        setLoading(false)
      }
    }
  }

  if (!open) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'received':
        return 'bg-blue-100 text-blue-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-amber-100 text-amber-700'
    }
  }

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white text-slate-900 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold">Test Tracking</h3>
            <p className="text-sm text-slate-500">Track patient test progress</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          ) : trackingInfo ? (
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Lab No:</span>
                    <span className="ml-2 font-bold text-slate-900">{trackingInfo.labNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Token No:</span>
                    <span className="ml-2 font-bold text-blue-600">{trackingInfo.tokenNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Barcode:</span>
                    <span className="ml-2 font-mono text-xs font-bold text-slate-900">{trackingInfo.barcode || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Patient:</span>
                    <span className="ml-2 font-bold text-slate-900">{trackingInfo.patient}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">MR No:</span>
                    <span className="ml-2 font-bold text-slate-900">{trackingInfo.mrn || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tests:</span>
                    <span className="ml-2 font-bold text-slate-900">{trackingInfo.tests.map(t => t.name).join(', ')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Status:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(trackingInfo.status)}`}>
                      {trackingInfo.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Received:</span>
                    <span className="ml-2 font-bold text-slate-900">0</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Receivable:</span>
                    <span className="ml-2 font-bold text-slate-900">0</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Timeline</h4>
                <div className="space-y-3">
                  {/* Token Generated */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-bold text-slate-900">Token Generated</div>
                      <div className="text-xs text-slate-500 mt-1">
                        & {trackingInfo.createdBy || 'admin'}
                      </div>
                      <div className="text-xs text-slate-500">{formatDateTime(trackingInfo.createdAt)}</div>
                    </div>
                  </div>

                  {/* Converted to Sample */}
                  {trackingInfo.status !== 'pending' && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <TestTube className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-bold text-slate-900">Converted to Sample</div>
                        <div className="text-xs text-slate-500 mt-1">
                          & {trackingInfo.createdBy || 'admin'}
                        </div>
                        <div className="text-xs text-slate-500">Barcode: {trackingInfo.barcode || '-'}</div>
                      </div>
                    </div>
                  )}

                  {/* Sample Received */}
                  {trackingInfo.sampleTime && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-bold text-slate-900">Sample Received</div>
                        <div className="text-xs text-slate-500 mt-1">
                          & {trackingInfo.createdBy || 'admin'}
                        </div>
                        <div className="text-xs text-slate-500">{formatDateTime(trackingInfo.sampleTime)}</div>
                      </div>
                    </div>
                  )}

                  {/* Result Entered - Show if any test has result */}
                  {(() => {
                    const testWithResult = trackingInfo.tests.find((t: any) => t.result)
                    console.log('🔍 Timeline - Test with result:', testWithResult)
                    
                    if (testWithResult && testWithResult.result) {
                      return (
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <TestTube className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="font-bold text-slate-900">Result Entered</div>
                            <div className="text-xs text-slate-500 mt-1">
                              & {testWithResult.result.submittedBy || 'admin'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDateTime(testWithResult.result.createdAt)}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Report Approved - Show if any test is approved */}
                  {(() => {
                    const approvedTest = trackingInfo.tests.find((t: any) => t.resultStatus === 'approved' && t.result)
                    console.log('🔍 Timeline - Approved test:', approvedTest)
                    
                    if (approvedTest && approvedTest.result) {
                      return (
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-slate-900">Report Approved</div>
                            <div className="text-xs text-slate-500 mt-1">
                              & {approvedTest.result.approvedBy || 'admin'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDateTime(approvedTest.result.approvedAt)}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="font-semibold">No tracking information found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
