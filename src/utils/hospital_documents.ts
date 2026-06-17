import jsPDF from 'jspdf'

export type DocumentInstance = {
  id: string
  patientId: string
  encounterId?: string
  type: string // e.g., "Invoice", "ShortStay", "DeathCertificate", "ReceivedDeath", "BloodDonationConsent", "TestTubeConsent", "GatePass"
  version: number
  status: 'draft' | 'final'
  createdAt: string
  updatedAt: string
  verificationCode: string
  meta?: Record<string, any>
}

// --- Gate Pass Related Types & Helpers ---
export type GatePassPdfData = {
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { 
    name?: string; 
    mrn?: string; 
    age?: string; 
    gender?: string; 
    phone?: string; 
    fatherName?: string;
    department?: string;
    bed?: string;
    admitDate?: string;
    dischargeDate?: string;
    dischargeTime?: string;
  }
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

function formatDate(d?: string) {
  if (!d) return '-'
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return d }
}

function formatTime(d?: string) {
  if (!d) return ''
  // Handle HH:mm or HH:mm:ss strings
  if (d.includes(':') && !d.includes('-') && !d.includes('T')) {
    try {
      const [h, m, s] = d.split(':')
      const date = new Date()
      date.setHours(Number(h), Number(m), Number(s || 0))
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    } catch { return d }
  }
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  } catch { return d }
}

