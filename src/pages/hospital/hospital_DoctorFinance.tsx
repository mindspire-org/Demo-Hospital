import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import Hospital_DoctorFinanceEntryDialog from '../../components/hospital/Hospital_DoctorFinanceEntryDialog'
import { financeApi, hospitalApi } from '../../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

let doctorFinanceSettingsCache: any | null = null

function getHospitalSessionUser(){
  if (typeof window === 'undefined') return 'hospital'
  try {
    const raw = window.localStorage.getItem('hospital.session')
    if (!raw) return 'hospital'
    const data = JSON.parse(raw)
    return data?.username || data?.name || 'hospital'
  } catch {
    return 'hospital'
  }
}

type EntryType = 'OPD' | 'IPD' | 'Procedure' | 'Payout' | 'Adjustment'

type Doctor = {
  id: string
  name: string
  fee?: number
}

type Entry = {
  id: string
  datetime: string
  doctorId?: string
  doctorName: string
  type: EntryType
  departmentName?: string
  visitCategory?: string
  patient?: string
  mrNumber?: string
  tokenId?: string
  tokenNo?: string
  description?: string
  gross?: number
  discount?: number
  sharePercent?: number
  doctorAmount?: number
  method?: 'cash' | 'bank' | 'card' | 'transfer'
  ref?: string
}

