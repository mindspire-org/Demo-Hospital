import { useEffect, useState, useMemo } from 'react'
import { labApi } from '../../utils/api'
import { printLabTokenSlip } from '../../utils/printLabToken'
import { Search, Clock, FileText, Calendar, TestTube, FlaskConical, RefreshCw } from 'lucide-react'
import Lab_ConvertToSampleDialog from '../../components/lab/lab_ConvertToSampleDialog'
import Lab_TrackingStatusDialog from '../../components/lab/lab_TrackingStatusDialog'

type Order = {
  id: string
  tokenNo: string
  createdAt: string
  patient: { fullName: string; mrn?: string; phone?: string }
  tests: string[]
  testDetails?: Array<{ testId: string; trackingId: string }>
  status: string
  referringConsultant?: string
  sampleTime?: string
  reportingTime?: string
}

export default function Lab_TokenHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 50

  // Convert to Sample dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [selectedToken, setSelectedToken] = useState<{ tokenNo: string; orderId: string; testId?: string } | null>(null)

  // Tracking Status dialog state
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false)
  const [trackingTokenNo, setTrackingTokenNo] = useState('')
  const [trackingTestId, setTrackingTestId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchTests()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [page, from, to])

  async function fetchTests() {
    try {
      const res: any = await labApi.listTests({ limit: 1000 })
      const testsList = res.items || []
      setTests(testsList)
      console.log('Loaded tests:', testsList.length, testsList.slice(0, 3))
    } catch (error) {
      console.error('Failed to fetch tests:', error)
    }
  }

  async function fetchOrders() {
    setLoading(true)
    try {
      const res: any = await labApi.listOrders({ from, to, page, limit, q: search })
      const ordersList = (res.items || []).map((o: any) => ({
        id: o._id,
        tokenNo: o.tokenNo || '-',
        createdAt: o.createdAt,
        patient: o.patient || { fullName: '-' },
        tests: o.tests || [],
        testDetails: o.testDetails || [],
        status: o.status || 'pending',
        referringConsultant: o.referringConsultant,
        sampleTime: o.sampleTime,
        reportingTime: o.reportingTime
      }))
      console.log('Sample order tests:', ordersList[0]?.tests)
      setOrders(ordersList)
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTestName(testId: string | any) {
    // Handle if testId is an object with _id or id property
    const id = typeof testId === 'object' && testId !== null 
      ? (testId._id || testId.id || String(testId))
      : String(testId)
    
    const test = tests.find(t => String(t._id) === String(id))
    const name = test?.name || id
    
    // Debug logging
    if (!test) {
      console.log('Test not found for ID:', id, 'Available tests:', tests.length)
    }
    
    return name
  }

  function handleSearch() {
    setPage(1)
    fetchOrders()
  }

  function handleTrackSample(tokenNo: string, testId?: string) {
    console.log('🔍 Track button clicked:', { tokenNo, testId })
    setTrackingTokenNo(tokenNo)
    setTrackingTestId(testId)
    setTrackingDialogOpen(true)
    console.log('🔍 Dialog state set to true')
  }

  function handleConvertToSample(tokenNo: string, orderId: string, testId?: string) {
    console.log('🔍 TokenHistory - Convert clicked:', { tokenNo, orderId, testId })
    setSelectedToken({ tokenNo, orderId, testId })
    setConvertDialogOpen(true)
  }

  function handleConvertSuccess() {
    fetchOrders() // Refresh the list
  }

  async function handleReprintToken(order: Order) {
    try {
      const res: any = await labApi.listOrders({ q: order.tokenNo, limit: 5 }).catch(() => null)
      const fullOrder = (res?.items || []).find((x: any) => String(x._id) === String(order.id)) || {}
      const rawTests: any[] = fullOrder.tests || order.tests || []
      const testItems = rawTests.map((t: any) => ({
        name: typeof t === 'object' && t?.testName ? t.testName : (tests.find(x => String(x._id) === String(t))?.name || String(t)),
        price: typeof t === 'object' ? (t.price || 0) : 0,
      }))
      const subtotal = testItems.reduce((s, t) => s + t.price, 0)
      const discount = Number(fullOrder.discount || 0)
      const net = Math.max(0, subtotal - discount)
      const receivedAmount = Number(fullOrder.receivedAmount || 0)
      await printLabTokenSlip({
        tokenNo: order.tokenNo,
        createdAt: order.createdAt,
        patient: {
          fullName: order.patient.fullName,
          mrn: order.patient.mrn,
          phone: order.patient.phone,
          age: (order.patient as any).age,
          gender: (order.patient as any).gender,
        },
        tests: testItems,
        subtotal,
        discount,
        net,
        receivedAmount,
        receivableAmount: Math.max(0, net - receivedAmount),
        printedBy: 'Reprint',
      })
    } catch (err) {
      console.error('Reprint failed', err)
    }
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'received': return 'bg-blue-100 text-blue-700'
      case 'returned': return 'bg-rose-100 text-rose-700'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  // Prepare rows with test names resolved
  const tableRows = useMemo(() => {
    return orders.flatMap((order) => {
      // Use testDetails if available (new format), otherwise fall back to tests array
      if (order.testDetails && order.testDetails.length > 0) {
        return order.testDetails.map((testDetail) => ({
          key: `${order.id}-${testDetail.trackingId}`,
          order,
          testId: testDetail.testId,
          trackingId: testDetail.trackingId,
          testName: getTestName(testDetail.testId)
        }))
      } else {
        // Fallback for old orders without testDetails
        return order.tests.map((testId: any, idx: number) => {
          const id = typeof testId === 'object' && testId !== null 
            ? (testId._id || testId.id || String(testId))
            : String(testId)
          
          console.log('🔍 TokenHistory - Creating row for test:', { orderId: order.id, testId: id, idx })
          
          return {
            key: `${order.id}-${id}-${idx}`,
            order,
            testId: id,
            trackingId: `LB-${new Date(order.createdAt).getFullYear()}-${order.tokenNo}-${id.slice(-4)}`, // Fallback format
            testName: getTestName(testId)
          }
        })
      }
    })
  }, [orders, tests])

  return (
    <div className="w-full min-h-screen bg-slate-50 px-4 md:px-8 py-8 space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Token History</h1>
            <p className="text-slate-600">Track all generated lab tokens and test status</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Tokens</p>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2.5">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2.5">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Received</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === 'received').length}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2.5">
                <TestTube className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {orders.filter(o => o.status === 'completed').length}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <FlaskConical className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Token, patient, MRN, phone..."
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Token Records</h3>
            <p className="text-sm text-slate-300 mt-0.5">All generated tokens with individual test tracking</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Token #</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Date & Time</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">MRN</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Test Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Tracking ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Doctor</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row) => {
                const dt = formatDateTime(row.order.createdAt)
                
                return (
                  <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600">{row.order.tokenNo}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900">{dt.date}</div>
                          <div className="text-xs text-slate-500">{dt.time}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{row.order.patient.fullName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{row.order.patient.mrn || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.order.patient.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TestTube className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-800">{row.testName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-medium">
                        {row.trackingId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.order.referringConsultant || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${getStatusColor(row.order.status)}`}>
                        {row.order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleConvertToSample(row.order.tokenNo, row.order.id, row.testId)}
                          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          title="Convert to Sample"
                        >
                          <FlaskConical className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTrackSample(row.order.tokenNo, row.testId)}
                          className="p-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                          title="Track Sample"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReprintToken(row.order)}
                          className="p-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                          title="RF — Reprint Token Slip"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="rounded-full bg-slate-100 p-6">
                        <FileText className="h-16 w-16 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-semibold text-lg mb-1">No tokens found</p>
                        <p className="text-slate-500 text-sm">Try adjusting your search filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-600 font-medium">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Convert to Sample Dialog */}
      {selectedToken && (
        <Lab_ConvertToSampleDialog
          open={convertDialogOpen}
          onClose={() => {
            setConvertDialogOpen(false)
            setSelectedToken(null)
          }}
          tokenNo={selectedToken.tokenNo}
          orderId={selectedToken.orderId}
          testId={selectedToken.testId}
          onConvert={handleConvertSuccess}
        />
      )}

      {/* Tracking Status Dialog */}
      <Lab_TrackingStatusDialog
        open={trackingDialogOpen}
        onClose={() => {
          console.log('🔍 Rendering dialog section:', { trackingDialogOpen, trackingTokenNo, trackingTestId })
          setTrackingDialogOpen(false)
          setTrackingTokenNo('')
          setTrackingTestId(undefined)
        }}
        tokenNo={trackingTokenNo}
        testId={trackingTestId}
      />
    </div>
  )
}
