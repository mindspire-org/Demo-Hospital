import React from 'react';
import { printDiagnosticReport } from './diagnosticPrint';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const UpperGIEndoscopy: React.FC<Props> = ({ value: _value, onChange }) => {
  const [indications, setIndications] = React.useState('');
  const [consent, setConsent] = React.useState('');
  const [procedure, setProcedure] = React.useState('');
  const [premed, setPremed] = React.useState('');
  const [findings, setFindings] = React.useState('');
  type KvRow = { label: string; value: string };
  const defaultFindingRows: KvRow[] = [
    { label: '', value: '' },
    { label: '', value: '' },
  ];
  const [findingRows, setFindingRows] = React.useState<KvRow[]>(defaultFindingRows);
  const [impression, setImpression] = React.useState('');
  const [recommendations, setRecommendations] = React.useState('');
  const [referredBy, setReferredBy] = React.useState('');
  const [ready] = React.useState(false)
  const initialRef = React.useRef<Record<string,string>>({})

  // Prefill from existing value (Edit flow)
  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) return;
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Findings','Impression','Recommendations']
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
    if (sections['Referred By']!=null) setReferredBy(sections['Referred By'])
    if (sections['Indications']!=null) setIndications(sections['Indications'])
    if (sections['Consent']!=null) setConsent(sections['Consent'])
    if (sections['Procedure']!=null) setProcedure(sections['Procedure'])
    if (sections['Pre-Medication']!=null) setPremed(sections['Pre-Medication'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Recommendations']!=null) setRecommendations(sections['Recommendations'])
    if (sections['Findings']){
      const lines = sections['Findings'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      const rows: KvRow[] = []
      for (const line of lines){
        const idx = line.indexOf(':')
        if (idx>0){ rows.push({ label: line.slice(0, idx).trim(), value: line.slice(idx+1).trim() }) }
        else { rows.push({ label: '', value: line }) }
      }
      if (rows.length) setFindingRows(rows)
      setFindings(sections['Findings'])
    }
    prefillRef.current = true
  }, [_value])

  const build = React.useCallback(() => {
    const out: string[] = [];
    const get = (label: string, cur: string) => (cur?.trim() || initialRef.current[label] || '').trim()
    const pushIf = (label: string, cur: string) => {
      const v = get(label, cur)
      if (v) out.push(`${label}\n${v}`)
    }
    pushIf('Indications', indications);
    pushIf('Consent', consent);
    pushIf('Procedure', procedure);
    pushIf('Pre-Medication', premed);
    pushIf('Findings', findings);
    pushIf('Impression', impression);
    pushIf('Recommendations', recommendations);
    pushIf('Referred By', referredBy);
    return out.join('\n\n');
  }, [indications, consent, procedure, premed, findings, impression, recommendations, referredBy]);

  // Recompute findings text from dynamic rows (preserve per-line layout)
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

  React.useEffect(() => {
    if (!ready) return;
    onChange(build());
  }, [build, onChange, ready]);

  return (
    <div className="grid gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">Referred By</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[60px]" value={referredBy} onChange={e=>setReferredBy(e.target.value)} placeholder="Doctor/Facility name" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Indications</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={indications} onChange={e=>setIndications(e.target.value)} placeholder="One item per line. Example: UPPER GI BLEED" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Consent</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={consent} onChange={e=>setConsent(e.target.value)} placeholder="Benefits/risks discussed; consent obtained" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Procedure</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={procedure} onChange={e=>setProcedure(e.target.value)} placeholder="Describe scope advancement and areas examined" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Pre-Medication</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={premed} onChange={e=>setPremed(e.target.value)} placeholder="e.g., Xylocaine Solution 4% ..." />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Findings</label>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={()=>setFindingRows(rows=>[...rows,{ label: '', value: '' }])}>Add Row</button>
        </div>
        <div className="grid gap-2">
          {findingRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-2 items-start">
              <textarea className="w-full rounded border px-2 py-2" value={row.label} onChange={e=>{
                const v = e.target.value; setFindingRows(r=>r.map((it,i)=> i===idx ? ({...it,label:v}) : it));
              }} placeholder="Label (e.g., 1. Esophagus)" />
              <textarea className="w-full rounded border px-2 py-2" value={row.value} onChange={e=>{
                const v = e.target.value; setFindingRows(r=>r.map((it,i)=> i===idx ? ({...it,value:v}) : it));
              }} placeholder="Details" />
              <button type="button" className="text-xs px-2 py-1" onClick={()=>setFindingRows(r=>r.filter((_,i)=>i!==idx))}>Remove</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Impression</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={impression} onChange={e=>setImpression(e.target.value)} placeholder="Summary impression" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Recommendations</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={recommendations} onChange={e=>setRecommendations(e.target.value)} placeholder="One item per line. e.g., High dose PPI; Follow biopsy report; ..." />
      </div>
    </div>
  );
};

export default UpperGIEndoscopy;

export async function printUpperGIEndoscopyReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Findings','Impression','Recommendations']
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
  for (const key of labels){
    const val = (sections as any)[key]
    if (!val) continue
    const html = `<p>${val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map((l: string)=>l.trim()).filter(Boolean).join('</p><p>')}</p>`
    const keyMap: Record<string,string> = {
      'Referred By': 'clinicalInformation',
      'Indications': 'clinicalInformation',
      'Consent': 'technique',
      'Procedure': 'technique',
      'Pre-Medication': 'technique',
      'Findings': 'findings',
      'Impression': 'impression',
      'Recommendations': 'impression',
    }
    sectionDefs.push({ key: keyMap[key] || 'findings', title: key, html })
  }

  await printDiagnosticReport({
    tokenNo: input.tokenNo,
    createdAt: input.createdAt,
    reportedAt: input.reportedAt,
    patient: input.patient,
    referringConsultant: input.referringConsultant,
    reportTitle: 'Upper GI Endoscopy Report',
    sections: sectionDefs,
  })
}


