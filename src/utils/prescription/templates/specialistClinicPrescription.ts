import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq } from '../ensureUrduNastaleeq'

export type SpecialistClinicPdfData = {
  doctor?: {
    name?: string
    qualification?: string
    departmentName?: string
    phone?: string
    title?: string
    specialization?: string
  }
  settings?: {
    name?: string
    address?: string
    phone?: string
    logoDataUrl?: string
  }
  patient?: {
    name?: string
    mrn?: string
    gender?: string
    fatherName?: string
    age?: string
    phone?: string
    address?: string
    cnic?: string
  }
  items?: Array<{
    name?: string
    frequency?: string
    duration?: string
    dose?: string
    instruction?: string
    route?: string
    qty?: number | string
  }>
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  allergyHistory?: string
  treatmentHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  riskFactors?: string
  medicalHistory?: string
  historyOfComplaint?: string
  examinationFindings?: string
  referral?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    temperatureF?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
  }
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  createdAt?: string | Date
}

export async function previewSpecialistClinicPdf(data: SpecialistClinicPdfData) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  try { await ensurePoppins(pdf) } catch {}
  try { await ensureUrduNastaleeq(pdf) } catch {}

  // ── Palette ──────────────────────────────────────────────────────────────
  const navy      = { r: 15,  g: 40,  b: 100  }
  const blue      = { r: 37,  g: 99,  b: 235  }
  const lightBlue = { r: 219, g: 234, b: 254  }
  const skyBg     = { r: 241, g: 246, b: 255  }
  const slate     = { r: 15,  g: 23,  b: 42   }
  const gray      = { r: 100, g: 116, b: 139  }
  const white     = { r: 255, g: 255, b: 255  }
  const softRed   = { r: 254, g: 242, b: 242  }
  const red       = { r: 220, g: 38,  b: 38   }
  const softBlue  = { r: 239, g: 246, b: 255  }
  const tblHead   = { r: 230, g: 238, b: 255  }
  const rowAlt    = { r: 248, g: 250, b: 255  }
  const border    = { r: 190, g: 210, b: 240  }

  const settings = data.settings || {}
  const patient  = data.patient  || {}
  const doctor   = data.doctor   || {}
  const dt       = data.createdAt ? new Date(data.createdAt as any) : new Date()
  const marginX  = 10

  // ══════════════════════════════════════════════════════════════════════════
  // 1.  HEADER  ── upgraded
  // ══════════════════════════════════════════════════════════════════════════
  const headerH  = 42
  const headerY  = 8

  // Card background
  pdf.setFillColor(skyBg.r, skyBg.g, skyBg.b)
  pdf.setDrawColor(lightBlue.r, lightBlue.g, lightBlue.b)
  pdf.setLineWidth(0.6)
  pdf.roundedRect(marginX, headerY, W - 2 * marginX, headerH, 4, 4, 'FD')

  // Bold navy left accent strip
  pdf.setFillColor(navy.r, navy.g, navy.b)
  pdf.rect(marginX, headerY, 4, headerH, 'F')
  // Soften strip corners (overdraw left edge)
  pdf.setFillColor(skyBg.r, skyBg.g, skyBg.b)
  pdf.rect(marginX, headerY, 2, 2, 'F')
  pdf.rect(marginX, headerY + headerH - 2, 2, 2, 'F')

  // Thick blue bottom line
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(1.8)
  pdf.line(marginX, headerY + headerH, W - marginX, headerY + headerH)

  // ── LEFT: logo + clinic name + address ───────────────────────────────────
  let nameX = marginX + 10
  const logoAreaX = marginX + 10
  const logoY     = headerY + 8

  const logoSrc = String(settings.logoDataUrl || '')
  if (logoSrc) {
    try {
      const norm = await ensurePngDataUrl(logoSrc)
      pdf.addImage(norm, 'PNG' as any, logoAreaX, logoY, 16, 16, undefined, 'FAST')
      nameX = logoAreaX + 20
    } catch {}
  }

  // Clinic name — large, dark
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  const clinicName  = String(settings.name || 'Hospital Name')
  const clinicLines = pdf.splitTextToSize(clinicName, 82) as string[]
  pdf.text(clinicLines, nameX, headerY + 14)

  // Thin blue rule under name
  const ruleY = headerY + 14 + clinicLines.length * 7
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.6)
  pdf.line(nameX, ruleY, nameX + 72, ruleY)

  // Address
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text(String(settings.address || ''), nameX, ruleY + 5.5)

  // ── RIGHT: doctor info ───────────────────────────────────────────────────
  const cardRight = W - marginX           // right edge of card
  const drX       = cardRight - 8         // text right-align point

  // Department badge (top-right of card, inside)
  const dept = (doctor.departmentName || doctor.title || '').toUpperCase().trim()
  if (dept) {
    const badgeW = Math.min(60, Math.max(36, dept.length * 1.9 + 8))
    const badgeX = cardRight - badgeW - 4
    pdf.setFillColor(navy.r, navy.g, navy.b)
    pdf.roundedRect(badgeX, headerY + 4, badgeW, 7, 1.5, 1.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(white.r, white.g, white.b)
    pdf.text(dept, badgeX + badgeW / 2, headerY + 9, { align: 'center' })
  }

  // Doctor name
  pdf.setFont('helvetica', 'bolditalic')
  pdf.setFontSize(20)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.text(`Dr. ${String(doctor.name || '-')}`, drX, headerY + 19, { align: 'right' })

  // Qualification
  if (doctor.qualification) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(gray.r, gray.g, gray.b)
    pdf.text(String(doctor.qualification), drX, headerY + 26, { align: 'right' })
  }

  // Specialization (blue)
  const spec = doctor.specialization || ''
  if (spec) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(blue.r, blue.g, blue.b)
    pdf.text(spec, drX, headerY + 33, { align: 'right' })
  }

  // Helpline removed

  let y = headerY + headerH + 7

  // ══════════════════════════════════════════════════════════════════════════
  // 2.  PATIENT INFO TABLE
  // ══════════════════════════════════════════════════════════════════════════
  const tblW  = W - 2 * marginX
  const col3W = tblW / 3
  const rowH  = 8

  // Draw 2-row × 3-col grid
  pdf.setDrawColor(slate.r, slate.g, slate.b)
  pdf.setLineWidth(0.3)
  pdf.rect(marginX, y, tblW, rowH * 2)
  pdf.line(marginX + col3W,     y, marginX + col3W,     y + rowH * 2)
  pdf.line(marginX + col3W * 2, y, marginX + col3W * 2, y + rowH * 2)
  pdf.line(marginX, y + rowH, marginX + tblW, y + rowH)

  const ptCell = (label: string, value: string, cx: number, cy: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    const lbl = `${label}: `
    pdf.text(lbl, cx + 2, cy + 5)
    pdf.setFont('helvetica', 'normal')
    pdf.text(String(value || '-'), cx + 2 + pdf.getTextWidth(lbl), cy + 5)
  }

  ptCell('Print Date', dt.toLocaleString(),                                   marginX,              y)
  ptCell('MR No',      String(patient.mrn || '-'),                            marginX + col3W,      y)
  ptCell('Age/Gender', `${patient.age || '-'} / ${patient.gender || '-'}`,   marginX + col3W * 2,  y)
  ptCell('Patient Name', String(patient.name || '-'),                         marginX,              y + rowH)
  ptCell('Contact No',   String(patient.phone || '-'),                        marginX + col3W,      y + rowH)
  ptCell('Created On',   dt.toLocaleString(),                                 marginX + col3W * 2,  y + rowH)

  y += rowH * 2 + 5

  // ══════════════════════════════════════════════════════════════════════════
  // 3.  VITALS
  // ══════════════════════════════════════════════════════════════════════════
  const v = data.vitals || {}
  const tempVal = v.temperatureF
    ? `${v.temperatureF}`
    : v.temperatureC ? `${(v.temperatureC * 9/5 + 32).toFixed(1)}` : ''

  const vitRows = [
    [`BP: ${fmtBp(v)} (mmhg)`,            `Pulse: ${fmt(v.pulse)} (pulse/min)`,   `Temperature: ${tempVal || fmt(v.temperatureC)} (F)`],
    [`Height: ${fmt(v.heightCm)} (cm)`,   `Weight: ${fmt(v.weightKg)} (kg)`,      `RespRate: ${fmt(v.respiratoryRate)} (breaths/min)`],
  ]
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  for (const row of vitRows) {
    pdf.text(row[0], marginX,       y + 4)
    pdf.text(row[1], marginX + 65,  y + 4)
    pdf.text(row[2], marginX + 130, y + 4)
    y += 6
  }

  // Separator
  pdf.setDrawColor(200, 208, 220)
  pdf.setLineWidth(0.2)
  pdf.line(marginX, y + 2, W - marginX, y + 2)
  y += 8

  // ══════════════════════════════════════════════════════════════════════════
  // 4.  TWO-COLUMN BODY
  // ══════════════════════════════════════════════════════════════════════════
  const leftColW  = 55
  const gap       = 8
  const rxX       = marginX + leftColW + gap
  const rxW       = W - marginX - rxX
  const bodyStartY = y

  // ── LEFT: Tests ───────────────────────────────────────────────────────────
  const labTests  = (data.labTests  || []).filter(Boolean)
  const diagTests = (data.diagnosticTests || []).filter(Boolean)

  const renderTestBlock = (title: string, subLabel: string, tests: string[], startY: number): number => {
    let ty = startY
    const tw = leftColW

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    pdf.text(title, marginX, ty)
    ty += 5

    // Sub-header
    pdf.setFillColor(tblHead.r, tblHead.g, tblHead.b)
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.25)
    pdf.rect(marginX, ty, tw, 6, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    pdf.text(subLabel, marginX + 2, ty + 4.2)
    ty += 6

    // Sr# | Test Name header row
    const srW = 10
    pdf.setFillColor(248, 250, 255)
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.rect(marginX, ty, tw, 5.5, 'FD')
    pdf.line(marginX + srW, ty, marginX + srW, ty + 5.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    pdf.text('Sr#',       marginX + 2,       ty + 3.8)
    pdf.text('Test Name', marginX + srW + 2, ty + 3.8)
    ty += 5.5

    // Data rows — at least one empty row
    const rows = tests.length > 0 ? tests : ['']
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    rows.forEach((test, i) => {
      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.2)
      pdf.rect(marginX, ty, tw, 6)
      pdf.line(marginX + srW, ty, marginX + srW, ty + 6)
      if (test) {
        pdf.setTextColor(slate.r, slate.g, slate.b)
        pdf.text(`${i + 1}.`,    marginX + 2,       ty + 4.2)
        pdf.text(String(test),   marginX + srW + 2, ty + 4.2)
      }
      ty += 6
    })

    return ty
  }

  let leftY = bodyStartY
  leftY = renderTestBlock('Test/Investigations:', 'Laboratory',  labTests,  leftY)
  leftY += 5
  leftY = renderTestBlock('Diagnostic Tests:',    'Diagnostic',  diagTests, leftY)
  leftY += 6

  // Clinical field boxes (below tests)
  const addFieldBox = (label: string, value: any) => {
    const text = String(value || '').trim()
    if (!text) return

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(slate.r, slate.g, slate.b)
    pdf.text(label, marginX, leftY)
    leftY += 4

    const wrapped = pdf.splitTextToSize(text, leftColW - 4) as string[]
    const boxH = Math.max(8, wrapped.length * 4 + 4)

    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.2)
    pdf.rect(marginX, leftY, leftColW, boxH)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(gray.r, gray.g, gray.b)
    pdf.text(wrapped, marginX + 2, leftY + 4.5)
    leftY += boxH + 3
  }

  addFieldBox('Primary Complaint',             data.primaryComplaint)
  addFieldBox('Risk Factors / Medical History',data.riskFactors || data.medicalHistory || data.history)
  addFieldBox('History of Primary Complaint',  data.historyOfComplaint || data.primaryComplaintHistory)
  addFieldBox('Family History',                data.familyHistory)
  addFieldBox('Allergy History',               data.allergyHistory)
  addFieldBox('Treatment History',             data.treatmentHistory)
  addFieldBox('Examination Findings',          data.examinationFindings || data.examFindings)
  addFieldBox('Diagnosis / Disease',           data.diagnosis)
  addFieldBox('Advice / Referral',             data.advice || data.referral)

  // ── RIGHT: Prescription ───────────────────────────────────────────────────
  let rxY = bodyStartY

  // "Doctor Prescription:" heading with blue accent bar
  pdf.setFillColor(blue.r, blue.g, blue.b)
  pdf.rect(rxX, rxY, 2.5, 10, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.text('Doctor Prescription:', rxX + 6, rxY + 7)
  rxY += 15

  // ── Medicine table ────────────────────────────────────────────────────────
  // Column proportions (ratios that sum to 1):
  //   # | Medicine | Route | Dose | Days | Instructions | Qty
  const colRatios = [0.055, 0.28, 0.10, 0.12, 0.12, 0.225, 0.10]
  const colW      = colRatios.map(r => r * rxW)
  const colLabels = ['#', 'Medicine', 'Route', 'Dose', 'Days', 'Instructions', 'Qty']
  const headerRowH = 7

  // ── Header row ────────────────────────────────────────────────────────────
  // Background
  pdf.setFillColor(tblHead.r, tblHead.g, tblHead.b)
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.3)
  pdf.rect(rxX, rxY, rxW, headerRowH, 'FD')

  // Vertical dividers in header
  let hx = rxX
  colW.forEach((cw, i) => {
    if (i > 0) {
      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.2)
      pdf.line(hx, rxY, hx, rxY + headerRowH)
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(navy.r, navy.g, navy.b)
    // Center-align short cols, left-align Medicine/Instructions
    const isCenter = i === 0 || i === 2 || i === 3 || i === 4 || i === 6
    const tx = isCenter ? hx + cw / 2 : hx + 2
    pdf.text(colLabels[i], tx, rxY + 4.8, { align: isCenter ? 'center' : 'left' })
    hx += cw
  })
  rxY += headerRowH

  // ── Data rows ─────────────────────────────────────────────────────────────
  const meds = (data.items || []).filter(m => String(m?.name || '').trim())

  if (meds.length === 0) {
    // Empty placeholder row
    pdf.setDrawColor(border.r, border.g, border.b)
    pdf.setLineWidth(0.2)
    pdf.rect(rxX, rxY, rxW, 7)
    rxY += 7
  } else {
    meds.forEach((med, idx) => {
      const nameLines = pdf.splitTextToSize(String(med?.name || ''), colW[1] - 3) as string[]
      const instLines = pdf.splitTextToSize(String(med?.instruction || ''), colW[5] - 3) as string[]
      const cellH     = Math.max(6.5, Math.max(nameLines.length, instLines.length) * 4 + 2.5)

      // Alternating row fill
      if (idx % 2 === 0) {
        pdf.setFillColor(rowAlt.r, rowAlt.g, rowAlt.b)
        pdf.rect(rxX, rxY, rxW, cellH, 'F')
      }

      // Row border + column dividers
      pdf.setDrawColor(border.r, border.g, border.b)
      pdf.setLineWidth(0.2)
      pdf.rect(rxX, rxY, rxW, cellH)

      let cx = rxX
      const cellValues = [
        `${idx + 1}.`,
        null,                                   // nameLines handled separately
        String(med?.route       || ''),
        String(med?.dose        || ''),
        String(med?.duration    || ''),
        null,                                   // instLines handled separately
        String(med?.qty ?? '1'),
      ]

      cellValues.forEach((val, i) => {
        if (i > 0) {
          pdf.setDrawColor(border.r, border.g, border.b)
          pdf.line(cx, rxY, cx, rxY + cellH)
        }

        pdf.setFont('helvetica', i === 6 ? 'bold' : 'normal')
        pdf.setFontSize(7.5)
        const isCenter = i === 0 || i === 2 || i === 3 || i === 4 || i === 6
        pdf.setTextColor(i === 6 ? blue.r : slate.r, i === 6 ? blue.g : slate.g, i === 6 ? blue.b : slate.b)

        if (i === 1) {
          pdf.text(nameLines, cx + 2, rxY + 4.5)
        } else if (i === 5) {
          pdf.text(instLines, cx + 2, rxY + 4.5)
        } else {
          const tx = isCenter ? cx + colW[i] / 2 : cx + 2
          pdf.text(String(val ?? ''), tx, rxY + 4.5, { align: isCenter ? 'center' : 'left' })
        }

        cx += colW[i]
      })

      rxY += cellH
    })
  }

  // Outer border around whole table
  pdf.setDrawColor(border.r, border.g, border.b)
  pdf.setLineWidth(0.4)
  const tblTop = bodyStartY + 15
  pdf.rect(rxX, tblTop, rxW, rxY - tblTop)

  // ══════════════════════════════════════════════════════════════════════════
  // 5.  DOCTOR SIGNATURE
  // ══════════════════════════════════════════════════════════════════════════
  const sigY = Math.max(leftY, rxY) + 12
  const sigX = rxX + rxW - 60

  pdf.setDrawColor(slate.r, slate.g, slate.b)
  pdf.setLineWidth(0.25)
  pdf.line(sigX, sigY, sigX + 56, sigY)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.text(`Dr. ${String(doctor.name || '')}`, sigX, sigY + 5)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(gray.r, gray.g, gray.b)
  pdf.text('Doctor Signature', sigX, sigY + 9.5)

  // ══════════════════════════════════════════════════════════════════════════
  // 6.  FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  const nvY = H - 22
  pdf.setFillColor(softRed.r, softRed.g, softRed.b)
  pdf.setDrawColor(254, 202, 202)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(marginX, nvY, W - 2 * marginX, 7.5, 1.5, 1.5, 'FD')
  pdf.setTextColor(red.r, red.g, red.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.text('\u26A0 NOT VALID FOR COURT \u26A0', W / 2, nvY + 5.3, { align: 'center' })

  const cbY = H - 12
  pdf.setFillColor(softBlue.r, softBlue.g, softBlue.b)
  pdf.setDrawColor(186, 230, 253)
  pdf.roundedRect(marginX, cbY, W - 2 * marginX, 10, 2.5, 2.5, 'FD')
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.text(`Phone: ${String(settings.phone || '-')}`,     W / 2, cbY + 4,   { align: 'center' })
  pdf.text(`Address: ${String(settings.address || '-')}`, W / 2, cbY + 8.5, { align: 'center' })

  // ══════════════════════════════════════════════════════════════════════════
  // 7.  OUTPUT
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      await api.printPreviewPdf(pdf.output('datauristring') as string)
      return
    }
  } catch {}

  const blob = pdf.output('blob') as Blob
  window.open(URL.createObjectURL(blob), '_blank')
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: any): string {
  const s = String(v ?? '').trim()
  return s || '-'
}

function fmtBp(v: any): string {
  if (v?.bloodPressureSys != null && v?.bloodPressureDia != null)
    return `${v.bloodPressureSys}/${v.bloodPressureDia}`
  return '-'
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width  = img.naturalWidth  || 200
          c.height = img.naturalHeight || 200
          c.getContext('2d')?.drawImage(img, 0, 0)
          resolve(c.toDataURL('image/png') || src)
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return src }
}