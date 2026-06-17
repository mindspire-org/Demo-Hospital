import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { utils, writeFile } from 'xlsx'

const fmtRs = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtNum = (n: number) => Number(n || 0).toLocaleString()

export function exportPdf(data: any, from: string, to: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text('Laboratory Analytics Report', pageW / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`Period: ${from} to ${to}`, pageW / 2, y, { align: 'center' })
  y += 12
  autoTable(doc, {
    startY: y, head: [['Metric', 'Value']],
    body: [
      ['Total Tests', fmtNum(data.totalTests || 0)], ['Total Orders', fmtNum(data.totalOrders || 0)],
      ['Total Revenue', fmtRs(data.totalRevenue || 0)], ['Total Received', fmtRs(data.totalReceived || 0)],
      ['Total Receivable', fmtRs(data.totalRevenue || 0 - (data.totalReceived || 0))], ['Total Expenses', fmtRs(data.totalExpenses || 0)],
      ['Total Purchases', fmtRs(data.totalPurchasesAmount || 0)], ['Pending Results', fmtNum(data.pendingResults || 0)],
      ['Pending Approval', fmtNum(data.pendingApproval || 0)], ['Completed Tests', fmtNum(data.completedTests || 0)],
    ],
    styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [59, 130, 246], textColor: 255 }, theme: 'striped',
  })
  y = (doc as any).lastAutoTable?.finalY || y + 60
  if ((data.testWise || []).length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(13); doc.text('Test-wise Performance', 14, y)
    autoTable(doc, { startY: y + 6, head: [['Test Name', 'Count', 'Revenue']], body: (data.testWise || []).slice(0, 50).map((t: any) => [t.testName, t.count, fmtRs(t.revenue)]), styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [16, 185, 129], textColor: 255 }, theme: 'striped' })
    y = (doc as any).lastAutoTable?.finalY || y + 40
  }
  if ((data.categoryWise || []).length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(13); doc.text('Category-wise Revenue', 14, y)
    autoTable(doc, { startY: y + 6, head: [['Category', 'Count', 'Revenue']], body: (data.categoryWise || []).map((c: any) => [c.category, c.count, fmtRs(c.revenue)]), styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [139, 92, 246], textColor: 255 }, theme: 'striped' })
    y = (doc as any).lastAutoTable?.finalY || y + 40
  }
  if ((data.collectionCenters || []).length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(13); doc.text('Collection Center Performance', 14, y)
    autoTable(doc, { startY: y + 6, head: [['Center', 'Tokens', 'Revenue', 'Commission']], body: (data.collectionCenters || []).map((c: any) => [c.name, c.tokens, fmtRs(c.revenue), fmtRs(c.commission)]), styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [245, 158, 11], textColor: 255 }, theme: 'striped' })
  }
  doc.save(`lab-report-${from}-to-${to}.pdf`)
}

export function exportExcel(data: any, from: string, to: string) {
  const wb = utils.book_new()
  const summarySheet = utils.aoa_to_sheet([['Laboratory Analytics Report'], [`Period: ${from} to ${to}`], [], ['Metric', 'Value'], ['Total Tests', data.totalTests || 0], ['Total Orders', data.totalOrders || 0], ['Total Revenue', data.totalRevenue || 0], ['Total Received', data.totalReceived || 0], ['Total Receivable', (data.totalRevenue || 0) - (data.totalReceived || 0)], ['Total Expenses', data.totalExpenses || 0], ['Total Purchases', data.totalPurchasesAmount || 0], ['Pending Results', data.pendingResults || 0], ['Pending Approval', data.pendingApproval || 0], ['Completed Tests', data.completedTests || 0]])
  utils.book_append_sheet(wb, summarySheet, 'Summary')
  if ((data.testWise || []).length > 0) utils.book_append_sheet(wb, utils.json_to_sheet((data.testWise || []).map((t: any) => ({ 'Test Name': t.testName, 'Count': t.count, 'Revenue': t.revenue }))), 'Test-wise')
  if ((data.categoryWise || []).length > 0) utils.book_append_sheet(wb, utils.json_to_sheet((data.categoryWise || []).map((c: any) => ({ 'Category': c.category, 'Count': c.count, 'Revenue': c.revenue }))), 'Category-wise')
  if ((data.collectionCenters || []).length > 0) utils.book_append_sheet(wb, utils.json_to_sheet((data.collectionCenters || []).map((c: any) => ({ 'Center': c.name, 'Tokens': c.tokens, 'Revenue': c.revenue, 'Commission': c.commission }))), 'Collection Centers')
  if ((data.dailyRevenue || []).length > 0) utils.book_append_sheet(wb, utils.json_to_sheet((data.dailyRevenue || []).map((d: any) => ({ 'Date': d.date, 'Revenue': d.value }))), 'Daily Revenue')
  writeFile(wb, `lab-report-${from}-to-${to}.xlsx`)
}
