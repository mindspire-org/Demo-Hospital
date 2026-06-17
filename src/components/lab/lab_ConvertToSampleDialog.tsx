import { useState, useEffect } from 'react'
import { X, TestTube, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { labApi } from '../../utils/api'

type Test = {
  id: string
  name: string
  status: 'pending' | 'received' | 'completed'
}

type Props = {
  open: boolean
  onClose: () => void
  tokenNo: string
  orderId: string
  testId?: string
  onConvert: () => void
}

export default function Lab_ConvertToSampleDialog({ open, onClose, tokenNo, orderId, testId, onConvert }: Props) {
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (open && orderId) {
      fetchTests()
    }
  }, [open, orderId, testId])

  async function fetchTests() {
    setLoading(true)
    try {
      console.log('🔍 ConvertDialog - Fetching tests for:', { tokenNo, orderId, testId })
      
      // Fetch order details by searching for the token
      const res: any = await labApi.listOrders({ q: tokenNo, limit: 100 })
      console.log('🔍 ConvertDialog - API response:', res)
      
      if (res.items && res.items.length > 0) {
        // Find the specific order by ID
        const order = res.items.find((o: any) => String(o._id) === String(orderId))
        
        if (!order) {
          console.log('🔍 ConvertDialog - Order not found in results')
          setTests([])
          setLoading(false)
          return
        }
        
        console.log('🔍 ConvertDialog - Order found:', order)
        
        // Fetch test details
        const testsRes: any = await labApi.listTests({ limit: 1000 })
        const allTests = testsRes.items || []
        
        // Check if order has testDetails (new format)
        if (order.testDetails && Array.isArray(order.testDetails) && order.testDetails.length > 0) {
          console.log('🔍 ConvertDialog - Using testDetails:', order.testDetails)
          
          let testDetails = order.testDetails.map((td: any) => {
            const test = allTests.find((t: any) => String(t._id) === String(td.testId))
            return {
              id: String(td.testId),
              name: test?.name || 'Unknown Test',
              status: order.status || 'pending',
              trackingId: td.trackingId
            }
          })
          
          // Filter by testId if provided
          if (testId) {
            const targetId = String(testId)
            console.log('🔍 ConvertDialog - Filtering for testId:', targetId)
            console.log('🔍 ConvertDialog - Available test IDs:', testDetails.map((t: any) => t.id))
            testDetails = testDetails.filter((t: any) => String(t.id) === targetId)
            console.log('🔍 ConvertDialog - Filtered tests:', testDetails)
          }
          
          setTests(testDetails)
        } else {
          // Fallback to tests array (old format)
          console.log('🔍 ConvertDialog - Using tests array:', order.tests)
          
          let testDetails = (order.tests || []).map((tid: any) => {
            const testIdStr = typeof tid === 'object' && tid !== null 
              ? (tid._id || tid.id || String(tid))
              : String(tid)
            
            const test = allTests.find((t: any) => String(t._id) === testIdStr)
            return {
              id: testIdStr,
              name: test?.name || 'Unknown Test',
              status: order.status || 'pending'
            }
          })
          
          console.log('🔍 ConvertDialog - All test details:', testDetails)
          
          // Filter by testId if provided
          if (testId) {
            const targetId = String(testId)
            console.log('🔍 ConvertDialog - Filtering for testId:', targetId)
            console.log('🔍 ConvertDialog - Available test IDs:', testDetails.map((t: any) => t.id))
            testDetails = testDetails.filter((t: any) => String(t.id) === targetId)
            console.log('🔍 ConvertDialog - Filtered tests:', testDetails)
          }
          
          setTests(testDetails)
        }
      } else {
        console.log('🔍 ConvertDialog - No orders found')
        setTests([])
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConvert() {
    setConverting(true)
    try {
      // Update order status to 'received' (sample received)
      await labApi.updateOrderTrack(orderId, {
        status: 'received',
        sampleTime: new Date().toISOString()
      })
      
      onConvert()
      onClose()
    } catch (error) {
      console.error('Failed to convert to sample:', error)
      alert('Failed to convert to sample')
    } finally {
      setConverting(false)
    }
  }

  if (!open) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />
      case 'received':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-amber-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'received':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-amber-100 text-amber-700'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <TestTube className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Convert to Sample</h3>
              <p className="text-sm text-slate-600">Token: {tokenNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Test Status</h4>
                <div className="space-y-2">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <span className="font-semibold text-slate-900">{test.name}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                  ))}
                  {tests.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No tests found for this token
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Converting to sample will mark this token as "received" and record the sample collection time.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={converting}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || loading || tests.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {converting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                Converting...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Convert to Sample
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
