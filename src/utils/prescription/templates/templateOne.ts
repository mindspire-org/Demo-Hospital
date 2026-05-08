import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'

export async function buildPrescriptionOne(data: PrescriptionPdfData) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  try { pdf.setFont('Poppins', 'normal') } catch {}

  // ── Colors ──
  const primary = [0, 102, 255] // vivid blue
  const rxRed = [214, 69, 69]
  const muted = [104, 113, 134]

  // ── Background Geometry ──
  pdf.setFillColor(244, 247, 251)
  pdf.rect(0, 0, W, H, 'F')

  // Sheet Wrap (the white paper container)
  const margin = 12
  const sheetW = W - (margin * 2)
  const sheetH = H - (margin * 2)
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(margin, margin, sheetW, sheetH, 4, 4, 'F')

  // Accent gradient circle at top right
  pdf.setDrawColor(primary[0], primary[1], primary[2])
  pdf.setFillColor(primary[0], primary[1], primary[2])
  // We'll just draw a corner accent
  pdf.saveGraphicsState()
  pdf.setGState(new (pdf as any).GState({ opacity: 0.05 }))
  pdf.circle(W, 0, 80, 'F')
  pdf.restoreGraphicsState()

  // ── Header ──
  const startY = margin + 12
  const logoSize = 18
  const logoX = margin + 12
  const logoY = startY

  // Logo box with gradient approximation
  pdf.setFillColor(primary[0], primary[1], primary[2])
  pdf.roundedRect(logoX, logoY, logoSize, logoSize, 4, 4, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('H+', logoX + (logoSize / 2), logoY + (logoSize / 2) + 2, { align: 'center' })

  // Hospital Info
  pdf.setTextColor(15, 23, 42)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(14)
  pdf.text(data.settings?.name || 'Green Valley Hospital', logoX + logoSize + 6, logoY + 6)

  pdf.setTextColor(muted[0], muted[1], muted[2])
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(8)
  pdf.text(data.settings?.address || '123 Health Ave, Medical City', logoX + logoSize + 6, logoY + 11)
  pdf.text(`Tel: ${data.settings?.phone || '(555) 123-4567'}`, logoX + logoSize + 6, logoY + 15)

  // Doctor Info in header
  pdf.setFontSize(8)
  pdf.text(`Doctor: ${data.doctor?.name || 'Dr. Sara Ahmed'} (${data.doctor?.qualification || 'MBBS, MD'})`, logoX + logoSize + 6, logoY + 19)

  // ── Patient Info Card ──
  const patientCardY = logoY + logoSize + 10
  const cardMargin = margin + 12
  const cardW = (sheetW - 24) * 0.65
  const cardH = 30
  
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(241, 245, 249)
  pdf.roundedRect(cardMargin, patientCardY, cardW, cardH, 4, 4, 'FD')

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Patient Information', cardMargin + 6, patientCardY + 8)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(muted[0], muted[1], muted[2])
  pdf.text(`Name: ${data.patient?.name || 'Ali Khan'}`, cardMargin + 6, patientCardY + 14)
  pdf.text(`Age/Sex: ${data.patient?.age || '45'} / ${data.patient?.gender || 'M'}`, cardMargin + 6, patientCardY + 19)
  pdf.text(`MRN: ${data.patient?.mrn || 'GVH-000124'}`, cardMargin + 6, patientCardY + 24)

  pdf.text(`Visit Date: ${new Date(data.createdAt || Date.now()).toLocaleDateString()}`, cardMargin + (cardW / 2), patientCardY + 14)
  pdf.text(`Contact: ${data.patient?.phone || '+92 300 1234567'}`, cardMargin + (cardW / 2), patientCardY + 19)
  pdf.text(`Allergies: ${data.allergyHistory || 'None reported'}`, cardMargin + (cardW / 2), patientCardY + 24)

  // ── Vitals Box ──
  const vitalsW = (sheetW - 24) * 0.32
  const vitalsX = cardMargin + cardW + 4
  pdf.setFillColor(244, 247, 255)
  pdf.roundedRect(vitalsX, patientCardY, vitalsW, cardH, 4, 4, 'F')

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Vital Signs', vitalsX + 6, patientCardY + 8)

  const vGridY = patientCardY + 14
  const vitalsData = [
    { label: 'BP', val: `${data.vitals?.bloodPressureSys || 120}/${data.vitals?.bloodPressureDia || 78}` },
    { label: 'Pulse', val: `${data.vitals?.pulse || 76}` },
    { label: 'Temp', val: `${data.vitals?.temperatureC || 98.6}°F` },
    { label: 'RR', val: `${data.vitals?.respiratoryRate || 18}` }
  ]

  vitalsData.forEach((v, i) => {
    const vx = vitalsX + 6 + (i % 2) * (vitalsW / 2 - 4)
    const vy = vGridY + Math.floor(i / 2) * 8
    pdf.setFontSize(7)
    pdf.setTextColor(muted[0], muted[1], muted[2])
    pdf.text(v.label, vx, vy)
    pdf.setFontSize(8)
    pdf.setTextColor(15, 23, 42)
    pdf.text(v.val, vx + 8, vy)
  })

  // ── Rx Section ──
  const rxY = patientCardY + cardH + 8
  pdf.setFillColor(252, 253, 255)
  pdf.roundedRect(cardMargin, rxY, sheetW - 24, 120, 4, 4, 'F')

  // Rx Badge
  pdf.setFillColor(rxRed[0], rxRed[1], rxRed[2])
  pdf.roundedRect(cardMargin + 6, rxY + 4, 12, 8, 2, 2, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8)
  pdf.text('Rx', cardMargin + 12, rxY + 10, { align: 'center' })

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Prescription', cardMargin + 22, rxY + 10)

  pdf.setTextColor(muted[0], muted[1], muted[2])
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Diagnosis: ${data.diagnosis || 'Clinical evaluation'}`, cardMargin + 6, rxY + 18)

  // Medication Table
  const tableData = (data.items || []).map(it => [
    it.name || '',
    it.dose || it.instruction || '',
    it.qty || '',
    it.duration || ''
  ])

  autoTable(pdf, {
    startY: rxY + 22,
    head: [['Medicine', 'Dose / Sig', 'Qty', 'Duration']],
    body: tableData.length ? tableData : [['', '', '', '']],
    theme: 'plain',
    margin: { left: cardMargin + 6, right: margin + 18 },
    styles: { fontSize: 8, cellPadding: 3, textColor: [15, 23, 42] },
    headStyles: { textColor: [104, 113, 134], fontStyle: 'bold' },
    didDrawCell: (d) => {
      if (d.section === 'head') {
        pdf.setDrawColor(241, 245, 249)
        pdf.setLineWidth(0.1)
        pdf.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height)
      }
    }
  })

  // ── Footer ──
  const footerY = H - margin - 25
  pdf.setTextColor(muted[0], muted[1], muted[2])
  pdf.setFontSize(7)
  pdf.text('This is a computer-generated prescription. Valid only with hospital stamp.', cardMargin, footerY)
  
  // Signature
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.doctor?.name || 'Dr. Sara Ahmed', W - margin - 12, footerY, { align: 'right' })
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.doctor?.qualification || 'MBBS, MD (Medicine)', W - margin - 12, footerY + 4, { align: 'right' })
  
  pdf.setDrawColor(muted[0], muted[1], muted[2])
  pdf.setLineWidth(0.2)
  pdf.line(W - margin - 60, footerY + 10, W - margin - 12, footerY + 10)
  pdf.text('Doctor\'s Signature', W - margin - 36, footerY + 15, { align: 'center' })

  return pdf
}
