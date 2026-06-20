import React from 'react';
import Diagnostic_RichTextEditor from './diagnostic_RichTextEditor';
import { ClipboardList, GitCompare, Wrench, Microscope, Lightbulb, ImagePlus, Trash2 } from 'lucide-react';
import { printDiagnosticReport } from './diagnosticPrint';

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
        // Legacy plain-text findings ? convert to simple HTML
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
  const FHTML = '__FINDINGS_HTML__'
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

  const sectionDefs: Array<{ key: string; title: string; html: string }> = []

  const clinical = sections['Clinical Information']
  if (clinical) sectionDefs.push({ key: 'clinicalInformation', title: 'Clinical Information', html: `<p>${clinical.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const comparison = sections['Comparison']
  if (comparison) sectionDefs.push({ key: 'comparison', title: 'Comparison', html: `<p>${comparison.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const technique = sections['Technique']
  if (technique) sectionDefs.push({ key: 'technique', title: 'Technique', html: `<p>${technique.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const findingsRaw = sections['Findings']
  if (findingsRaw) {
    let findingsHtml = ''
    if (findingsRaw.startsWith(FHTML)) {
      findingsHtml = findingsRaw.slice(FHTML.length)
    } else {
      findingsHtml = findingsRaw.split(/\r?\n/).map((l: string) => `<p>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('')
    }
    if (findingsHtml.replace(/<[^>]+>/g,'').trim()) {
      sectionDefs.push({ key: 'findings', title: 'Findings / Report', html: findingsHtml })
    }
  }

  const impression = sections['Impression']
  if (impression) sectionDefs.push({ key: 'impression', title: 'Impression', html: impression })

  const imagesRaw = sections['Images']
  if (imagesRaw) {
    const imgs = imagesRaw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    if (imgs.length) {
      const imgsHtml = `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">` + imgs.map(src=>`<img src="${src}" style="width:100%;height:auto;border-radius:6px;border:1px solid #e2e8f0"/>`).join('') + `</div>`
      sectionDefs.push({ key: 'images', title: 'Images', html: imgsHtml })
    }
  }

  await printDiagnosticReport({
    tokenNo: input.tokenNo,
    createdAt: input.createdAt,
    reportedAt: input.reportedAt,
    patient: input.patient,
    referringConsultant: input.referringConsultant,
    reportTitle: 'Ultrasound Report',
    sections: sectionDefs,
  })
}
