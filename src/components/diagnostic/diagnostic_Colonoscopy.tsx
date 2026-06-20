import React from 'react';
import type { ReportRendererProps } from './registry';
import { printDiagnosticReport } from './diagnosticPrint';

const Colonoscopy: React.FC<ReportRendererProps> = ({ value: _value, onChange }) => {
  const [indications, setIndications] = React.useState('');
  const [consent, setConsent] = React.useState('');
  const [procedure, setProcedure] = React.useState('');
  const [premed, setPremed] = React.useState('');
  const [rectalExam, setRectalExam] = React.useState('');
  const [findings, setFindings] = React.useState('');
  const [impression, setImpression] = React.useState('');
  const [recommendations, setRecommendations] = React.useState('');
  const [referredBy, setReferredBy] = React.useState('');
  const [ready, setReady] = React.useState(false)

  const prefillRef = React.useRef(false)
  const initialRef = React.useRef<Record<string,string>>({})
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) return;
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Rectal Exam','Findings','Impression','Recommendations'];
    const set = new Set(labels);
    const sections: Record<string,string> = {};
    let cur = '';
    let buf: string[] = [];
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim();
      if (set.has(line)){
        if (!cur){ buf = [] } else { push() }
        cur = line; continue
      }
      // skip title line like 'COLONOSCOPY'
      if (!cur && ['colonoscopy','colonoscopy report'].includes(line.toLowerCase())) continue
      buf.push(raw)
    }
    push()
    initialRef.current = sections
    setReferredBy(sections['Referred By'] || '')
    setIndications(sections['Indications'] || '')
    setConsent(sections['Consent'] || '')
    setProcedure(sections['Procedure'] || '')
    setPremed(sections['Pre-Medication'] || '')
    setRectalExam(sections['Rectal Exam'] || '')
    setFindings(sections['Findings'] || '')
    setImpression(sections['Impression'] || '')
    setRecommendations(sections['Recommendations'] || '')
    prefillRef.current = true
    setReady(true)
  }, [_value])

  const build = React.useCallback(() => {
    const lines: string[] = [];
    lines.push('COLONOSCOPY');
    lines.push('');
    const refBy = (referredBy || initialRef.current['Referred By'] || '').trim();
    if (refBy) { lines.push('Referred By'); lines.push(refBy); lines.push(''); }
    lines.push('Indications');
    lines.push(indications || initialRef.current['Indications'] || '');
    lines.push('');
    lines.push('Consent');
    lines.push(consent || initialRef.current['Consent'] || '');
    lines.push('');
    lines.push('Procedure');
    lines.push(procedure || initialRef.current['Procedure'] || '');
    lines.push('');
    lines.push('Pre-Medication');
    lines.push(premed || initialRef.current['Pre-Medication'] || '');
    lines.push('');
    lines.push('Rectal Exam');
    lines.push(rectalExam || initialRef.current['Rectal Exam'] || '');
    lines.push('');
    lines.push('Findings');
    lines.push(findings || initialRef.current['Findings'] || '');
    lines.push('');
    lines.push('Impression');
    lines.push(impression || initialRef.current['Impression'] || '');
    lines.push('');
    lines.push('Recommendations');
    lines.push(recommendations || initialRef.current['Recommendations'] || '');
    return lines.join('\n');
  }, [indications, consent, procedure, premed, rectalExam, findings, impression, recommendations, referredBy]);

  React.useEffect(() => { if (!ready) return; onChange(build()); }, [build, onChange, ready]);

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Referred By</div>
        <input className="border rounded px-2 h-9" value={referredBy} onChange={e=>setReferredBy(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Indications</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={indications} onChange={e=>setIndications(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Consent</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={consent} onChange={e=>setConsent(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Procedure</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={procedure} onChange={e=>setProcedure(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Pre-Medication</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={premed} onChange={e=>setPremed(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Rectal Exam</div>
        <input className="border rounded px-2 h-9" value={rectalExam} onChange={e=>setRectalExam(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Findings</div>
        <textarea placeholder="Write findings. Use new line for separation." className="border rounded px-2 py-2 min-h-[140px]" value={findings} onChange={e=>setFindings(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Impression</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={impression} onChange={e=>setImpression(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Recommendations</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={recommendations} onChange={e=>setRecommendations(e.target.value)} />
      </div>
    </div>
  );
};

export default Colonoscopy;

export async function printColonoscopyReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Rectal Exam','Findings','Impression','Recommendations']
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
      'Rectal Exam': 'technique',
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
    reportTitle: 'Colonoscopy Report',
    sections: sectionDefs,
  })
}

