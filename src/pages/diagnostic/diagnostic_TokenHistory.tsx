import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Clock, FlaskConical, CheckCircle2, FileText,
  RefreshCw, Download, Pencil, XCircle, Printer,
  Ban, ArrowRightToLine, ListChecks, ChevronLeft, ChevronRight,
  Beaker, Activity, Calendar, Filter, User, Hash, Zap, Plus, Trash2
} from 'lucide-react'
import { diagnosticApi } from '../../utils/api'
import { printLabTokenSlip } from '../../utils/printLabToken'
import Toast, { type ToastState } from '../../components/ui/Toast'

type TokenStatus = 'token_generated' | 'converted_to_sample' | 'cancelled'

type DiagnosticToken = {
  _id: string
  tokenNo: string
  patient: {
    fullName: string
    phone?: string
    mrn?: string
    age?: string
    gender?: string
  }
  tests: string[]
  status: TokenStatus
  sampleType?: 'normal' | 'urgent' | 'stat'
  barcode?: string
  generatedAt: string
  generatedBy: string
  convertedAt?: string
  convertedBy?: string
  sampleReceivedAt?: string
  sampleReceivedBy?: string
  resultEnteredAt?: string
  resultEnteredBy?: string
  approvedAt?: string
  approvedBy?: string
  orderId?: string
  resultId?: string
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
}

type DiagnosticTest = { id: string; name: string; turnaroundTime?: number }

