import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportOptions {
  title: string
  subtitle?: string
  filename: string
  headers: string[]
  rows: any[][]
  footers?: any[][]
}

export const exportToPdf = ({ title, subtitle, filename, headers, rows, footers }: ExportOptions) => {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(40)
  doc.text(title, 14, 22)
  
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(subtitle, 14, 30)
  }

  // Table
  autoTable(doc, {
    startY: subtitle ? 35 : 28,
    head: [headers],
    body: rows,
    foot: footers,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: {
      // Auto-right align numbers
      ...headers.reduce((acc: any, header, idx) => {
        const h = header.toLowerCase()
        if (h.includes('debit') || h.includes('credit') || h.includes('balance') || h.includes('amount') || h.includes('total')) {
          acc[idx] = { halign: 'right' }
        }
        return acc
      }, {})
    }
  })

  doc.save(`${filename}.pdf`)
}
