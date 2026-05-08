export type ClinicalProfessionalPdfData = {
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

function roundedRect(pdf: any, x: number, y: number, w: number, h: number, r: number) {
  try { pdf.roundedRect(x, y, w, h, r, r) } catch { pdf.rect(x, y, w, h) }
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth || 200; c.height = img.naturalHeight || 200; c.getContext('2d')?.drawImage(img, 0, 0); resolve(c.toDataURL('image/png') || src) } catch { resolve(src) } }
      img.onerror = () => resolve(src); img.src = src
    })
  } catch { return src }
}

export async function previewClinicalProfessionalPdf(data: ClinicalProfessionalPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Palette - teal/emerald clinical
  const teal       = { r: 20,  g: 184, b: 166 }
  const emerald    = { r: 16,  g: 185, b: 129 }
  const darkTeal   = { r: 13,  g: 148, b: 136 }
  const dark       = { r: 15,  g: 23,  b: 42  }
  const white      = { r: 255, g: 255, b: 255 }
  const softTeal   = { r: 240, g: 253, b: 250 }
  const softEmerald = { r: 236, g: 253, b: 245 }
  const gray       = { r: 100, g: 116, b: 139 }
  const slate      = { r: 51,  g: 65,  b: 85  }
  const amber      = { r: 245, g: 158, b: 11  }
  const softAmber  = { r: 255, g: 251, b: 235 }
  const red        = { r: 220, g: 38,  b: 38  }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  const cw = W - 2 * mx
  let y = 8

  // ══════════════════════════════════════════════════════════════
  // 1. HEADER - Teal top bar + white content
  // ══════════════════════════════════════════════════════════════
  const headerH = 36
  // Teal top section
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.rect(mx, y, cw, 8, 'F')

  // White card below
  pdf.setFillColor(white.r, white.g, white.b)
  pdf.setDrawColor(200, 230, 225)
  pdf.setLineWidth(0.3)
  roundedRect(pdf, mx, y + 8, cw, headerH - 8, 0)

  // Logo
  let nameX = mx + 8
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc)
      pdf.addImage(normalized, 'PNG' as any, mx + 8, y + 12, 16, 16, undefined, 'FAST')
      nameX = mx + 28
    } catch {}
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, y + 20)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(String(settings.address || ''), nameX, y + 26)
  pdf.text(`Phone: ${settings.phone || ''}`, nameX, y + 31)

  // Doctor right
  const drX = W - mx - 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || '-'}`, drX, y + 18, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(teal.r, teal.g, teal.b)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(' • ')
  if (drSub) pdf.text(drSub, drX, y + 24, { align: 'right' })
  if ((doctor as any).departmentName) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(white.r, white.g, white.b)
    const deptW = Math.min(50, (doctor as any).departmentName.length * 2 + 10)
    pdf.setFillColor(darkTeal.r, darkTeal.g, darkTeal.b)
    roundedRect(pdf, drX - deptW, y + 27, deptW, 6, 2)
    pdf.text(String((doctor as any).departmentName).toUpperCase(), drX - deptW / 2, y + 31, { align: 'center' })
  }

  y += headerH + 6

  // ══════════════════════════════════════════════════════════════
  // 2. PATIENT INFO (teal-bordered card)
  // ══════════════════════════════════════════════════════════════
  pdf.setFillColor(softTeal.r, softTeal.g, softTeal.b)
  pdf.setDrawColor(teal.r, teal.g, teal.b)
  pdf.setLineWidth(0.4)
  roundedRect(pdf, mx, y, cw, 20, 3)

  // Left teal bar
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.rect(mx, y + 2, 3, 16, 'F')

  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.setFontSize(8)
  const c1 = mx + 10, c2 = mx + 55, c3 = mx + 100, c4 = mx + 140

  pdf.setFont('helvetica', 'bold'); pdf.text('Patient:', c1, y + 7); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.name || '-'), c1 + 14, y + 7)
  pdf.setFont('helvetica', 'bold'); pdf.text('MR#:', c2, y + 7); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.mrn || '-'), c2 + 10, y + 7)
  pdf.setFont('helvetica', 'bold'); pdf.text('Age/Gender:', c3, y + 7); pdf.setFont('helvetica', 'normal'); pdf.text(`${patient.age || '-'} / ${patient.gender || '-'}`, c3 + 20, y + 7)
  pdf.setFont('helvetica', 'bold'); pdf.text('Date:', c4, y + 7); pdf.setFont('helvetica', 'normal'); pdf.text(dt.toLocaleDateString(), c4 + 10, y + 7)

  pdf.setFont('helvetica', 'bold'); pdf.text('Phone:', c1, y + 13); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.phone || '-'), c1 + 14, y + 13)
  if ((data as any).tokenNo) {
    pdf.setFont('helvetica', 'bold'); pdf.text('Token:', c2, y + 13); pdf.setFont('helvetica', 'normal'); pdf.text(String((data as any).tokenNo), c2 + 10, y + 13)
  }

  y += 24

  // ══════════════════════════════════════════════════════════════
  // 3. VITALS (emerald badges)
  // ══════════════════════════════════════════════════════════════
  const v: any = (data as any).vitals || {}
  const vitalsList: Array<{ label: string; value: string }> = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsList.push({ label: 'BP', value: `${v.bloodPressureSys}/${v.bloodPressureDia}` })
  if (v.pulse != null) vitalsList.push({ label: 'Pulse', value: String(v.pulse) })
  if (v.temperatureC != null) vitalsList.push({ label: 'Temp', value: `${v.temperatureC}°C` })
  if (v.spo2 != null) vitalsList.push({ label: 'SpO2', value: `${v.spo2}%` })
  if (v.weightKg != null) vitalsList.push({ label: 'Wt', value: `${v.weightKg}kg` })
  if (v.bloodSugar != null) vitalsList.push({ label: 'BS', value: String(v.bloodSugar) })
  if (v.respiratoryRate != null) vitalsList.push({ label: 'RR', value: String(v.respiratoryRate) })

  if (vitalsList.length) {
    pdf.setFillColor(softEmerald.r, softEmerald.g, softEmerald.b)
    pdf.setDrawColor(emerald.r, emerald.g, emerald.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, mx, y, cw, 10, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(emerald.r, emerald.g, emerald.b)
    pdf.text('VITALS', mx + 4, y + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.setFontSize(7.5)
    pdf.text(vitalsList.map(v => `${v.label}: ${v.value}`).join('   '), mx + 20, y + 7)
    y += 14
  }

  // ══════════════════════════════════════════════════════════════
  // 4. CLINICAL SECTIONS (structured with teal headers)
  // ══════════════════════════════════════════════════════════════
  const addSection = (label: string, value: string | undefined, accent: { r: number; g: number; b: number }) => {
    if (!value || !String(value).trim()) return
    const text = String(value).trim()
    const lines = (pdf as any).splitTextToSize(text, cw - 12)

    // Section header bar
    pdf.setFillColor(accent.r, accent.g, accent.b)
    pdf.setFillColor(Math.min(255, accent.r + 180), Math.min(255, accent.g + 180), Math.min(255, accent.b + 180))
    pdf.rect(mx, y, cw, 5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(accent.r, accent.g, accent.b)
    pdf.text(label.toUpperCase(), mx + 4, y + 3.5)
    y += 6

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.text(lines, mx + 4, y)
    y += lines.length * 3.5 + 3
  }

  addSection('Chief Complaint', data.primaryComplaint, teal)
  addSection('History of Present Illness', data.primaryComplaintHistory, teal)
  addSection('Medical History', data.history, slate)
  addSection('Examination Findings', data.examFindings, emerald)
  addSection('Allergies', data.allergyHistory, red)
  addSection('Family History', data.familyHistory, slate)
  addSection('Diagnosis', data.diagnosis, amber)
  addSection('Advice / Referral', data.advice, teal)

  // ══════════════════════════════════════════════════════════════
  // 5. Rx TABLE
  // ══════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    y += 2
    pdf.setFillColor(teal.r, teal.g, teal.b)
    roundedRect(pdf, mx, y, cw, 7, 2)
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text('Rx', mx + 4, y + 5)
    y += 9

    const cols = [6, 38, 18, 18, 22, 15, 18]
    const headers = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction']

    pdf.setFillColor(softTeal.r, softTeal.g, softTeal.b)
    pdf.rect(mx, y - 4, cw, 5.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(teal.r, teal.g, teal.b)
    let cx = mx + 2
    headers.forEach((h, i) => { pdf.text(h, cx + 1, y); cx += cols[i] })
    y += 4

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    meds.forEach((m, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(248, 252, 250)
        pdf.rect(mx, y - 3.5, cw, 5, 'F')
      }
      cx = mx + 2
      pdf.text(String(i + 1), cx + 1, y); cx += cols[0]
      pdf.text(String(m?.name || '').trim(), cx + 1, y); cx += cols[1]
      pdf.text(String(m?.dose || '').trim(), cx + 1, y); cx += cols[2]
      pdf.text(String(m?.duration || '').trim(), cx + 1, y); cx += cols[3]
      pdf.text(String(m?.frequency || '').trim(), cx + 1, y); cx += cols[4]
      pdf.text(String(m?.route || '').trim(), cx + 1, y); cx += cols[5]
      pdf.text(String(m?.instruction || '').trim(), cx + 1, y)
      y += 5
    })
  }

  // ── Tests ──
  const labTests = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    y += 4
    pdf.setFillColor(softAmber.r, softAmber.g, softAmber.b)
    pdf.setDrawColor(amber.r, amber.g, amber.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, mx, y, cw, 10, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(amber.r, amber.g, amber.b)
    pdf.text('INVESTIGATIONS', mx + 4, y + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.setFontSize(7)
    const testStr = [labTests.length ? `Lab: ${labTests.join(', ')}` : '', diagTests.length ? `Diag: ${diagTests.join(', ')}` : ''].filter(Boolean).join('   |   ')
    pdf.text(testStr, mx + 36, y + 7, { maxWidth: cw - 42 })
    y += 14
  }

  // ══════════════════════════════════════════════════════════════
  // 6. SIGNATURE + FOOTER
  // ══════════════════════════════════════════════════════════════
  const signY = H - 30
  pdf.setDrawColor(teal.r, teal.g, teal.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx + 4, signY, mx + 45, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text("Doctor's Signature", mx + 4, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || ''}`, mx + 4, signY + 8)

  // Footer teal bar
  pdf.setFillColor(teal.r, teal.g, teal.b)
  pdf.rect(mx, H - 14, cw, 6, 'F')
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text(`${settings.name || ''}  •  ${settings.phone || ''}  •  ${settings.address || ''}`, W / 2, H - 10, { align: 'center' })

  // ── Overlay (header/footer/watermark) ──
  const { applyOverlayBeforeOutput } = await import('./applyOverlay')
  await applyOverlayBeforeOutput(pdf)

  // ── Output ──
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
