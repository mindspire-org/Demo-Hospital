export type MinimalCleanPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; specialization?: string }
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  vitals?: {
    pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number
    respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number
  }
  labTests?: string[]; labNotes?: string; diagnosticTests?: string[]; diagnosticNotes?: string
  createdAt?: string | Date
}

type Extras = { tokenNo?: string }

export async function previewMinimalCleanPdf(data: MinimalCleanPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const { ensureUrduNastaleeq, drawUrduText } = await import('../ensureUrduNastaleeq')
  const urduOk = await ensureUrduNastaleeq(pdf)
  const hasUrduChars = (s: string) => urduOk && /[\u0600-\u06FF]/.test(s)
  const safeUrdu = (text: string, x: number, yy: number, opts?: any) => {
    if (drawUrduText) drawUrduText(pdf, text, x, yy, opts)
    else pdf.text(text, x, yy, opts)
  }
  const wantsUrdu = (data as any).language === 'urdu'
  const isUrdu = wantsUrdu && urduOk

  const black = { r: 30, g: 30, b: 30 }
  const gray  = { r: 120, g: 120, b: 120 }
  const ltGray = { r: 220, g: 220, b: 220 }
  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 14
  let y = 14

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text(String(settings.name || 'Hospital'), mx, y + 2)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(String(settings.address || ''), mx, y + 7)
  pdf.text(`Tel: ${settings.phone || ''}`, mx, y + 11)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text(`Dr. ${doctor.name || '-'}`, W - mx, y + 2, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(' • ')
  if (drSub) pdf.text(drSub, W - mx, y + 7, { align: 'right' })

  y += 16
  pdf.setDrawColor(ltGray.r, ltGray.g, ltGray.b)
  pdf.setLineWidth(0.3)
  pdf.line(mx, y, W - mx, y)
  y += 6

  pdf.setFontSize(8)
  const patLine = [
    patient.name || '-',
    patient.mrn ? `MR# ${patient.mrn}` : '',
    patient.age ? `Age ${patient.age}` : '',
    patient.gender || '',
    (data as any).tokenNo ? `Token ${(data as any).tokenNo}` : '',
    dt.toLocaleDateString(),
  ].filter(Boolean).join('  |  ')
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(patLine, mx, y)
  y += 6

  const v: any = (data as any).vitals || {}
  const vitalsArr: string[] = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsArr.push(`BP ${v.bloodPressureSys}/${v.bloodPressureDia}`)
  if (v.pulse != null) vitalsArr.push(`P ${v.pulse}`)
  if (v.temperatureC != null) vitalsArr.push(`T ${v.temperatureC}°C`)
  if (v.spo2 != null) vitalsArr.push(`SpO2 ${v.spo2}%`)
  if (v.weightKg != null) vitalsArr.push(`Wt ${v.weightKg}kg`)
  if (vitalsArr.length) {
    pdf.setTextColor(gray.r, gray.g, gray.b)
    pdf.setFontSize(7)
    pdf.text(vitalsArr.join('   '), mx, y)
    y += 5
  }

  y += 2
  pdf.setDrawColor(ltGray.r, ltGray.g, ltGray.b)
  pdf.line(mx, y, W - mx, y)
  y += 6

  const leftX = mx
  const rightX = mx + (W - 2 * mx) / 2 + 4
  let leftY = y
  let rightY = y

  const addField = (label: string, value: string | undefined, x: number, yy: number): number => {
    if (!value || !String(value).trim()) return yy
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(black.r, black.g, black.b)
    pdf.text(`${label}`, x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(gray.r, gray.g, gray.b)
    const lines = (pdf as any).splitTextToSize(String(value).trim(), (W - 2 * mx) / 2 - 22)
    pdf.text(lines, x + 22, yy)
    return yy + lines.length * 3.2 + 3
  }

  leftY = addField('Complaint', data.primaryComplaint, leftX, leftY)
  leftY = addField('Diagnosis', data.diagnosis, leftX, leftY)
  leftY = addField('History', data.history, leftX, leftY)
  leftY = addField('Exam', data.examFindings, leftX, leftY)

  rightY = addField('Allergies', data.allergyHistory, rightX, rightY)
  rightY = addField('Family Hx', data.familyHistory, rightX, rightY)
  rightY = addField('Treatment Hx', data.treatmentHistory, rightX, rightY)
  rightY = addField('Advice', data.advice, rightX, rightY)

  y = Math.max(leftY, rightY) + 4

  pdf.setDrawColor(ltGray.r, ltGray.g, ltGray.b)
  pdf.line(mx, y, W - mx, y)
  y += 5

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(black.r, black.g, black.b)
  pdf.text('Rx', mx, y)
  y += 6

  const { translateRxItem } = await import('../../prescriptionUrdu')
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    pdf.setFontSize(8)
    meds.forEach((m, i) => {
      const t = translateRxItem(m as any, isUrdu ? 'urdu' : 'english')
      const parts = [
        String(m?.name || '').trim(),
        t?.dose ? `— ${t.dose}` : '',
        t?.frequency ? `• ${t.frequency}` : '',
        t?.duration ? `× ${t.duration}` : '',
        t?.route ? `(${t.route})` : '',
        t?.instruction ? `[${t.instruction}]` : '',
      ].filter(Boolean).join(' ')
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(black.r, black.g, black.b)
      const lines = (pdf as any).splitTextToSize(`${i + 1}. ${parts}`, W - 2 * mx - 4)
      // If parts contain Urdu, render with safeUrdu
      if (hasUrduChars(parts)) {
        safeUrdu(`${i + 1}. ${parts}`, mx + 2, y, { maxWidth: W - 2 * mx - 4 })
      } else {
        pdf.text(lines, mx + 2, y)
      }
      y += lines.length * 3.5 + 1.5
    })
  }

  const labTests = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    y += 3
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(black.r, black.g, black.b)
    const testStr = [
      labTests.length ? `Lab: ${labTests.join(', ')}` : '',
      diagTests.length ? `Diag: ${diagTests.join(', ')}` : '',
    ].filter(Boolean).join('   ')
    pdf.text(testStr, mx, y, { maxWidth: W - 2 * mx })
    y += 5
  }

  const signY = H - 30
  pdf.setDrawColor(ltGray.r, ltGray.g, ltGray.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx, signY, mx + 40, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text('Signature', mx, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Dr. ${doctor.name || ''}`, mx, signY + 8)

  pdf.setDrawColor(ltGray.r, ltGray.g, ltGray.b)
  pdf.line(mx, H - 14, W - mx, H - 14)
  pdf.setFontSize(6)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`${settings.name || ''} • ${settings.phone || ''} • ${settings.address || ''}`, W / 2, H - 10, { align: 'center' })

  const { applyOverlayBeforeOutput } = await import('./applyOverlay')
  await applyOverlayBeforeOutput(pdf)

  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = pdf.output('datauristring') as string
      await api.printPreviewPdf(dataUrl)
      return
    }
  } catch {}
  const blob = pdf.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
