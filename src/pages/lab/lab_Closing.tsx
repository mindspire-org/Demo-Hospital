import { useEffect, useState, useMemo } from 'react'
import { labApi } from '../../utils/api'
import { Calendar, Download, FileText, TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react'
import Lab_AddExpense from '../../components/lab/lab_AddExpense'

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
  payments?: Array<{ amount: number; at: string; note?: string; method?: string; receivedBy?: string }>
}

type Expense = {
  id: string
  date: string
  datetime?: string
  type: string
  note: string
  amount: number
  createdBy: string
}

type Transaction = {
  id: string
  date: string
  time: string
  type: 'Payment Received' | 'Expense' | 'Supplier Cost'
  description: string
  debit: number
  credit: number
  balance: number
  user: string
  referenceNo?: string
}

let cachedTestsPriceMap: Map<string, number> | null = null
let cachedTestsPriceMapAt = 0
const TESTS_PRICE_CACHE_TTL_MS = 5 * 60 * 1000

export default function Lab_Closing() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [closingBalance, setClosingBalance] = useState<number>(0)
  const [totalProfit, setTotalProfit] = useState<number>(0)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  
  const [currentUser, setCurrentUser] = useState<string>('admin')

  useEffect(() => {
    try {
      const session = localStorage.getItem('lab.session')
      if (session) {
        const user = JSON.parse(session)
        setCurrentUser(user?.username || user?.name || 'admin')
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [])

  async function calculateOpeningBalance(currentFromDate: string): Promise<number> {
    try {
      const beforeDate = new Date(currentFromDate + 'T00:00:00')
      beforeDate.setDate(beforeDate.getDate() - 1)
      beforeDate.setHours(23, 59, 59, 999)
      const beforeDateStr = beforeDate.toISOString().slice(0, 10)
      
      // Avoid huge historical fetches; use a reasonable lookback window to improve performance.
      // If you need exact all-time opening balances, implement a backend aggregated endpoint.
      const lookback = new Date(currentFromDate + 'T00:00:00')
      lookback.setDate(lookback.getDate() - 120)
      const veryEarlyDate = lookback.toISOString().slice(0, 10)
      
      const [ordersRes, expensesRes]: any[] = await Promise.all([
        labApi.listOrders({ from: veryEarlyDate, to: beforeDateStr, limit: 10000 }),
        labApi.listExpenses({ from: veryEarlyDate, to: beforeDateStr, limit: 10000 })
      ])

      const previousOrders = (ordersRes.items || []).filter((o: any) => {
        const orderDate = new Date(o.createdAt).toISOString().slice(0, 10)
        return orderDate < currentFromDate
      })

      const previousExpenses = (expensesRes.items || []).filter((e: any) => {
        return e.date < currentFromDate
      })

      const totalRevenue = previousOrders.reduce((sum: number, o: any) => {
        return sum + Number(o.netAmount || o.totalAmount || 0)
      }, 0)
      
      const totalExpenses = previousExpenses.reduce((sum: number, e: any) => {
        return sum + Number(e.amount || 0)
      }, 0)
      
      return totalRevenue - totalExpenses
    } catch (error) {
      console.error('Failed to calculate opening balance:', error)
      return 0
    }
  }

  async function fetchData(recalculateOpening: boolean = true) {
    setLoading(true)
    try {
      let opening = openingBalance
      if (recalculateOpening) {
        opening = await calculateOpeningBalance(from)
        setOpeningBalance(opening)
      }

      const now = Date.now()
      const testsPricePromise = (async () => {
        if (cachedTestsPriceMap && now - cachedTestsPriceMapAt < TESTS_PRICE_CACHE_TTL_MS) return cachedTestsPriceMap
        const testsRes: any = await labApi.listTests({ limit: 10000 })
        const testsData = testsRes.items || []
        const testPriceMap = new Map<string, number>()
        testsData.forEach((test: any) => {
          testPriceMap.set(String(test._id), Number(test.price || 0))
        })
        cachedTestsPriceMap = testPriceMap
        cachedTestsPriceMapAt = Date.now()
        return testPriceMap
      })()

      const [ordersRes, expensesRes, testPriceMap]: any[] = await Promise.all([
        labApi.listOrders({ from, to, limit: 10000 }),
        labApi.listExpenses({ from, to, limit: 10000 }),
        testsPricePromise
      ])

      const ordersList = (ordersRes.items || [])
        .filter((o: any) => {
          const orderDate = new Date(o.createdAt).toISOString().slice(0, 10)
          return orderDate >= from && orderDate <= to
        })
        .map((o: any) => {
          let charges = Number(o.totalAmount || 0)
          if (charges === 0 && o.tests && o.tests.length > 0) {
            charges = o.tests.reduce((sum: number, testId: string) => {
              return sum + (testPriceMap.get(String(testId)) || 0)
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
            user: o.createdBy || 'sehar',
            payments: o.payments || []
          }
        })

      const expensesList = (expensesRes.items || [])
        .filter((e: any) => {
          return e.date >= from && e.date <= to
        })
        .map((e: any) => ({
          id: e._id,
          date: e.date,
          datetime: e.datetime,
          type: e.type,
          note: e.note || '',
          amount: Number(e.amount || 0),
          createdBy: e.createdBy
        }))
      
      const allTransactions: Transaction[] = []
      let runningBalance = opening

      const combinedList: any[] = []

      // Add payment transactions instead of token generation
      ordersList.forEach((order: Order) => {
        if (order.payments && order.payments.length > 0) {
          order.payments.forEach((payment: any) => {
            const paymentDate = new Date(payment.at)
            const paymentDateStr = paymentDate.toISOString().slice(0, 10)
            
            // Only include payments within the selected date range
            if (paymentDateStr >= from && paymentDateStr <= to) {
              combinedList.push({
                id: `${order.id}-payment-${payment.at}`,
                datetime: paymentDate,
                date: paymentDateStr,
                time: paymentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'Payment Received',
                description: `${order.patient.fullName} - ${order.tokenNo} (${payment.method || 'cash'})`,
                debit: 0,
                credit: Number(payment.amount || 0),
                user: payment.receivedBy || currentUser,
                referenceNo: order.tokenNo
              })
            }
          })
        }
      })

      expensesList.forEach((expense: Expense) => {
        const date = expense.datetime ? new Date(expense.datetime) : new Date(expense.date)
        const expenseType = expense.type.toLowerCase().includes('supplier') ? 'Supplier Cost' : 'Expense'
        
        combinedList.push({
          id: expense.id,
          datetime: date,
          date: expense.date,
          time: expense.datetime ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          type: expenseType,
          description: `${expense.type} - ${expense.note}`,
          debit: expense.amount,
          credit: 0,
          user: expense.createdBy || currentUser,
          referenceNo: ''
        })
      })

      combinedList.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())

      combinedList.forEach(item => {
        runningBalance = runningBalance + item.credit - item.debit
        allTransactions.push({
          ...item,
          balance: runningBalance
        })
      })

      // Reverse to show newest transactions first (latest token on top)
      allTransactions.reverse()

      setTransactions(allTransactions)
      
      const totalRevenue = ordersList.reduce((sum: number, o: any) => sum + o.netAmount, 0)
      const totalExpenses = expensesList.reduce((sum: number, e: any) => sum + e.amount, 0)
      const closing = opening + totalRevenue - totalExpenses
      const profit = totalRevenue - totalExpenses
      
      setClosingBalance(closing)
      setTotalProfit(profit)
      
    } catch (error) {
      console.error('Failed to fetch closing data:', error)
    } finally {
      setLoading(false)
      setLoadedOnce(true)
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

    fetchData(true)
  }

  async function handleAddExpense(exp: { date: string; time?: string; type: string; note: string; amount: number }) {
    try {
      await labApi.createExpense({ ...exp, createdBy: currentUser })
      fetchData(true)
    } catch (error) {
      console.error('Failed to add expense:', error)
    }
  }

  const summary = useMemo(() => {
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0)
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0)
    const paymentCount = transactions.filter(t => t.type === 'Payment Received').length
    const expenseCount = transactions.filter(t => t.type === 'Expense').length
    const supplierCount = transactions.filter(t => t.type === 'Supplier Cost').length

    return {
      totalCredit,
      totalDebit,
      totalProfit: totalCredit - totalDebit,
      paymentCount,
      expenseCount,
      supplierCount,
      transactionCount: transactions.length
    }
  }, [transactions])

  const fmtMoney = (n: number) => n.toLocaleString()


  async function downloadPDF() {
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    let yPos = 15

    let settings: any = {}
    try {
      const res: any = await labApi.getSettings()
      settings = res || {}
    } catch {}

    const labName = settings.labName || 'Laboratory'

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(labName, 105, yPos, { align: 'center' })
    yPos += 8

    doc.setFontSize(12)
    doc.text('Lab Closing Statement - All Transactions', 105, yPos, { align: 'center' })
    yPos += 10

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`From: ${from}`, 15, yPos)
    doc.text(`To: ${to}`, 105, yPos, { align: 'center' })
    doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 195, yPos, { align: 'right' })
    yPos += 10

    doc.setFillColor(219, 234, 254)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 64, 175)
    doc.text(`Opening Balance: Rs ${openingBalance.toLocaleString()}`, 105, yPos + 5.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    yPos += 15

    const headers = ['Sr', 'Date', 'Time', 'Type', 'Description', 'Debit', 'Credit', 'Balance', 'User']
    const tableData = transactions.map((txn, idx) => [
      (idx + 1).toString(),
      txn.date,
      txn.time,
      txn.type,
      txn.description,
      txn.debit > 0 ? txn.debit.toLocaleString() : '-',
      txn.credit > 0 ? txn.credit.toLocaleString() : '-',
      txn.balance.toLocaleString(),
      txn.user
    ])

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      bodyStyles: {
        fontSize: 7,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 50 },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 15, halign: 'center' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const type = tableData[data.row.index][3]
          if (type === 'Payment Received') {
            data.cell.styles.fillColor = [209, 250, 229]
            data.cell.styles.textColor = [21, 128, 61]
          } else if (type === 'Expense') {
            data.cell.styles.fillColor = [254, 226, 226]
            data.cell.styles.textColor = [185, 28, 28]
          } else if (type === 'Supplier Cost') {
            data.cell.styles.fillColor = [254, 243, 199]
            data.cell.styles.textColor = [180, 83, 9]
          }
        }
        if (data.section === 'body' && data.column.index === 7) {
          data.cell.styles.fillColor = [241, 245, 249]
        }
      },
      margin: { left: 15, right: 15 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    if (yPos > 260) {
      doc.addPage()
      yPos = 15
    }

    doc.setFillColor(209, 250, 229)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(21, 128, 61)
    doc.text(`Closing Balance: Rs ${closingBalance.toLocaleString()}`, 105, yPos + 5.5, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    yPos += 15

    doc.addPage()
    yPos = 15

    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPos, 180, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Financial Summary', 17, yPos + 5.5)
    yPos += 12

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: [
        ['Opening Balance', `Rs ${openingBalance.toLocaleString()}`],
        ['Total Revenue (Credit)', `Rs ${summary.totalCredit.toLocaleString()}`],
        ['Total Expenses (Debit)', `Rs -${summary.totalDebit.toLocaleString()}`],
        ['Total Profit', `Rs ${totalProfit.toLocaleString()}`],
        ['Closing Balance', `Rs ${closingBalance.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      bodyStyles: {
        fontSize: 10,
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 100, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'right', fontStyle: 'bold', fontSize: 11 }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [219, 234, 254]
            data.cell.styles.textColor = [30, 64, 175]
          }
          else if (data.row.index === 1) {
            data.cell.styles.fillColor = [209, 250, 229]
            data.cell.styles.textColor = [21, 128, 61]
          }
          else if (data.row.index === 2) {
            data.cell.styles.fillColor = [254, 226, 226]
            data.cell.styles.textColor = [185, 28, 28]
          }
          else if (data.row.index === 3) {
            data.cell.styles.fillColor = [233, 213, 255]
            data.cell.styles.textColor = [107, 33, 168]
            data.cell.styles.fontSize = 12
          }
          else if (data.row.index === 4) {
            data.cell.styles.fillColor = [167, 243, 208]
            data.cell.styles.textColor = [5, 150, 105]
            data.cell.styles.fontSize = 12
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      margin: { left: 15, right: 15 }
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Transaction Breakdown:', 15, yPos)
    yPos += 6
    
    doc.setFont('helvetica', 'normal')
    doc.text(`• Payment Transactions: ${summary.paymentCount}`, 20, yPos)
    yPos += 5
    doc.text(`• Expenses: ${summary.expenseCount}`, 20, yPos)
    yPos += 5
    doc.text(`• Supplier Costs: ${summary.supplierCount}`, 20, yPos)
    yPos += 5
    doc.text(`• Total Transactions: ${summary.transactionCount}`, 20, yPos)
    yPos += 10

    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('Formula: Closing Balance = Opening Balance + Total Credit - Total Debit', 105, yPos, { align: 'center' })
    yPos += 5
    doc.text('Profit = Total Revenue - Total Expenses', 105, yPos, { align: 'center' })

    doc.save(`Lab_Closing_${from}_to_${to}.pdf`)
  }


  return (
    <div className="w-full min-h-screen bg-slate-50/50 px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            Day Closing
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lab Closing Statement</h1>
          <p className="text-slate-500 font-medium">Complete transaction summary grouped by doctors</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAddExpenseOpen(true)}
            className="group flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-200 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
          <button
            onClick={downloadPDF}
            disabled={loading}
            className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Select Period</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPeriodDates('daily')}
                className={`flex-1 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                  period === 'daily'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPeriodDates('weekly')}
                className={`flex-1 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                  period === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriodDates('monthly')}
                className={`flex-1 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                  period === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Date Range (From)</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-50 p-1 rounded-md group-focus-within:bg-indigo-50 transition-colors">
                  <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500" />
                </div>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-12 pr-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="md:col-span-4 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Date Range (To)</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-50 p-1 rounded-md group-focus-within:bg-indigo-50 transition-colors">
                  <Calendar className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500" />
                </div>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-12 pr-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="md:col-span-4 lg:col-span-2">
              <button
                onClick={() => fetchData(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 h-[42px]"
              >
                Filter
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Opening and Closing Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-white p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <h4 className="font-black text-lg tracking-tight text-slate-800">Opening Balance</h4>
          </div>
          <div className="text-3xl font-black text-blue-600">Rs {fmtMoney(openingBalance)}</div>
          <div className="text-xs text-slate-500 mt-2">Balance at start of period</div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
            <h4 className="font-black text-lg tracking-tight text-slate-800">Closing Balance</h4>
          </div>
          <div className="text-3xl font-black text-emerald-600">Rs {fmtMoney(closingBalance)}</div>
          <div className="text-xs text-slate-500 mt-2">Balance at end of period</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 ring-4 ring-indigo-50/50">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Transactions</div>
          </div>
          <div className="text-4xl font-black text-slate-900 mb-2">{summary.transactionCount}</div>
        </div>

        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 ring-4 ring-emerald-50/50">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Revenue</div>
          </div>
          <div className="text-4xl font-black text-slate-900 mb-2">Rs {fmtMoney(summary.totalCredit)}</div>
        </div>

        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-rose-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600 ring-4 ring-rose-50/50">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Expenses</div>
          </div>
          <div className="text-4xl font-black text-slate-900 mb-2">Rs {fmtMoney(summary.totalDebit)}</div>
        </div>

        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-purple-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600 ring-4 ring-purple-50/50">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Profit</div>
          </div>
          <div className="text-4xl font-black text-slate-900 mb-2">Rs {fmtMoney(totalProfit)}</div>
        </div>
      </div>


      {/* All Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-black text-slate-800 text-lg tracking-tight">All Transactions</h3>
          <p className="text-sm text-slate-500 mt-1">Complete transaction history with running balance</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-700 text-white uppercase text-[10px] tracking-widest font-black sticky top-0">
              <tr>
                <th className="px-4 py-3">Sr</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn, idx) => (
                <tr key={txn.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-600">{txn.date}</td>
                  <td className="px-4 py-3 text-slate-600">{txn.time}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      txn.type === 'Payment Received' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : txn.type === 'Expense'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{txn.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-rose-600">
                    {txn.debit > 0 ? fmtMoney(txn.debit) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {txn.credit > 0 ? fmtMoney(txn.credit) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 bg-slate-50">
                    {fmtMoney(txn.balance)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{txn.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && !loadedOnce && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-6">
          <div className="h-20 w-20 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin"></div>
          <div className="text-center">
            <p className="text-slate-900 font-bold text-lg tracking-tight">Loading Closing Data...</p>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <Lab_AddExpense 
        open={addExpenseOpen} 
        onClose={() => setAddExpenseOpen(false)} 
        onSave={handleAddExpense} 
      />
    </div>
  )
}
