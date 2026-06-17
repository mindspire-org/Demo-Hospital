import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, FileDown, Printer, Pencil, Barcode, Clock, Calendar } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { labApi } from '../../utils/api'
import { previewLabReportPdf, downloadLabReportPdf, type ReportRow } from '../../utils/printLabReport'
import Lab_TrackDialog from '../../components/lab/lab_TrackDialog'
import { useLabSession } from '../../hooks/useLabSession'

type ResultRow = { id: string; test: string; normal?: string; unit?: string; value?: string; comment?: string; flag?: 'normal'|'abnormal'|'critical'; sectionKey?: string; profile?: string }

type ResultRecord = { id: string; orderId: string; testId?: string; testName?: string; rows: ResultRow[]; interpretation?: string; createdAt: string; submittedBy?: string; approvedBy?: string; approvedAt?: string; reportStatus?: 'pending' | 'approved' }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; mrn?: string; age?: string; gender?: string; address?: string; cnic?: string; guardianName?: string }
  tests: Array<string | { testId: string; testName: string; price: number }>
  status: 'received'|'completed'
  tokenNo?: string
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
  barcode?: string
  sampleType?: 'normal' | 'urgent' | 'stat'
  billingType?: 'Cash' | 'Card' | 'Corporate' | 'Free' | string
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
}

type Track = { status: 'received' | 'completed'; sampleTime?: string; reportingTime?: string; tokenNo: string }

type LabTest = { id: string; name: string; category?: string; sections?: any[] }

function parseRange(r?: string) {
  if (!r) return null
  const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/)
  if (!m) return null
  return { min: Number(m[1]), max: Number(m[2]) }
}

function rowFlag(r: ResultRow) {
  if (r.flag === 'critical') return 'critical'
  if (r.flag === 'abnormal') return 'abnormal'
  if (r.flag === 'normal') return 'normal'
  if (!r.value) return 'unknown'
  const num = Number(r.value)
  if (Number.isNaN(num)) return 'unknown'
  const range = parseRange(r.normal)
  if (!range) return 'unknown'
  if (num < range.min || num > range.max) return 'abnormal'
  return 'normal'
}

function formatDateTime(iso: string) { const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString() }

function buildPrintRows(sourceRows: any[], testDef: any) {
  const sections = testDef?.sections || []
  const unsectioned: any[] = []
  const sectionGroups: Record<string, any[]> = {}
  for (const r of sourceRows) {
    const sk = r.sectionKey || ''
    if (!sk) unsectioned.push(r)
    else {
      if (!sectionGroups[sk]) sectionGroups[sk] = []
      sectionGroups[sk].push(r)
    }
  }

  const out: any[] = []
  const mapRow = (r:any) => ({
    test: r.test,
    normal: r.normal,
    unit: r.unit,
    value: r.value,
    prevValue: r.prevValue,
    flag: r.flag,
    comment: r.comment,
    profile: r.profile,
  })
  
  unsectioned.forEach(r => out.push(mapRow(r)))
  
  sections.forEach((sec: any) => {
    const secRows = sectionGroups[sec.key] || []
    if (secRows.length > 0) {
      out.push({ isSection: true, test: sec.title })
      secRows.forEach(r => out.push(mapRow(r)))
    }
  })
  return out
}