function toCsv(rows: Entry[]) {
  const headers = ['id','datetime','doctorName','departmentName','visitCategory','patient','mrNumber','tokenNo','gross','discount','net','sharePercent','doctorAmount','description']
  const body = rows.map(r => {
    const gross = Number(r.gross||0)
    const discount = Number(r.discount||0)
    const net = Math.max(0, gross - discount)
    return [
      r.id,
      r.datetime,
      r.doctorName,
      r.departmentName || '',
      r.visitCategory || '',
      r.patient||'',
      r.mrNumber||'',
      r.tokenNo||'',
      gross,
      discount,
      net,
      r.sharePercent || 0,
      r.doctorAmount || 0,
      r.description||''
    ]
  })
  return [headers, ...body].map(arr => arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Hospital_DoctorFinance() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [to, setTo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [doctorId, setDoctorId] = useState<string>('All')
  const [departmentId, setDepartmentId] = useState<string>('All')
  const [addOpen, setAddOpen] = useState(false)
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(50)
  const [tick, setTick] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [payslipOpen, setPayslipOpen] = useState(false)
  const [orgSettings, setOrgSettings] = useState({ name: 'Hospital Name', address: '', phone: '' })
  

  useEffect(() => {
    // Always fetch doctors from DB on first mount and when dialog opens
    if (!doctors.length || addOpen) { loadDoctors() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen])

  useEffect(() => {
    if (!payslipOpen) return
    let cancelled = false
    async function loadSettings(){
      try {
        if (!doctorFinanceSettingsCache) doctorFinanceSettingsCache = await hospitalApi.getSettings()
        if (!cancelled && doctorFinanceSettingsCache) {
          const s: any = doctorFinanceSettingsCache
          setOrgSettings({
            name: s.name || 'Hospital Name',
            address: s.address || '',
            phone: s.phone || '',
          })
        }
      } catch {}
    }
    loadSettings()
    return () => { cancelled = true }
  }, [payslipOpen])

  useEffect(() => {
    hospitalApi.listDepartments({ limit: 1000 }).then((res: any) => {
      const items: any[] = res?.departments || res || []
      setDepartments(items.map((d: any) => ({ id: String(d._id || d.id), name: String(d.name || '') })))
    }).catch(() => {})
  }, [])

  async function loadDoctors(){
    try {
      const res: any = await hospitalApi.listDoctors({ limit: 1000 })
      const items: any[] = (res?.doctors || res || []) as any[]
      const mapped: Doctor[] = items.map((d:any)=> ({ id: String(d._id||d.id), name: String(d.name||''), fee: Number(d.opdBaseFee||0) }))
      setDoctors(mapped)
    } catch {}
  }

  useEffect(() => { syncBackendEarnings() }, [tick])
  useEffect(() => { 
    if (doctors.length > 0) {
      syncBackendEarnings() 
    }
  }, [from, to, doctorId, doctors])

  async function syncBackendEarnings(){
    try {
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const useFrom = (from && from.length===10) ? from : today
      const useTo = (to && to.length===10) ? to : useFrom
      const params: any = { from: useFrom, to: useTo }
      if (doctorId && doctorId !== 'All') params.doctorId = doctorId
      const res: any = await financeApi.doctorEarnings(params)
      const items: any[] = res?.earnings || []
      if (!Array.isArray(items)) return
      const mapDoc = (id?: string)=> doctors.find(d=>d.id===id)?.name || 'Doctor'
      const newOnes: Entry[] = items.map((r:any)=> {
        const amount = Number(r.amount || 0)
        const grossFromApi = Number(r.gross)
        const useApiGross = Number.isFinite(grossFromApi) && grossFromApi > 0
        const gross = useApiGross ? grossFromApi : (amount !== 0 ? Math.abs(amount) : undefined)
        const discountFromApi = Number(r.discount)
        const discount = (Number.isFinite(discountFromApi) && discountFromApi > 0) ? discountFromApi : (gross != null ? 0 : undefined)
        const patientName = (r.patientName == null) ? undefined : String(r.patientName)
        const mrn = (r.mrn == null) ? undefined : String(r.mrn)
        // Use createdAt timestamp if available (for manual entries), otherwise use dateIso
        const datetime = r.createdAt ? String(r.createdAt) : `${r.dateIso}T00:00:00`
        return ({
        id: `be:${r.id}`,
        datetime,
        doctorId: r.doctorId,
        doctorName: String(r.doctorName || '') || mapDoc(r.doctorId),
        type: (r.type || 'OPD') as EntryType,
        departmentName: r.departmentName,
        visitCategory: r.visitCategory,
        tokenId: r.tokenId,
        tokenNo: r.tokenNo,
        patient: patientName,
        mrNumber: mrn,
        description: r.memo,
        gross,
        discount,
        sharePercent: r.sharePercent,
        doctorAmount: r.amount,
        ref: undefined,
      })
      })
      setEntries(newOnes)
    } catch (err) {
    }
  }

  const filtered = useMemo(() => {
    const toLocalYmd = (isoLike: string) => {
      const dt = new Date(isoLike)
      if (Number.isNaN(dt.getTime())) return ''
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }
    const result = entries
      .filter(e => {
        if (doctorId !== 'All' && e.doctorId !== doctorId) return false
        if (departmentId !== 'All' && e.departmentName !== departments.find(d => d.id === departmentId)?.name) return false
        
        // Compare by local date to avoid UTC shifting issues
        const entryDate = toLocalYmd(e.datetime)
        
        if (from && entryDate < from) return false
        if (to && entryDate > to) return false
        return true
      })
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    return result
  }, [entries, from, to, doctorId, departmentId, departments])

  const effectiveRowsPerPage = rowsPerPage === 'All' ? filtered.length : rowsPerPage
  const visibleRows = useMemo(
    () => filtered.slice(0, effectiveRowsPerPage),
    [filtered, effectiveRowsPerPage]
  )

  const summary = useMemo(() => {
    let gross = 0, discount = 0, net = 0, doctorShare = 0
    for (const e of filtered) {
      const g = Number(e.gross||0)
      const d = Number(e.discount||0)
      const ds = Number(e.doctorAmount||0)
      gross += g
      discount += d
      net += Math.max(0, g - d)
      doctorShare += ds
    }
    return { gross, discount, net, doctorShare }
  }, [filtered])

  const doctorTotals = useMemo(() => {
    const map = new Map<string, { gross: number; discount: number; net: number; share: number; name: string }>()
    for (const entry of filtered) {
      const id = entry.doctorId || 'unknown'
      if (!map.has(id)) {
        map.set(id, { gross: 0, discount: 0, net: 0, share: 0, name: entry.doctorName || 'Doctor' })
      }
      const item = map.get(id)!
      const g = Number(entry.gross || 0)
      const d = Number(entry.discount || 0)
      const net = Math.max(0, g - d)
      const share = Number(entry.doctorAmount || 0)
      item.gross += g
      item.discount += d
      item.net += net
      item.share += share
    }
    return map
  }, [filtered])

  const activePayslip = useMemo(() => {
    if (doctorId === 'All') return null
    const item = doctorTotals.get(doctorId || '')
    if (!item) return null
    return {
      doctorName: item.name,
      gross: item.gross,
      discount: item.discount,
      net: item.net,
      share: item.share,
    }
  }, [doctorId, doctorTotals])

  const formatCurrency = (value: number) => `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doctor_finance_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSummaryPdf = () => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const title = 'Doctor Token Summary Report'
    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    const deptName = departmentId==='All' ? 'All Departments' : (departments.find(d=>d.id===departmentId)?.name || '')
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(14)
    pdf.text(title, pageWidth/2, 14, { align: 'center' })
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(10)
    pdf.text(`Date: ${dateRange}`, pageWidth/2, 20, { align: 'center' })
    pdf.text(`Department: ${deptName}`, pageWidth/2, 25, { align: 'center' })
    pdf.setFontSize(10)

    // Build summary data — only doctors that have tokens
    const summaryMap = new Map<string, { name: string; departments: Set<string>; general: number; private: number; subsidized: number }>()

    // Count tokens from entries
    for (const e of entries) {
      const docId = e.doctorId
      if (!docId) continue
      const existing = summaryMap.get(docId)
      if (existing) {
        if (e.departmentName) existing.departments.add(e.departmentName)
        const cat = String(e.visitCategory || '').toLowerCase()
        if (cat === 'private') existing.private++
        else if (cat === 'subsidized') existing.subsidized++
        else existing.general++
      } else {
        const depts = new Set<string>()
        if (e.departmentName) depts.add(e.departmentName)
        const cat = String(e.visitCategory || '').toLowerCase()
        summaryMap.set(docId, {
          name: e.doctorName,
          departments: depts,
          general: cat === 'private' ? 0 : (cat === 'subsidized' ? 0 : 1),
          private: cat === 'private' ? 1 : 0,
          subsidized: cat === 'subsidized' ? 1 : 0,
        })
      }
    }

    const headers = ['Doctor Name', 'Department', 'General', 'Private', 'Subsidized', 'Total']
    const body = Array.from(summaryMap.values()).map(s => [
      s.name,
      Array.from(s.departments).join(', ') || '-',
      String(s.general),
      String(s.private),
      String(s.subsidized),
      String(s.general + s.private + s.subsidized)
    ])

    // Add totals row
    const totalGeneral = body.reduce((sum, r) => sum + Number(r[2]), 0)
    const totalPrivate = body.reduce((sum, r) => sum + Number(r[3]), 0)
    const totalSubsidized = body.reduce((sum, r) => sum + Number(r[4]), 0)
    const totalAll = body.reduce((sum, r) => sum + Number(r[5]), 0)
    body.push(['TOTAL', '', String(totalGeneral), String(totalPrivate), String(totalSubsidized), String(totalAll)])

    autoTable(pdf, {
      head: [headers],
      body,
      startY: 30,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [248,249,251], textColor: 0, halign: 'left', fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 240, 240]
        }
      }
    })
    pdf.save(`finance_report_summary_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const downloadPdf = () => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const title = 'Doctors Finance Report'
    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    const docName = doctorId==='All' ? 'All' : (doctors.find(d=>d.id===doctorId)?.name || '')
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(14)
    pdf.text(title, pageWidth/2, 14, { align: 'center' })
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(10)
    pdf.text(`Date: ${dateRange}`, pageWidth/2, 20, { align: 'center' })
    pdf.text(`Doctor: ${docName}`, pageWidth/2, 25, { align: 'center' })
    pdf.setFontSize(10)
    const sumLine = `Gross: Rs ${summary.gross.toFixed(2)}   Discount: Rs ${summary.discount.toFixed(2)}   Net: Rs ${summary.net.toFixed(2)}`
    pdf.text(sumLine, pageWidth/2, 31, { align: 'center' })
    const headers = ['Date','Department','Patient','MR #','Token #','Type','Gross','Disc','Net','%','Amt']
    const body = filtered.map(e => {
      const p = Math.max(0, (e.gross||0) - (e.discount||0))
      return [
        new Date(e.datetime).toLocaleDateString(),
        e.departmentName || '-',
        e.patient || '-',
        e.mrNumber || '-',
        e.tokenNo || '-',
        e.visitCategory ? (e.visitCategory.charAt(0).toUpperCase() + e.visitCategory.slice(1)) : '-',
        (e.gross||0).toLocaleString(),
        (e.discount||0).toLocaleString(),
        p.toLocaleString(),
        (e.sharePercent || 0).toFixed(0) + '%',
        (e.doctorAmount || 0).toLocaleString()
      ]
    })
    autoTable(pdf, {
      head: [headers],
      body,
      startY: 36,
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.2 },
      headStyles: { fillColor: [248,249,251], textColor: 0, halign: 'left' },
      columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' } }
    })
    pdf.save(`finance_report_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const printFinanceReport = () => {
    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    const docName = doctorId==='All' ? 'All' : (doctors.find(d=>d.id===doctorId)?.name || '')
    const rows = filtered.map(e => {
      const p = Math.max(0, (e.gross||0) - (e.discount||0))
      return `<tr>
        <td>${new Date(e.datetime).toLocaleDateString()}</td>
        <td>${e.departmentName || '-'}</td>
        <td>${e.patient || '-'}</td>
        <td>${e.mrNumber || '-'}</td>
        <td>${e.tokenNo || '-'}</td>
        <td>${e.visitCategory ? (e.visitCategory.charAt(0).toUpperCase() + e.visitCategory.slice(1)) : '-'}</td>
        <td class="r">${(e.gross||0).toLocaleString()}</td>
        <td class="r">${(e.discount||0).toLocaleString()}</td>
        <td class="r">${p.toLocaleString()}</td>
        <td class="r">${(e.sharePercent || 0).toFixed(0)}%</td>
        <td class="r">${(e.doctorAmount || 0).toLocaleString()}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><title>Finance Report</title>
      <style>
        @page{size:A4;margin:10mm}
        body{font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#000;margin:0;padding:10px}
        h2{text-align:center;font-size:14px;margin:0 0 4px}
        .sub{text-align:center;font-size:10px;margin:2px 0}
        .sum{text-align:center;font-size:10px;margin:6px 0 10px;font-weight:bold}
        table{border-collapse:collapse;width:100%;font-size:8px}
        th,td{border:1px solid #ccc;padding:3px 4px}
        th{background:#f8f9fb;font-weight:bold;text-align:left}
        .r{text-align:right}
      </style></head><body>
      <h2>Doctors Finance Report</h2>
      <div class="sub">Date: ${dateRange} &nbsp;|&nbsp; Doctor: ${docName}</div>
      <div class="sum">Gross: Rs ${summary.gross.toFixed(2)} &nbsp; Discount: Rs ${summary.discount.toFixed(2)} &nbsp; Net: Rs ${summary.net.toFixed(2)}</div>
      <table><thead><tr><th>Date</th><th>Department</th><th>Patient</th><th>MR #</th><th>Token #</th><th>Type</th><th>Gross</th><th>Disc</th><th>Net</th><th>%</th><th>Amt</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </body></html>`
    if ((window as any).electronAPI?.printHTML) {
      ;(window as any).electronAPI.printHTML(html)
    } else {
      const win = window.open('','_blank')
      if(win){win.document.write(html + '<script>window.onload=function(){window.print()}</script>');win.document.close()}
    }
  }

  const openPayslipModal = () => {
    if (doctorId === 'All' || !activePayslip) return
    setPayslipOpen(true)
  }

  const closePayslipModal = () => setPayslipOpen(false)

  const downloadPayslipPdf = () => {
    if (!activePayslip || doctorId === 'All') return
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.text(orgSettings.name || 'Hospital', pageWidth / 2, 18, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    if (orgSettings.address) pdf.text(orgSettings.address, pageWidth / 2, 24, { align: 'center' })
    if (orgSettings.phone) pdf.text(`Phone: ${orgSettings.phone}`, pageWidth / 2, 29, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text('Doctor Earnings Slip', pageWidth / 2, 38, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Doctor: ${activePayslip.doctorName}`, 20, 48)
    pdf.text(`Period: ${from} → ${to}`, 20, 54)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 60)
    pdf.text(`Prepared by: ${getHospitalSessionUser()}`, 20, 66)

    const rows = filtered
      .filter(e => e.doctorId === doctorId)
      .map(e => [
        new Date(e.datetime).toLocaleDateString(),
        e.departmentName || '-',
        e.visitCategory ? e.visitCategory.charAt(0).toUpperCase() + e.visitCategory.slice(1) : '-',
        (e.gross || 0).toLocaleString(),
        (e.discount || 0).toLocaleString(),
        Math.max(0, (e.gross || 0) - (e.discount || 0)).toLocaleString(),
        (e.sharePercent || 0).toFixed(0) + '%',
        (e.doctorAmount || 0).toLocaleString(),
      ])

    autoTable(pdf, {
      head: [['Date', 'Department', 'Type', 'Gross', 'Discount', 'Net', 'Share %', 'Amount']],
      body: rows,
      startY: 74,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [245, 246, 248], textColor: 0, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
      margin: { bottom: 35 },
      didDrawPage: () => {
        pdf.setFont('helvetica', 'bold')
        pdf.text(`Total Gross: ${formatCurrency(activePayslip.gross)}`, 20, pdf.internal.pageSize.getHeight() - 28)
        pdf.text(`Total Discount: ${formatCurrency(activePayslip.discount)}`, 20, pdf.internal.pageSize.getHeight() - 22)
        pdf.text(`Net Revenue: ${formatCurrency(activePayslip.net)}`, 20, pdf.internal.pageSize.getHeight() - 16)
        pdf.text(`Doctor Share: ${formatCurrency(activePayslip.share)}`, 20, pdf.internal.pageSize.getHeight() - 10)
      }
    })

    pdf.save(`doctor_payslip_${doctorId}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const printPayslip = () => {
    if (!activePayslip || doctorId === 'All') return
    const rows = filtered
      .filter(e => e.doctorId === doctorId)
      .map(e => `<tr>
        <td>${new Date(e.datetime).toLocaleDateString()}</td>
        <td>${e.departmentName || '-'}</td>
        <td>${e.visitCategory ? (e.visitCategory.charAt(0).toUpperCase() + e.visitCategory.slice(1)) : '-'}</td>
        <td class="r">${(e.gross || 0).toLocaleString()}</td>
        <td class="r">${(e.discount || 0).toLocaleString()}</td>
        <td class="r">${Math.max(0, (e.gross || 0) - (e.discount || 0)).toLocaleString()}</td>
        <td class="r">${(e.sharePercent || 0).toFixed(0)}%</td>
        <td class="r">${(e.doctorAmount || 0).toLocaleString()}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><title>Doctor Payslip</title>
      <style>
        @page{size:A4;margin:12mm}
        body{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#000;margin:0;padding:16px}
        h2{text-align:center;font-size:18px;margin:0 0 6px}
        .sub{text-align:center;font-size:11px;margin-bottom:12px}
        table{border-collapse:collapse;width:100%;font-size:9px;margin-top:12px}
        th,td{border:1px solid #ccc;padding:6px 8px}
        th{background:#f6f7f9;font-weight:bold;text-align:left}
        .r{text-align:right}
        .summary{margin-top:16px;font-weight:bold}
      </style></head><body>
      <h2>${orgSettings.name || 'Hospital'} — Doctor Payslip</h2>
      <div class="sub">Doctor: ${activePayslip.doctorName} · Period: ${from} → ${to} · Generated: ${new Date().toLocaleString()}</div>
      <table>
        <thead><tr><th>Date</th><th>Department</th><th>Type</th><th class="r">Gross</th><th class="r">Discount</th><th class="r">Net</th><th class="r">Share %</th><th class="r">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">Gross: ${formatCurrency(activePayslip.gross)} &nbsp; | &nbsp; Discount: ${formatCurrency(activePayslip.discount)} &nbsp; | &nbsp; Net: ${formatCurrency(activePayslip.net)} &nbsp; | &nbsp; Doctor Share: ${formatCurrency(activePayslip.share)}</div>
      <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px">
        <div>Prepared by: ____________________</div>
        <div>Doctor Signature: ____________________</div>
      </div>
      </body></html>`

    if ((window as any).electronAPI?.printHTML) (window as any).electronAPI.printHTML(html)
    else {
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html + '<script>window.onload=function(){window.print()}</script>')
        win.document.close()
      }
    }
  }

  const printSummary = () => {
    const dateRange = from || to ? `${from || to}${to ? ' to '+to : ''}` : new Date().toISOString().slice(0,10)
    const deptName = departmentId==='All' ? 'All Departments' : (departments.find(d=>d.id===departmentId)?.name || '')
    const summaryMap = new Map<string, { name: string; departments: Set<string>; general: number; private: number; subsidized: number }>()
    for (const e of entries) {
      const docId = e.doctorId
      if (!docId) continue
      const existing = summaryMap.get(docId)
      if (existing) {
        if (e.departmentName) existing.departments.add(e.departmentName)
        const cat = String(e.visitCategory || '').toLowerCase()
        if (cat === 'private') existing.private++
        else if (cat === 'subsidized') existing.subsidized++
        else existing.general++
      } else {
        const depts = new Set<string>()
        if (e.departmentName) depts.add(e.departmentName)
        const cat = String(e.visitCategory || '').toLowerCase()
        summaryMap.set(docId, {
          name: e.doctorName,
          departments: depts,
          general: cat === 'private' ? 0 : (cat === 'subsidized' ? 0 : 1),
          private: cat === 'private' ? 1 : 0,
          subsidized: cat === 'subsidized' ? 1 : 0,
        })
      }
    }
    const rows = Array.from(summaryMap.values()).map(s => `<tr>
      <td>${s.name}</td><td>${Array.from(s.departments).join(', ')||'-'}</td>
      <td class="c">${s.general}</td><td class="c">${s.private}</td><td class="c">${s.subsidized}</td><td class="c">${s.general+s.private+s.subsidized}</td>
    </tr>`).join('')
    const tG = Array.from(summaryMap.values()).reduce((s,v)=>s+v.general,0)
    const tP = Array.from(summaryMap.values()).reduce((s,v)=>s+v.private,0)
    const tS = Array.from(summaryMap.values()).reduce((s,v)=>s+v.subsidized,0)
    const html = `<!DOCTYPE html><html><head><title>Summary Report</title>
      <style>
        @page{size:A4;margin:10mm}
        body{font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#000;margin:0;padding:10px}
        h2{text-align:center;font-size:14px;margin:0 0 4px}
        .sub{text-align:center;font-size:10px;margin:2px 0 10px}
        table{border-collapse:collapse;width:100%;font-size:9px}
        th,td{border:1px solid #ccc;padding:4px 6px}
        th{background:#f8f9fb;font-weight:bold;text-align:left}
        .c{text-align:center}
        .tot td{font-weight:bold;background:#f0f0f0}
      </style></head><body>
      <h2>Doctor Token Summary Report</h2>
      <div class="sub">Date: ${dateRange} &nbsp;|&nbsp; Department: ${deptName}</div>
      <table><thead><tr><th>Doctor Name</th><th>Department</th><th>General</th><th>Private</th><th>Subsidized</th><th>Total</th></tr></thead>
      <tbody>${rows}
      <tr class="tot"><td>TOTAL</td><td></td><td class="c">${tG}</td><td class="c">${tP}</td><td class="c">${tS}</td><td class="c">${tG+tP+tS}</td></tr>
      </tbody></table>
      </body></html>`
    if ((window as any).electronAPI?.printHTML) {
      ;(window as any).electronAPI.printHTML(html)
    } else {
      const win = window.open('','_blank')
      if(win){win.document.write(html + '<script>window.onload=function(){window.print()}</script>');win.document.close()}
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-6 py-8 space-y-6">
      <section className="rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl ring-1 ring-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/60">Finance Console</p>
            <h1 className="mt-3 text-3xl font-semibold">Doctor Earnings &amp; Payouts</h1>
            <p className="mt-2 text-sm text-white/70">Monitor token revenue, manual entries, and payouts across every department.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>{ setTick(t=>t+1); syncBackendEarnings() }} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">Refresh</button>
            <button onClick={downloadPdf} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">Finance PDF</button>
            <button onClick={printFinanceReport} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">Print Finance</button>
            <button onClick={exportCsv} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">CSV</button>
            <button onClick={downloadSummaryPdf} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">Summary PDF</button>
            <button onClick={printSummary} className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-sm transition hover:bg-white/20">Print Summary</button>
            <button onClick={()=>setAddOpen(true)} className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100">+ Add Entry</button>
          </div>
        </div>
      </section>

      {payslipOpen && activePayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor Payslip</p>
                <h3 className="text-lg font-semibold text-slate-900">{activePayslip.doctorName}</h3>
                <p className="text-xs text-slate-500">{from} → {to}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{orgSettings.name}</p>
                {orgSettings.phone && <p>Phone: {orgSettings.phone}</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Gross</p>
                <p className="text-xl font-semibold">{formatCurrency(activePayslip.gross)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Discounts</p>
                <p className="text-xl font-semibold text-amber-600">{formatCurrency(activePayslip.discount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Net Revenue</p>
                <p className="text-xl font-semibold text-emerald-600">{formatCurrency(activePayslip.net)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Doctor Share</p>
                <p className="text-xl font-semibold text-violet-600">{formatCurrency(activePayslip.share)}</p>
              </div>
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Net</th>
                    <th className="px-3 py-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.filter(e => e.doctorId === doctorId).slice(0, 50).map(row => {
                    const netVal = Math.max(0, Number(row.gross||0) - Number(row.discount||0))
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2">{new Date(row.datetime).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{row.departmentName || '-'}</td>
                        <td className="px-3 py-2">{row.visitCategory ? row.visitCategory.charAt(0).toUpperCase() + row.visitCategory.slice(1) : '-'}</td>
                        <td className="px-3 py-2 text-right">{netVal.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{Number(row.doctorAmount||0).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {filtered.filter(e => e.doctorId === doctorId).length > 50 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-slate-400">Showing first 50 entries… refine date range for more detail.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
              <span>Prepared by: {getHospitalSessionUser()}</span>
              <span>Generated on: {new Date().toLocaleString()}</span>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button onClick={downloadPayslipPdf} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" /> Download
              </button>
              <button onClick={printPayslip} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={closePayslipModal} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-700">Filters</p>
          <p className="text-xs text-slate-400">Refine data by doctor, department, and date range.</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Doctor
            <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
              <option value="All">All Doctors</option>
              {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Department
            <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
              <option value="All">All Departments</option>
              {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
          </label>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Gross (Tokens)" amount={summary.gross} tone="violet" subtitle="Total token charges" />
        <SummaryCard title="Discount" amount={summary.discount} tone="sky" subtitle="Waived during billing" />
        <SummaryCard title="Net" amount={summary.net} tone="emerald" subtitle="Patient collectible" />
        <SummaryCard title="Doctor Share" amount={summary.doctorShare} tone="amber" subtitle="Payable to doctors" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-800">Finance Entries</p>
            <p className="text-xs text-slate-500">Showing {visibleRows.length} of {filtered.length} filtered rows</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Date Range:</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{from || 'N/A'} → {to || from}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Date / Time</th>
                <th className="px-5 py-3">Doctor</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Patient · MR</th>
                <th className="px-5 py-3">Token · Type</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-right">Discount</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right">Share %</th>
                <th className="px-5 py-3 text-right">Doctor Amt</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map(e => (
                <tr key={e.id} className="group transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-xs text-slate-500">{new Date(e.datetime).toLocaleString()}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{e.doctorName}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{e.departmentName || '-'}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-slate-900">{e.patient || '-'}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">{e.mrNumber || '-'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold text-violet-600">{e.tokenNo || '-'}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">{e.visitCategory || '-'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-slate-700">Rs {(e.gross||0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-rose-500">Rs {(e.discount||0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600">Rs {Math.max(0, (e.gross||0)-(e.discount||0)).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right text-slate-600">{(e.sharePercent || 0).toFixed(1)}%</td>
                  <td className="px-5 py-4 text-right font-semibold text-orange-600">Rs {(e.doctorAmount || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={()=>startEdit()} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">Edit</button>
                      <button onClick={()=>deleteEntry(e.id)} className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-14 text-center text-sm text-slate-400">No entries for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
          <div>Rows visible: {visibleRows.length} / {filtered.length}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Rows</span>
            <select value={rowsPerPage} onChange={e=>setRowsPerPage(e.target.value === 'All' ? 'All' : parseInt(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-1 text-sm">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>
      </section>

      <div className="text-xs text-slate-500">Manage doctor records inside <Link to="/hospital/doctors" className="font-semibold text-sky-600 hover:underline">Hospital → Doctors</Link></div>

      {addOpen && (
        <Hospital_DoctorFinanceEntryDialog
          doctors={doctors}
          onClose={()=>setAddOpen(false)}
          onSave={async (e)=>{
            try {
              const memo = e.description || 'Manual entry'
              const amount = Math.abs(e.doctorAmount || 0)
              const dep = String((e as any).departmentName || '').toLowerCase()
              const revenueAccount = dep.includes('ipd') ? 'IPD_REVENUE' : (dep.includes('proc') ? 'PROCEDURE_REVENUE' : 'OPD_REVENUE')
              let createdByUsername: string | undefined = undefined
              try {
                const sessRaw = localStorage.getItem('hospital.session')
                if (sessRaw) {
                  const sess = JSON.parse(sessRaw)
                  if (sess?.username) createdByUsername = String(sess.username)
                }
              } catch {}
              await financeApi.manualDoctorEarning({ doctorId: e.doctorId || '', departmentId: undefined, departmentName: (e as any).departmentName, phone: (e as any).phone, amount, revenueAccount, paidMethod: 'AR', memo, sharePercent: 100, patientName: e.patient, mrn: e.mrNumber, createdByUsername })
              await syncBackendEarnings()
              setTick(t=>t+1)
            } catch {}
            setAddOpen(false)
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Confirm Delete"
        message="Delete this entry?"
        confirmText="Delete"
        onCancel={()=>setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )

  function startEdit(){
    // Placeholder for future edit flow; opens add dialog prefilled if needed
    setAddOpen(true)
  }

  async function deleteEntry(id: string) {
    setConfirmDeleteId(id)
  }
  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    if (!id) return
    // If it's a backend-sourced journal, delete it server-side
    if (id.startsWith('be:')){
      const realId = id.slice(3)
      const entry = entries.find(e => e.id === id)
      // Manual entries can be hard-deleted, OPD tokens must be reversed
      if (entry && !entry.tokenId) {
        try { await financeApi.deleteManualEarning(realId) } catch {}
      } else {
        try { await financeApi.reverseJournal(realId, 'Reversed from Doctors Finance UI') } catch {}
      }
      await syncBackendEarnings()
    }
    setEntries(prev => prev.filter(e => e.id !== id))
  }
}

function SummaryCard({ title, amount, tone, subtitle }: { title: string; amount: number; tone: 'emerald'|'sky'|'violet'|'amber'; subtitle?: string }) {
  const toneText: Record<string, string> = {
    emerald: 'text-emerald-600',
    sky: 'text-sky-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
  }
  const toneBg: Record<string, string> = {
    emerald: 'bg-emerald-50',
    sky: 'bg-sky-50',
    violet: 'bg-violet-50',
    amber: 'bg-amber-50',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className={`mt-3 inline-flex items-baseline gap-2 rounded-xl px-3 py-2 text-3xl font-bold ${toneBg[tone]} ${toneText[tone]}`}>
        <span>Rs {amount.toFixed(2)}</span>
      </div>
      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}
 