const statusConfig: Record<TokenStatus, { label: string; accent: string; bg: string; text: string; glow: string; icon: any; step: number }> = {
  token_generated:   { label: 'Token',     accent: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', glow: '0 0 12px #3B82F640', icon: Clock,         step: 1 },
  converted_to_sample:{ label: 'Sample',   accent: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9', glow: '0 0 12px #8B5CF640', icon: FlaskConical,   step: 2 },
  cancelled:         { label: 'Cancelled', accent: '#F43F5E', bg: '#FFF1F2', text: '#BE123C', glow: '0 0 12px #F43F5E40', icon: XCircle,         step: 0 },
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function getInitials(name: string): string {
  return name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

const avatarColors = [
  ['#6366F1','#818CF8'], ['#8B5CF6','#A78BFA'], ['#EC4899','#F472B6'],
  ['#14B8A6','#2DD4BF'], ['#F59E0B','#FCD34D'], ['#10B981','#34D399'],
]

function getAvatarColor(name: string): string[] {
  const idx = (name?.charCodeAt(0) || 0) % avatarColors.length
  return avatarColors[idx]
}

export default function Diagnostic_TokenHistory() {

  const navigate = useNavigate()
  const [tokens, setTokens] = useState<DiagnosticToken[]>([])
  const [tests, setTests] = useState<DiagnosticTest[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TokenStatus | 'all'>('all')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelToken, setCancelToken] = useState<DiagnosticToken | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteToken, setDeleteToken] = useState<DiagnosticToken | null>(null)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [modifyToken, setModifyToken] = useState<DiagnosticToken | null>(null)
  const [modifyTestIds, setModifyTestIds] = useState<string[]>([])
  const [modifySaving, setModifySaving] = useState(false)
  const todayIso = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const openEdit = (t: DiagnosticToken) => {
    const isReception = window.location.pathname.startsWith('/reception')
    navigate(isReception
      ? `/reception/diagnostic/sample-intake?tokenId=${encodeURIComponent(t._id)}`
      : `/diagnostic/orders?tokenId=${encodeURIComponent(t._id)}`)
  }

  const getTestNamesArray = (tests: Array<string | { testId?: string; testName?: string }>) =>
    (tests || []).map(t => {
      if (typeof t === 'object' && t?.testId) return t.testName || testsMap[t.testId] || t.testId
      const id = String(t); return testsMap[id] || id
    })

  const getTestNames = (tests: Array<string | { testId?: string; testName?: string }>) =>
    getTestNamesArray(tests).join(', ')

  const handleConvertToSample = async (t: DiagnosticToken) => {
    setConvertingId(t._id)
    try {
      await diagnosticApi.convertToken(t._id)
      setToast({ type: 'success', message: `Token #${t.tokenNo} converted to sample` })
      refresh()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to convert to sample' })
    } finally { setConvertingId(null) }
  }

  const confirmCancel = async () => {
    if (!cancelToken) return
    try {
      await diagnosticApi.updateTokenStatus(cancelToken._id, { status: 'cancelled' })
      setToast({ type: 'success', message: `Token ${cancelToken.tokenNo} cancelled` })
      setCancelOpen(false); setCancelToken(null); refresh()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to cancel token' }) }
  }

  const confirmDelete = async () => {
    if (!deleteToken) return
    try {
      await diagnosticApi.deleteToken(deleteToken._id)
      setToast({ type: 'success', message: `Token ${deleteToken.tokenNo} deleted` })
      setDeleteOpen(false); setDeleteToken(null); refresh()
    } catch (e: any) { setToast({ type: 'error', message: e?.message || 'Failed to delete token' }) }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const [tokenRes, testRes] = await Promise.all([
        diagnosticApi.listTokens({ q: q || undefined, status: statusFilter === 'all' ? undefined : statusFilter, from: from || undefined, to: to || undefined, page, limit: rows }),
        diagnosticApi.listTests({ limit: 1000 }),
      ])
      setTokens((tokenRes.items || []) as DiagnosticToken[])
      setTotal(Number(tokenRes.total || 0))
      setTotalPages(Number(tokenRes.totalPages || 1))
      setTests((testRes.items || []).map((t: any) => ({ id: String(t._id), name: t.name, turnaroundTime: t.turnaroundTime || 0 })))
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load tokens' })
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [from, to, page, rows, statusFilter])

  const filteredTokens = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return (tokens || []).filter(t => {
      if (!qq) return true
      const testsText = getTestNames(t.tests || []).toLowerCase()
      return [t.tokenNo, t.patient?.fullName, t.patient?.mrn, t.patient?.phone, t.barcode, t.status, t.sampleType, testsText].filter(Boolean).join(' ').toLowerCase().includes(qq)
    })
  }, [tokens, q, testsMap])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of (tokens || [])) { counts[t.status] = (counts[t.status] || 0) + 1 }
    return counts
  }, [tokens])

  const exportCsv = () => {
    const cols = ['Token No', 'Date', 'Time', 'Patient', 'MR No', 'Phone', 'Tests', 'Sample Type', 'Barcode', 'Status']
    const esc = (v: any) => { const s = String(v ?? ''); return /[,\n\r\"]/g.test(s) ? `"${s.replace(/\"/g, '""')}"` : s }
    const rowsCsv = (filteredTokens || []).map(t => {
      const dt = new Date(t.generatedAt)
      return [t.tokenNo, isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(), isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString(), t.patient?.fullName || '', t.patient?.mrn || '', t.patient?.phone || '', getTestNames(t.tests || []), t.sampleType || 'normal', t.barcode || '', t.status].map(esc).join(',')
    })
    const csv = [cols.join(','), ...rowsCsv].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `token-history.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100%', backgroundColor: '#F0F2F5', padding: '24px' }}>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); } 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }
        .modern-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .modern-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1); }
        .date-input-modern::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── MODERN GLASS HEADER ── */}
      <div style={{
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%)',
        padding: '32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -12px rgba(79, 70, 229, 0.4)',
      }}>
        <div style={{ position:'absolute', top:'-50%', right:'-10%', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-20%', left:'-5%', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', filter:'blur(60px)', pointerEvents:'none' }} />
        
        <div style={{ position:'relative', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <div style={{
              width:'64px', height:'64px', borderRadius:'20px',
              background:'rgba(255,255,255,0.2)',
              border:'1px solid rgba(255,255,255,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(12px)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            }}>
              <Zap size={32} color='#FFFFFF' fill='#FFFFFF' />
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:'32px', fontWeight:800, color:'#FFFFFF', letterSpacing:'-1px' }}>
                Diagnostic Dashboard
              </h1>
              <div style={{ marginTop:'4px', display:'flex', alignItems:'center', gap:'8px', color:'rgba(255,255,255,0.8)', fontSize:'14px', fontWeight:500 }}>
                <Calendar size={14} />
                {todayStr}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:'12px' }}>
            <button onClick={refresh} disabled={loading} style={{
              display:'flex', alignItems:'center', gap:'10px',
              padding:'12px 24px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.3)',
              background:'rgba(255,255,255,0.15)', color:'#FFFFFF', fontSize:'14px', fontWeight:600,
              cursor:'pointer', backdropFilter:'blur(12px)', transition:'all 0.3s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Sync Data
            </button>
            <button onClick={exportCsv} style={{
              display:'flex', alignItems:'center', gap:'10px',
              padding:'12px 24px', borderRadius:'14px', border:'none',
              background:'#FFFFFF', color:'#4F46E5', fontSize:'14px', fontWeight:700,
              cursor:'pointer', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', transition:'all 0.3s',
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS SECTION ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginBottom:'24px' }}>
        {[
          { label:'Overall Tokens', value: total, color:'#6366F1', icon: ListChecks, gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' },
          { label:'Pending Intake', value: statusCounts['token_generated'] || 0, color:'#F59E0B', icon: Clock, gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
          { label:'In Lab Process', value:(statusCounts['converted_to_sample'] || 0)+(statusCounts['sample_received'] || 0), color:'#8B5CF6', icon: FlaskConical, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' },
          { label:'Completed', value: statusCounts['approved'] || 0, color:'#10B981', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="modern-card" style={{
              background:'#FFFFFF', borderRadius:'24px', padding:'24px',
              border:'1px solid rgba(226, 232, 240, 0.8)', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)',
              display:'flex', alignItems:'center', gap:'20px',
            }}>
              <div style={{
                width:'56px', height:'56px', borderRadius:'18px',
                background: card.gradient,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: `0 8px 16px ${card.color}40`,
              }}>
                <Icon size={24} color='#FFFFFF' />
              </div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.5px' }}>{card.label}</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:'#1E293B', marginTop:'2px' }}>{card.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div style={{ background:'#FFFFFF', borderRadius:'24px', padding:'20px', marginBottom:'24px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)', border:'1px solid rgba(226, 232, 240, 0.8)' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center' }}>
          {/* Modern Search */}
          <div style={{ position:'relative', flex:'1', minWidth:'300px' }}>
            <Search size={18} style={{ position:'absolute', left:'18px', top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Quick search patient, MRN or token ID..."
              style={{
                width:'100%', borderRadius:'16px', border:'2px solid #F1F5F9', background:'#F8FAFC',
                padding:'14px 14px 14px 50px', fontSize:'15px', fontWeight:500, color:'#1E293B',
                outline:'none', transition:'all 0.3s',
              }}
              onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.background = '#FFFFFF'; e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)' }}
              onBlur={e => { e.target.style.borderColor = '#F1F5F9'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* Modern Date Pickers */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ position:'relative', display:'flex', alignItems:'center', background:'#F8FAFC', border:'2px solid #F1F5F9', borderRadius:'16px', padding:'10px 16px', gap:'10px' }}>
              <Calendar size={16} color='#6366F1' />
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="date-input-modern" style={{ border:'none', background:'transparent', fontSize:'14px', fontWeight:600, color:'#1E293B', outline:'none', cursor:'pointer', width:'110px' }} />
              <span style={{ color:'#CBD5E1', fontWeight:800 }}>→</span>
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="date-input-modern" style={{ border:'none', background:'transparent', fontSize:'14px', fontWeight:600, color:'#1E293B', outline:'none', cursor:'pointer', width:'110px' }} />
            </div>
            
            <div style={{ height:'30px', width:'2px', background:'#F1F5F9' }} />
            
            <button onClick={() => { setFrom(todayIso); setTo(todayIso); setPage(1) }} style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'12px 20px', borderRadius:'16px',
              background: from === todayIso && to === todayIso ? '#6366F1' : '#F8FAFC', border: from === todayIso && to === todayIso ? 'none' : '2px solid #F1F5F9',
              color: from === todayIso && to === todayIso ? '#FFFFFF' : '#64748B', fontSize:'14px', fontWeight:600,
              cursor:'pointer', transition:'all 0.3s'
            }}>
              <Calendar size={16} /> Today
            </button>
            {(from !== todayIso || to !== todayIso) && (
              <button onClick={() => { setFrom(''); setTo(''); setPage(1) }} style={{
                display:'flex', alignItems:'center', gap:'6px', padding:'12px 16px', borderRadius:'16px',
                background:'#FFF1F2', border:'2px solid #FFE4E6', color:'#E11D48', fontSize:'13px', fontWeight:600,
                cursor:'pointer', transition:'all 0.3s'
              }}>
                Clear Dates
              </button>
            )}
            
            <button style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'12px 20px', borderRadius:'16px',
              background:'#F8FAFC', border:'2px solid #F1F5F9', color:'#64748B', fontSize:'14px', fontWeight:600,
              cursor:'pointer', transition:'all 0.3s'
            }}>
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', marginTop:'20px', paddingTop:'20px', borderTop:'1px solid #F1F5F9' }}>
          <button onClick={() => setStatusFilter('all')} style={{
            padding:'10px 20px', borderRadius:'12px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:700, transition:'all 0.3s',
            background: statusFilter === 'all' ? '#1E293B' : '#F1F5F9',
            color: statusFilter === 'all' ? '#FFFFFF' : '#64748B',
          }}>All Access</button>
          {Object.entries(statusConfig).map(([st, cfg]) => {
            const Icon = cfg.icon; const active = statusFilter === st
            return (
              <button key={st} onClick={() => setStatusFilter(st as TokenStatus)} style={{
                display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', borderRadius:'12px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:700, transition:'all 0.3s',
                background: active ? cfg.accent : '#F1F5F9',
                color: active ? '#FFFFFF' : '#64748B',
                boxShadow: active ? `0 8px 16px ${cfg.accent}40` : 'none',
              }}>
                <Icon size={14} /> {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── HIGH DENSITY TOKEN LIST ── */}
      <div style={{ background:'#FFFFFF', borderRadius:'24px', border:'1px solid rgba(226, 232, 240, 0.8)', overflow:'hidden', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'100px 2fr 100px 2fr 140px 200px', gap:'0', padding:'16px 24px', background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
          {[
            { label: 'TOKEN ID', icon: Hash },
            { label: 'PATIENT', icon: User },
            { label: 'TYPE', icon: Activity },
            { label: 'TESTS', icon: Beaker },
            { label: 'STATUS', icon: Activity },
            { label: 'ACTIONS', icon: Zap },
          ].map(h => (
            <div key={h.label} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', fontWeight:800, color:'#94A3B8', letterSpacing:'1px' }}>
              <h.icon size={12} /> {h.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:'100px 20px', textAlign:'center' }}>
            <RefreshCw size={48} className="animate-spin" style={{ color:'#6366F1', opacity:0.3 }} />
          </div>
        ) : filteredTokens.length === 0 ? (
          <div style={{ padding:'100px 20px', textAlign:'center', color:'#94A3B8' }}>
            <FileText size={48} style={{ opacity:0.2, marginBottom:'16px' }} />
            <div style={{ fontSize:'16px', fontWeight:600 }}>No results match your criteria</div>
          </div>
        ) : (
          filteredTokens.map((t, idx) => {
            const cfg = statusConfig[t.status]; const Icon = cfg.icon
            const [c1, c2] = getAvatarColor(t.patient?.fullName || '')
            return (
              <div key={t._id} style={{
                display:'grid', gridTemplateColumns:'100px 2fr 100px 2fr 140px 200px',
                alignItems:'center', padding:'18px 24px',
                borderBottom: idx < filteredTokens.length - 1 ? '1px solid #F1F5F9' : 'none',
                transition:'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* ID */}
                <div style={{ position:'relative' }}>
                  <div style={{ fontSize:'16px', fontWeight:800, color:'#1E293B', fontVariantNumeric:'tabular-nums' }}>#{t.tokenNo.split('-').pop()}</div>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'#94A3B8', marginTop:'2px' }}>{formatTime(t.generatedAt)}</div>
                </div>

                {/* Patient */}
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:`linear-gradient(135deg, ${c1}, ${c2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:800, color:'#FFFFFF', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                    {getInitials(t.patient?.fullName || '')}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'15px', fontWeight:700, color:'#1E293B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.patient?.fullName}</div>
                    <div style={{ fontSize:'12px', fontWeight:500, color:'#64748B', marginTop:'2px' }}>{t.patient?.mrn || 'Walk-in'} • {t.patient?.age || 'N/A'} • {t.patient?.gender}</div>
                  </div>
                </div>

                {/* Type */}
                <div>
                  <span style={{ padding:'3px 8px', borderRadius:'999px', background: t.sampleType === 'urgent' ? '#FEE2E2' : t.sampleType === 'stat' ? '#FEF9C3' : '#EFF6FF', color: t.sampleType === 'urgent' ? '#B91C1C' : t.sampleType === 'stat' ? '#B45309' : '#1D4ED8', fontSize:'11px', fontWeight:700, textTransform:'uppercase' }}>
                    {t.sampleType || 'normal'}
                  </span>
                </div>

                {/* Tests */}
                <div style={{ paddingRight:'20px', display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div style={{ 
                    display:'flex', 
                    flexWrap:'wrap', 
                    gap:'4px',
                    maxHeight:'60px',
                    overflow:'hidden',
                    position:'relative'
                  }}>
                    {getTestNamesArray(t.tests).map((name, i) => (
                      <span key={i} style={{ 
                        fontSize:'11px', 
                        fontWeight:600, 
                        color:'#475569',
                        background:'#F8FAFC',
                        padding:'2px 8px',
                        borderRadius:'6px',
                        border:'1px solid #F1F5F9',
                        whiteSpace:'nowrap'
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:'6px', background:'#EFF6FF', fontSize:'10px', fontWeight:800, color:'#3B82F6', border:'1px solid #DBEAFE' }}>
                      {t.tests.length} {t.tests.length === 1 ? 'TEST' : 'TESTS'}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 14px', borderRadius:'12px', background:cfg.bg, color:cfg.text, fontSize:'12px', fontWeight:700, boxShadow:`inset 0 0 0 1px ${cfg.accent}20` }}>
                    <Icon size={14} /> {cfg.label}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'flex-end' }}>
                  <ModernActionBtn icon={<Pencil size={16} />} onClick={() => openEdit(t)} />
                  <ModernActionBtn icon={<Printer size={16} />} onClick={async () => {
                    try {
                      await printLabTokenSlip({
                        tokenNo: t.tokenNo,
                        createdAt: t.generatedAt,
                        patient: t.patient,
                        tests: getTestNamesArray(t.tests).map(name => ({ name, price: 0 })),
                        subtotal: t.subtotal || 0,
                        discount: t.discount || 0,
                        net: t.net || 0,
                        receivedAmount: t.receivedAmount,
                        receivableAmount: t.receivableAmount,
                      })
                    } catch (e: any) {
                      setToast({ type: 'error', message: 'Print failed: ' + (e?.message || 'Unknown error') })
                    }
                  }} />
                  
                  {t.status === 'token_generated' ? (
                    <button onClick={() => handleConvertToSample(t)} disabled={convertingId === t._id} style={{
                      display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', borderRadius:'10px', border:'none', cursor: convertingId === t._id ? 'not-allowed' : 'pointer',
                      background:'linear-gradient(135deg, #6366F1, #4F46E5)', color:'#FFFFFF', fontSize:'12px', fontWeight:700,
                      boxShadow:'0 4px 12px rgba(99,102,241,0.3)', transition:'all 0.2s',
                      opacity: convertingId === t._id ? 0.6 : 1,
                    }}
                    onMouseEnter={e => convertingId !== t._id && (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <ArrowRightToLine size={14} /> {convertingId === t._id ? 'CONVERTING...' : 'CONVERT'}
                    </button>
                  ) : (
                    <>
                      {isSameDay(t.generatedAt) && (
                        <ModernActionBtn icon={<Plus size={16} />} onClick={() => { 
                          setModifyToken(t); 
                          const ids = (t.tests || []).map(x => typeof x === 'object' ? (x as any).testId : String(x));
                          setModifyTestIds(ids); 
                          setModifyOpen(true) 
                        }} />
                      )}
                    </>
                  )}
                  {t.status === 'token_generated' && (
                    <button onClick={() => { setCancelToken(t); setCancelOpen(true) }} style={{ width:'36px', height:'36px', borderRadius:'10px', border:'none', background:'#FFF1F2', color:'#F43F5E', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }} onMouseEnter={e => (e.currentTarget.style.background = '#FFE4E6')}>
                      <Ban size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── MODERN PAGINATION ── */}
      <div style={{ marginTop:'24px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px' }}>
        <div style={{ fontSize:'14px', fontWeight:600, color:'#94A3B8' }}>
          Showing <span style={{ color:'#1E293B' }}>{(page - 1) * rows + 1}</span> to <span style={{ color:'#1E293B' }}>{Math.min(page * rows, total)}</span> of <span style={{ color:'#1E293B' }}>{total}</span> entries
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <select value={rows} onChange={e => { setRows(Number(e.target.value)); setPage(1) }} style={{ padding:'10px 16px', borderRadius:'12px', border:'2px solid #F1F5F9', background:'#FFFFFF', fontSize:'13px', fontWeight:700, color:'#1E293B', cursor:'pointer', outline:'none' }}>
            <option value={10}>10 / PAGE</option>
            <option value={20}>20 / PAGE</option>
            <option value={50}>50 / PAGE</option>
          </select>
          <div style={{ display:'flex', gap:'8px' }}>
            <ModernPageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={20} />} />
            <div style={{ height:'40px', padding:'0 20px', display:'flex', alignItems:'center', background:'#1E293B', color:'#FFFFFF', borderRadius:'12px', fontSize:'14px', fontWeight:700 }}>{page} / {totalPages}</div>
            <ModernPageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} icon={<ChevronRight size={20} />} />
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {cancelOpen && cancelToken && (
        <Modal
          title="Cancel Token?"
          message={<>This will permanently stop all progress for token <strong style={{ color:'#F43F5E' }}>#{cancelToken.tokenNo}</strong>. This cannot be undone.</>}
          confirmLabel="Yes, Cancel Token"
          confirmColor="#F43F5E"
          confirmShadow="rgba(244,63,94,0.3)"
          onCancel={() => { setCancelOpen(false); setCancelToken(null) }}
          onConfirm={confirmCancel}
        />
      )}
      {deleteOpen && deleteToken && (
        <Modal
          title="Delete Permanently?"
          message={<>Token <strong style={{ color:'#F43F5E' }}>#{deleteToken.tokenNo}</strong> and all its data will be removed forever. This is irreversible.</>}
          confirmLabel="Delete Token"
          confirmColor="#F43F5E"
          confirmShadow="rgba(244,63,94,0.3)"
          onCancel={() => { setDeleteOpen(false); setDeleteToken(null) }}
          onConfirm={confirmDelete}
        />
      )}

      {modifyOpen && modifyToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Modify Tests — Token #{modifyToken.tokenNo}</div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {modifyTestIds.map(id => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
                    {testsMap[id] || id}
                    <button type="button" onClick={() => setModifyTestIds(prev => prev.filter(x => x !== id))} className="text-violet-400 hover:text-rose-500"><Trash2 size={12} /></button>
                  </span>
                ))}
                {modifyTestIds.length === 0 && <div className="text-sm text-slate-400 italic">No tests selected</div>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Add Test</label>
                <select
                  value=""
                  onChange={e => { const v = e.target.value; if (v && !modifyTestIds.includes(v)) setModifyTestIds(prev => [...prev, v]); e.target.value = '' }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select test to add...</option>
                  {tests.filter(t => !modifyTestIds.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => { setModifyOpen(false); setModifyToken(null) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={async () => {
                if (!modifyToken || modifySaving) return
                setModifySaving(true)
                try {
                  await diagnosticApi.updateToken(modifyToken._id, { tests: modifyTestIds })
                  setToast({ type: 'success', message: `Tests updated for token #${modifyToken.tokenNo}` })
                  setModifyOpen(false); setModifyToken(null); refresh()
                } catch (e: any) {
                  setToast({ type: 'error', message: e?.message || 'Failed to update tests' })
                } finally { setModifySaving(false) }
              }} disabled={modifySaving || modifyTestIds.length === 0} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-40">{modifySaving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function isSameDay(iso: string): boolean {
  try {
    const d = new Date(iso)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  } catch { return false }
}

function ModernActionBtn({ icon, onClick }: { icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width:'36px', height:'36px', borderRadius:'10px', border:'2px solid #F1F5F9', background:'#FFFFFF', color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.color = '#64748B' }}>
      {icon}
    </button>
  )
}

function ModernPageBtn({ disabled, onClick, icon }: { disabled: boolean; onClick: () => void; icon: any }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ width:'40px', height:'40px', borderRadius:'12px', border:'2px solid #F1F5F9', background:'#FFFFFF', color: disabled ? '#CBD5E1' : '#1E293B', display:'flex', alignItems:'center', justifyContent:'center', cursor: disabled ? 'default' : 'pointer', transition:'all 0.2s' }} onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = '#6366F1')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#F1F5F9')}>
      {icon}
    </button>
  )
}

function Modal({ title, message, confirmLabel, confirmColor, confirmShadow, onCancel, onConfirm }: {
  title: string; message: React.ReactNode; confirmLabel: string;
  confirmColor: string; confirmShadow: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(15,23,42,0.5)', backdropFilter:'blur(6px)', padding:'16px',
    }}>
      <div style={{
        width:'100%', maxWidth:'400px', background:'#FFFFFF', borderRadius:'20px',
        boxShadow:'0 24px 80px -10px rgba(15,23,42,0.4)',
        animation:'fadeIn 0.2s ease-out',
        overflow:'hidden',
      }}>
        <div style={{ height:'4px', background:`linear-gradient(90deg, ${confirmColor}, ${confirmColor}90)` }} />
        <div style={{ padding:'28px 28px 24px' }}>
          <h2 style={{ margin:'0 0 10px', fontSize:'18px', fontWeight:800, color:'#0F172A' }}>{title}</h2>
          <p style={{ margin:0, fontSize:'13px', fontWeight:500, color:'#64748B', lineHeight:1.6 }}>{message}</p>
          <div style={{ marginTop:'24px', display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button onClick={onCancel} style={{ padding:'9px 18px', borderRadius:'9px', border:'1.5px solid #E2E8F0', background:'#FFF', color:'#64748B', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
              Go Back
            </button>
            <button onClick={onConfirm} style={{ padding:'9px 20px', borderRadius:'9px', border:'none', background:confirmColor, color:'#FFF', fontSize:'12px', fontWeight:700, cursor:'pointer', boxShadow:`0 6px 16px ${confirmShadow}`, transition:'all 0.15s' }}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}