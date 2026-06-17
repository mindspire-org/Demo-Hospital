import jsPDF from 'jspdf'

export type ErMedicalRecordData = {
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: {
    name?: string
    mrn?: string
    gender?: string
    age?: string
    phone?: string
    address?: string
  }
  encounter?: {
    tokenNo?: string
    startAt?: string
    endAt?: string
    disposition?: string
    triage?: string
    arrivalMode?: string
    doctorName?: string
  }
  initialAssessments?: Array<{
    arrivalTime?: string
    assessmentTime?: string
    assessedBy?: string
    chiefComplaint?: string
    historyOfPresentingIllness?: string
    pastMedicalHistory?: string
    medications?: string
    allergies?: string
    vitals?: { bp?: string; pulse?: number; temp?: number; rr?: number; spo2?: number; pain?: number }
    nurseNotes?: string
    staffName?: string
  }>
  vitals?: Array<{
    recordedAt?: string
    shift?: string
    bp?: string
    hr?: number
    temp?: number
    rr?: number
    spo2?: number
    bsr?: number
    intakeIV?: string
    urine?: string
    nurseSign?: string
  }>
  consultantNotes?: Array<{
    recordedAt?: string
    doctorName?: string
    text?: string
    sign?: string
  }>
  medications?: Array<{
    drugName?: string
    dose?: string
    frequency?: string
    startAt?: string
  }>
}

function formatDateTime(s?: string): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleString()
  } catch {
    return s
  }
}

