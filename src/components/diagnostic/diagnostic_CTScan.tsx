import React from 'react';
import type { ReportRendererProps } from './registry';
import { printDiagnosticReport } from './diagnosticPrint';

const CTScan: React.FC<ReportRendererProps> = ({ value: _value, onChange }) => {
  const [part, setPart] = React.useState('');
  const [technique, setTechnique] = React.useState('');
  const [findings, setFindings] = React.useState('');
  const [impression, setImpression] = React.useState('');
  const [suggested, setSuggested] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [imageUrl, setImageUrl] = React.useState('');
  const [ready, setReady] = React.useState(false)

  const prefillRef = React.useRef(false)
  const initialRef = React.useRef<Record<string,string>>({})
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) { setReady(true); return; }
    const labels = ['Part','Technique','Findings','Impression','Suggested','Images'];
    const set = new Set(labels);
    const sections: Record<string,string> = {};
    let cur = '';
    let buf: string[] = [];
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim();
      if (!cur && ['ct scan','ct scan report'].includes(line.toLowerCase())) continue;
      if (set.has(line)){ if (!cur){ buf = [] } else { push() } cur = line; continue }
      buf.push(raw)
    }
    push()
    initialRef.current = sections
    if (sections['Part']!=null) setPart(sections['Part'])
    if (sections['Technique']!=null) setTechnique(sections['Technique'])
    if (sections['Findings']!=null) setFindings(sections['Findings'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Suggested']!=null) setSuggested(sections['Suggested'])
    if (sections['Images']){
      const imgs = sections['Images'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      if (imgs.length) setImages(imgs)
    }
    prefillRef.current = true
    setReady(true)
  }, [_value])

  const build = React.useCallback(() => {
    const lines: string[] = [];
    lines.push('CT SCAN');
    lines.push('');
    lines.push('Part');
    lines.push(part || initialRef.current['Part'] || '');
    lines.push('');
    lines.push('Technique');
    lines.push(technique || initialRef.current['Technique'] || '');
    lines.push('');
    lines.push('Findings');
    lines.push(findings || initialRef.current['Findings'] || '');
    lines.push('');
    lines.push('Impression');
    lines.push(impression || initialRef.current['Impression'] || '');
    lines.push('');
    lines.push('Suggested');
    lines.push(suggested || initialRef.current['Suggested'] || '');
    const imgs = images && images.length ? images : (initialRef.current['Images'] ? initialRef.current['Images'].split(/\r?\n/).filter(Boolean) : [])
    if (imgs.length) {
      lines.push('');
      lines.push('Images');
      imgs.forEach(u => lines.push(u));
    }
    return lines.join('\n');
  }, [part, technique, findings, impression, suggested, images]);

  React.useEffect(() => { if (!ready) return; onChange(build()); }, [build, onChange, ready]);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const reads = Array.from(files).map(f =>
      new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('read error'));
        r.readAsDataURL(f);
      })
    );
    const urls = await Promise.all(reads);
    setImages(prev => [...prev, ...urls]);
  };

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Part</div>
        <input className="border rounded px-2 h-9" value={part} onChange={e=>setPart(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Technique</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={technique} onChange={e=>setTechnique(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Findings</div>
        <textarea placeholder="Use one finding per line" className="border rounded px-2 py-2 min-h-[140px]" value={findings} onChange={e=>setFindings(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Impression</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={impression} onChange={e=>setImpression(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Suggested</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={suggested} onChange={e=>setSuggested(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Images</div>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles(e.target.files)} />
          <div className="ml-auto flex items-center gap-2">
            <input className="border rounded px-2 h-9 w-64" placeholder="Paste image URL" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
            <button type="button" className="px-2 h-9 text-xs rounded border" onClick={()=>{ if (!imageUrl.trim()) return; setImages(prev=>[...prev, imageUrl.trim()]); setImageUrl(''); }}>Add URL</button>
          </div>
        </div>
        {images.length>0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {images.map((src, idx)=>(
              <div key={idx} className="relative border rounded overflow-hidden">
                <img src={src} alt="ct" className="w-full h-32 object-cover" />
                <button type="button" className="absolute top-1 right-1 bg-white/80 border rounded text-xs px-1" onClick={()=>setImages(prev=>prev.filter((_,i)=>i!==idx))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CTScan;

export async function printCTScanReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const labels = ['Part','Technique','Findings','Impression','Suggested','Images']
  const set = new Set(labels)
  const sections: Record<string,string> = {}
  let cur = ''
  let buf: string[] = []
  function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
  for (const raw of String(input.value||'').split(/\r?\n/)){
    const line = raw.trim()
    if (set.has(line)){ if (!cur){ buf = [] } else { push() } cur = line; continue }
    buf.push(raw)
  }
  push()

  const sectionDefs: Array<{ key: string; title: string; html: string }> = []

  const part = sections['Part']
  if (part) sectionDefs.push({ key: 'clinicalInformation', title: 'Part', html: `<p>${part.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const technique = sections['Technique']
  if (technique) sectionDefs.push({ key: 'technique', title: 'Technique', html: `<p>${technique.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const findings = sections['Findings']
  if (findings) sectionDefs.push({ key: 'findings', title: 'Findings', html: `<p>${findings.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const impression = sections['Impression']
  if (impression) sectionDefs.push({ key: 'impression', title: 'Impression', html: `<p>${impression.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

  const suggested = sections['Suggested']
  if (suggested) sectionDefs.push({ key: 'impression', title: 'Suggested', html: `<p>${suggested.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>` })

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
    reportTitle: 'CT Scan Report',
    sections: sectionDefs,
  })
}
