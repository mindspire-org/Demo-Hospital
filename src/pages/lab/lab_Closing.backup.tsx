import { useEffect, useState, useMemo } from 'react'
import { labApi } from '../../utils/api'
import { Download, FileText, TestTube, CheckCircle, Activity } from 'lucide-react'

type Order = {
  id: string
  tokenNo: string
  createdAt: string
  patient: { fullName: string; mrn?: string }
  tests: string[]
  referringConsultant?: string
  status: string
  paymentMethod?: string
  charges: number
  discount: number
  netAmount: number
  doctorShare: number
  hospitalShare: number
  treatment?: string
  user?: string
}

type LabTest = {
  id: string
  name: string
  category?: string
  price?: number
}

type TestStat = {
  testId: string
  testName: string
  category: string
  count: number
  revenue: number
}

export default function Lab_Closing() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [testStats, setTestStats] = useState<TestStat[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [ordersRes, testsRes]: any[] = await Promise.all([
        labApi.listOrders({ from, to, limit: 10000 }),
        labApi.listTests({ limit: 10000 })
      ])

      const testsData: LabTest[] = (testsRes.items || []).map((t: any) => ({
        id: t._id,
        name: t.name,
        category: t.category || 'General',
        price: Number(t.price || 0)
      }))

      // Create test price map
      const testPriceMap = new Map<string, number>()
      const testNameMap = new Map<string, string>()
      const testCategoryMap = new Map<string, string>()
      testsData.forEach((test) => {
        testPriceMap.set(test.id, test.price || 0)
        testNameMap.set(test.id, test.name)
        testCategoryMap.set(test.id, test.category || 'General')
      })

      const ordersList = (ordersRes.items || [])
        .filter((o: any) => {
          const orderDate = new Date(o.createdAt).toISOString().slice(0, 10)
          return orderDate >= from && orderDate <= to
        })
        .map((o: any) => {
          let charges = Number(o.totalAmount || 0)
          if (charges === 0 && o.tests && o.tests.length > 0) {
            charges = o.tests.reduce((sum: number, testId: string) => {
              return sum + (testPriceMap.get(testId) || 0)
            }, 0)
          }

          const discount = Number(o.discount || 0)
          const netAmount = charges - discount

          return {
            id: o._id,
            tokenNo: o.tokenNo || '-',
            createdAt: o.createdAt || new Date().toISOString(),
            patient: o.patient || { fullName: '-' },
            tests: o.tests || [],
            referringConsultant: o.referringConsultant || 'Self/Age Pt/Company',
            status: o.status || 'received',
            paymentMethod: o.paymentMethod || 'Private',
            charges,
            discount,
            netAmount,
            doctorShare: 0,
            hospitalShare: 0,
            treatment: o.treatment || '',
            user: o.createdBy || 'sehar'
          }
        })

      setOrders(ordersList)

      // Calculate test-wise statistics
      const testCountMap = new Map<string, number>()
      const testRevenueMap = new Map<string, number>()

      ordersList.forEach((order: Order) => {
        order.tests.forEach((testId: string) => {
          testCountMap.set(testId, (testCountMap.get(testId) || 0) + 1)
          const price = testPriceMap.get(testId) || 0
          testRevenueMap.set(testId, (testRevenueMap.get(testId) || 0) + price)
        })
      })

      const stats: TestStat[] = Array.from(testCountMap.entries())
        .map(([testId, count]) => ({
          testId,
          testName: testNameMap.get(testId) || 'Unknown Test',
          category: testCategoryMap.get(testId) || 'General',
          count,
          revenue: testRevenueMap.get(testId) || 0
        }))
        .sort((a, b) => b.count - a.count) // Sort by count descending

      setTestStats(stats)
      
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  function setPeriodDates(periodType: 'daily' | 'weekly' | 'monthly') {
    const today = new Date()
    let fromDate = new Date()
    
    switch (periodType) {
      case 'daily':
        fromDate = today
        break
      case 'weekly':
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - diff)
        break
      case 'monthly':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
        break
    }
    
    setFrom(fromDate.toISOString().slice(0, 10))
    setTo(today.toISOString().slice(0, 10))
    setPeriod(periodType)
    
    setTimeout(() => fetchData(), 100)
  }

  const summary = useMemo(() => {
    const totalTokens = orders.length
    const totalTests = testStats.reduce((sum, stat) => sum + stat.count, 0)
    const totalRevenue = testStats.reduce((sum, stat) => sum + stat.revenue, 0)
    const completedOrders = orders.filter(o => o.status === 'completed').length
    const uniqueTests = testStats.length

    return {
      totalTokens,
      totalTests,
      totalRevenue,
      completedOrders,
      uniqueTests
    }
  }, [orders, testStats])

  const fmtMoney = (n: number) => n.toLocaleString()

  async function downloadPDF() {
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    let yPos = 15

    // Get settings
    let settings: any = {}
    try {
      const res: any = await labApi.getSettings()
      settings = res || {}
    } catch {}

    const labName = settings.labName || 'Laboratory'

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(labName, 105, yPos, { align: 'center' })
    yPos += 8

    doc.setFontSize(12)
    doc.text('Lab Test-Wise Performance Report', 105, yPos, { align: 'center' })
    yPos += 10

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`From: ${from}`, 15, yPos)
    doc.text(`To: ${to}`, 105, yPos, { align: 'center' })
    doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 195, yPos, { align: 'right' })
    yPos += 15

    // Summary Section
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Summary', 17, yPos + 5.5)
    yPos += 12

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Tokens Generated', summary.totalTokens.toString()],
        ['Total Tests Performed', summary.totalTests.toString()],
        ['Unique Tests', summary.uniqueTests.toString()],
        ['Completed Orders', summary.completedOrders.toString()],
        ['Total Revenue', `Rs ${summary.totalRevenue.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 100, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'right', fontStyle: 'bold', fontSize: 11 }
      },
      margin: { left: 15, right: 15 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Test-Wise Statistics Table
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Test-Wise Performance', 17, yPos + 5.5)
    yPos += 12

    const headers = ['Sr', 'Test Name', 'Category', 'Count', 'Revenue']
    const tableData = testStats.map((stat, idx) => [
      (idx + 1).toString(),
      stat.testName,
      stat.category,
      stat.count.toString(),
      `Rs ${stat.revenue.toLocaleString()}`
    ])

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // Totals row
    doc.setFillColor(209, 250, 229)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(21, 128, 61)
    doc.text(`Total Tests: ${summary.totalTests}`, 20, yPos + 5.5)
    doc.text(`Total Revenue: Rs ${summary.totalRevenue.toLocaleString()}`, 195, yPos + 5.5, { align: 'right' })
    doc.setTextColor(0, 0, 0)

    doc.save(`Lab_Test_Performance_${from}_to_${to}.pdf`)
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/50 px-4 md:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Test Analytics</h1>
          <p className="text-slate-600">Track test performance and token statistics</p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Period Selector - Simplified */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setPeriodDates('daily')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            period === 'daily'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setPeriodDates('weekly')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            period === 'weekly'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setPeriodDates('monthly')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            period === 'monthly'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          This Month
        </button>
        
        {/* Custom Date Range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
          />
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Summary Cards - Compact & Colorful */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="relative rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg shadow-violet-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <FileText className="h-8 w-8 mb-3 opacity-90" />
          <div className="text-3xl font-black mb-1">{summary.totalTokens}</div>
          <div className="text-sm font-medium opacity-90">Total Tokens</div>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <TestTube className="h-8 w-8 mb-3 opacity-90" />
          <div className="text-3xl font-black mb-1">{summary.totalTests}</div>
          <div className="text-sm font-medium opacity-90">Total Tests</div>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg shadow-purple-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <Activity className="h-8 w-8 mb-3 opacity-90" />
          <div className="text-3xl font-black mb-1">{summary.uniqueTests}</div>
          <div className="text-sm font-medium opacity-90">Unique Tests</div>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg shadow-green-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <CheckCircle className="h-8 w-8 mb-3 opacity-90" />
          <div className="text-3xl font-black mb-1">{summary.completedOrders}</div>
          <div className="text-sm font-medium opacity-90">Completed</div>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-200 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <FileText className="h-8 w-8 mb-3 opacity-90" />
          <div className="text-2xl font-black mb-1">Rs {fmtMoney(summary.totalRevenue)}</div>
          <div className="text-sm font-medium opacity-90">Revenue</div>
        </div>
      </div>

      {/* Test-Wise Statistics Table - Modern Design */}
      <div className="rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-violet-600">
          <h3 className="font-black text-white text-lg">Test Performance Details</h3>
          <p className="text-sm text-violet-100 mt-0.5">Breakdown by test type</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">Sr</th>
                <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">Test Name</th>
                <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Count</th>
                <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-wider text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {testStats.map((stat, idx) => (
                <tr key={stat.testId} className="hover:bg-violet-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">{stat.testName}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                      {stat.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black text-lg shadow-lg shadow-emerald-200">
                      {stat.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 text-base">
                    Rs {fmtMoney(stat.revenue)}
                  </td>
                </tr>
              ))}
              {testStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <TestTube className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No test data available for selected period</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {testStats.length > 0 && (
              <tfoot className="bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-200">
                <tr>
                  <td colSpan={3} className="px-6 py-5 text-right font-black text-slate-900 text-lg">
                    TOTAL:
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 text-white font-black text-xl shadow-xl shadow-emerald-300">
                      {summary.totalTests}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-emerald-700 text-xl">
                    Rs {fmtMoney(summary.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-6">
          <div className="h-20 w-20 rounded-full border-4 border-slate-100 border-t-violet-600 animate-spin"></div>
          <div className="text-center">
            <p className="text-slate-900 font-black text-lg tracking-tight">Loading Test Performance Data...</p>
          </div>
        </div>
      )}
    </div>
  )
}
