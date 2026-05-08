export type CompactPharmacyPdfData = {
  doctor?: { name?: string; qualification?: string; departmentName?: string; phone?: string; specialization?: string }
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  items?: Array<{ name?: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string; qty?: number | string }>
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

export async function previewCompactPharmacyPdf(data: CompactPharmacyPdfData & Extras) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Palette - warm amber/orange pharmacy
  const amber      = { r: 245, g: 158, b: 11  }
  const dark       = { r: 15,  g: 23,  b: 42  }
  const white      = { r: 255, g: 255, b: 255 }
  const softAmber  = { r: 255, g: 251, b: 235 }
  const gray       = { r: 100, g: 116, b: 139 }
  const brown      = { r: 120, g: 53,  b: 15  }
  const softBrown  = { r: 254, g: 243, b: 199 }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const mx = 8
  const cw = W - 2 * mx
  let y = 6

  // ══════════════════════════════════════════════════════════════
  // 1. COMPACT HEADER (amber bar + single-line info)
  // ══════════════════════════════════════════════════════════════
  // Amber top strip
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(mx, y, cw, 3, 'F')

  y += 5
  // Logo + hospital name inline
  let nameX = mx + 4
  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const normalized = await ensurePngDataUrl(logoSrc)
      pdf.addImage(normalized, 'PNG' as any, mx + 4, y, 10, 10, undefined, 'FAST')
      nameX = mx + 16
    } catch {}
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(String(settings.name || 'Hospital'), nameX, y + 4)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(`${settings.address || ''}  |  Tel: ${settings.phone || ''}`, nameX, y + 8)

  // Doctor right side compact
  const drX = W - mx - 4
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || '-'}`, drX, y + 3, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(amber.r, amber.g, amber.b)
  const drSub = [doctor.qualification, (doctor as any).specialization].filter(Boolean).join(', ')
  if (drSub) pdf.text(drSub, drX, y + 7, { align: 'right' })

  y += 12
  // Thin amber line
  pdf.setDrawColor(amber.r, amber.g, amber.b)
  pdf.setLineWidth(0.4)
  pdf.line(mx, y, W - mx, y)
  y += 4

  // ══════════════════════════════════════════════════════════════
  // 2. PATIENT (single compact line)
  // ══════════════════════════════════════════════════════════════
  pdf.setFillColor(softAmber.r, softAmber.g, softAmber.b)
  pdf.rect(mx, y, cw, 8, 'F')

  pdf.setFontSize(7)
  pdf.setTextColor(brown.r, brown.g, brown.b)
  const patInfo = [
    `Pt: ${patient.name || '-'}`,
    patient.mrn ? `MR# ${patient.mrn}` : '',
    patient.age ? `Age ${patient.age}` : '',
    patient.gender || '',
    (data as any).tokenNo ? `Token ${(data as any).tokenNo}` : '',
    dt.toLocaleDateString(),
  ].filter(Boolean).join('  |  ')
  pdf.text(patInfo, mx + 3, y + 5)
  y += 10

  // ══════════════════════════════════════════════════════════════
  // 3. VITALS (inline)
  // ══════════════════════════════════════════════════════════════
  const v: any = (data as any).vitals || {}
  const vitalsArr: string[] = []
  if (v.bloodPressureSys != null && v.bloodPressureDia != null) vitalsArr.push(`BP ${v.bloodPressureSys}/${v.bloodPressureDia}`)
  if (v.pulse != null) vitalsArr.push(`P ${v.pulse}`)
  if (v.temperatureC != null) vitalsArr.push(`T ${v.temperatureC}°C`)
  if (v.spo2 != null) vitalsArr.push(`SpO2 ${v.spo2}%`)
  if (v.weightKg != null) vitalsArr.push(`Wt ${v.weightKg}kg`)
  if (vitalsArr.length) {
    pdf.setFontSize(6.5)
    pdf.setTextColor(gray.r, gray.g, gray.b)
    pdf.text(`Vitals: ${vitalsArr.join('   ')}`, mx + 2, y)
    y += 5
  }

  // ══════════════════════════════════════════════════════════════
  // 4. CLINICAL (compact two-column)
  // ══════════════════════════════════════════════════════════════
  const addField = (label: string, value: string | undefined, x: number, yy: number): number => {
    if (!value || !String(value).trim()) return yy
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(amber.r, amber.g, amber.b)
    pdf.text(`${label}:`, x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    const lines = (pdf as any).splitTextToSize(String(value).trim(), cw / 2 - 20)
    pdf.text(lines, x + 18, yy)
    return yy + lines.length * 3 + 2
  }

  const leftX = mx + 2
  const rightX = mx + cw / 2 + 2
  let leftY = y
  let rightY = y

  leftY = addField('Complaint', data.primaryComplaint, leftX, leftY)
  leftY = addField('Diagnosis', data.diagnosis, leftX, leftY)
  leftY = addField('Exam', data.examFindings, leftX, leftY)

  rightY = addField('Allergies', data.allergyHistory, rightX, rightY)
  rightY = addField('History', data.history, rightX, rightY)
  rightY = addField('Advice', data.advice, rightX, rightY)

  y = Math.max(leftY, rightY) + 3

  // ══════════════════════════════════════════════════════════════
  // 5. Rx TABLE (compact, dense)
  // ══════════════════════════════════════════════════════════════
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())
  if (meds.length > 0) {
    // Rx header
    pdf.setFillColor(amber.r, amber.g, amber.b)
    pdf.rect(mx, y, cw, 6, 'F')
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('Rx', mx + 4, y + 4.5)
    y += 7

    const cols = [5, 36, 16, 16, 20, 13, 16, 12]
    const headers = ['#', 'Medicine', 'Dosage', 'Duration', 'Frequency', 'Route', 'Instruction', 'Qty']

    pdf.setFillColor(softBrown.r, softBrown.g, softBrown.b)
    pdf.rect(mx, y - 3.5, cw, 4.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6)
    pdf.setTextColor(brown.r, brown.g, brown.b)
    let cx = mx + 1
    headers.forEach((h, i) => { pdf.text(h, cx + 0.5, y); cx += cols[i] })
    y += 3.5

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(dark.r, dark.g, dark.b)
    meds.forEach((m, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(255, 252, 240)
        pdf.rect(mx, y - 2.5, cw, 4, 'F')
      }
      cx = mx + 1
      pdf.text(String(i + 1), cx + 0.5, y); cx += cols[0]
      pdf.text(String(m?.name || '').trim(), cx + 0.5, y); cx += cols[1]
      pdf.text(String(m?.dose || '').trim(), cx + 0.5, y); cx += cols[2]
      pdf.text(String(m?.duration || '').trim(), cx + 0.5, y); cx += cols[3]
      pdf.text(String(m?.frequency || '').trim(), cx + 0.5, y); cx += cols[4]
      pdf.text(String(m?.route || '').trim(), cx + 0.5, y); cx += cols[5]
      pdf.text(String(m?.instruction || '').trim(), cx + 0.5, y); cx += cols[6]
      pdf.text(String((m as any)?.qty || '').trim(), cx + 0.5, y)
      y += 4
    })
  }

  // ── Tests ──
  const labTests = (data.labTests || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)
  if (labTests.length || diagTests.length) {
    y += 3
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(amber.r, amber.g, amber.b)
    pdf.text('Investigations:', mx + 2, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(dark.r, dark.g, dark.b)
    const testStr = [labTests.length ? `Lab: ${labTests.join(', ')}` : '', diagTests.length ? `Diag: ${diagTests.join(', ')}` : ''].filter(Boolean).join(' | ')
    pdf.text(testStr, mx + 28, y, { maxWidth: cw - 32 })
    y += 5
  }

  // ══════════════════════════════════════════════════════════════
  // 6. SIGNATURE + FOOTER
  // ══════════════════════════════════════════════════════════════
  const signY = H - 24
  pdf.setDrawColor(amber.r, amber.g, amber.b)
  pdf.setLineWidth(0.2)
  pdf.line(mx + 2, signY, mx + 38, signY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text("Doctor's Signature", mx + 2, signY + 3)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(dark.r, dark.g, dark.b)
  pdf.text(`Dr. ${doctor.name || ''}`, mx + 2, signY + 6.5)

  // Footer amber bar
  pdf.setFillColor(amber.r, amber.g, amber.b)
  pdf.rect(mx, H - 10, cw, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(5.5)
  pdf.setTextColor(white.r, white.g, white.b)
  pdf.text(`${settings.name || ''}  |  ${settings.phone || ''}  |  ${settings.address || ''}`, W / 2, H - 8, { align: 'center' })

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
