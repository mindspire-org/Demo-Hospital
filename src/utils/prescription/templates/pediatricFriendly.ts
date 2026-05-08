export type PediatricFriendlyPdfData = {
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

export async function previewPediatricFriendlyPdf(data: PediatricFriendlyPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Palette - soft pastels, warm and friendly
  const pink       = { r: 236, g: 72,  b: 153 }
  const softPink   = { r: 252, g: 231, b: 243 }
  const sky        = { r: 56,  g: 189, b: 248 }
  const softSky    = { r: 224, g: 242, b: 254 }
  const mint       = { r: 52,  g: 211, b: 153 }
  const softMint   = { r: 236, g: 253, b: 245 }
  const lavender   = { r: 167, g: 139, b: 250 }
  const softLavender = { r: 237, g: 233, b: 254 }
  const peach      = { r: 251, g: 191, b: 36  }
  const softPeach  = { r: 254, g: 243, b: 199 }
  const dark       = { r: 30,  g: 30,  b: 50  }
  const white      = { r: 255, g: 255, b: 255 }
  const gray       = { r: 100, g: 116, b: 139 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 10
  const cw = W - 2 * mx
  let y = 8

  // ══════════════════════════════════════════════════════════════
  // 1. HEADER - Soft pastel rainbow strip + white card
  // ══════════════════════════════════════════════════════════════
  const headerH = 38
  const headerY = y

  // Rainbow strip at top (5 color bands)
  const rainbowColors = [pink, lavender, sky, mint, peach]
  const bandW = cw / rainbowColors.length
  rainbowColors.forEach((col, i) => {
    pdf.setFillColor(col.r, col.g, col.b)
    pdf.rect(mx + i * bandW, headerY, bandW + 0.5, 4, 'F')
  })

  // White card body
  pdf.setFillColor(white.r, white.g, white.b)
  pdf.setDrawColor(220, 220, 240)
  pdf.setLineWidth(0.3)
  roundedRect(pdf, mx, headerY + 4, cw, headerH - 4, 4)

  // Logo
  let nameX = mx + 10
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc)
      pdf.addImage(normalized, 'PNG' as any, mx + 10, headerY + 10, 16, 16, undefined, 'FAST')
      nameX = mx + 30
    } catch {}
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, headerY + 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(String(settings.address || ''), nameX, headerY + 22)
  pdf.text(`Tel: ${settings.phone || ''}`, nameX, headerY + 27)

  // Doctor right side
  const drX = W - mx - 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || '-'}`, drX, headerY + 14, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(pink.r, pink.g, pink.b)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(' • ')
  if (drSub) pdf.text(drSub, drX, headerY + 20, { align: 'right' })

  // Department badge
  if ((doctor as any).departmentName) {
    const dept = String((doctor as any).departmentName)
    const deptW = Math.min(55, dept.length * 2 + 8)
    pdf.setFillColor(softLavender.r, softLavender.g, softLavender.b)
    pdf.setDrawColor(lavender.r, lavender.g, lavender.b)
    pdf.setLineWidth(0.3)
    roundedRect(pdf, drX - deptW, headerY + 23, deptW, 6, 3)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(lavender.r, lavender.g, lavender.b)
    pdf.text(dept, drX - deptW / 2, headerY + 27.5, { align: 'center' })
  }

  y += headerH + 6

  // ══════════════════════════════════════════════════════════════
  // 2. PATIENT CARD (soft pink)
  // ══════════════════════════════════════════════════════════════
  pdf.setFillColor(softPink.r, softPink.g, softPink.b)
  pdf.setDrawColor(pink.r, pink.g, pink.b)
  pdf.setLineWidth(0.3)
  roundedRect(pdf, mx, y, cw, 20, 5)

  // Pink left accent
  pdf.setFillColor(pink.r, pink.g, pink.b)
  roundedRect(pdf, mx, y, 4, 20, 2)

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
  // 3. VITALS (pastel badges)
  // ══════════════════════════════════════════════════════════════
  const v: any = (data as any).vitals || {}
  const vitalsList: Array<{ label: string; value: string; bg: { r: number; g: number; b: number }; fg: { r: number; g: number; b: number } }> = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsList.push({ label: 'BP', value: `${v.bloodPressureSys}/${v.bloodPressureDia}`, bg: softPink, fg: pink })
  if (v.pulse != null) vitalsList.push({ label: 'Pulse', value: String(v.pulse), bg: softLavender, fg: lavender })
  if (v.temperatureC != null) vitalsList.push({ label: 'Temp', value: `${v.temperatureC}°C`, bg: softPeach, fg: peach })
  if (v.spo2 != null) vitalsList.push({ label: 'SpO2', value: `${v.spo2}%`, bg: softMint, fg: mint })
  if (v.weightKg != null) vitalsList.push({ label: 'Wt', value: `${v.weightKg}kg`, bg: softSky, fg: sky })
  if (v.bloodSugar != null) vitalsList.push({ label: 'BS', value: String(v.bloodSugar), bg: softLavender, fg: lavender })

  if (vitalsList.length) {
    let badgeX = mx + 2
    for (const vit of vitalsList) {
      const textW = pdf.getStringUnitWidth(`${vit.label}: ${vit.value}`) * 0.35 + 8
      pdf.setFillColor(vit.bg.r, vit.bg.g, vit.bg.b)
      pdf.setDrawColor(vit.fg.r, vit.fg.g, vit.fg.b)
      pdf.setLineWidth(0.2)
      roundedRect(pdf, badgeX, y, textW, 7, 3)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(vit.fg.r, vit.fg.g, vit.fg.b)
      pdf.text(`${vit.label}: `, badgeX + 3, y + 5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(dark.r, dark.g, dark.b)
      pdf.text(vit.value, badgeX + 3 + pdf.getStringUnitWidth(`${vit.label}: `) * 0.35, y + 5)
      badgeX += textW + 3
    }
    y += 12
  }

  // ══════════════════════════════════════════════════════════════
  // 4. CLINICAL SECTIONS (pastel cards)
  // ══════════════════════════════════════════════════════════════
  const addCard = (title: string, value: string | undefined, bg: { r: number; g: number; b: number }, accent: { r: number; g: number; b: number }) => {
    if (!value || !String(value).trim()) return
    const text = String(value).trim()
    const lines = (pdf as any).splitTextToSize(text, cw - 16)
    const cardH = 8 + lines.length * 3.5 + 2

    pdf.setFillColor(bg.r, bg.g, bg.b)
    pdf.setDrawColor(accent.r, accent.g, accent.b)
    pdf.setLineWidth(0.2)
    roundedRect(pdf, mx, y, cw, cardH, 4)

    // Left accent
    pdf.setFillColor(accent.r, accent.g, accent.b)
    roundedRect(pdf, mx, y, 3, cardH, 2)

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

  addCard('Chief Complaint', data.primaryComplaint, softPink, pink)
  addCard('Diagnosis', data.diagnosis, softLavender, lavender)
  addCard('Medical History', data.history, softSky, sky)
  addCard('Examination Findings', data.examFindings, softMint, mint)
  addCard('Allergies', data.allergyHistory, softPeach, peach)
  addCard('Advice / Referral', data.advice, softPink, pink)

  // ══════════════════════════════════════════════════════════════
  // 5. Rx TABLE (rainbow header)
  // ══════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    y += 2
    // Rainbow Rx header
    rainbowColors.forEach((col, i) => {
      pdf.setFillColor(col.r, col.g, col.b)
      pdf.rect(mx + i * bandW, y, bandW + 0.5, 7, 'F')
    })
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('Rx  PRESCRIPTION', mx + 6, y + 5)
    y += 9

    const cols = [6, 38, 18, 18, 22, 15, 18]
    const headers = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction']

    pdf.setFillColor(softLavender.r, softLavender.g, softLavender.b)
    pdf.rect(mx, y - 4, cw, 5.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(lavender.r, lavender.g, lavender.b)
    let cx = mx + 2
    headers.forEach((h, i) => { pdf.text(h, cx + 1, y); cx += cols[i] })
    y += 5

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    meds.forEach((m, i) => {
      const rowBg = i % 2 === 0 ? softLavender : softMint
      pdf.setFillColor(rowBg.r, rowBg.g, rowBg.b)
      pdf.rect(mx, y - 3.5, cw, 5, 'F')
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
    pdf.setFillColor(softSky.r, softSky.g, softSky.b)
    pdf.setDrawColor(sky.r, sky.g, sky.b)
    pdf.setLineWidth(0.2)
    roundedRect(pdf, mx, y, cw, 10, 4)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(sky.r, sky.g, sky.b)
    pdf.text('INVESTIGATIONS', mx + 6, y + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    pdf.setFontSize(7)
    const testStr = [labTests.length ? `Lab: ${labTests.join(', ')}` : '', diagTests.length ? `Diag: ${diagTests.join(', ')}` : ''].filter(Boolean).join('   |   ')
    pdf.text(testStr, mx + 40, y + 7, { maxWidth: cw - 48 })
    y += 14
  }

  // ══════════════════════════════════════════════════════════════
  // 6. SIGNATURE + FOOTER
  // ══════════════════════════════════════════════════════════════
  const signY = H - 30
  pdf.setDrawColor(lavender.r, lavender.g, lavender.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx + 4, signY, mx + 45, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text("Doctor's Signature", mx + 4, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || ''}`, mx + 4, signY + 8)

  // Footer rainbow strip
  rainbowColors.forEach((col, i) => {
    pdf.setFillColor(col.r, col.g, col.b)
    pdf.rect(mx + i * bandW, H - 12, bandW + 0.5, 4, 'F')
  })
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.text(`${settings.name || ''}  •  ${settings.phone || ''}  •  ${settings.address || ''}`, W / 2, H - 9.5, { align: 'center' })

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
