import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi, corporateApi, opdApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import DatePicker from '../../components/common/DatePicker'
import TimePicker from '../../components/common/TimePicker'
import { fmtDateTime12 } from '../../utils/timeFormat'
import { createCacheKey, getCache, setCache, invalidateCache } from '../../utils/apiCache'
import Hospital_TokenSlip from '../../components/hospital/Hospital_TokenSlip'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { previewEyePrescriptionPdf } from '../../utils/prescription/templates/eyePrescriptionPdf'
import { previewHospitalRxPdf } from '../../utils/hospitalRxPdf'
import PrescriptionVitals from '../../components/doctor/PrescriptionVitals'
import { 
  Search, FileDown, RefreshCcw, Ticket, Banknote, CreditCard, Building, 
  Tag, RotateCcw, Filter, Printer, Eye, Trash2, Edit2, Stethoscope,
  Clock, Smartphone, Calendar, ChevronDown
} from 'lucide-react'

function escHtml(v: any){
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c)
}

function ServicesCell({ services }: { services?: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!services) return null
  const list = services.split(',').map(s => s.trim()).filter(Boolean)
  if (list.length <= 2) return <div className="text-[10px] font-bold text-violet-600 uppercase tracking-tighter wrap-break-word">{services}</div>

  const visible = expanded ? list : list.slice(0, 2)
  return (
    <div className="text-[10px] font-bold text-violet-600 uppercase tracking-tighter">
      <div className="wrap-break-word">
        {visible.join(', ')}
        {!expanded && '...'}
      </div>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[9px] font-black text-violet-800 hover:underline mt-0.5 uppercase tracking-tighter block"
      >
        {expanded ? 'Show Less' : `Show All (${list.length})`}
      </button>
    </div>
  )
}

