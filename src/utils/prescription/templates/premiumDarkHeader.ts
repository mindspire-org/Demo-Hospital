export type PremiumDarkHeaderPdfData = {
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

export async function previewPremiumDarkHeaderPdf(data: PremiumDarkHeaderPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Palette - navy + gold luxury
  const navy       = { r: 15,  g: 30,  b: 80  }
  const gold       = { r: 212, g: 175, b: 55  }
  const lightGold  = { r: 252, g: 235, b: 160 }
  const dark       = { r: 15,  g: 23,  b: 42  }
  const white      = { r: 255, g: 255, b: 255 }
  const cream      = { r: 255, g: 251, b: 240 }
  const gray       = { r: 100, g: 116, b: 139 }
  const softGold   = { r: 255, g: 248, b: 220 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  const cw = W - 2 * mx
  let y = 8

  // ══════════════════════════════════════════════════════════════
  // 1. DARK NAVY HEADER with gold accents
  // ══════════════════════════════════════════════════════════════
  const headerH = 40
  pdf.setFillColor(navy.r, navy.g, navy.b)
  pdf.rect(mx, y, cw, headerH, 'F')

  // Gold line at top
  pdf.setFillColor(gold.r, gold.g, gold.b)
  pdf.rect(mx, y, cw, 1.5, 'F')

  // Gold line at bottom
  pdf.rect(mx, y + headerH - 1.5, cw, 1.5, 'F')

  // Gold corner accents
  pdf.setFillColor(gold.r, gold.g, gold.b)
  pdf.rect(mx, y, 2, 8, 'F')
  pdf.rect(mx, y, 8, 2, 'F')
  pdf.rect(W - mx - 2, y, 2, 8, 'F')
  pdf.rect(W - mx - 8, y, 8, 2, 'F')

  // Logo
  let nameX = mx + 10
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc)
      pdf.addImage(normalized, 'PNG' as any, mx + 10, y + 10, 18, 18, undefined, 'FAST')
      nameX = mx + 32
    } catch {}
  }

  // Hospital name (gold)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(gold.r, gold.g, gold.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, y + 16)

  // Address (white)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(String(settings.address || ''), nameX, y + 22)
  pdf.text(`Tel: ${settings.phone || ''}`, nameX, y + 27)

  // Doctor right side (white + gold)
  const drX = W - mx - 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(`Dr. ${doctor.name || '-'}`, drX, y + 14, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(lightGold.r, lightGold.g, lightGold.b)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(' • ')
  if (drSub) pdf.text(drSub, drX, y + 20, { align: 'right' })

  // Department badge (gold on navy)
  if ((doctor as any).departmentName) {
    const dept = String((doctor as any).departmentName).toUpperCase()
    const deptW = Math.min(55, dept.length * 2 + 10)
    pdf.setFillColor(gold.r, gold.g, gold.b)
    roundedRect(pdf, drX - deptW, y + 24, deptW, 6, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(dept, drX - deptW / 2, y + 28.5, { align: 'center' })
  }

  y += headerH + 6

  // ══════════════════════════════════════════════════════════════
  // 2. PATIENT (cream card with gold border)
  // ══════════════════════════════════════════════════════════════
  pdf.setFillColor(cream.r, cream.g, cream.b)
  pdf.setDrawColor(gold.r, gold.g, gold.b)
  pdf.setLineWidth(0.5)
  roundedRect(pdf, mx, y, cw, 22, 3)

  // Gold left bar
  pdf.setFillColor(gold.r, gold.g, gold.b)
  pdf.rect(mx, y + 2, 3, 18, 'F')

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
  if (patient.address) {
    pdf.setFont('helvetica', 'bold'); pdf.text('Address:', c3, y + 13); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.address), c3 + 14, y + 13)
  }

  y += 26

  // ══════════════════════════════════════════════════════════════
  // 3. VITALS (gold badges)
  // ══════════════════════════════════════════════════════════════
  const v: any = (data as any).vitals || {}
  const vitalsList: Array<{ label: string; value: string }> = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsList.push({ label: 'BP', value: `${v.bloodPressureSys}/${v.bloodPressureDia}` })
  if (v.pulse != null) vitalsList.push({ label: 'Pulse', value: String(v.pulse) })
  if (v.temperatureC != null) vitalsList.push({ label: 'Temp', value: `${v.temperatureC}°C` })
  if (v.spo2 != null) vitalsList.push({ label: 'SpO2', value: `${v.spo2}%` })
  if (v.weightKg != null) vitalsList.push({ label: 'Wt', value: `${v.weightKg}kg` })
  if (v.bloodSugar != null) vitalsList.push({ label: 'BS', value: String(v.bloodSugar) })

  if (vitalsList.length) {
    pdf.setFillColor(softGold.r, softGold.g, softGold.b)
    pdf.setDrawColor(gold.r, gold.g, gold.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, mx, y, cw, 10, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text('VITALS', mx + 4, y + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.setFontSize(7.5)
    pdf.text(vitalsList.map(v => `${v.label}: ${v.value}`).join('   '), mx + 20, y + 7)
    y += 14
  }

  // ══════════════════════════════════════════════════════════════
  // 4. CLINICAL SECTIONS
  // ══════════════════════════════════════════════════════════════
  const addSection = (label: string, value: string | undefined) => {
    if (!value || !String(value).trim()) return
    const text = String(value).trim()
    const lines = (pdf as any).splitTextToSize(text, cw - 12)

    // Gold section header
    pdf.setFillColor(gold.r, gold.g, gold.b)
    pdf.rect(mx, y, cw, 0.8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(label, mx + 4, y + 5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.text(lines, mx + 4, y + 10)
    y += lines.length * 3.5 + 12
  }

  addSection('Chief Complaint', data.primaryComplaint)
  addSection('Diagnosis', data.diagnosis)
  addSection('Medical History', data.history)
  addSection('Examination Findings', data.examFindings)
  addSection('Allergies', data.allergyHistory)
  addSection('Advice / Referral', data.advice)

  // ══════════════════════════════════════════════════════════════
  // 5. Rx TABLE
  // ══════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    y += 2
    // Navy Rx header
    pdf.setFillColor(navy.r, navy.g, navy.b)
    roundedRect(pdf, mx, y, cw, 8, 2)
    pdf.setTextColor(gold.r, gold.g, gold.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Rx  PRESCRIPTION', mx + 6, y + 6)
    y += 10

    const cols = [6, 38, 18, 18, 22, 15, 18]
    const headers = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction']

    pdf.setFillColor(softGold.r, softGold.g, softGold.b)
    pdf.rect(mx, y - 4, cw, 5.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    let cx = mx + 2
    headers.forEach((h, i) => { pdf.text(h, cx + 1, y); cx += cols[i] })
    y += 4

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    meds.forEach((m, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(255, 252, 245)
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
    pdf.setFillColor(softGold.r, softGold.g, softGold.b)
    pdf.setDrawColor(gold.r, gold.g, gold.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, mx, y, cw, 10, 2)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(navy.r, navy.g, navy.b)
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
  pdf.setDrawColor(gold.r, gold.g, gold.b)
  pdf.setLineWidth(0.3)
  pdf.line(mx + 4, signY, mx + 45, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text("Doctor's Signature", mx + 4, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(navy.r, navy.g, navy.b)
  pdf.text(`Dr. ${doctor.name || ''}`, mx + 4, signY + 8)

  // Footer navy bar with gold text
  pdf.setFillColor(navy.r, navy.g, navy.b)
  pdf.rect(mx, H - 14, cw, 6, 'F')
  pdf.setFillColor(gold.r, gold.g, gold.b)
  pdf.rect(mx, H - 14, cw, 0.8, 'F')
  pdf.setTextColor(gold.r, gold.g, gold.b)
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
