import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { ClinicalDialogShell, clinicalInp, clinicalLbl } from '../ui/ClinicalDialog'
import { Activity } from 'lucide-react'

type VitalRow = {
  id: string; date: string; time: string
  bp?: string; temp?: string; pulse?: string; resp?: string
  bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string
  shift?: 'morning'|'evening'|'night'
}

const SHIFT_COLORS: Record<string, string> = {
  morning: 'bg-amber-100 text-amber-700',
  evening: 'bg-sky-100 text-sky-700',
  night: 'bg-indigo-100 text-indigo-700',
}

function inferShift(): 'morning'|'evening'|'night' {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'morning'
  if (h >= 14 && h < 22) return 'evening'
  return 'night'
}

export default function DailyMonitoring({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<VitalRow[]>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdVitals(encounterId, { limit: 200 }) as any
      const docs = (res.vitals || []) as any[]
      docs.sort((a: any, b: any)=> new Date(String(b.recordedAt || b.createdAt || 0)).getTime() - new Date(String(a.recordedAt || a.createdAt || 0)).getTime())
      const vitRows = docs.map((v: any)=>{
        const d = new Date(String(v.recordedAt || v.createdAt || new Date().toISOString()))
        const date = d.toISOString().slice(0,10)
        const time = d.toTimeString().slice(0,5)
        return {
          id: String(v._id), date, time,
          bp: v.bp || '',
          temp: v.temp!=null ? String(v.temp) : '',
          pulse: v.hr!=null ? String(v.hr) : '',
          resp: v.rr!=null ? String(v.rr) : '',
          bsr: v.bsr!=null ? String(v.bsr) : '',
          intakeIV: v.intakeIV || '',
          urine: v.urine || '',
          nurseSign: v.nurseSign || '',
          shift: v.shift,
        }
      })
      setRows(vitRows)
    }catch{}
  }

  async function save(d: { date?: string; time?: string; bp?: string; temp?: string; pulse?: string; resp?: string; bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string; shift?: 'morning'|'evening'|'night' }){
    try{
      const recordedAt = (d.date && d.time) ? new Date(`${d.date}T${d.time}`).toISOString() : new Date().toISOString()
      await hospitalApi.createIpdVital(encounterId, {
        recordedAt,
        bp: d.bp || undefined,
        temp: d.temp ? parseFloat(d.temp) : undefined,
        hr: d.pulse ? parseFloat(d.pulse) : undefined,
        rr: d.resp ? parseFloat(d.resp) : undefined,
        bsr: d.bsr ? parseFloat(d.bsr) : undefined,
        intakeIV: d.intakeIV || undefined,
        urine: d.urine || undefined,
        nurseSign: d.nurseSign || undefined,
        shift: d.shift || undefined,
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save monitoring entry') }
  }

  async function printMonitoring(){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const hospitalName = String(s?.name || 'Hospital')
    const hospitalAddress = String(s?.address || '')
    const hospitalPhone = String(s?.phone || '')

    const overlay = document.createElement('div')
    overlay.id = 'mon-print-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;'

    const esc = (v?: string)=> (v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

    const groupedRows = Array.from(new Set(rows.map(v=>v.date)))
      .sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({ date, entries: rows.filter(v=>v.date===date) }))

    const dateHtml = groupedRows.map(g=>{
      const dateStr = new Date(g.date+'T00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})
      const rowHtml = g.entries.map(v=>`
        <tr>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px;">${esc(v.time)}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;font-weight:700;">${v.shift ? v.shift.charAt(0).toUpperCase()+v.shift.slice(1) : '—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:12px;">${esc(v.bp)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:12px;">${esc(v.pulse)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:12px;">${esc(v.temp)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:12px;">${esc(v.resp)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:12px;">${esc(v.bsr)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${esc(v.intakeIV)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${esc(v.urine)||'—'}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;">${esc(v.nurseSign)||'—'}</td>
        </tr>`).join('')
      return `<tr><td colspan="10" style="background:#f1f5f9;padding:6px 8px;font-size:11px;font-weight:800;color:#0f172a;border:1px solid #e2e8f0;">${dateStr}</td></tr>${rowHtml}`
    }).join('')

    overlay.innerHTML = `
    <style>
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body * { visibility: hidden !important; }
        #mon-print-overlay, #mon-print-overlay * { visibility: visible !important; }
        #mon-print-overlay { position: fixed !important; inset: 0 !important; background: transparent !important; padding: 0 !important; }
        #mon-print-sheet { width: auto !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; }
        #mon-actions { display: none !important; }
      }
    </style>
    <div id="mon-print-sheet" style="position:relative;width:210mm;max-height:90vh;overflow-y:auto;background:white;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:24px;">
      <div id="mon-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;">
        <button id="mon-print-btn" style="cursor:pointer;border:1px solid #0284c7;background:#0284c7;color:white;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:700;">Print</button>
        <button id="mon-close-btn" style="cursor:pointer;border:1px solid #cbd5e1;background:white;color:#334155;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;">Close</button>
      </div>
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;">
        <div style="text-align:center;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;margin-bottom:12px;">
          <div style="background:linear-gradient(90deg,#0284c7,#0ea5e9);color:#fff;padding:10px 12px;">
            <div style="font-size:16px;font-weight:900;">${esc(hospitalName)}</div>
            <div style="font-size:12px;opacity:0.95;margin-top:2px;">Daily Monitoring Chart</div>
          </div>
          <div style="padding:6px 10px;font-size:11px;color:#64748b;">
            ${hospitalAddress ? esc(hospitalAddress) : ''}${hospitalPhone ? (hospitalAddress ? ' | ' : '') + 'Phone: ' + esc(hospitalPhone) : ''}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:left;">Time</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:left;">Shift</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">B.P.</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">Pulse</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">Temp</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">Resp</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">BSR</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">I/V</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:center;">Urine</th>
              <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;text-align:left;">Nurse</th>
            </tr>
          </thead>
          <tbody>${dateHtml}</tbody>
        </table>
        <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:6px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;">
          <div>${esc(hospitalName)}</div>
          <div>Printed: ${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>`

    document.body.appendChild(overlay)

    const onClose = ()=> { try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {} }
    const onPrint = ()=> {
      const btns = document.getElementById('mon-actions') as HTMLElement|null
      if (btns) btns.style.display = 'none'
      try { window.print() } catch {}
      setTimeout(()=>{ if (btns) btns.style.display = 'flex' }, 500)
    }
    const onKey = (e: KeyboardEvent)=> {
      if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
      if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow */ }
      if (e.key === 'Escape') onClose()
    }
    document.getElementById('mon-close-btn')?.addEventListener('click', onClose)
    document.getElementById('mon-print-btn')?.addEventListener('click', onPrint)
    document.addEventListener('keydown', onKey)
  }

  // Get last reading for each shift to show as reference
  const lastByShift: Record<string, VitalRow|undefined> = {}
  for (const r of rows) {
    const k = r.shift || 'unassigned'
    if (!lastByShift[k]) lastByShift[k] = r
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Daily Monitoring</h3>
          <p className="text-xs text-slate-500 mt-0.5">{rows.length} entries recorded</p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && (
            <button
              onClick={()=>void printMonitoring()}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              🖨 Print
            </button>
          )}
          <button
            onClick={()=>setOpen(true)}
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 active:scale-[0.98]"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Quick last-reading cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['morning','evening','night'] as const).map(shift => {
            const last = lastByShift[shift]
            if (!last) return (
              <div key={shift} className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                No {shift} entry yet
              </div>
            )
            return (
              <div key={shift} className="rounded-xl border border-slate-200 p-3 transition-shadow hover:shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SHIFT_COLORS[shift]}`}>
                    {shift.charAt(0).toUpperCase()+shift.slice(1)}
                  </span>
                  <span className="text-[10px] text-slate-400">{last.date} {last.time}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    ['BP', last.bp],
                    ['Pulse', last.pulse],
                    ['Temp', last.temp],
                    ['Resp', last.resp],
                    ['BSR', last.bsr],
                    ['I/V', last.intakeIV],
                    ['Urine', last.urine],
                    ['Nurse', last.nurseSign],
                  ].map(([label, val])=>(
                    <div key={String(label)}>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase">{label}</div>
                      <div className="text-xs font-bold text-slate-800">{val || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No monitoring entries yet. Click "+ Add Entry" to begin.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 text-left">Time</th>
                <th className="px-3 py-2.5 text-left">Shift</th>
                <th className="px-3 py-2.5 text-center">B.P.</th>
                <th className="px-3 py-2.5 text-center">Pulse</th>
                <th className="px-3 py-2.5 text-center">Temp</th>
                <th className="px-3 py-2.5 text-center">Resp</th>
                <th className="px-3 py-2.5 text-center">BSR</th>
                <th className="px-3 py-2.5 text-center">I/V</th>
                <th className="px-3 py-2.5 text-center">Urine</th>
                <th className="px-3 py-2.5 text-left">Nurse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from(new Set(rows.map(v=>v.date)))
                .sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
                .map(date => (
                  <React.Fragment key={`d-${date}`}>
                    {/* Date separator */}
                    <tr>
                      <td colSpan={10} className="bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                        {new Date(date+'T00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                      </td>
                    </tr>
                    {rows.filter(v=>v.date===date).map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2 text-xs font-medium text-slate-700">{v.time}</td>
                        <td className="px-3 py-2">
                          {v.shift ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SHIFT_COLORS[v.shift]||'bg-slate-100 text-slate-600'}`}>
                              {v.shift.charAt(0).toUpperCase()+v.shift.slice(1)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.bp || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.pulse || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.temp || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.resp || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.bsr || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.intakeIV || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800">{v.urine || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{v.nurseSign || <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VitalsDialog open={open} onClose={()=>setOpen(false)} onSave={save} lastEntry={rows[0]} />
    </div>
  )
}

function VitalsDialog({ open, onClose, onSave, lastEntry }: {
  open: boolean
  onClose: ()=>void
  onSave: (d: { date?: string; time?: string; bp?: string; temp?: string; pulse?: string; resp?: string; bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string; shift?: 'morning'|'evening'|'night' })=>void
  lastEntry?: VitalRow
}){
  const now = new Date()
  const defaultDate = now.toISOString().slice(0, 10)
  const defaultTime = now.toTimeString().slice(0, 5)
  const defaultShift = inferShift()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    onSave({
      date: String(fd.get('date')||''),
      time: String(fd.get('time')||''),
      shift: (String(fd.get('shift')||'') as any),
      bp: String(fd.get('bp')||''),
      pulse: String(fd.get('pulse')||''),
      temp: String(fd.get('temp')||''),
      resp: String(fd.get('resp')||''),
      bsr: String(fd.get('bsr')||''),
      intakeIV: String(fd.get('intakeIV')||''),
      urine: String(fd.get('urine')||''),
      nurseSign: String(fd.get('nurseSign')||''),
    })
    onClose()
  }

  return (
    <ClinicalDialogShell
      open={open}
      title="Add Monitoring Entry"
      subtitle="Vitals & I/O Record"
      icon={Activity}
      onClose={onClose}
      onSubmit={submit}
      submitText="Save Entry"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className={clinicalLbl}>Date</label>
            <input name="date" type="date" defaultValue={defaultDate} className={clinicalInp} autoFocus />
          </div>
          <div>
            <label className={clinicalLbl}>Time</label>
            <input name="time" type="time" defaultValue={defaultTime} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Shift</label>
            <select name="shift" defaultValue={defaultShift} className={clinicalInp}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={clinicalLbl}>B.P.</label>
            <input name="bp" placeholder="120/80" defaultValue={lastEntry?.bp || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Pulse</label>
            <input name="pulse" placeholder="72" defaultValue={lastEntry?.pulse || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Temp</label>
            <input name="temp" placeholder="98.6" defaultValue={lastEntry?.temp || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Resp</label>
            <input name="resp" placeholder="16" defaultValue={lastEntry?.resp || ''} className={clinicalInp} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={clinicalLbl}>BSR</label>
            <input name="bsr" type="number" step="0.1" placeholder="120" defaultValue={lastEntry?.bsr || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Intake I/V</label>
            <input name="intakeIV" placeholder="500ml" defaultValue={lastEntry?.intakeIV || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Urine</label>
            <input name="urine" placeholder="300ml" defaultValue={lastEntry?.urine || ''} className={clinicalInp} />
          </div>
          <div>
            <label className={clinicalLbl}>Nurse Sign</label>
            <input name="nurseSign" placeholder="Name/Sign" defaultValue={lastEntry?.nurseSign || ''} className={clinicalInp} />
          </div>
        </div>
      </div>
    </ClinicalDialogShell>
  )
}
