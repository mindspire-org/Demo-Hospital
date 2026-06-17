import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporateDashboard(){
  const today = new Date().toISOString().slice(0,10)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ companyId: string; from: string; to: string }>({ companyId: '', from: '', to: '' })
  const [outstandingRows, setOutstandingRows] = useState<Array<{ companyId: string; companyName: string; outstanding: number; accrued?: number; claimed?: number; paid?: number }>>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [paidTotal, setPaidTotal] = useState(0)
  const [claims, setClaims] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Date range defaults to last 30 days
  useEffect(() => {
    const to = today
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
    setFilters(s => ({ ...s, from, to }))
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [cRes] = await Promise.all([
          corporateApi.listCompanies() as any,
        ])
        if (!mounted) return
        setCompanies((cRes?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))
      } catch { /* ignore */ }
    })()
    return ()=>{ mounted=false }
  }, [])

  async function apply(){
    setLoading(true)
    try {
      const params = { companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined }
      const [oRes, txRes, payRes, claimsRes] = await Promise.all([
        corporateApi.reportsOutstanding(params as any) as any,
        corporateApi.listTransactions({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
        corporateApi.listPayments({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
        corporateApi.listClaims({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
      ])
      setOutstandingRows(oRes?.rows || [])
      const setP = new Set<string>()
      const txs = txRes?.transactions || []
      for (const t of txs){
        const mrn = String(t.patientMrn||'').trim()
        if (mrn) setP.add(mrn)
      }
      setTotalPatients(setP.size)
      const pays: any[] = (payRes?.payments || payRes?.items || payRes || []) as any[]
      const sum = pays.reduce((s,p)=> s + Number(p?.amount||0), 0)
      setPaidTotal(sum)
      setPayments(pays)
      setTransactions(txs)
      setClaims(claimsRes?.items || claimsRes?.claims || [])
    } catch { 
      setOutstandingRows([]); setTotalPatients(0)
      setPayments([]); setTransactions([]); setClaims([])
    }
    setLoading(false)
  }
  useEffect(()=>{ apply() }, [filters.companyId])

  const totalOutstanding = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.outstanding||0), 0), [outstandingRows])
  const claimedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.claimed||0), 0), [outstandingRows])
  const accruedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.accrued||0), 0), [outstandingRows])

  // Claims status breakdown
  const claimsByStatus = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    for (const c of claims) {
      const status = c.status || 'unknown'
      if (!map[status]) map[status] = { count: 0, amount: 0 }
      map[status].count++
      map[status].amount += Number(c.totalAmount || 0)
    }
    return map
  }, [claims])

  const claimStatusColors: Record<string, string> = {
    open: '#3B82F6',
    locked: '#8B5CF6',
    'partially-paid': '#F59E0B',
    paid: '#10B981',
    rejected: '#EF4444'
  }

  // Collection metrics
  const collectionRate = useMemo(() => {
    if (!claimedTotal) return 0
    return (paidTotal / claimedTotal) * 100
  }, [paidTotal, claimedTotal])

  const avgClaimSize = useMemo(() => {
    if (!claims.length) return 0
    return claimedTotal / claims.length
  }, [claims.length, claimedTotal])

  const pendingClaimsCount = useMemo(() => {
    return claims.filter(c => c.status === 'open' || c.status === 'locked').length
  }, [claims])

  const totalDiscount = useMemo(() => {
    return payments.reduce((s, p) => s + Number(p.discount || 0), 0)
  }, [payments])

  // Aging analysis
  const agingBuckets = useMemo(() => {
    const now = new Date()
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    for (const t of transactions) {
      if (t.status === 'paid') continue
      const date = new Date(t.dateIso || t.createdAt || t.date)
      const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      const due = Math.max(0, Number(t.netToCorporate || 0) - Number(t.paidAmount || 0))
      if (days <= 30) buckets['0-30'] += due
      else if (days <= 60) buckets['31-60'] += due
      else if (days <= 90) buckets['61-90'] += due
      else buckets['90+'] += due
    }
    return buckets
  }, [transactions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Corporate Dashboard</h2>
        {loading && <span className="text-sm text-slate-500 dark:text-slate-400">Loading...</span>}
      </div>

      {/* Filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 items-end">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Company</label>
            <select value={filters.companyId} onChange={e=>setFilters(s=>({ ...s, companyId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">From</label>
            <input type="date" value={filters.from} onChange={e=>setFilters(s=>({ ...s, from: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">To</label>
            <input type="date" value={filters.to} onChange={e=>setFilters(s=>({ ...s, to: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={apply} className="btn">Apply</button>
            <button onClick={() => { setFilters({ companyId: '', from: '', to: '' }); setTimeout(apply, 0) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Reset</button>
          </div>
        </div>
      </section>

      {/* Enhanced KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPI title="Total Outstanding" value={formatPKR(totalOutstanding)} tone="bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800" subtext="Awaiting payment" />
        <KPI title="Claimable (Accrued)" value={formatPKR(accruedTotal)} tone="bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800" subtext="Ready to claim" />
        <KPI title="Claimed" value={formatPKR(claimedTotal)} tone="bg-violet-50 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800" subtext="Submitted to companies" />
        <KPI title="Paid" value={formatPKR(paidTotal)} tone="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800" subtext="Received from companies" />
        <KPI title="Collection Rate" value={`${collectionRate.toFixed(1)}%`} tone="bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800" subtext="Paid / Claimed" />
        <KPI title="Avg Claim Size" value={formatPKR(avgClaimSize)} tone="bg-pink-50 border-pink-200 dark:bg-pink-900/30 dark:border-pink-800" subtext="Per claim average" />
        <KPI title="Pending Claims" value={String(pendingClaimsCount)} tone="bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800" subtext="Open or locked" />
        <KPI title="Total Discounts" value={formatPKR(totalDiscount)} tone="bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800" subtext="Forgiven amount" />
        <KPI title="Total Patients" value={String(totalPatients)} tone="bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800" subtext="Unique patients" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Claims Status Breakdown */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Claims by Status</div>
          {Object.keys(claimsByStatus).length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No claims data</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(claimsByStatus).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: claimStatusColors[status] || '#94a3b8' }} />
                    <span className="text-sm capitalize dark:text-slate-300">{status.replace(/-/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium dark:text-slate-200">{formatPKR(data.amount)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{data.count} claims</div>
                  </div>
                </div>
              ))}
              <MiniPieChart data={Object.entries(claimsByStatus).map(([k, v]) => ({ label: k, value: v.amount, color: claimStatusColors[k] || '#94a3b8' }))} />
            </div>
          )}
        </section>

        {/* Aging Analysis */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Aging Analysis (Days)</div>
          <div className="space-y-3">
            {Object.entries(agingBuckets).map(([bucket, amount]) => {
              const max = Math.max(...Object.values(agingBuckets), 1)
              const pct = (amount / max) * 100
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="dark:text-slate-300">{bucket} days</span>
                    <span className="font-medium dark:text-slate-200">{formatPKR(amount)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-2 rounded-full ${bucket === '90+' ? 'bg-red-500' : bucket === '61-90' ? 'bg-orange-500' : bucket === '31-60' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Summary Bar Chart */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Financial Overview</div>
          <FourBars
            data={[
              { label: 'Outstanding', value: totalOutstanding, color: '#F59E0B' },
              { label: 'Claimable', value: accruedTotal, color: '#0EA5E9' },
              { label: 'Claimed', value: claimedTotal, color: '#8B5CF6' },
              { label: 'Paid', value: paidTotal, color: '#10B981' },
            ]}
          />
        </section>
      </div>

    </div>
  )
}

function KPI({ title, value, tone, subtext }: { title: string; value: string; tone?: string; subtext?: string }){
  return (
    <div className={`rounded-lg border p-4 ${tone || 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</div>}
    </div>
  )
}

function FourBars({ data }: { data: Array<{ label: string; value: number; color: string }> }){
  const W = 640, H = 220
  const padX = 40, padTop = 20, padBottom = 36
  const innerH = H - padTop - padBottom
  const maxV = Math.max(1, ...data.map(d => Number(d.value || 0)))
  const gap = 24
  const barW = (W - padX * 2 - gap * (data.length - 1)) / data.length
  return (
    <div className="w-full">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <line x1={padX} y1={padTop + innerH} x2={W - padX} y2={padTop + innerH} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const x = padX + i * (barW + gap)
          const h = (Number(d.value || 0) / maxV) * innerH
          const y = padTop + innerH - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={4} fill={d.color}>
                <title>{`${d.label}: ${formatPKR(Number(d.value || 0))}`}</title>
              </rect>
              <text x={x + barW / 2} y={Math.max(10, y - 6)} textAnchor="middle" fontSize="10" fill="#111827">{formatPKR(Number(d.value || 0))}</text>
              <text x={x + barW / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="#374151">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

//

function MiniPieChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  
  const size = 120
  const center = size / 2
  const radius = size / 2 - 10
  
  let currentAngle = 0
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle
    return { ...d, startAngle, endAngle }
  })
  
  const polarToCartesian = (angle: number) => ({
    x: center + radius * Math.cos(angle - Math.PI / 2),
    y: center + radius * Math.sin(angle - Math.PI / 2)
  })
  
  const largeArcFlag = (angle: number) => angle > Math.PI ? 1 : 0
  
  return (
    <div className="flex justify-center py-2">
      <svg width={size} height={size}>
        {slices.map((s, i) => {
          const start = polarToCartesian(s.startAngle)
          const end = polarToCartesian(s.endAngle)
          return (
            <path
              key={i}
              d={`M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag(s.endAngle - s.startAngle)} 1 ${end.x} ${end.y} Z`}
              fill={s.color}
            />
          )
        })}
        <circle cx={center} cy={center} r={radius * 0.5} fill="white" />
      </svg>
    </div>
  )
}

function formatPKR(n: number){
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}