function genBarcode(order?: Order) {
  if (!order) return '-'
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

export default function Lab_ReportGenerator() {
  const session = useLabSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackTokenNo, setTrackTokenNo] = useState<string | null>(null)
  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await labApi.listResults({ orderId, limit: 1 })
        const rec = Array.isArray(res?.items) && res.items.length ? res.items[0] : null
        const status = String(rec?.reportStatus || 'pending')
        if (!cancelled && status !== 'approved') {
          navigate(`/lab/report-approval?orderId=${encodeURIComponent(orderId)}`)
        }
      } catch {
        if (!cancelled) navigate(`/lab/report-approval?orderId=${encodeURIComponent(orderId)}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, navigate])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [rowsPer, setRowsPer] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const reqSeq = useRef(0)

  // Filters/search
  const [q, setQ] = useState('')
  const [flag, setFlag] = useState<'all'|'normal'|'abnormal'|'critical'|'unknown'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'all'|'paid'|'partial'|'free'|'discounted'>('all')

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const my = ++reqSeq.current
        const [resRes, ordRes, tstRes] = await Promise.all([
          labApi.listResults({ page, limit: rowsPer, reportStatus: 'approved', from: fromDate || undefined, to: toDate || undefined }),
          labApi.listOrders({ limit: 500 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted || my !== reqSeq.current) return
        const list = (resRes.items||[])
          .map((r:any)=>({
            id: r._id,
            orderId: r.orderId,
            testId: r.testId,
            testName: r.testName,
            rows: r.rows||[],
            interpretation: r.interpretation,
            createdAt: r.createdAt || new Date().toISOString(),
            submittedBy: r.submittedBy,
            approvedBy: r.approvedBy,
            approvedAt: r.approvedAt,
            reportStatus: r.reportStatus || 'pending'
          }))
        setResults(list)
        setTotal(Number(resRes.total || list.length || 0))
        setTotalPages(Number(resRes.totalPages || 1))
        const o: Order[] = (ordRes.items||[]).map((x:any)=>({ 
          id: x._id, 
          createdAt: x.createdAt || new Date().toISOString(), 
          patient: x.patient || { fullName: '-', phone: '' }, 
          tests: x.tests||[], 
          status: x.status || 'received', 
          tokenNo: x.tokenNo, 
          sampleTime: x.sampleTime, 
          reportingTime: x.reportingTime, 
          referringConsultant: x.referringConsultant, 
          barcode: x.barcode,
          billingType: x.billingType,
          discount: Number(x.discount || 0),
          net: Number(x.net || 0),
          receivedAmount: Number(x.receivedAmount || 0),
          receivableAmount: Number(x.receivableAmount || 0),
        }))
        setOrders(o)
        setTests((tstRes.items||[]).map((t:any)=>({ id: t._id, name: t.name, category: t.category||'', sections: t.sections||[] })))
      } catch (e){ console.error(e); setResults([]); setOrders([]); setTests([]) }
    })()
    return ()=>{ mounted = false }
  }, [page, rowsPer, fromDate, toDate])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try { const s = await labApi.getSettings(); if (mounted) setSettings(s) } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  const ordersMap = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o])), [orders])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])
  const testDefMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t])), [tests])
  const track = useMemo<Record<string, Track>>(()=> Object.fromEntries(orders.map(o=> [o.id, { status: o.status, tokenNo: o.tokenNo || `D${new Date(o.createdAt).getDate().toString().padStart(2,'0')}${(new Date(o.createdAt).getMonth()+1).toString().padStart(2,'0')}${new Date(o.createdAt).getFullYear()}_${o.id.slice(-3)}`, sampleTime: o.sampleTime, reportingTime: o.reportingTime } as Track ])), [orders])

  type Enriched = { r: ResultRecord; order: Order | undefined; track: Track | undefined; flag: 'normal'|'abnormal'|'critical'|'unknown'; testsStr: string }
  const enriched: Enriched[] = useMemo(() => results.map((r) => {
    const order = ordersMap[r.orderId]
    const tr = track[r.orderId]
    const flagAgg = r.rows.reduce<'critical'|'abnormal'|'normal'|'unknown'>((acc, row) => {
      const f = rowFlag(row)
      if (f === 'critical') return 'critical'
      if (f === 'abnormal' && acc !== 'critical') return 'abnormal'
      if (f === 'normal' && acc === 'unknown') return 'normal'
      return acc
    }, 'unknown')
    // Use result's testName if available, otherwise fall back to matching from order tests
    let testsStr = ''
    if (r.testName) {
      testsStr = r.testName
    } else {
      const resultTestNames = new Set(r.rows.map((row: any) => String(row.test).toLowerCase()))
      const filteredTests = order?.tests.filter((t: any) => {
        const tname = typeof t === 'object' && t?.testName ? t.testName : testsMap[typeof t === 'object' ? t.testId : String(t)]
        return resultTestNames.has(String(tname || '').toLowerCase())
      })
      testsStr = filteredTests?.map((t: any) => {
        if (typeof t === 'object' && t?.testId) {
          return t.testName || testsMap[t.testId] || t.testId
        }
        return testsMap[t] || t
      }).filter(Boolean).join(', ') || ''
    }
    return { r, order, track: tr, flag: flagAgg, testsStr }
  }), [results, ordersMap, track, testsMap])

  const filtered = useMemo(() => enriched.filter(e => {
    if (flag !== 'all' && e.flag !== flag) return false
    if (paymentStatus !== 'all') {
      const o = e.order
      const net = o?.net || 0
      const received = o?.receivedAmount || 0
      const discount = o?.discount || 0
      const billingType = (o?.billingType || '').toLowerCase()
      if (paymentStatus === 'free' && billingType !== 'free') return false
      if (paymentStatus === 'discounted' && discount <= 0) return false
      if (paymentStatus === 'paid' && (received < net || net === 0)) return false
      if (paymentStatus === 'partial' && (received >= net || received === 0)) return false
    }
    const term = q.trim().toLowerCase()
    if (!term) return true
    return (
      e.order?.patient.fullName.toLowerCase().includes(term) ||
      (e.order?.patient.phone || '').toLowerCase().includes(term) ||
      (e.order?.patient.mrn || '').toLowerCase().includes(term) ||
      (e.track?.tokenNo || '').toLowerCase().includes(term) ||
      (e.order?.barcode || '').toLowerCase().includes(term) ||
      e.testsStr.toLowerCase().includes(term)
    )
  }), [enriched, q, flag, paymentStatus])

  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rowsPer + 1, total)
  const end = Math.min((curPage - 1) * rowsPer + filtered.length, total)
  const items = filtered

  const printCollectiveReport = async (orderId: string) => {
    const o = ordersMap[orderId]
    if (!o) return
    const tr = track[orderId]
    try {
      const res: any = await labApi.listResults({ orderId: o.id, reportStatus: 'approved', limit: 100 })
      const allResults: ResultRecord[] = (res?.items || []).filter((r: any) => String(r.reportStatus) === 'approved')
      
      if (allResults.length === 0) {
        alert('No approved results found for this order.')
        return
      }

      // Merge rows from all results
      const mergedRows: ReportRow[] = allResults.flatMap(r => buildPrintRows(r.rows || [], testDefMap[r.testId || '']))
      
      // Combined test list for header
      const combinedTests = allResults.map(r => r.testName).filter(Boolean).join(', ')
      
      await previewLabReportPdf({
        tokenNo: tr?.tokenNo || '-',
        barcode: o.barcode,
        createdAt: o.createdAt,
        sampleTime: tr?.sampleTime,
        reportingTime: tr?.reportingTime,
        approvedAt: allResults[0].approvedAt,
        patient: {
          fullName: o.patient.fullName,
          phone: o.patient.phone,
          mrn: o.patient.mrn,
          age: o.patient.age,
          gender: o.patient.gender,
          address: o.patient.address,
        },
        rows: mergedRows,
        interpretation: allResults.map(r => r.interpretation).filter(Boolean).join('\n---\n'),
        referringConsultant: o.referringConsultant,
        submittedBy: allResults[0].submittedBy,
        approvedBy: allResults[0].approvedBy,
        profileLabel: combinedTests || 'Collective Report',
      })
    } catch (err) {
      console.error('Failed to generate collective report:', err)
      alert('Failed to generate collective report.')
    }
  }

  const printRow = async (e: Enriched) => {
    const o = e.order; if (!o) return
    const s: any = settings || await labApi.getSettings().catch(()=>({}))
    
    // Check if we should merge reports for the same order
    if (s?.mergeReportsByPatient) {
      try {
        // Fetch all results for this order
        const res: any = await labApi.listResults({ orderId: o.id, reportStatus: 'approved', limit: 100 })
        const allResults: ResultRecord[] = (res?.items || []).filter((r: any) => String(r.reportStatus) === 'approved')
        
        if (allResults.length > 1) {
          // Merge rows from all results
          const mergedRows: ReportRow[] = allResults.flatMap(r => (r.rows || []).map(row => ({
            test: row.test,
            normal: row.normal,
            unit: row.unit,
            value: row.value,
            prevValue: (row as any).prevValue,
            flag: row.flag,
            comment: row.comment,
          })))
          
          // Use first result's metadata but combined test list
          const combinedTests = allResults.map(r => r.testName).filter(Boolean).join(', ')
          
          await previewLabReportPdf({
            tokenNo: e.track?.tokenNo || '-',
            barcode: o.barcode,
            createdAt: o.createdAt,
            sampleTime: e.track?.sampleTime,
            reportingTime: e.track?.reportingTime,
            approvedAt: allResults[0].approvedAt, // Use latest or first approved time
            patient: {
              fullName: o.patient.fullName,
              phone: o.patient.phone,
              mrn: o.patient.mrn,
              age: o.patient.age,
              gender: o.patient.gender,
              address: o.patient.address,
            },
            rows: mergedRows,
            interpretation: allResults.map(r => r.interpretation).filter(Boolean).join('\n---\n'),
            referringConsultant: o.referringConsultant,
            submittedBy: allResults[0].submittedBy,
            approvedBy: allResults[0].approvedBy,
            profileLabel: combinedTests || e.testsStr,
          })
          return
        }
      } catch (err) {
        console.error('Failed to merge reports:', err)
      }
    }

    // Default: Print single report
    const testDef = testDefMap[e.r.testId || '']
    const printRows = buildPrintRows(e.r.rows || [], testDef)
    
    await previewLabReportPdf({
      tokenNo: e.track?.tokenNo || '-',
      barcode: o.barcode,
      createdAt: o.createdAt,
      sampleTime: e.track?.sampleTime,
      reportingTime: e.track?.reportingTime,
      approvedAt: e.r.approvedAt,
      patient: {
        fullName: o.patient.fullName,
        phone: o.patient.phone,
        mrn: o.patient.mrn,
        age: o.patient.age,
        gender: o.patient.gender,
        address: o.patient.address,
      },
      rows: printRows,
      interpretation: e.r.interpretation,
      referringConsultant: o.referringConsultant,
      submittedBy: e.r.submittedBy,
      approvedBy: e.r.approvedBy,
      profileLabel: e.testsStr,
    })
  }

  const downloadRowPdf = async (e: Enriched) => {
    const o = e.order; if (!o) return
    const s: any = settings || await labApi.getSettings().catch(()=>({}))

    // Check if we should merge reports for the same order
    if (s?.mergeReportsByPatient) {
      try {
        // Fetch all results for this order
        const res: any = await labApi.listResults({ orderId: o.id, reportStatus: 'approved', limit: 100 })
        const allResults: ResultRecord[] = (res?.items || []).filter((r: any) => String(r.reportStatus) === 'approved')
        
        if (allResults.length > 1) {
          // Merge rows from all results
          const mergedRows: ReportRow[] = allResults.flatMap(r => (r.rows || []).map(row => ({
            test: row.test,
            normal: row.normal,
            unit: row.unit,
            value: row.value,
            prevValue: (row as any).prevValue,
            flag: row.flag,
            comment: row.comment,
          })))
          
          // Use first result's metadata but combined test list
          const combinedTests = allResults.map(r => r.testName).filter(Boolean).join(', ')
          
          await downloadLabReportPdf({
            tokenNo: e.track?.tokenNo || '-',
            barcode: o.barcode,
            createdAt: o.createdAt,
            sampleTime: e.track?.sampleTime,
            reportingTime: e.track?.reportingTime,
            approvedAt: allResults[0].approvedAt,
            patient: {
              fullName: o.patient.fullName,
              phone: o.patient.phone,
              mrn: o.patient.mrn,
              age: o.patient.age,
              gender: o.patient.gender,
              address: o.patient.address,
            },
            rows: mergedRows,
            interpretation: allResults.map(r => r.interpretation).filter(Boolean).join('\n---\n'),
            referringConsultant: o.referringConsultant,
            submittedBy: allResults[0].submittedBy,
            approvedBy: allResults[0].approvedBy,
            profileLabel: combinedTests || e.testsStr,
          })
          return
        }
      } catch (err) {
        console.error('Failed to merge reports during download:', err)
      }
    }

    // Default: Download single report
    const testDef = testDefMap[e.r.testId || '']
    const printRows = buildPrintRows(e.r.rows || [], testDef)
    
    await downloadLabReportPdf({
      tokenNo: e.track?.tokenNo || '-',
      barcode: o.barcode,
      createdAt: o.createdAt,
      sampleTime: e.track?.sampleTime,
      reportingTime: e.track?.reportingTime,
      approvedAt: e.r.approvedAt,
      patient: {
        fullName: o.patient.fullName,
        phone: o.patient.phone,
        mrn: o.patient.mrn,
        age: o.patient.age,
        gender: o.patient.gender,
        address: o.patient.address,
      },
      rows: printRows,
      interpretation: e.r.interpretation,
      referringConsultant: o.referringConsultant,
      submittedBy: e.r.submittedBy,
      approvedBy: e.r.approvedBy,
      profileLabel: e.testsStr,
    })
  }

  const printCriticalList = () => {
    const crit = filtered.filter(e => e.flag === 'critical')
    const flatRows = crit.flatMap((e)=> e.r.rows.filter(r => rowFlag(r)==='critical').map(r=> ({ e, r })))
    const total = flatRows.length
    const now = new Date()
    const minDate = crit.length? new Date(Math.min(...crit.map(x=> new Date(x.r.createdAt).getTime()))) : null
    const maxDate = crit.length? new Date(Math.max(...crit.map(x=> new Date(x.r.createdAt).getTime()))) : null
    const fmt = (d: Date)=> d.toLocaleDateString()
    const rightNow = now.toLocaleDateString() + ' ' + now.toLocaleTimeString()
    const labName = (settings?.labName || 'Lab').toUpperCase()
    const getCategory = (e: Enriched, rowTest: string) => {
      const testList = e.order?.tests || []
      for (const testItem of testList){
        const tid = typeof testItem === 'object' && testItem?.testId ? testItem.testId : String(testItem)
        const t = tests.find(tt=>tt.id===tid)
        if (!t) continue
        if (t.name && (rowTest?.toLowerCase()||'').includes(t.name.toLowerCase())) return t.category || ''
      }
      const firstTest = testList[0]
      const firstId = firstTest ? (typeof firstTest === 'object' && firstTest?.testId ? firstTest.testId : String(firstTest)) : ''
      return (tests.find(tt=> tt.id === firstId)?.category) || ''
    }
    const getTestName = (e: Enriched, rowTest: string) => {
      const testList = e.order?.tests || []
      for (const testItem of testList){
        const tid = typeof testItem === 'object' && testItem?.testId ? testItem.testId : String(testItem)
        const t = tests.find(tt=>tt.id===tid)
        if (t && rowTest && rowTest.toLowerCase().includes((t.name||'').toLowerCase())) return t.name
      }
      return rowTest || ''
    }
    const rowsHtml = flatRows.map(({ e, r }, idx) => {
      const cat = esc(getCategory(e, r.test))
      const tname = esc(getTestName(e, r.test))
      return `<tr>
        <td class="cell">${idx+1}</td>
        <td class="cell">${esc(e.order?.patient.mrn || '')}</td>
        <td class="cell">${esc(e.track?.tokenNo || '')}</td>
        <td class="cell">${esc(new Date(e.r.createdAt).toLocaleDateString())}</td>
        <td class="cell">${esc(e.track?.reportingTime || '')}</td>
        <td class="cell">${esc(e.order?.patient.fullName || '')}</td>
        <td class="cell">${esc(e.order?.referringConsultant || '')}</td>
        <td class="cell">${cat}</td>
        <td class="cell">${tname}</td>
        <td class="cell">${esc(r.value || '')}</td>
        <td class="cell">${esc(r.normal || '')}</td>
      </tr>`
    }).join('')

    const win = window.open('', 'print', 'width=1000,height=700')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Critical Test Results</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827;margin:16px}
      .row{display:flex;justify-content:space-between;align-items:flex-start}
      .title{font-size:20px;font-weight:800;letter-spacing:.5px}
      .sub{font-size:12px;color:#475569}
      .bar{margin:10px 0;padding:6px 10px;background:#111827;color:#fff;font-weight:700;text-align:center;border:1px solid #111827}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #111827;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}
      .cell{white-space:nowrap}
      .footer{display:flex;justify-content:flex-end;align-items:center;margin-top:8px;border-top:2px solid #111827;padding-top:6px;font-weight:700}
    </style></head><body>`)
    win.document.write(`<div class="row">
      <div>
        <div class="title">${esc(labName)}</div>
      </div>
      <div style="text-align:right">
        <div class="sub">${rightNow}</div>
        <div class="sub"><strong>DURATION</strong> ${minDate && maxDate ? `(From ${fmt(minDate)} To ${fmt(maxDate)})` : '(All)'}</div>
      </div>
    </div>`)
    win.document.write(`<div class="bar">CRITICAL TEST RESULTS</div>`)
    win.document.write(`<table><thead><tr>
      <th>SMP #</th>
      <th>MR NO</th>
      <th>LAB #</th>
      <th>DATE</th>
      <th>REPORT TIME</th>
      <th>PATIENT NAME</th>
      <th>CONSULTANT</th>
      <th>HEADER</th>
      <th>TEST NAME</th>
      <th>RESULT</th>
      <th>REF. VALUE</th>
    </tr></thead><tbody>
      ${rowsHtml || `<tr><td colspan="11" style="text-align:center;padding:10px;color:#64748b">No critical results</td></tr>`}
    </tbody></table>`)
    win.document.write(`<div class="footer">TOTAL TESTS .&nbsp;&nbsp; ${total}</div>`)
    win.document.write('</body></html>'); win.document.close(); win.focus(); win.print();
  }

  

  const printList = () => {
    const win = window.open('', 'print', 'width=900,height=700')
    if (!win) return
    const rowsHtml = filtered.map((e, idx) => `<tr>
      <td>${idx+1}</td>
      <td>${formatDateTime(e.r.createdAt)}</td>
      <td>${esc(e.order?.patient.fullName || '-')}</td>
      <td>${esc(e.order?.patient.mrn || '-')}</td>
      <td>${esc(e.track?.tokenNo || '-')}</td>
      <td>${esc(e.testsStr || '-')}</td>
      <td>${esc(e.track?.reportingTime || '-')}</td>
      <td>${e.flag}</td>
    </tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Reports</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}
      th{background:#f8fafc}
    </style></head><body>`)
    win.document.write(`<h1>Report Register</h1>`)
    win.document.write(`<table><thead><tr><th>SR</th><th>Date</th><th>Patient</th><th>MR No</th><th>Token</th><th>Tests</th><th>Reporting Time</th><th>Flag</th></tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>'); win.document.close(); win.focus(); win.print();
  }

  const flagBadge = (f: string) => {
    const cls = f === 'critical' ? 'bg-rose-100 text-rose-700' : f === 'abnormal' ? 'bg-amber-100 text-amber-700' : f === 'normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{f}</span>
  }

  const payBadge = (o: Order | undefined) => {
    if (!o) return null
    const bt = (o.billingType || '').toLowerCase()
    const net = o.net || 0; const received = o.receivedAmount || 0; const discount = o.discount || 0
    if (bt === 'free') return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-violet-100 text-violet-700">Free</span>
    if (discount > 0 && received >= net) return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-sky-100 text-sky-700">Discounted</span>
    if (net > 0 && received >= net) return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">Paid</span>
    if (received > 0 && received < net) return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700">Partial</span>
    return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-500">{o.billingType || '-'}</span>
  }

  const typeBadge = (o: Order | undefined) => {
    const st = o?.sampleType || 'normal'
    const cls = st === 'urgent' ? 'bg-rose-100 text-rose-700' : st === 'stat' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{st}</span>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Report Generator</h2>
            <p className="mt-0.5 text-sm text-sky-100">Search, preview and print approved lab reports</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{session.role}</span>
            <button onClick={()=>{ flag==='critical' ? printCriticalList() : printList() }} className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/30 transition-colors">
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end gap-3 p-4">
          {/* Search */}
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="Name, token, barcode, MR, test…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-1.5 basis-auto shrink-0">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
              className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <span className="text-slate-300 font-medium">–</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
              className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          {/* Flag filter */}
          <select value={flag} onChange={e => { setFlag(e.target.value as any); setPage(1) }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="all">All Flags</option>
            <option value="normal">Normal</option>
            <option value="abnormal">Abnormal</option>
            <option value="critical">Critical</option>
            <option value="unknown">Unknown</option>
          </select>
          {/* Payment filter */}
          <select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value as any); setPage(1) }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial / Pending</option>
            <option value="discounted">Discounted</option>
            <option value="free">Free</option>
          </select>
          <button onClick={() => { setFromDate(''); setToDate(''); setQ(''); setFlag('all'); setPaymentStatus('all'); setPage(1) }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 shrink-0">
            Clear
          </button>
        </div>
        {/* Active filter chips */}
        {(q || fromDate || toDate || flag !== 'all' || paymentStatus !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Active:</span>
            {q && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Search: {q}</span>}
            {(fromDate || toDate) && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700"><Calendar className="h-3 w-3" />{fromDate || '…'} – {toDate || '…'}</span>}
            {flag !== 'all' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Flag: {flag}</span>}
            {paymentStatus !== 'all' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Payment: {paymentStatus}</span>}
            <span className="ml-auto text-xs text-slate-500 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* ── Table (desktop) / Cards (mobile) ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60">
              <tr className="text-left">
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Patient</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">MR / Token</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Barcode</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 max-w-[180px]">Test</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Flag</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((e, idx) => (
                <tr key={e.r.id} className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${e.flag === 'critical' ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}>
                  <td className="px-3 py-2.5 text-xs font-medium text-slate-400">{start + idx}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{formatDateTime(e.r.createdAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 dark:text-white">{e.order?.patient.fullName || '-'}</div>
                    {e.order?.patient.phone && <div className="text-xs text-slate-400">{e.order.patient.phone}</div>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300">{e.order?.patient.mrn || '-'}</div>
                    <div className="text-xs text-slate-400">{e.track?.tokenNo || '-'}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <Barcode className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {e.order?.barcode || genBarcode(e.order)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{typeBadge(e.order)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{payBadge(e.order)}</td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <div className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300">{e.testsStr || '-'}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{flagBadge(e.flag)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${e.r.reportStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {e.r.reportStatus || 'pending'}
                      {e.r.reportStatus === 'approved' && e.r.approvedBy ? ` · ${e.r.approvedBy}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { const t = String(e.track?.tokenNo || '').trim(); if (!t) return; setTrackTokenNo(t); setTrackOpen(true) }} title="Tracking" aria-label="Tracking" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"><Clock className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => downloadRowPdf(e)} title="Download PDF" aria-label="Download PDF" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-sky-600 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"><FileDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => printRow(e)} title="Print" aria-label="Print" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"><Printer className="h-3.5 w-3.5" /></button>
                      {(e.order?.tests?.length || 0) > 1 && (
                        <button type="button" onClick={() => printCollectiveReport(e.r.orderId)} title="Collective Report" aria-label="Collective Report" className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 text-[9px] font-black uppercase tracking-wider text-violet-700 hover:bg-violet-100 transition-colors dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300"><FileDown className="h-3 w-3" />All</button>
                      )}
                      <button type="button" onClick={() => navigate(`/lab/results?orderId=${e.r.orderId}`)} title="Edit" aria-label="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-600 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-medium">No reports match your filters</p>
              <button onClick={() => { setQ(''); setFlag('all'); setPaymentStatus('all'); setFromDate(''); setToDate(''); setPage(1) }} className="text-xs font-semibold text-violet-600 hover:underline">Clear filters</button>
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-medium">No reports found</p>
            </div>
          )}
          {items.map((e, idx) => (
            <div key={e.r.id} className={`p-4 space-y-3 ${e.flag === 'critical' ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}>
              {/* Row 1: number + patient + flag */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs font-bold text-slate-400 w-5 shrink-0">{start + idx}</span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{e.order?.patient.fullName || '-'}</div>
                    <div className="text-xs text-slate-500">{e.order?.patient.phone || ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">{flagBadge(e.flag)}{payBadge(e.order)}</div>
              </div>
              {/* Row 2: meta chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{e.order?.patient.mrn || '-'}</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{e.track?.tokenNo || '-'}</span>
                {typeBadge(e.order)}
                <span>{formatDateTime(e.r.createdAt)}</span>
              </div>
              {/* Row 3: tests */}
              {e.testsStr && <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{e.testsStr}</div>}
              {/* Row 4: action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => { const t = String(e.track?.tokenNo || '').trim(); if (!t) return; setTrackTokenNo(t); setTrackOpen(true) }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700"><Clock className="h-3.5 w-3.5" />Track</button>
                <button type="button" onClick={() => printRow(e)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700"><Printer className="h-3.5 w-3.5" />Print</button>
                <button type="button" onClick={() => downloadRowPdf(e)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700"><FileDown className="h-3.5 w-3.5" />PDF</button>
                <button type="button" onClick={() => navigate(`/lab/results?orderId=${e.r.orderId}`)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700"><Pencil className="h-3.5 w-3.5" />Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {total === 0 ? 'No results' : <><span className="font-semibold text-slate-900 dark:text-white">{start}–{end}</span> of <span className="font-semibold text-slate-900 dark:text-white">{total}</span> results</>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="min-w-[80px] text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            {page} / {Math.max(1, pageCount)}
          </span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <select value={rowsPer} onChange={e => { setRowsPer(Number(e.target.value)); setPage(1) }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      </div>
      <Lab_TrackDialog open={trackOpen} onClose={() => setTrackOpen(false)} tokenNo={trackTokenNo || undefined} />
    </div>
  )
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