function buildTokensPdfHtml({
  title,
  printedAt,
  hospital,
  filters,
  rows,
}: {
  title: string
  printedAt: Date
  hospital: { name: string; address?: string; phone?: string; logoDataUrl?: string }
  filters: string
  rows: Array<{ time?: string; tokenNo?: string; mrNo?: string; patient?: string; phone?: string; doctor?: string; department?: string; services?: string; fee?: any; isCorporate?: boolean; paidMethod?: string; status?: string }>
}){
  const printedDate = fmtDateTime12(printedAt.toISOString()).split(', ')[0] || ''
  const printedTime = fmtDateTime12(printedAt.toISOString()).split(', ')[1] || ''
  const head = ['Time','Type','Token #','MR #','Patient','Phone','Doctor','Department','Services','Fee','Status']
  const th = head.map(h => `<th>${escHtml(h)}</th>`).join('')
  const body = (rows || []).map(r => {
    const method = String(r.paidMethod || '').toLowerCase()
    const t = r.isCorporate ? 'Corporate' : (method === 'bank' || method === 'card' ? 'Card' : 'Cash')
    const fee = Number(r.fee || 0)
    return `<tr>
      <td>${escHtml(r.time || '')}</td>
      <td>${escHtml(t)}</td>
      <td>${escHtml(r.tokenNo || '')}</td>
      <td>${escHtml(r.mrNo || '')}</td>
      <td>${escHtml(r.patient || '')}</td>
      <td>${escHtml(r.phone || '')}</td>
      <td>${escHtml(r.doctor || '')}</td>
      <td>${escHtml(r.department || '')}</td>
      <td>${escHtml(r.services || '')}</td>
      <td class="right">${escHtml(`Rs ${fee.toFixed(0)}`)}</td>
      <td>${escHtml(r.status || '')}</td>
    </tr>`
  }).join('')
  const empty = `<tr><td class="empty" colspan="${head.length}">No rows</td></tr>`

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>${escHtml(title)}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm }
        *{ box-sizing:border-box }
        body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; line-height:1.35; font-size:11px }
        .header{ border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px }
        .hdr{ display:grid; grid-template-columns: 70px 1fr 70px; align-items:center; gap:10px }
        .logo{ width:60px; height:60px; object-fit:contain }
        .hname{ font-size:16px; font-weight:800; text-align:center }
        .hmeta{ font-size:11px; text-align:center; color:#475569 }
        .title{ margin-top:8px; font-size:14px; font-weight:800 }
        .meta{ margin-top:4px; display:flex; justify-content:space-between; gap:12px; color:#334155 }
        table{ width:100%; border-collapse:collapse; table-layout:fixed }
        th,td{ border:1px solid #e2e8f0; padding:6px 6px; vertical-align:top; word-wrap:break-word }
        th{ background:#f8fafc; font-weight:800; color:#334155 }
        td.right, th.right{ text-align:right }
        .empty{ text-align:center; color:#64748b; padding:10px }
        .footer{ margin-top:10px; color:#94a3b8; font-size:10px; text-align:center }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hdr">
          <div>${hospital.logoDataUrl ? `<img class="logo" src="${hospital.logoDataUrl}" />` : ''}</div>
          <div>
            <div class="hname">${escHtml(hospital.name || 'Hospital')}</div>
            <div class="hmeta">${escHtml(hospital.address || '')}${hospital.phone ? ` • Ph: ${escHtml(hospital.phone)}` : ''}</div>
          </div>
          <div></div>
        </div>
        <div class="title">${escHtml(title)}</div>
        <div class="meta">
          <div><b>Filters:</b> ${escHtml(filters || '-')}</div>
          <div><b>Printed:</b> ${escHtml(printedDate)} ${escHtml(printedTime)}</div>
        </div>
      </div>

      <table>
        <thead><tr>${th}</tr></thead>
        <tbody>${body || empty}</tbody>
      </table>

      <div class="footer">Generated by Hospital Management System</div>
    </body>
  </html>`
}

type TokenSlipData = {
  tokenNo: string
  departmentName: string
  doctorName: string
  patientName: string
  phone?: string
  mrn?: string
  age?: string
  gender?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  address?: string
  amount: number
  discount: number
  payable: number
  createdAt?: string
  fbr?: any
  visitCategory?: string
  tokenType?: string
  isReprint?: boolean
  doctorQualification?: string
  doctorSpecialization?: string
  encounterId?: string
}

interface TokenRow {
  _id: string
  time: string
  tokenNo: string
  mrNo: string
  patient: string
  doctorId?: string
  encounterId?: string
  visitCategory?: 'public' | 'private'
  gender?: string
  phone?: string
  address?: string
  age?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  doctor?: string
  department?: string
  services?: string
  fee: number
  discount: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  paidMethod?: 'Cash'|'Bank'|'AR'|string
  isCorporate?: boolean
  corporateId?: string
  performedBy?: string
  createdAt?: string
  vitalsData?: any
  hasVitals?: boolean
  tokenType?: string
}

export default function Hospital_TodayTokens(){
  const navigate = useNavigate()
  const [rows, setRows] = useState<TokenRow[]>([])
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('All')
  const [doctorId, setDoctorId] = useState<string>('All')
  const [serviceId, setServiceId] = useState<string>('All')
  const [departments, setDepartments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [revByMethod, setRevByMethod] = useState<{ cash: number; card: number }>({ cash: 0, card: 0 })
  const [backendStats, setBackendStats] = useState<any>(null)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [page, setPage] = useState(1)
  const [backendTotal, setBackendTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [eyeRxEnabled, setEyeRxEnabled] = useState(true)
  const [forceRefresh, setForceRefresh] = useState(0)
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; token: any } | null>(null)
  const [tokenType, setTokenType] = useState<'All' | 'Cash' | 'Corporate'>('All')
  const [visitCategory, setVisitCategory] = useState<'All' | 'Public' | 'Private'>('All')
  const [fromDate, setFromDate] = useState(getLocalDate())
  const [toDate, setToDate] = useState(getLocalDate())
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [vitalsDialog, setVitalsDialog] = useState<{ open: boolean; token: TokenRow | null }>({ open: false, token: null })
  const vitalsRef = useRef<any>(null)
  const hasLoadedRef = useRef(false)


  useEffect(() => {
    ;(async()=>{
      try {
        const [deps, docs, svcs, comps, sett] = await Promise.all([
          hospitalApi.listDepartments({ limit: 1000 }) as any,
          hospitalApi.listDoctors() as any,
          hospitalApi.listErServices({ active: true, limit: 1000 }) as any,
          corporateApi.listCompanies() as any,
          hospitalApi.getSettings().catch(() => null) as any,
        ])
        setDepartments(deps?.departments || deps?.data || deps || [])
        setDoctors(docs?.doctors || docs?.data || docs || [])
        setServices(svcs?.services || svcs || [])
        const arr = (comps?.companies || comps?.data || comps || []).map((c:any)=>({ id: String(c._id||c.id), name: c.name }))
        setCompanies(arr)
        if (sett) {
          const s: any = sett?.settings || sett
          const apiEyeRx = s?.eyeRxEnabled
          setEyeRxEnabled(apiEyeRx !== false)
        }
      } catch {
        setDepartments([])
        setDoctors([])
        setServices([])
        setCompanies([])
      }
    })()
  }, [])

  const load = useCallback(async (force: boolean = false) => {
    // Server-side pagination: pass page and limit to backend
    const isAll = rowsPerPage === -1
    const params: any = { from: fromDate, to: toDate, page, limit: isAll ? 1000 : rowsPerPage }
    if (departmentId !== 'All') params.departmentId = departmentId
    if (doctorId !== 'All') params.doctorId = doctorId
    if (serviceId !== 'All') params.serviceId = serviceId
    if (fromTime) params.fromTime = fromTime
    if (toTime) params.toTime = toTime
    
    // Check cache first (unless forcing refresh)
    const cacheKey = createCacheKey('/hospital/tokens', params)
    if (!force) {
      const cached = getCache<{ tokens: any[], total: number, stats: any }>(cacheKey)
      if (cached) {
        setBackendTotal(cached.total || 0)
        setBackendStats(cached.stats || null)
        await processTokens(cached.tokens)
        hasLoadedRef.current = true
        return
      }
    }
    
    // Only show loading spinner if no existing data (first load)
    if (!hasLoadedRef.current) setIsLoading(true)
    try {
      const res = await hospitalApi.listTokens(params) as any
      setBackendTotal(res.total || 0)
      setBackendStats(res.stats || null)
      
      // Cache the response
      setCache(cacheKey, { tokens: res.tokens || [], total: res.total || 0, stats: res.stats })
      
      await processTokens(res.tokens || [])
      hasLoadedRef.current = true
    } finally {
      setIsLoading(false)
    }
  }, [departmentId, doctorId, serviceId, page, rowsPerPage, fromDate, toDate, fromTime, toTime])

  useEffect(() => { load(forceRefresh > 0) }, [load, forceRefresh])
  
  async function processTokens(tokens: any[]) {
    const items: TokenRow[] = (tokens || []).map((t: any) => ({
      _id: t._id,
      time: t.createdAt ? fmtDateTime12(t.createdAt) : '',
      tokenNo: t.tokenNo,
      mrNo: t.patientId?.mrn || t.mrn || '-',
      patient: t.patientId?.fullName || t.patientName || '-',
      doctorId: String(t.doctorId?._id || t.doctorId?.id || t.doctorId || ''),
      encounterId: t.encounterId ? String(t.encounterId._id || t.encounterId) : undefined,
      visitCategory: t.visitCategory,
      gender: t.patientId?.gender,
      phone: t.patientId?.phoneNormalized,
      address: t.patientId?.address,
      age: t.patientId?.age,
      guardianRel: t.patientId?.guardianRel,
      guardianName: t.patientId?.fatherName,
      cnic: t.patientId?.cnicNormalized || t.patientId?.cnic,
      doctor: t.doctorId?.name || '-',
      department: t.departmentId?.name || '-',
      services: t.serviceNames || (Array.isArray(t.serviceIds) ? t.serviceIds.map((s: any) => s.name).join(', ') : ''),
      fee: Number(t.fee || 0),
      discount: Number(t.discount || 0),
      status: t.status,
      paidMethod: t.paidMethod || t.paymentMethod || t.method,
      isCorporate: !!t.corporateId,
      corporateId: t.corporateId,
      tokenType: t.visitCategory || 'General',
      performedBy: t.createdByUsername || t.createdBy || '-',
      createdAt: t.createdAt,
      vitalsData: t.vitals,
    }))

    // Check vitals status from token's vitals field
    const itemsWithVitals = items.map((item) => {
      const tokenVitals = (item as any).vitalsData
      const hasVitals = tokenVitals && Object.keys(tokenVitals).some(k => tokenVitals[k] != null)
      return { ...item, hasVitals }
    })

    const rowsClean = itemsWithVitals.filter(r => r.status !== 'cancelled')
    setRows(rowsClean)
    // Don't reset page here - it's managed by pagination controls

    // Revenue split from tokens based on selected payment method at token creation
    let cash = 0
    let card = 0
    for (const r of rowsClean){
      if (r.status === 'returned') continue
      if (r.isCorporate) continue
      const amt = Number(r.fee || 0)
      if (!isFinite(amt) || amt <= 0) continue
      const method = String(r.paidMethod || 'Cash').toLowerCase()
      if (method === 'cash') cash += amt
      else if (method === 'bank' || method === 'card') card += amt
      else card += amt
    }
    setRevByMethod({ cash, card })
  }
  
  // Force refresh function (e.g., after token status change)
  const refresh = useCallback(() => {
    invalidateCache('/hospital/tokens')
    setForceRefresh(v => v + 1)
  }, [])

  const filtered = useMemo(() => {
    let result = rows

    if (tokenType !== 'All'){
      result = result.filter(r => {
        if (tokenType === 'Corporate') return !!r.isCorporate
        if (tokenType === 'Cash') return !r.isCorporate
        return true
      })
    }

    if (visitCategory !== 'All'){
      result = result.filter(r => {
        if (visitCategory === 'Public') return r.visitCategory !== 'private'
        if (visitCategory === 'Private') return r.visitCategory === 'private'
        return true
      })
    }

    // Time-of-day filtering is handled server-side (see listTokens fromTime/toTime),
    // so it stays consistent with pagination and the header counts/stats.

    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(r =>
        [r.patient, r.mrNo, r.tokenNo, r.phone, r.doctor, r.department, r.gender, r.time]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      )
    }

    // Sort by createdAt descending (most recent first)
    result.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })

    return result
  }, [query, rows, tokenType, visitCategory])

  // Use backend stats if available (calculated from ALL matching records, not just paginated)
  const totalTokens = rowsPerPage === -1 ? filtered.length : backendTotal
  const totalRevenue = backendStats?.cashRevenue ?? revByMethod.cash
  const cardRevenue = backendStats?.cardRevenue ?? revByMethod.card
  const totalRevenueAll = backendStats?.totalRevenue ?? (revByMethod.cash + revByMethod.card)
  const totalDiscount = backendStats?.totalDiscount ?? 0
  const discountTokens = backendStats?.discountedTokens ?? 0
  const returnedPatients = backendStats?.returnedPatients ?? 0
  const corporateTokens = backendStats?.corporateTokens ?? 0

  // When showing all, display all rows. Otherwise backend handles pagination
  const isAll = rowsPerPage === -1
  const pageRows = isAll ? filtered : filtered
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(backendTotal / rowsPerPage))

  async function deleteToken(row: TokenRow){
    try{
      await hospitalApi.deleteToken(row._id)
      // Invalidate cache and force refresh after deletion
      refresh()
      setToast({ type: 'success', message: 'Token deleted permanently' })
    } catch (e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to delete token' })
    }
  }

  function printSlip(r: TokenRow){
    const panelName = r.corporateId ? (companies.find(c=> c.id === String(r.corporateId))?.name || '') : ''
    const tType = r.visitCategory?.toLowerCase() === 'private' ? 'Private' : 'General'
    // Find doctor details for qualification and specialization
    const docRec = doctors.find((d:any)=> String(d._id||d.id) === String(r.doctorId)) ||
                   doctors.find((d:any)=> String(d.name||'').toLowerCase() === String(r.doctor||'').toLowerCase())
    const slip: TokenSlipData = {
      tokenNo: r.tokenNo,
      departmentName: r.department || '-',
      doctorName: r.doctor || '-',
      patientName: r.patient || '-',
      phone: r.phone || '',
      mrn: r.mrNo || '',
      age: r.age,
      gender: r.gender,
      guardianRel: r.guardianRel,
      guardianName: r.guardianName,
      cnic: r.cnic,
      address: r.address,
      amount: r.fee + (r.discount || 0),
      discount: r.discount || 0,
      payable: r.fee,
      createdAt: r.createdAt,
      tokenType: tType,
      isReprint: true,
      doctorQualification: docRec?.qualification || '',
      doctorSpecialization: docRec?.specialization || '',
      encounterId: r.encounterId,
      ...(panelName ? { corporateCompanyName: panelName } : {}),
    }
    setSlipData(slip)
    setShowSlip(true)
  }

  async function printEyeRx(r: TokenRow){
    try{
      const s: any = await hospitalApi.getSettings()
      let docRec = doctors.find((d:any)=> String(d._id||d.id) === String(r.doctorId)) || doctors.find((d:any)=> String(d.name||'').toLowerCase() === String(r.doctor||'').toLowerCase())
      if (!docRec) {
        try {
          const res: any = await hospitalApi.listDoctors({ q: r.doctor || '' })
          docRec = (res?.doctors || res || []).find((d:any)=> String(d.name||'').toLowerCase() === String(r.doctor||'').toLowerCase())
        } catch {}
      }
      let eyeItems: any[] = []
      if (r.encounterId) {
        try {
          const presRes: any = await opdApi.getPrescriptionByEncounterId(r.encounterId)
          eyeItems = presRes?.prescription?.items || []
        } catch {}
      }
      await previewEyePrescriptionPdf({
        settings: {
          name: s?.settings?.name || s?.name,
          address: s?.settings?.address || s?.address,
          phone: s?.settings?.phone || s?.phone,
          email: s?.settings?.email || s?.email,
          website: s?.settings?.website || s?.website,
          logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl,
        },
        doctor: {
          name: (docRec?.name || r.doctor || '-'),
          departmentName: r.department || '-',
          specialization: docRec?.specialization || '',
          qualification: docRec?.qualification || ''
        },
        patient: {
          name: r.patient || '-',
          mrn: r.mrNo || '-',
          fatherName: r.guardianName,
          age: r.age,
          gender: r.gender,
          phone: r.phone,
          address: r.address,
          cnic: r.cnic,
        },
        items: eyeItems,
        createdAt: new Date().toISOString(),
        tokenNo: r.tokenNo,
        outdoorNo: r.tokenNo,
        visitCategory: r.visitCategory,
        tokenType: r.tokenType,
        isReprint: true,
      } as any)
    } catch (e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to open Eye Rx preview' })
    }
  }

  async function printHospitalRx(r: TokenRow){
    try{
      const s: any = await hospitalApi.getSettings()
      let docRec = doctors.find((d:any)=> String(d._id||d.id) === String(r.doctorId)) || doctors.find((d:any)=> String(d.name||'').toLowerCase() === String(r.doctor||'').toLowerCase())
      if (!docRec) {
        try {
          const res: any = await hospitalApi.listDoctors({ q: r.doctor || '' })
          docRec = (res?.doctors || res || []).find((d:any)=> String(d.name||'').toLowerCase() === String(r.doctor||'').toLowerCase())
        } catch {}
      }
      let rxItems: any[] = []
      if (r.encounterId) {
        try {
          const presRes: any = await opdApi.getPrescriptionByEncounterId(r.encounterId)
          rxItems = presRes?.prescription?.items || []
        } catch {}
      }
      await previewHospitalRxPdf({
        settings: {
          name: s?.settings?.name || s?.name,
          address: s?.settings?.address || s?.address,
          phone: s?.settings?.phone || s?.phone,
          email: s?.settings?.email || s?.email,
          website: s?.settings?.website || s?.website,
          logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl,
        },
        doctor: {
          name: (docRec?.name || r.doctor || '-'),
          departmentName: r.department || '-',
          specialization: docRec?.specialization || '',
          qualification: docRec?.qualification || ''
        },
        patient: {
          name: r.patient || '-',
          mrn: r.mrNo || '-',
          fatherName: r.guardianName,
          age: r.age,
          gender: r.gender,
          phone: r.phone,
          address: r.address,
          cnic: r.cnic,
        },
        items: rxItems,
        createdAt: new Date().toISOString(),
        tokenNo: r.tokenNo,
        outdoorNo: r.tokenNo,
        visitCategory: r.visitCategory,
        isReprint: true,
        manualRxFields: s?.settings?.manualRxFields || s?.manualRxFields,
      } as any)
    } catch (e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to open Hospital Rx preview' })
    }
  }

  function openEdit(r: TokenRow){
    // Stay on current portal (reception or hospital)
    const portal = window.location.pathname.startsWith('/reception') ? 'reception' : 'hospital'
    navigate(`/${portal}/token-generator?tokenId=${encodeURIComponent(r._id)}`)
  }

  async function openVitals(r: TokenRow){
    // Use token's own vitals data (nurses save here; no prescription needed)
    const vitals = r.vitalsData || {}
    const displayVitals: any = {
      pulse: vitals.pulse != null ? String(vitals.pulse) : '',
      temperature: vitals.temperatureC != null ? String(vitals.temperatureC) : '',
      bloodPressureSys: vitals.bloodPressureSys != null ? String(vitals.bloodPressureSys) : '',
      bloodPressureDia: vitals.bloodPressureDia != null ? String(vitals.bloodPressureDia) : '',
      respiratoryRate: vitals.respiratoryRate != null ? String(vitals.respiratoryRate) : '',
      bloodSugar: vitals.bloodSugar != null ? String(vitals.bloodSugar) : '',
      weightKg: vitals.weightKg != null ? String(vitals.weightKg) : '',
      height: vitals.heightCm != null ? String(vitals.heightCm) : '',
      spo2: vitals.spo2 != null ? String(vitals.spo2) : '',
      ar: vitals.ar != null ? String(vitals.ar) : '',
      va: vitals.va != null ? String(vitals.va) : '',
      iop: vitals.iop != null ? String(vitals.iop) : '',
    }
    setVitalsDialog({ open: true, token: r })
    // Delay setting vitals to allow dialog to mount
    setTimeout(() => {
      try { vitalsRef.current?.setDisplay?.(displayVitals) } catch {}
    }, 50)
  }

  async function saveVitals(){
    const token = vitalsDialog.token
    if (!token?._id) {
      setToast({ type: 'error', message: 'No token found' })
      return
    }
    try {
      const vitals = vitalsRef.current?.getNormalized?.()
      if (!vitals || !Object.values(vitals).some(x => x != null)) {
        setToast({ type: 'error', message: 'Enter at least one vital' })
        return
      }
      await hospitalApi.updateToken(token._id, { vitals })
      setToast({ type: 'success', message: 'Vitals saved' })
      setVitalsDialog({ open: false, token: null })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to save vitals' })
    }
  }

  

  // No index mapping needed when actions use row ids

  const exportCSV = () => {
    const cols = ['Time','Token #','MR #','Patient','Gender','Phone','Doctor','Department','Fee','Returned']
    const lines = [cols.join(',')]
    for (const r of filtered) {
      lines.push([
        r.time,
        r.tokenNo,
        r.mrNo,
        r.patient,
        r.gender ?? '',
        r.phone ?? '',
        r.doctor ?? '',
        r.department ?? '',
        r.fee,
        r.status === 'returned' ? 'Yes' : 'No',
      ].map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v)).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todays-tokens-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = async () => {
    try{
      const api = (window as any).electronAPI
      const isElectron = api && typeof api.printPreviewHtml === 'function'
      const s: any = await hospitalApi.getSettings().catch(()=>({}))
      const hospital = {
        name: s?.settings?.name || s?.name || 'Hospital',
        address: s?.settings?.address || s?.address || '',
        phone: s?.settings?.phone || s?.phone || '',
        logoDataUrl: s?.settings?.logoDataUrl || s?.logoDataUrl || '',
      }

      const depName = departmentId === 'All'
        ? 'All Departments'
        : (departments.find((d:any)=> String(d._id||d.id) === String(departmentId))?.name || 'Department')
      const docName = doctorId === 'All'
        ? 'All Doctors'
        : (doctors.find((d:any)=> String(d._id||d.id) === String(doctorId))?.name || 'Doctor')

      const filters = `Date: ${new Date().toISOString().slice(0,10)}  •  Dept: ${depName}  •  Doctor: ${docName}  •  Type: ${tokenType}  •  Category: ${visitCategory}`

      const htmlDoc = buildTokensPdfHtml({
        title: "Today's Tokens",
        printedAt: new Date(),
        hospital,
        filters,
        rows: filtered.map(r => ({
          time: r.time,
          tokenNo: r.tokenNo,
          mrNo: r.mrNo,
          patient: r.patient,
          phone: r.phone,
          doctor: r.doctor,
          department: r.department,
          services: r.services,
          fee: r.fee,
          isCorporate: r.isCorporate,
          paidMethod: r.paidMethod as any,
          status: r.status,
        })),
      })

      if (isElectron) {
        const r = await api.printPreviewHtml(htmlDoc, { printBackground: true, marginsType: 0 })
        if (r && r.ok === false) setToast({ type: 'error', message: r.error || 'Failed to generate PDF' })
      } else {
        const win = window.open('', 'print', 'width=1100,height=750')
        if (!win) { setToast({ type: 'error', message: 'Popup blocked. Please allow popups to export PDF.' }); return }
        win.document.write(htmlDoc)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 350)
      }
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to generate PDF' })
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Ticket className="h-6 w-6 rotate-45" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Today's Tokens</h2>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">REAL-TIME QUEUE MANAGEMENT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
             <Calendar className="h-3.5 w-3.5" />
             {new Date().toISOString().slice(0, 10)}
             <button onClick={refresh} disabled={isLoading} className="ml-2 hover:text-blue-600 transition-colors">
               <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
             </button>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all uppercase tracking-wide border border-emerald-100">
            <FileDown className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button onClick={exportPdf} className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all uppercase tracking-wide border border-rose-100">
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <Filter className="h-3 w-3" />
          Filters & Search
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From Date</label>
            <DatePicker value={fromDate} onChange={v=>{ setFromDate(v); setPage(1) }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From Time</label>
            <TimePicker value={fromTime} onChange={v=>{ setFromTime(v); setPage(1) }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To Date</label>
            <DatePicker value={toDate} onChange={v=>{ setToDate(v); setPage(1) }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To Time</label>
            <TimePicker value={toTime} onChange={v=>{ setToTime(v); setPage(1) }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Department</label>
            <div className="relative">
              <select value={departmentId} onChange={e=>{ setDepartmentId(e.target.value); setPage(1) }} className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 py-2.5 px-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium">
                <option value="All">All Departments</option>
                {departments.map((d:any) => (
                  <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Doctor</label>
            <div className="relative">
              <select value={doctorId} onChange={e=>{ setDoctorId(e.target.value); setPage(1) }} className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 py-2.5 px-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium">
                <option value="All">All Doctors</option>
                {doctors.map((d:any) => (
                  <option key={String(d._id || d.id)} value={String(d._id || d.id)}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Service</label>
            <div className="relative">
              <select value={serviceId} onChange={e=>{ setServiceId(e.target.value); setPage(1) }} className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 py-2.5 px-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium">
                <option value="All">All Services</option>
                {services.map((s:any) => (
                  <option key={String(s._id || s.id)} value={String(s._id || s.id)}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Billing Type</label>
            <div className="relative">
              <select value={tokenType} onChange={e=>{ setTokenType(e.target.value as any); setPage(1) }} className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 py-2.5 px-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium">
                <option value="All">All Types</option>
                <option value="Cash">Cash</option>
                <option value="Corporate">Corporate</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
            <div className="relative">
              <select value={visitCategory} onChange={e=>{ setVisitCategory(e.target.value as any); setPage(1) }} className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50/50 py-2.5 px-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium">
                <option value="All">All Categories</option>
                <option value="Public">General</option>
                <option value="Private">Private</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="relative">
          <input
            value={query}
            onChange={(e)=>{ setQuery(e.target.value); setPage(1) }}
            placeholder="Search by name, token#, MR#, phone, doctor, department..."
            className="w-full rounded-xl border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium placeholder:text-slate-400"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WidgetCard title="Total Tokens" value={totalTokens} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <WidgetCard title="Total Revenue" value={`Rs. ${totalRevenueAll.toLocaleString()}`} icon={<Banknote className="h-5 w-5" />} color="emerald" />
        <WidgetCard title="Cash Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} icon={<CreditCard className="h-5 w-5" />} color="violet" />
        <WidgetCard title="Card Revenue" value={`Rs. ${cardRevenue.toLocaleString()}`} icon={<CreditCard className="h-5 w-5" />} color="indigo" />
        <WidgetCard title="Corporate" value={corporateTokens} icon={<Building className="h-5 w-5" />} color="blue" />
        <WidgetCard title="Discount" value={`Rs. ${totalDiscount.toLocaleString()}`} icon={<Tag className="h-5 w-5" />} color="orange" />
        <WidgetCard title="Discounted Tokens" value={discountTokens} icon={<Tag className="h-5 w-5" />} color="emerald" />
        <WidgetCard title="Returned Patients" value={returnedPatients} icon={<RotateCcw className="h-5 w-5" />} color="amber" />
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Token / MR #</th>
                <th className="px-6 py-4">Patient Info</th>
                <th className="px-6 py-4">Type / Category</th>
                <th className="px-6 py-4">Doctor / Dept / Services</th>
                <th className="px-6 py-4">Financials</th>
                <th className="px-6 py-4 text-center">Vitals</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageRows.map((r) => (
                <tr key={r._id} className={`hover:bg-slate-50/50 transition-colors group ${r.status === 'returned' ? 'bg-amber-50/50' : ''} ${r.isCorporate ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                       <Clock className="h-3.5 w-3.5 text-slate-300" />
                       {r.time.split(', ')[1] || r.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-black text-blue-600 tracking-tight">{r.tokenNo}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1">{r.mrNo}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-black text-slate-700 uppercase tracking-tight line-clamp-1">{r.patient}</div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 tracking-tighter">
                        <Smartphone className="h-3 w-3" />
                        {r.phone || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {r.isCorporate ? (
                        <span className="w-fit inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-600 uppercase tracking-wider">Corporate</span>
                      ) : (
                        (String(r.paidMethod || 'Cash').toLowerCase() === 'bank' || String(r.paidMethod || '').toLowerCase() === 'card') ? (
                          <span className="w-fit inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-600 uppercase tracking-wider">Card</span>
                        ) : (
                          <span className="w-fit inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600 uppercase tracking-wider">Cash</span>
                        )
                      )}
                      {r.visitCategory === 'private' ? (
                        <span className="w-fit inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-600 uppercase tracking-wider">Private</span>
                      ) : (
                        <span className="w-fit inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-600 uppercase tracking-wider">General</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-black text-slate-700 tracking-tight line-clamp-1">{r.doctor}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1">{r.department}</div>
                      <ServicesCell services={r.services} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-black text-slate-700">Rs. {r.fee.toLocaleString()}</div>
                      {r.discount > 0 && (
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Disc: Rs. {r.discount.toLocaleString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      {r.hasVitals ? (
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" title="Vitals Added"></div>
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-200" title="No Vitals"></div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <ActionBtn onClick={()=>openVitals(r)} icon={<Stethoscope className="h-3.5 w-3.5" />} title="Vitals" />
                      <ActionBtn onClick={()=>printSlip(r)} icon={<Printer className="h-3.5 w-3.5" />} title="Slip" />
                      {eyeRxEnabled && <ActionBtn onClick={()=>printEyeRx(r)} icon={<Eye className="h-3.5 w-3.5" />} title="Eye Rx" />}
                      <ActionBtn onClick={()=>printHospitalRx(r)} icon={<Printer className="h-3.5 w-3.5" />} title="Hospital Rx" />
                      <ActionBtn onClick={()=>openEdit(r)} icon={<Edit2 className="h-3.5 w-3.5" />} title="Edit" />
                      <ActionBtn 
                        onClick={async () => {
                          try {
                            await hospitalApi.updateTokenStatus(r._id, r.status === 'returned' ? 'queued' : 'returned')
                            refresh()
                            setToast({ type: 'success', message: r.status === 'returned' ? 'Token un-returned' : 'Token returned' })
                          } catch (e: any) {
                            setToast({ type: 'error', message: e?.message || 'Failed to update status' })
                          }
                        }}
                        icon={<RotateCcw className="h-3.5 w-3.5" />} 
                        title={r.status === 'returned' ? 'Undo Return' : 'Return'}
                        color="amber"
                      />
                      <ActionBtn onClick={()=>setConfirmCancel({ open: true, token: r })} icon={<Trash2 className="h-3.5 w-3.5" />} title="Cancel" color="rose" />
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Ticket className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No tokens found today</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rows per page selector & Pagination Section */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-50 bg-slate-50/30 px-6 py-4 gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Rows:</span>
            <select value={rowsPerPage} onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} className="rounded-lg border-slate-200 bg-white py-1 px-2 text-[10px] font-bold focus:ring-0">
              {[10,20,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
              <option value={-1}>All</option>
            </select>
            <span className="ml-2">Showing {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, backendTotal)} of {backendTotal}</span>
          </div>
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {showSlip && slipData && (
        <Hospital_TokenSlip open={showSlip} onClose={()=>setShowSlip(false)} data={slipData} autoPrint={false} />
      )}

      {confirmCancel?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">
              <p className="font-medium text-rose-700">Warning: This action cannot be undone!</p>
              <p className="mt-1">Are you sure you want to permanently delete this token?</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setConfirmCancel(null)} className="btn-outline-navy">No, keep it</button>
              <button
                type="button"
                onClick={async()=>{
                  const tok = confirmCancel?.token
                  setConfirmCancel(null)
                  if (tok) {
                    await deleteToken(tok)
                  }
                }}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Yes, delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {vitalsDialog.open && vitalsDialog.token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="font-semibold text-slate-800">
                Vitals - {vitalsDialog.token.patient} ({vitalsDialog.token.mrNo})
              </div>
              <button type="button" onClick={()=>setVitalsDialog({ open: false, token: null })} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-5">
              <PrescriptionVitals ref={vitalsRef} />
              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={()=>setVitalsDialog({ open: false, token: null })} className="btn-outline-navy">Cancel</button>
                <button type="button" onClick={saveVitals} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Vitals</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function ActionBtn({ onClick, icon, title, color = 'blue' }: { onClick: any, icon: any, title: string, color?: string }) {
  const colors: any = {
    blue: 'text-blue-500 hover:bg-blue-50',
    emerald: 'text-emerald-500 hover:bg-emerald-50',
    violet: 'text-violet-500 hover:bg-violet-50',
    rose: 'text-rose-500 hover:bg-rose-50',
    amber: 'text-amber-500 hover:bg-amber-50',
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${colors[color] || colors.blue}`}
    >
      {icon}
    </button>
  )
}

function WidgetCard({ title, value, icon, color }: { title: string, value: any, icon: any, color: string }) {
  const colors: any = {
    blue: 'bg-blue-500 shadow-blue-100',
    emerald: 'bg-emerald-500 shadow-emerald-100',
    violet: 'bg-violet-500 shadow-violet-100',
    indigo: 'bg-indigo-500 shadow-indigo-100',
    orange: 'bg-orange-500 shadow-orange-100',
    amber: 'bg-amber-500 shadow-amber-100',
  }
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-100 group">
      <div className="relative z-10 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${colors[color] || colors.blue}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-lg font-black text-slate-800">{value}</p>
        </div>
      </div>
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-5 ${colors[color] || colors.blue}`}></div>
    </div>
  )
}
