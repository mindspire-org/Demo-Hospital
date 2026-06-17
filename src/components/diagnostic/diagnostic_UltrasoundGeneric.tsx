import React from 'react';
import { diagnosticApi } from '../../utils/api';
import Diagnostic_RichTextEditor from './diagnostic_RichTextEditor';
import { ClipboardList, GitCompare, Wrench, Microscope, Lightbulb, ImagePlus, Trash2 } from 'lucide-react';

const FINDINGS_HTML_MARKER = '__FINDINGS_HTML__'

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const UltrasoundGeneric: React.FC<Props> = ({ value: _value, onChange }) => {
  const [clinical, setClinical] = React.useState('');
  const [comparison, setComparison] = React.useState('');
  const [technique, setTechnique] = React.useState('');
  const [findings, setFindings] = React.useState('');
  type KvRow = { label: string; value: string };
  const [findingRows, setFindingRows] = React.useState<KvRow[]>([
    { label: '', value: '' },
    { label: '', value: '' },
  ]);
  const [findingsHtml, setFindingsHtml] = React.useState('');
  const [impression, setImpression] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [ready, setReady] = React.useState(false)

  const initialRef = React.useRef<Record<string,string>>({})
  const build = React.useCallback(() => {
    const get = (label: string, cur: string) => (cur?.trim() || initialRef.current[label] || '').trim()
    const parts = [
      `Clinical Information\n${get('Clinical Information', clinical)}`,
      `Comparison\n${get('Comparison', comparison)}`,
      `Technique\n${get('Technique', technique)}`,
      `Findings\n${FINDINGS_HTML_MARKER}${findingsHtml}`,
      `FindingsLegacy\n${get('Findings', findings)}`,// kept for backward compat print
      `Impression\n${get('Impression', impression)}`,
    ];
    const imgs = images && images.length ? images : (initialRef.current['Images'] ? initialRef.current['Images'].split(/\r?\n/).filter(Boolean) : [])
    if (imgs.length) {
      parts.push(`Images\n${imgs.join('\n')}`);
    }
    return parts.join('\n\n').trim();
  }, [clinical, comparison, technique, findings, findingsHtml, impression, images]);

  React.useEffect(() => {
    if (!ready) return;
    onChange(build());
  }, [build, onChange, ready]);

  // Prefill from existing value (Edit flow)
  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) { setReady(true); return; }
    const labels = ['Clinical Information','Comparison','Technique','Findings','Impression','Images']
    const set = new Set(labels)
    const sections: Record<string,string> = {}
    let cur = ''
    let buf: string[] = []
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim()
      if (set.has(line)){ push(); cur = line; continue }
      buf.push(raw)
    }
    push()
    initialRef.current = sections
    if (sections['Clinical Information']!=null) setClinical(sections['Clinical Information'])
    if (sections['Comparison']!=null) setComparison(sections['Comparison'])
    if (sections['Technique']!=null) setTechnique(sections['Technique'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Findings']!=null) {
      const raw = sections['Findings']
      if (raw.startsWith(FINDINGS_HTML_MARKER)) {
        setFindingsHtml(raw.slice(FINDINGS_HTML_MARKER.length))
      } else {
        // Legacy plain-text findings → convert to simple HTML
        const html = raw.split(/\r?\n/).filter(Boolean).map((l: string) => `<p>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('')
        setFindingsHtml(html || '')
      }
    }
    if (sections['Images']){
      const imgs = sections['Images'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      if (imgs.length) setImages(imgs)
    }
    // Map Findings lines back to dynamic rows (best-effort)
    if (sections['Findings']){
      const lines = sections['Findings'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      const rows: KvRow[] = []
      for (const line of lines){
        const idx = line.indexOf(':')
        if (idx>0){ rows.push({ label: line.slice(0, idx).trim(), value: line.slice(idx+1).trim() }) }
        else { rows.push({ label: '', value: line }) }
      }
      if (rows.length) setFindingRows(rows)
    }
    prefillRef.current = true
    setReady(true)
  }, [_value])

  // Recompute Findings from dynamic rows (two-column layout)
  React.useEffect(() => {
    const out: string[] = [];
    for (const r of findingRows) {
      const Ls = String(r.label || '').split(/\r?\n/).map(s=>s.trim());
      const Vs = String(r.value || '').split(/\r?\n/).map(s=>s.trim());
      const n = Math.max(Ls.length, Vs.length);
      for (let i = 0; i < n; i++) {
        const lbl = (Ls[i] || '').replace(/:+/g, '').trim();
        const val = (Vs[i] || '').trim();
        if (!lbl && !val) continue;
        out.push(lbl ? `${lbl}: ${val}` : val);
      }
    }
    setFindings(out.join('\n'));
  }, [findingRows]);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    const reads = files.map(f => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result||''));
      fr.onerror = (err) => rej(err);
      fr.readAsDataURL(f);
    }));
    const urls = await Promise.all(reads);
    setImages(prev => [...prev, ...urls]);
    try { if (input) input.value = ''; } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Clinical Information */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-violet-600" />
          <label className="text-sm font-semibold text-slate-800">Clinical Information</label>
        </div>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 min-h-[80px] text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" value={clinical} onChange={e=>setClinical(e.target.value)} placeholder="Enter clinical notes" />
      </div>

      {/* Comparison */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitCompare className="w-4 h-4 text-sky-600" />
          <label className="text-sm font-semibold text-slate-800">Comparison</label>
        </div>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 min-h-[80px] text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" value={comparison} onChange={e=>setComparison(e.target.value)} placeholder="Previous studies or NONE" />
      </div>

      {/* Technique */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-amber-600" />
          <label className="text-sm font-semibold text-slate-800">Technique</label>
        </div>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 min-h-[80px] text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all" value={technique} onChange={e=>setTechnique(e.target.value)} placeholder="Describe technique" />
      </div>

      {/* Findings - Rich Text */}
      <div className="rounded-xl border border-emerald-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Microscope className="w-4 h-4 text-emerald-600" />
          <label className="text-sm font-semibold text-slate-800">Findings / Report</label>
        </div>
        <Diagnostic_RichTextEditor
          value={findingsHtml}
          onChange={setFindingsHtml}
        />
      </div>

      {/* Impression - Rich Text */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-fuchsia-600" />
          <label className="text-sm font-semibold text-slate-800">Impression</label>
        </div>
        <Diagnostic_RichTextEditor
          value={impression}
          onChange={setImpression}
        />
      </div>

      {/* Images */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <ImagePlus className="w-4 h-4 text-indigo-600" />
          <label className="text-sm font-semibold text-slate-800">Images</label>
        </div>
        <input type="file" accept="image/*" multiple onChange={onFiles} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-700 hover:file:bg-violet-100" />
        {images.length>0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {images.map((src, idx) => (
              <div key={idx} className="relative rounded-lg border border-slate-200 overflow-hidden group">
                <img src={src} alt={`img-${idx}`} className="w-full h-24 object-cover" />
                <button type="button" className="absolute top-1 right-1 bg-white/90 text-rose-600 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" onClick={()=>setImages(imgs=>imgs.filter((_,i)=>i!==idx))}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UltrasoundGeneric;

export async function printUltrasoundReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const s: any = await diagnosticApi.getSettings().catch(()=>({}))
  const name = s?.diagnosticName || 'Diagnostic Center'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Diagnostics'
  const logo = s?.logoDataUrl || ''
  const footer = s?.reportFooter || 'System Generated Report. No Signature Required.'

  const esc = (x: any)=> String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+" "+d.toLocaleTimeString() }
  const FHTML = '__FINDINGS_HTML__'
  const bodyHtml = (()=>{
    const labels = ['Clinical Information','Comparison','Technique','Findings','FindingsLegacy','Impression','Images']
    const set = new Set(labels)
    const sections: Record<string,string> = {}
    let cur = ''
    let buf: string[] = []
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of String(input.value||'').split(/\r?\n/)){
      const line = raw.trim()
      if (set.has(line)){ push(); cur = line; continue }
      buf.push(raw)
    }
    push()
    let html = `<div class="title-mid">ULTRASOUND REPORT</div><div class="box">`
    const printLabels = ['Clinical Information','Comparison','Technique','Findings','Impression','Images']
    for (const key of printLabels){
      let val = (sections as any)[key]
      if (key === 'Findings') {
        const rawVal = String(val || '')
        if (rawVal.startsWith(FHTML)) {
          // New HTML findings
          const htmlContent = rawVal.slice(FHTML.length)
          if (htmlContent.replace(/<[^>]+>/g,'').trim()) {
            html += `<div class="sec"><div class="sec-title">Findings</div><div class="sec-text impression-html">${htmlContent}</div></div>`
          }
          continue
        }
        // Legacy plain text — fall through to normal render
      }
      if (key==='Images' && !val) continue
      if (!val || !String(val).trim()) continue
      const isHtml = key === 'Impression'
      html += `<div class="sec"><div class="sec-title">${esc(key)}</div><div class="sec-text${isHtml ? ' impression-html' : ''}">${isHtml ? val : esc(val)}</div></div>`
    }
    html += `</div>`
    return html
  })()

  const consultants = ((()=>{
    const arr: Array<{ name?: string; degrees?: string; title?: string }> = []
    arr.push({ name: (s as any)?.consultantName, degrees: (s as any)?.consultantDegrees, title: (s as any)?.consultantTitle })
    const extra = Array.isArray((s as any)?.consultants) ? (s as any).consultants : []
    for (const c of extra) arr.push({ name: c?.name, degrees: c?.degrees, title: c?.title })
    const filtered = arr.filter(c => (c?.name || c?.degrees || c?.title))
    const out = filtered.slice(0,3)
    return out
  })())
  const consultHtml = consultants.length ? `<div class=\"consult-grid\">${consultants.map(c=>`<div class=\\\"consult\\\"><div class=\\\"name\\\">${esc(c.name||'')}</div><div class=\\\"deg\\\">${esc(c.degrees||'')}</div><div class=\\\"title\\\">${esc(c.title||'')}</div></div>`).join('')}</div>` : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    body{ font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#1e293b; }
    .wrap{ padding: 0 6mm; min-height: 100vh; display:flex; flex-direction:column }
    @media print { .wrap{ min-height: calc(100vh - 36mm) } }
    .hdr{display:grid;grid-template-columns:80px 1fr 80px;align-items:center;padding-bottom:10px;border-bottom:3px solid #0f172a;margin-bottom:8px}
    .hdr .title{font-size:26px;font-weight:800;text-align:center;letter-spacing:0.5px;color:#0f172a}
    .hdr .muted{color:#64748b;font-size:11px;text-align:center;margin-top:3px}
    .dept{font-style:italic;text-align:center;margin:6px 0 2px 0;font-size:13px;color:#334155;font-weight:500}
    .hr{border-bottom:1px solid #cbd5e1;margin:4px 0}
    .box{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin:8px 0;background:#fafafa}
    .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:5px 12px;font-size:11.5px;align-items:start}
    .kv > div{line-height:1.3;color:#475569}
    .kv > div:nth-child(odd){font-weight:600;color:#334155}
    .kv > div:nth-child(2n){word-break:break-word;color:#0f172a}
    .title-mid{font-size:17px;font-weight:700;text-align:center;margin-top:6px;color:#0f172a;letter-spacing:0.3px}
    .sec{margin-top:10px}
    .sec-title{font-size:13px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #e2e8f0}
    .sec-text{white-space:pre-wrap;font-size:12.5px;line-height:1.6;color:#1e293b}
    .impression-html{white-space:normal}
    .impression-html p{margin:0 0 6px 0}
    .impression-html ul,.impression-html ol{margin:0 0 6px 16px;padding:0}
    .impression-html li{margin-bottom:2px}
    .content{white-space:pre-wrap;font-size:13px;line-height:1.6}
    .footnote{margin-top:20px;text-align:center;color:#64748b;font-size:10.5px}
    .foot-hr{border-bottom:1px solid #94a3b8;margin:10px 0}
    .spacer{flex:1}
    .footer-block{ page-break-inside: avoid; break-inside: avoid }
    .consult-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 20px;margin-top:8px}
    .consult .name{font-weight:700;text-transform:uppercase;font-size:12px;color:#0f172a}
    .consult .deg{font-size:11px;color:#475569}
    .consult .title{font-weight:600;font-size:11px;color:#334155}
  </style></head><body>
    <div class="wrap">
      <div class="hdr">
        <div>${logo? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title">${esc(name)}</div>
          <div class="muted">${esc(address)}</div>
          <div class="muted">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
        </div>
        <div></div>
      </div>
      <div class="dept">${esc(department)}</div>
      <div class="hr"></div>
      <div class="box">
        <div class="kv">
          <div>Medical Record No :</div><div>${esc(input.patient.mrn || '-')}</div>
          <div>Sample No / Lab No :</div><div>${esc(input.tokenNo || '-')}</div>
          <div>Patient Name :</div><div>${esc(input.patient.fullName)}</div>
          <div>Age / Gender :</div><div>${esc(input.patient.age || '')} / ${esc(input.patient.gender || '')}</div>
          <div>Reg. & Sample Time :</div><div>${fmt(input.createdAt)}</div>
          <div>Reporting Time :</div><div>${fmt(input.reportedAt || new Date().toISOString())}</div>
          <div>Contact No :</div><div>${esc(input.patient.phone || '-')}</div>
          <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
          <div>Address :</div><div>${esc(input.patient.address || '-')}</div>
        </div>
      </div>
      ${bodyHtml}
      <div class="spacer"></div>
      <div class="footer-block">
        <div class="footnote">${esc(footer)}</div>
        <div class="foot-hr"></div>
        ${consultHtml}
      </div>
    </div>
  </body></html>`
  // Prefer Electron in-app preview if available
  try{
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function'){
      await api.printPreviewHtml(html, {})
      return
    }
  }catch{}
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return
  doc.open(); doc.write(html); doc.close()
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch {}
    setTimeout(()=>{ try { iframe.remove() } catch {} }, 8000)
  }
}