export async function previewGatePassPdf(data: GatePassPdfData) {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  
  const logo = await rasterizeLogo(data.settings?.logoDataUrl)
  
  const drawCopy = (startY: number, title: string, copyLabel: string) => {
    let y = startY
    
    // Header
    if (logo) { try { pdf.addImage(logo, 'JPEG', 14, y - 6, 15, 15) } catch {} }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
    pdf.text(title, pageWidth / 2, y, { align: 'center' })
    
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
    const today = new Date().toLocaleDateString('en-GB')
    pdf.text(`Dated: ${today}`, pageWidth - 14, y, { align: 'right' })
    y += 8

    // Box
    pdf.setDrawColor(0)
    pdf.setLineWidth(0.2)
    const boxHeight = 62
    pdf.rect(14, y, pageWidth - 28, boxHeight)
    
    const contentYStart = y + 6
    let cy = contentYStart
    const col1 = 18
    const col2 = 80
    
    pdf.setFontSize(10)
    
    // Row 1
    pdf.setFont('helvetica', 'bold'); pdf.text('Computer No:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.mrn || '-', col1 + 25, cy);
    pdf.setFont('helvetica', 'bold'); pdf.text('Dated:', col2 + 10, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(today, col2 + 25, cy);
    
    // Row 2
    cy += 8
    pdf.setFont('helvetica', 'bold'); pdf.text('Patient Name:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.name || '-', col1 + 25, cy);
    
    // Row 3
    cy += 8
    pdf.setFont('helvetica', 'bold'); pdf.text('Age:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.age || '-', col1 + 10, cy);
    
    pdf.setFont('helvetica', 'bold'); pdf.text('Sex:', col2 + 10, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.gender || '-', col2 + 20, cy);
    
    // Row 4
    cy += 8
    pdf.setFont('helvetica', 'bold'); pdf.text('Department:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.department || '-', col1 + 25, cy);
    
    pdf.setFont('helvetica', 'bold'); pdf.text('Bed:', col2 + 10, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(data.patient?.bed || '-', col2 + 20, cy);
    
    // Row 5
    cy += 8
    pdf.setFont('helvetica', 'bold'); pdf.text('Date of Adm:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); pdf.text(`${formatDate(data.patient?.admitDate)} ${formatTime(data.patient?.admitDate)}`, col1 + 25, cy);
    
    // Row 6
    cy += 8
    pdf.setFont('helvetica', 'bold'); pdf.text('Date of Disch:', col1, cy); 
    pdf.setFont('helvetica', 'normal'); 
    const dischDate = data.patient?.dischargeDate ? formatDate(data.patient.dischargeDate) : formatDate(new Date().toISOString())
    const dischTime = data.patient?.dischargeTime || formatTime(new Date().toISOString())
    pdf.text(`${dischDate} ${dischTime}`, col1 + 25, cy);

    // Copy label at bottom left
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text(copyLabel, 14, y + boxHeight + 8)
    
    return y + boxHeight + 20
  }

  let nextY = 15
  nextY = drawCopy(nextY, 'Gate Pass', 'Staff Copy')
  nextY += 10
  nextY = drawCopy(nextY, 'Gate Pass', 'File Copy')
  nextY += 10
  nextY = drawCopy(nextY, 'Gate Pass', 'Security Guard Copy')

  const blob = pdf.output('blob')
  const url = URL.createObjectURL(blob)
  
  // Use Electron's native print preview if available
  const api: any = (window as any).electronAPI
  if (api && typeof api.printPreviewPdf === 'function') {
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        api.printPreviewPdf(String(reader.result), {})
        URL.revokeObjectURL(url)
      }
      reader.readAsDataURL(blob)
      return
    } catch (e) {
      console.error('Electron print preview failed, falling back to overlay', e)
    }
  }

  // Fallback: Custom overlay preview
  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '9999'
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)'
  overlay.style.backdropFilter = 'blur(4px)'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.padding = '20px'

  const panel = document.createElement('div')
  panel.style.width = '100%'
  panel.style.maxWidth = '900px'
  panel.style.height = '90%'
  panel.style.backgroundColor = '#fff'
  panel.style.borderRadius = '12px'
  panel.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)'
  panel.style.display = 'flex'
  panel.style.flexDirection = 'column'
  panel.style.overflow = 'hidden'

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '12px 20px'
  header.style.borderBottom = '1px solid #e2e8f0'
  header.style.backgroundColor = '#f8fafc'

  const titleText = document.createElement('div')
  titleText.textContent = 'Gate Pass Preview'
  titleText.style.fontWeight = '700'
  titleText.style.fontSize = '16px'
  titleText.style.color = '#1e293b'
  header.appendChild(titleText)

  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '10px'

  const btnPrint = document.createElement('button')
  btnPrint.textContent = 'Print Now'
  btnPrint.style.padding = '8px 16px'
  btnPrint.style.borderRadius = '8px'
  btnPrint.style.backgroundColor = '#0284c7'
  btnPrint.style.color = '#fff'
  btnPrint.style.border = 'none'
  btnPrint.style.fontSize = '14px'
  btnPrint.style.fontWeight = '600'
  btnPrint.style.cursor = 'pointer'
  btnPrint.onclick = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }

  const btnClose = document.createElement('button')
  btnClose.textContent = 'Close'
  btnClose.style.padding = '8px 16px'
  btnClose.style.borderRadius = '8px'
  btnClose.style.backgroundColor = '#fff'
  btnClose.style.color = '#475569'
  btnClose.style.border = '1px solid #cbd5e1'
  btnClose.style.fontSize = '14px'
  btnClose.style.fontWeight = '600'
  btnClose.style.cursor = 'pointer'
  btnClose.onclick = () => {
    try { URL.revokeObjectURL(url) } catch {}
    overlay.remove()
  }

  actions.appendChild(btnClose)
  actions.appendChild(btnPrint)
  header.appendChild(actions)

  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.flex = '1'
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = 'none'

  panel.appendChild(header)
  panel.appendChild(frame)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}

// --- Document Instance Methods ---
const KEY = 'hospital.documents'

export function listDocuments(): DocumentInstance[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as DocumentInstance[] } catch { return [] }
}

export function saveDocuments(docs: DocumentInstance[]) {
  localStorage.setItem(KEY, JSON.stringify(docs))
}

export function addDocument(doc: Omit<DocumentInstance,'id'|'version'|'createdAt'|'updatedAt'|'verificationCode'|'status'> & { status?: DocumentInstance['status'], version?: number }): DocumentInstance {
  const all = listDocuments()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const verificationCode = genCode()
  const full: DocumentInstance = {
    id,
    verificationCode,
    createdAt: now,
    updatedAt: now,
    version: doc.version ?? 1,
    status: doc.status ?? 'final',
    meta: {},
    ...doc,
  }
  all.unshift(full)
  saveDocuments(all)
  return full
}

function genCode() {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase()
  const t = Date.now().toString().slice(-4)
  return `${s}-${t}`
}
