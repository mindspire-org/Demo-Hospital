export type ModernGradientPdfData = {
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

export async function previewModernGradientPdf(data: ModernGradientPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Palette - vibrant violet-to-sky gradient simulation
  const violet   = { r: 124, g: 58,  b: 237 }
  const sky      = { r: 56,  g: 189, b: 248 }
  const indigo   = { r: 99,  g: 102, b: 241 }
  const dark     = { r: 15,  g: 23,  b: 42  }
  const white    = { r: 255, g: 255, b: 255 }
  const softViolet = { r: 245, g: 243, b: 255 }
  const softSky    = { r: 240, g: 249, b: 255 }
  const gray      = { r: 100, g: 116, b: 139 }
  const rose      = { r: 244, g: 63,  b: 94  }
  const emerald   = { r: 16,  g: 185, b: 129 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  let y = 10

  // ══════════════════════════════════════════════════════════════
  // 1. GRADIENT HEADER (simulated with overlapping rectangles)
  // ══════════════════════════════════════════════════════════════
  const headerH = 42
  const headerY = 8
  const headerW = W - 2 * mx

  // Simulate gradient: violet → indigo → sky with 6 strips
  const strips = 6
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1)
    const r = Math.round(violet.r + (sky.r - violet.r) * t)
    const g = Math.round(violet.g + (sky.g - violet.g) * t)
    const b = Math.round(violet.b + (sky.b - violet.b) * t)
    pdf.setFillColor(r, g, b)
    const stripW = headerW / strips
    pdf.rect(mx + i * stripW, headerY, stripW + 0.5, headerH, 'F')
  }

  // Rounded overlay on top to smooth edges
  pdf.setFillColor(violet.r, violet.g, violet.b)
  roundedRect(pdf, mx, headerY, headerW, 4, 2)
  pdf.setFillColor(sky.r, sky.g, sky.b)
  roundedRect(pdf, mx, headerY + headerH - 4, headerW, 4, 2)

  // White text on gradient
  pdf.setTextColor(white.r, white.g, white.b)

  // Logo
  let nameX = mx + 8
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc)
      pdf.addImage(normalized, 'PNG' as any, mx + 8, headerY + 8, 16, 16, undefined, 'FAST')
      nameX = mx + 28
    } catch {}
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text(String(settings.name || 'Hospital'), nameX, headerY + 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(String(settings.address || ''), nameX, headerY + 22)
  pdf.text(`Tel: ${settings.phone || ''}`, nameX, headerY + 27)

  // Doctor info right side
  const drX = W - mx - 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(`Dr. ${doctor.name || '-'}`, drX, headerY + 13, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(' • ')
  if (drSub) pdf.text(drSub, drX, headerY + 19, { align: 'right' })
  if ((doctor as any).departmentName) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text(String((doctor as any).departmentName), drX, headerY + 25, { align: 'right' })
  }

  y = headerY + headerH + 8

  // ══════════════════════════════════════════════════════════════
  // 2. PATIENT CARD (rounded, soft violet bg)
  // ══════════════════════════════════════════════════════════════
  const patCardH = 22
  pdf.setFillColor(softViolet.r, softViolet.g, softViolet.b)
  pdf.setDrawColor(violet.r, violet.g, violet.b)
  pdf.setLineWidth(0.4)
  roundedRect(pdf, mx, y, headerW, patCardH, 4)

  // Left accent bar
  pdf.setFillColor(violet.r, violet.g, violet.b)
  pdf.rect(mx, y + 2, 3, patCardH - 4, 'F')

  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('PATIENT INFORMATION', mx + 10, y + 7)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(gray.r, gray.g, gray.b)
  const col1 = mx + 10
  const col2 = mx + 55
  const col3 = mx + 100
  const col4 = mx + 140

  pdf.setFont('helvetica', 'bold'); pdf.text('Name:', col1, y + 12); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.name || '-'), col1 + 12, y + 12)
  pdf.setFont('helvetica', 'bold'); pdf.text('MR#:', col2, y + 12); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.mrn || '-'), col2 + 10, y + 12)
  pdf.setFont('helvetica', 'bold'); pdf.text('Age:', col3, y + 12); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.age || '-'), col3 + 9, y + 12)
  pdf.setFont('helvetica', 'bold'); pdf.text('Gender:', col4, y + 12); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.gender || '-'), col4 + 14, y + 12)

  pdf.setFont('helvetica', 'bold'); pdf.text('Phone:', col1, y + 17); pdf.setFont('helvetica', 'normal'); pdf.text(String(patient.phone || '-'), col1 + 12, y + 17)
  pdf.setFont('helvetica', 'bold'); pdf.text('Date:', col2, y + 17); pdf.setFont('helvetica', 'normal'); pdf.text(dt.toLocaleDateString(), col2 + 10, y + 17)
  if ((data as any).tokenNo) {
    pdf.setFont('helvetica', 'bold'); pdf.text('Token:', col3, y + 17); pdf.setFont('helvetica', 'normal'); pdf.text(String((data as any).tokenNo), col3 + 12, y + 17)
  }

  y += patCardH + 6

  // ══════════════════════════════════════════════════════════════
  // 3. VITALS BADGES (pill-shaped)
  // ══════════════════════════════════════════════════════════════
  const v: any = (data as any).vitals || {}
  const vitalsList: Array<{ label: string; value: string; color: { r: number; g: number; b: number } }> = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsList.push({ label: 'BP', value: `${v.bloodPressureSys}/${v.bloodPressureDia}`, color: violet })
  if (v.pulse != null) vitalsList.push({ label: 'Pulse', value: String(v.pulse), color: indigo })
  if (v.temperatureC != null) vitalsList.push({ label: 'Temp', value: `${v.temperatureC}°C`, color: sky })
  if (v.spo2 != null) vitalsList.push({ label: 'SpO2', value: `${v.spo2}%`, color: emerald })
  if (v.weightKg != null) vitalsList.push({ label: 'Wt', value: `${v.weightKg}kg`, color: violet })
  if (v.bloodSugar != null) vitalsList.push({ label: 'BS', value: String(v.bloodSugar), color: indigo })

  if (vitalsList.length) {
    let badgeX = mx + 2
    const badgeY = y
    for (const vit of vitalsList) {
      const textW = pdf.getStringUnitWidth(`${vit.label}: ${vit.value}`) * 0.35 + 8
      // Badge bg
      pdf.setFillColor(vit.color.r, vit.color.g, vit.color.b)
      pdf.setFillColor(Math.min(255, vit.color.r + 160), Math.min(255, vit.color.g + 160), Math.min(255, vit.color.b + 160))
      roundedRect(pdf, badgeX, badgeY, textW, 7, 3)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(vit.color.r, vit.color.g, vit.color.b)
      pdf.text(`${vit.label}: `, badgeX + 3, badgeY + 5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(dark.r, dark.g, dark.b)
      pdf.text(vit.value, badgeX + 3 + pdf.getStringUnitWidth(`${vit.label}: `) * 0.35, badgeY + 5)
      badgeX += textW + 3
    }
    y += 12
  }

  // ══════════════════════════════════════════════════════════════
  // 4. CLINICAL SECTIONS (card-based)
  // ══════════════════════════════════════════════════════════════
  const addCard = (title: string, value: string | undefined, accent: { r: number; g: number; b: number }) => {
    if (!value || !String(value).trim()) return
    const text = String(value).trim()
    const lines = (pdf as any).splitTextToSize(text, headerW - 16)
    const cardH = 8 + lines.length * 3.5 + 2

    pdf.setFillColor(250, 250, 255)
    pdf.setDrawColor(accent.r, accent.g, accent.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, mx, y, headerW, cardH, 3)

    // Left accent
    pdf.setFillColor(accent.r, accent.g, accent.b)
    pdf.rect(mx, y + 2, 2.5, cardH - 4, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(accent.r, accent.g, accent.b)
    pdf.text(title, mx + 8, y + 5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.text(lines, mx + 8, y + 10)

    y += cardH + 3
  }

  addCard('PRIMARY COMPLAINT', data.primaryComplaint, violet)
  addCard('DIAGNOSIS', data.diagnosis, rose)
  addCard('MEDICAL HISTORY', data.history, indigo)
  addCard('EXAMINATION FINDINGS', data.examFindings, sky)
  addCard('ALLERGIES', data.allergyHistory, rose)
  addCard('ADVICE / REFERRAL', data.advice, emerald)

  // ══════════════════════════════════════════════════════════════
  // 5. Rx TABLE (modern styled)
  // ══════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    y += 2
    // Rx header with gradient bar
    pdf.setFillColor(violet.r, violet.g, violet.b)
    roundedRect(pdf, mx, y, headerW, 8, 2)
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Rx  PRESCRIPTION', mx + 6, y + 6)
    y += 10

    // Table header
    const cols = [6, 40, 20, 20, 24, 16, 20]
    const headers = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction']
    const colX = mx + 2

    pdf.setFillColor(softViolet.r, softViolet.g, softViolet.b)
    pdf.rect(colX, y - 4, headerW - 4, 6, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(violet.r, violet.g, violet.b)
    let cx = colX
    headers.forEach((h, i) => { pdf.text(h, cx + 1, y); cx += cols[i] })
    y += 5

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    meds.forEach((m, i) => {
      cx = colX
      pdf.text(String(i + 1), cx + 1, y); cx += cols[0]
      pdf.text(String(m?.name || '').trim(), cx + 1, y); cx += cols[1]
      pdf.text(String(m?.dose || '').trim(), cx + 1, y); cx += cols[2]
      pdf.text(String(m?.duration || '').trim(), cx + 1, y); cx += cols[3]
      pdf.text(String(m?.frequency || '').trim(), cx + 1, y); cx += cols[4]
      pdf.text(String(m?.route || '').trim(), cx + 1, y); cx += cols[5]
      pdf.text(String(m?.instruction || '').trim(), cx + 1, y)
      // Alternating row bg
      if (i % 2 === 0) {
        pdf.setFillColor(248, 246, 255)
        pdf.rect(colX, y - 3.5, headerW - 4, 5, 'F')
        // Re-draw text on top
        pdf.setTextColor(dark.r, dark.g, dark.b)
        cx = colX
        pdf.text(String(i + 1), cx + 1, y); cx += cols[0]
        pdf.text(String(m?.name || '').trim(), cx + 1, y); cx += cols[1]
        pdf.text(String(m?.dose || '').trim(), cx + 1, y); cx += cols[2]
        pdf.text(String(m?.duration || '').trim(), cx + 1, y); cx += cols[3]
        pdf.text(String(m?.frequency || '').trim(), cx + 1, y); cx += cols[4]
        pdf.text(String(m?.route || '').trim(), cx + 1, y); cx += cols[5]
        pdf.text(String(m?.instruction || '').trim(), cx + 1, y)
      }
      y += 5
    })
  }

  // ── Lab/Diag Tests ──
  const labTests = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    y += 4
    pdf.setFillColor(softSky.r, softSky.g, softSky.b)
    roundedRect(pdf, mx, y, headerW, 10, 3)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(sky.r, sky.g, sky.b)
    pdf.text('INVESTIGATIONS', mx + 6, y + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.setFontSize(7)
    const testStr = [labTests.length ? `Lab: ${labTests.join(', ')}` : '', diagTests.length ? `Diag: ${diagTests.join(', ')}` : ''].filter(Boolean).join('   |   ')
    pdf.text(testStr, mx + 40, y + 5, { maxWidth: headerW - 48 })
    y += 14
  }

  // ══════════════════════════════════════════════════════════════
  // 6. SIGNATURE + FOOTER
  // ══════════════════════════════════════════════════════════════
  const signY = H - 32
  pdf.setDrawColor(violet.r, violet.g, violet.b)
  pdf.setLineWidth(0.3)
  pdf.line(mx + 4, signY, mx + 50, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text("Doctor's Signature", mx + 4, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || ''}`, mx + 4, signY + 8)

  // Footer gradient bar
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1)
    const r = Math.round(violet.r + (sky.r - violet.r) * t)
    const g = Math.round(violet.g + (sky.g - violet.g) * t)
    const b = Math.round(violet.b + (sky.b - violet.b) * t)
    pdf.setFillColor(r, g, b)
    const stripW = headerW / strips
    pdf.rect(mx + i * stripW, H - 14, stripW + 0.5, 6, 'F')
  }
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