function addHeader(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()

  // Logo left, hospital info centered
  if (data.settings?.logoDataUrl) {
    try { pdf.addImage(data.settings.logoDataUrl, 'JPEG', 14, 8, 18, 18) } catch {}
  }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15)
  pdf.text(String(data.settings?.name || 'Hospital'), pageWidth / 2, 14, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  if (data.settings?.address) pdf.text(String(data.settings.address), pageWidth / 2, 19, { align: 'center' })
  if (data.settings?.phone) pdf.text(`Phone: ${data.settings.phone}`, pageWidth / 2, 24, { align: 'center' })
  y = 30
  pdf.setLineWidth(0.3)
  pdf.setDrawColor(60); pdf.line(14, y, pageWidth - 14, y)
  y += 5

  // Title
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
  pdf.setFillColor(220, 38, 38) // red-600
  pdf.rect(14, y, pageWidth - 28, 8, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.text('EMERGENCY ROOM - MEDICAL RECORD', pageWidth / 2, y + 5.5, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  y += 12

  return y
}

function addPatientInfo(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.text('Patient Information', 14, y)
  pdf.setDrawColor(100); pdf.setLineWidth(0.5)
  pdf.line(14, y + 2, pageWidth - 14, y + 2)
  y += 8

  const col1 = 18, col2 = pageWidth / 3 + 5, col3 = (pageWidth * 2) / 3 + 5

  const drawField = (label: string, value: string, x: number, lw = 22) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
    pdf.text(label, x, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    pdf.text(value?.trim() || '-', x + lw, y)
  }

  // Row 1
  drawField('Name:', data.patient?.name || '-', col1, 18)
  drawField('MRN:', data.patient?.mrn || '-', col2, 15)
  drawField('Token #:', data.encounter?.tokenNo || '-', col3, 20)
  y += 6

  // Row 2
  drawField('Age:', data.patient?.age || '-', col1, 15)
  drawField('Gender:', data.patient?.gender || '-', col2, 18)
  drawField('Phone:', data.patient?.phone || '-', col3, 18)
  y += 6

  // Row 3
  drawField('Doctor:', data.encounter?.doctorName || '-', col1, 18)
  drawField('Triage:', (data.encounter?.triage || '-').toUpperCase(), col2, 18)
  drawField('Arrival:', data.encounter?.arrivalMode || '-', col3, 18)
  y += 6

  // Row 4
  drawField('Check In:', formatDateTime(data.encounter?.startAt), col1, 18)
  drawField('Discharged:', formatDateTime(data.encounter?.endAt), col2, 22)
  drawField('Disposition:', data.encounter?.disposition || 'Discharged', col3, 22)
  y += 8

  return y
}

function addInitialAssessments(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const assessments = data.initialAssessments || []

  if (assessments.length === 0) return y

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.setFillColor(254, 226, 226) // red-100
  pdf.rect(14, y - 4, pageWidth - 28, 7, 'F')
  pdf.text('1. Initial Assessment', 16, y)
  y += 6

  for (const a of assessments.slice(0, 3)) { // Max 3 assessments
    pdf.setDrawColor(180); pdf.setLineWidth(0.3)
    pdf.rect(14, y, pageWidth - 28, 50)

    let yy = y + 6
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
    pdf.text(`Assessment Time: ${formatDateTime(a.assessmentTime)}`, 18, yy)
    pdf.text(`By: ${a.assessedBy || a.staffName || '-'}`, pageWidth - 18, yy, { align: 'right' })
    yy += 6

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
    const maxWidth = pageWidth - 40

    // Chief Complaint
    pdf.setFont('helvetica', 'bold'); pdf.text('Chief Complaint:', 18, yy)
    pdf.setFont('helvetica', 'normal')
    const ccLines = pdf.splitTextToSize(a.chiefComplaint || '-', maxWidth - 50)
    pdf.text(ccLines.slice(0, 2), 60, yy)
    yy += Math.max(5, ccLines.slice(0, 2).length * 4)

    // History
    pdf.setFont('helvetica', 'bold'); pdf.text('History:', 18, yy)
    pdf.setFont('helvetica', 'normal')
    const histLines = pdf.splitTextToSize(a.historyOfPresentingIllness || '-', maxWidth - 35)
    pdf.text(histLines.slice(0, 2), 45, yy)
    yy += Math.max(5, histLines.slice(0, 2).length * 4)

    // Vitals
    if (a.vitals) {
      pdf.setFont('helvetica', 'bold'); pdf.text('Vitals:', 18, yy)
      pdf.setFont('helvetica', 'normal')
      const v = a.vitals
      const vitalsStr = `BP: ${v.bp || '-'} | Pulse: ${v.pulse || '-'} | Temp: ${v.temp || '-'}°F | RR: ${v.rr || '-'} | SpO2: ${v.spo2 || '-'}%`
      pdf.text(vitalsStr, 38, yy)
      yy += 5
    }

    // Allergies
    if (a.allergies) {
      pdf.setFont('helvetica', 'bold'); pdf.text('Allergies:', 18, yy)
      pdf.setFont('helvetica', 'normal'); pdf.text(a.allergies, 48, yy)
      yy += 5
    }

    y += 55
  }

  return y
}

function addVitals(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const vitals = data.vitals || []

  if (vitals.length === 0) return y

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.setFillColor(254, 226, 226)
  pdf.rect(14, y - 4, pageWidth - 28, 7, 'F')
  pdf.text('2. Daily Monitoring (Vitals)', 16, y)
  y += 6

  // Table header
  const headers = ['Date/Time', 'Shift', 'BP', 'Pulse', 'Temp', 'RR', 'SpO2', 'BSR', 'Intake', 'Urine', 'Nurse']
  const colWidths = [28, 16, 18, 14, 14, 12, 14, 14, 18, 18, 18]
  let x = 16

  pdf.setFillColor(240, 240, 240)
  pdf.rect(14, y, pageWidth - 28, 6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
  headers.forEach((h, i) => {
    pdf.text(h, x, y + 4)
    x += colWidths[i]
  })
  y += 6

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
  for (const v of vitals.slice(0, 20)) { // Max 20 rows
    x = 16
    const row = [
      formatDateTime(v.recordedAt).slice(0, 16),
      (v.shift || '-').slice(0, 3),
      v.bp || '-',
      String(v.hr || '-'),
      String(v.temp || '-'),
      String(v.rr || '-'),
      String(v.spo2 || '-'),
      String(v.bsr || '-'),
      v.intakeIV || '-',
      v.urine || '-',
      (v.nurseSign || '-').slice(0, 10)
    ]
    row.forEach((cell, i) => {
      pdf.text(String(cell).slice(0, 12), x, y + 3)
      x += colWidths[i]
    })
    y += 5
    if (y > 270) break // Prevent overflow
  }

  return y + 5
}

function addConsultantNotes(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const notes = data.consultantNotes || []

  if (notes.length === 0) return y

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.setFillColor(254, 226, 226)
  pdf.rect(14, y - 4, pageWidth - 28, 7, 'F')
  pdf.text('3. Consultant Notes', 16, y)
  y += 6

  for (const n of notes.slice(0, 10)) { // Max 10 notes
    pdf.setDrawColor(180); pdf.setLineWidth(0.3)
    const noteHeight = Math.min(25, 10 + Math.ceil((n.text || '').length / 80) * 4)
    pdf.rect(14, y, pageWidth - 28, noteHeight)

    let yy = y + 5
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
    pdf.text(formatDateTime(n.recordedAt), 18, yy)
    pdf.text(`Dr: ${n.doctorName || '-'}`, pageWidth - 18, yy, { align: 'right' })
    yy += 5

    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
    const textLines = pdf.splitTextToSize(n.text || '-', pageWidth - 40)
    pdf.text(textLines.slice(0, 3), 18, yy)

    y += noteHeight + 3
    if (y > 270) break
  }

  return y + 3
}

function addMedications(pdf: jsPDF, data: ErMedicalRecordData, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const meds = data.medications || []

  if (meds.length === 0) return y

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.setFillColor(254, 226, 226)
  pdf.rect(14, y - 4, pageWidth - 28, 7, 'F')
  pdf.text('4. Medication Administered', 16, y)
  y += 6

  // Table header
  const headers = ['Medicine', 'Dose', 'Frequency', 'Time']
  const colWidths = [70, 35, 35, 40]
  let x = 18

  pdf.setFillColor(240, 240, 240)
  pdf.rect(14, y, pageWidth - 28, 6, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
  headers.forEach((h, i) => {
    pdf.text(h, x, y + 4)
    x += colWidths[i]
  })
  y += 6

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  for (const m of meds) {
    x = 18
    pdf.text(m.drugName || '-', x, y + 3)
    pdf.text(m.dose || '-', x + colWidths[0], y + 3)
    pdf.text(m.frequency || '-', x + colWidths[0] + colWidths[1], y + 3)
    pdf.text(formatDateTime(m.startAt).slice(0, 16), x + colWidths[0] + colWidths[1] + colWidths[2], y + 3)
    y += 5
    if (y > 270) break
  }

  return y + 5
}

export async function buildErMedicalRecordPdf(data: ErMedicalRecordData) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  let y = 14

  // Header
  y = addHeader(pdf, data, y)

  // Patient Info
  y = addPatientInfo(pdf, data, y)

  // Initial Assessments
  y = addInitialAssessments(pdf, data, y)

  // Check for page break
  if (y > 200) {
    pdf.addPage()
    y = 20
  }

  // Vitals
  y = addVitals(pdf, data, y)

  // Check for page break
  if (y > 200) {
    pdf.addPage()
    y = 20
  }

  // Consultant Notes
  y = addConsultantNotes(pdf, data, y)

  // Check for page break
  if (y > 230) {
    pdf.addPage()
    y = 20
  }

  // Medications
  y = addMedications(pdf, data, y)

  // Footer
  const pageHeight = pdf.internal.pageSize.getHeight()
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  pdf.setTextColor(100)
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, pageHeight - 10)
  pdf.text('Page 1 of 1', pdf.internal.pageSize.getWidth() - 14, pageHeight - 10, { align: 'right' })

  return pdf
}

export async function previewErMedicalRecordPdf(data: ErMedicalRecordData) {
  const pdf = await buildErMedicalRecordPdf(data)
  const blob = (pdf as any).output('blob') as Blob
  const url = URL.createObjectURL(blob)

  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '9999'
  overlay.style.background = 'rgba(0,0,0,0.5)'
  overlay.className = 'no-print'

  const panel = document.createElement('div')
  panel.style.position = 'absolute'
  panel.style.left = '50%'
  panel.style.top = '50%'
  panel.style.transform = 'translate(-50%, -50%)'
  panel.style.width = 'min(1000px, 95vw)'
  panel.style.height = 'min(90vh, 900px)'
  panel.style.background = '#ffffff'
  panel.style.borderRadius = '12px'
  panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'
  panel.style.display = 'flex'
  panel.style.flexDirection = 'column'

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '8px 12px'
  header.style.borderBottom = '1px solid #e5e7eb'

  const title = document.createElement('div')
  title.textContent = 'ER Medical Record Preview'
  title.style.fontWeight = '600'
  title.style.color = '#0f172a'
  header.appendChild(title)

  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '8px'

  const btnPrint = document.createElement('button')
  btnPrint.textContent = 'Print'
  btnPrint.style.padding = '6px 12px'
  btnPrint.style.borderRadius = '6px'
  btnPrint.style.background = '#dc2626'
  btnPrint.style.color = '#fff'
  btnPrint.style.border = 'none'
  btnPrint.style.cursor = 'pointer'

  const btnClose = document.createElement('button')
  btnClose.textContent = 'Close'
  btnClose.style.padding = '6px 12px'
  btnClose.style.borderRadius = '6px'
  btnClose.style.border = '1px solid #cbd5e1'
  btnClose.style.background = '#fff'
  btnClose.style.color = '#0f172a'
  btnClose.style.cursor = 'pointer'

  actions.appendChild(btnPrint)
  actions.appendChild(btnClose)
  header.appendChild(actions)

  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.flex = '1'
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = '0'

  function cleanup() {
    try { URL.revokeObjectURL(url) } catch {}
    try { document.removeEventListener('keydown', onKey) } catch {}
    try { overlay.remove() } catch {}
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cleanup() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault()
      try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {}
    }
  }

  btnClose.onclick = () => cleanup()
  btnPrint.onclick = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }
  document.addEventListener('keydown', onKey)

  panel.appendChild(header)
  panel.appendChild(frame)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}
