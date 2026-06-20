import jsPDF from 'jspdf'

export type IpdReferralPdfData = {
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  referral?: {
    date?: string
    time?: string
    reason?: string
    provisionalDiagnosis?: string
    vitals?: { bp?: string; pulse?: string; temperature?: string; rr?: string }
    referredTo?: { department?: string; doctor?: string }
    condition?: { stability?: string; consciousness?: string }
    remarks?: string
    signStamp?: string
    referredBy?: string
  }
  prescriptionSnapshot?: any
}

async function rasterizeLogo(logo?: string): Promise<string | undefined> {
  if (!logo) return undefined
  try {
    let src = logo
    if (!src.startsWith('data:')) {
      try {
        const u = src.startsWith('http') ? src : `${location.origin}${src.startsWith('/') ? '' : '/'}${src}`
        const resp = await fetch(u)
        const blob = await resp.blob()
        src = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result||'')); fr.readAsDataURL(blob) })
      } catch {}
    }
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const S = 96
          canvas.width = S; canvas.height = S
          const ctx = canvas.getContext('2d')
          if (ctx) { ctx.clearRect(0,0,S,S); ctx.drawImage(img, 0, 0, S, S) }
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return undefined }
}

export async function buildIpdReferralPdf(data: IpdReferralPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 14

  // Header (logo left, hospital info centered)
  const logo = await rasterizeLogo(data.settings?.logoDataUrl)
  if (logo) { try { pdf.addImage(logo, 'JPEG', 14, 8, 18, 18) } catch {} }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15)
  pdf.text(String(data.settings?.name || 'Hospital'), pageWidth/2, 14, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  if (data.settings?.address) pdf.text(String(data.settings.address), pageWidth/2, 19, { align: 'center' })
  if (data.settings?.phone) pdf.text(`Mobile #: ${data.settings.phone}`, pageWidth/2, 24, { align: 'center' })
  y = 30
  pdf.setLineWidth(0.2)
  pdf.setDrawColor(60); pdf.line(14, y, pageWidth-14, y); y += 6

  // Title
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
  pdf.text('Refer to IPD', 14, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
  if (data.referral?.referredBy) pdf.text(`Referred by: ${data.referral.referredBy}`, pageWidth-14, y, { align: 'right' })
  y += 6

  // Patient block - 3 column layout with increased spacing
  pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Patient Information', 14, y)
  pdf.setDrawColor(100)
  pdf.setLineWidth(0.5)
  pdf.line(14, y + 2, pageWidth - 14, y + 2)
  y += 10
  
  const col1 = 18
  const col2 = pageWidth / 3 + 5
  const col3 = (pageWidth * 2) / 3 + 5
  const labelW = 22
  
  // Helper to draw label-value pair
  const drawField3 = (label: string, value: string, x: number, lw: number = labelW) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
    pdf.text(label, x, y)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    const displayValue = value?.trim() || '-'
    pdf.text(displayValue, x + lw, y)
  }
  
  // Row 1: Name, MRN, Age
  drawField3('Name:', data.patient?.name || '-', col1, 20)
  drawField3('MRN:', data.patient?.mrn || '-', col2, 18)
  drawField3('Age:', data.patient?.age || '-', col3, 15)
  y += 7
  
  // Row 2: Gender, CNIC, Phone
  drawField3('Gender:', data.patient?.gender || '-', col1, 20)
  drawField3('CNIC:', data.patient?.cnic || '', col2, 18)
  drawField3('Phone:', data.patient?.phone || '', col3, 18)
  y += 7
  
  // Row 3: Father/Husband (full width)
  drawField3('Father/Husband:', data.patient?.fatherName || '-', col1, 28)
  y += 7
  
  // Row 4: Address (full width)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
  pdf.text('Address:', col1, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  const addressText = data.patient?.address?.trim() || '-'
  const addrWidth = pageWidth - 65
  const addrLines = pdf.splitTextToSize(addressText, addrWidth)
  pdf.text(addrLines, col1 + 22, y)
  y += Math.max(7, addrLines.length * 4.5)
  
  y += 8 // Increased gap after patient section

  // Referral details - 3 column layout
  pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Referral Details', 14, y)
  pdf.setDrawColor(100)
  pdf.line(14, y + 2, pageWidth - 14, y + 2)
  y += 10
  
  // Row 1: Date, Time, Reason of Referral
  drawField3('Date:', data.referral?.date || '-', col1, 18)
  drawField3('Time:', data.referral?.time || '-', col2, 16)
  y += 7
  
  // Row 2: Reason of Referral (full width)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
  pdf.text('Reason:', col1, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  const reasonText = data.referral?.reason?.trim() || '-'
  const reasonLines = pdf.splitTextToSize(reasonText, pageWidth - 55)
  pdf.text(reasonLines, col1 + 22, y)
  y += Math.max(7, reasonLines.length * 4.5)
  
  // Row 3: Provisional Diagnosis (full width)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
  pdf.text('Provisional Diagnosis:', col1, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  const diagText = data.referral?.provisionalDiagnosis?.trim() || '-'
  const diagLines = pdf.splitTextToSize(diagText, pageWidth - 78)
  pdf.text(diagLines, col1 + 38, y)
  y += Math.max(7, diagLines.length * 4.5) + 8

  // Vitals, Referred To, Condition - 3 columns with increased spacing
  const colW = (pageWidth - 28 - 12) / 3
  const leftX = 14, midX = 14 + colW + 6, rightX = 14 + (colW + 6) * 2

  // Vitals
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
  pdf.setFillColor(240, 245, 250); pdf.rect(leftX, y-4, colW, 7, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Vitals', leftX + 3, y)
  pdf.setDrawColor(150); pdf.setLineWidth(0.4); pdf.rect(leftX, y+3, colW, 28)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
  const v = data.referral?.vitals || {}
  pdf.text(`BP: ${v.bp || '-'}`, leftX + 5, y + 11)
  pdf.text(`Pulse: ${v.pulse || '-'}`, leftX + colW/2 + 5, y + 11)
  pdf.text(`Temp: ${v.temperature || '-'}`, leftX + 5, y + 20)
  pdf.text(`RR: ${v.rr || '-'}`, leftX + colW/2 + 5, y + 20)

  // Referred To
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
  pdf.setFillColor(240, 245, 250); pdf.rect(midX, y-4, colW, 7, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Referred To', midX + 3, y)
  pdf.setDrawColor(150); pdf.rect(midX, y+3, colW, 28)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
  pdf.text(`Dept: ${data.referral?.referredTo?.department || '-'}`, midX + 5, y + 11)
  pdf.text(`Dr: ${data.referral?.referredTo?.doctor || '-'}`, midX + 5, y + 20)

  // Condition
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
  pdf.setFillColor(240, 245, 250); pdf.rect(rightX, y-4, colW, 7, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Condition', rightX + 3, y)
  pdf.setDrawColor(150); pdf.rect(rightX, y+3, colW, 28)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
  pdf.text(`Stability: ${data.referral?.condition?.stability || '-'}`, rightX + 5, y + 11)
  pdf.text(`Consciousness: ${data.referral?.condition?.consciousness || '-'}`, rightX + 5, y + 20)
  
  y += 38

  // Remarks - full width
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
  pdf.setFillColor(240, 245, 250); pdf.rect(leftX, y-4, pageWidth - 28, 7, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Remarks', leftX + 3, y)
  pdf.setDrawColor(150); pdf.rect(leftX, y+3, pageWidth - 28, 22)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
  const rem = pdf.splitTextToSize(String(data.referral?.remarks || '-'), pageWidth - 36)
  pdf.text(rem, leftX + 5, y + 11)
  y += 32

  // Sign & Stamp - full width
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
  pdf.setFillColor(240, 245, 250); pdf.rect(leftX, y-4, pageWidth-28, 7, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Doctor Sign & Stamp', leftX + 3, y)
  pdf.setDrawColor(150); pdf.rect(leftX, y+3, pageWidth-28, 26)
  pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
  const signTxt = String(data.referral?.signStamp || '')
  if (signTxt) pdf.text(pdf.splitTextToSize(signTxt, pageWidth-36), leftX + 5, y + 12)

  return pdf
}

export async function previewIpdReferralPdf(data: IpdReferralPdfData){
  const pdf = await buildIpdReferralPdf(data)
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
  title.textContent = 'IPD Referral Preview'
  title.style.fontWeight = '600'
  title.style.color = '#0f172a'
  header.appendChild(title)
  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '8px'
  const btnPrint = document.createElement('button')
  btnPrint.textContent = 'Print'
  btnPrint.style.padding = '6px 10px'
  btnPrint.style.borderRadius = '6px'
  btnPrint.style.background = '#1f2937'
  btnPrint.style.color = '#fff'
  btnPrint.style.border = '1px solid #1f2937'
  const btnClose = document.createElement('button')
  btnClose.textContent = 'Close'
  btnClose.style.padding = '6px 10px'
  btnClose.style.borderRadius = '6px'
  btnClose.style.border = '1px solid #cbd5e1'
  btnClose.style.background = '#fff'
  btnClose.style.color = '#0f172a'
  actions.appendChild(btnPrint)
  actions.appendChild(btnClose)
  header.appendChild(actions)

  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.flex = '1'
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = '0'

  function cleanup(){
    try { URL.revokeObjectURL(url) } catch {}
    try { document.removeEventListener('keydown', onKey) } catch {}
    try { overlay.remove() } catch {}
  }
  function onKey(e: KeyboardEvent){
    if (e.key === 'Escape') { e.preventDefault(); cleanup() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); cleanup() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }
  }
  btnClose.onclick = () => cleanup()
  btnPrint.onclick = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }
  document.addEventListener('keydown', onKey)

  panel.appendChild(header)
  panel.appendChild(frame)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}
