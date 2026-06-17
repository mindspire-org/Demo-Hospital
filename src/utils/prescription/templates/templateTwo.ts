import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'

export async function buildPrescriptionTwo(data: PrescriptionPdfData) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  const { ensureUrduNastaleeq } = await import('../ensureUrduNastaleeq')
  const urduOk = await ensureUrduNastaleeq(pdf)
  const wantsUrdu = data.language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  try { pdf.setFont('Poppins', 'normal') } catch {}

  const primary = [79, 70, 229]
  const muted = [107, 115, 144]
  const danger = [239, 68, 68]

  pdf.setFillColor(238, 241, 247)
  pdf.rect(0, 0, W, H, 'F')

  const margin = 10
  const pageW = W - (margin * 2)
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(margin, margin, pageW, H - (margin * 2), 6, 6, 'F')

  const startY = margin + 12
  const logoSize = 22
  const logoX = margin + 12

  pdf.setFillColor(primary[0], primary[1], primary[2])
  pdf.roundedRect(logoX, startY, logoSize, logoSize, 6, 6, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('H+', logoX + (logoSize / 2), startY + (logoSize / 2) + 2, { align: 'center' })

  pdf.setTextColor(10, 15, 44)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(16)
  pdf.text(data.settings?.name || 'Green Valley Hospital', logoX + logoSize + 6, startY + 8)

  pdf.setTextColor(muted[0], muted[1], muted[2])
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(9)
  pdf.text('Advanced Care & Digital Health Services', logoX + logoSize + 6, startY + 13)
  pdf.text(`${data.settings?.address || 'Medical City'} | Tel: ${data.settings?.phone || '(555) 123-4567'}`, logoX + logoSize + 6, startY + 18)

  pdf.setTextColor(muted[0], muted[1], muted[2])
  pdf.setFontSize(9)
  pdf.text(data.doctor?.name || 'Dr. Sara Ahmed', W - margin - 12, startY + 5, { align: 'right' })
  pdf.text(data.doctor?.qualification || 'MBBS, MD', W - margin - 12, startY + 10, { align: 'right' })
  pdf.text(new Date(data.createdAt || Date.now()).toLocaleDateString(), W - margin - 12, startY + 15, { align: 'right' })

  const stripY = startY + logoSize + 8
  const stripW = pageW - 24
  const stripH = 32

  pdf.setFillColor(primary[0], primary[1], primary[2])
  pdf.roundedRect(margin + 12, stripY, stripW, stripH, 5, 5, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Patient: ${data.patient?.name || 'Ali Khan'}`, margin + 18, stripY + 8)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Age / Sex: ${data.patient?.age || '45'} / ${data.patient?.gender || 'M'}`, margin + 18, stripY + 13)
  pdf.text(`MRN: ${data.patient?.mrn || 'GVH-000124'}`, margin + 18, stripY + 18)
  pdf.text(`Diagnosis: ${data.diagnosis || 'Hypertension'}`, margin + 18, stripY + 23)

  const vitals = data.vitals || {}
  const vX = margin + 12 + stripW * 0.65
  const vW = (stripW * 0.35) - 6

  const vData = [
    { l: 'BP', v: `${vitals.bloodPressureSys || 120}/${vitals.bloodPressureDia || 78}` },
    { l: 'HR', v: `${vitals.pulse || 76}` },
    { l: 'Temp', v: `${vitals.temperatureC || 98.6}°F` },
    { l: 'RR', v: `${vitals.respiratoryRate || 18}` }
  ]

  vData.forEach((v, i) => {
    const vx = vX + (i % 2) * (vW / 2)
    const vy = stripY + 8 + Math.floor(i / 2) * 12
    pdf.setFillColor(255, 255, 255)
    pdf.saveGraphicsState()
    pdf.setGState(new (pdf as any).GState({ opacity: 0.2 }))
    pdf.roundedRect(vx, vy - 5, vW / 2 - 2, 10, 3, 3, 'F')
    pdf.restoreGraphicsState()
    pdf.setFontSize(7)
    pdf.text(v.v, vx + 2, vy)
    pdf.setFontSize(6)
    pdf.text(v.l, vx + 2, vy + 4)
  })

  const rxY = stripY + stripH + 12
  const cardW = stripW
  const cardH = 150

  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(241, 245, 249)
  pdf.roundedRect(margin + 12, rxY, cardW, cardH, 6, 6, 'FD')

  pdf.setFillColor(danger[0], danger[1], danger[2])
  pdf.roundedRect(margin + 12 + cardW - 24, rxY - 6, 18, 12, 4, 4, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(12)
  pdf.text('Rx', margin + 12 + cardW - 15, rxY + 2, { align: 'center' })

  const medsW = cardW * 0.65
  const sideW = cardW - medsW - 12

  const { translateRxItem } = await import('../../prescriptionUrdu')
  const medData = (data.items || []).map(it => {
    const t = translateRxItem(it as any, isUrdu ? 'urdu' : 'english')
    return [
      it.name || '',
      String(t?.dose || t?.instruction || ''),
      String(t?.duration || '')
    ]
  })

  const head = isUrdu
    ? [['Medicine', 'خوراک', 'مدت']]
    : [['Medicine', 'Dosage', 'Duration']]

  autoTable(pdf, {
    startY: rxY + 12,
    head,
    body: medData.length ? medData : [['', '', '']],
    theme: 'plain',
    margin: { left: margin + 18, right: W - margin - 12 - sideW - 6 },
    styles: { fontSize: 8, cellPadding: 4, textColor: [10, 15, 44] },
    headStyles: { textColor: [107, 115, 144], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: medsW * 0.5 },
      1: { cellWidth: medsW * 0.3 },
      2: { cellWidth: medsW * 0.2 }
    }
  })

  const sideX = margin + 12 + medsW + 6
  const sideY = rxY + 12
  const panels = [
    { t: 'Instructions', b: data.advice || 'Low salt diet • Daily BP log' },
    { t: 'Follow-up', b: 'After 4 weeks or as symp. worsens' },
    { t: 'Allergies', b: data.allergyHistory || 'None reported' }
  ]

  panels.forEach((p, i) => {
    const py = sideY + i * 35
    pdf.setFillColor(248, 250, 255)
    pdf.roundedRect(sideX, py, sideW, 30, 4, 4, 'F')
    pdf.setTextColor(10, 15, 44)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(p.t, sideX + 4, py + 6)
    pdf.setTextColor(muted[0], muted[1], muted[2])
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    const lines = pdf.splitTextToSize(p.b, sideW - 8)
    pdf.text(lines, sideX + 4, py + 12)
  })

  const footerY = H - margin - 20
  pdf.setTextColor(muted[0], muted[1], muted[2])
  pdf.setFontSize(8)
  pdf.text('This is a digitally generated prescription. Valid only with hospital stamp.', margin + 12, footerY)

  pdf.text(data.doctor?.name || 'Dr. Sara Ahmed', W - margin - 12, footerY, { align: 'right' })
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.3)
  pdf.line(W - margin - 60, footerY + 5, W - margin - 12, footerY + 5)
  pdf.text('Signature', W - margin - 36, footerY + 10, { align: 'center' })

  return pdf
}
