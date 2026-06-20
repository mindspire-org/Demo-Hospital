import React from 'react';
// Using native textarea/input elements to avoid external UI dependencies
import type { ReportRendererProps } from './registry';
import { printDiagnosticReport } from './diagnosticPrint';

const EchoCheckbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean)=>void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" className="accent-purple-600" checked={checked} onChange={e=>onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const Echocardiography: React.FC<ReportRendererProps> = ({ value, onChange }) => {
  type Row = { label: string; normal: string; result: string };
  const [rows, setRows] = React.useState<Row[]>([
    { label: 'AORTIC ROOT', normal: '', result: '' },
    { label: 'AORTIC ANNULUS', normal: '', result: '' },
    { label: 'LA', normal: '19-39mm', result: '' },
    { label: 'LA/Aortic Ratio', normal: '', result: '' },
    { label: 'RV', normal: '7-25mm', result: '' },
    { label: '2D MV Area', normal: '', result: '' },
    { label: 'LVISD', normal: '', result: '' },
    { label: 'LVPWD', normal: '', result: '' },
    { label: 'LVIDD', normal: '', result: '' },
    { label: 'LVIDS', normal: '', result: '' },
    { label: 'EF', normal: '', result: '' },
    { label: 'FS', normal: '', result: '' },
  ]);
  const [doppler, setDoppler] = React.useState({ mitral: '', tricuspid: '', aortic: '', pulmonary: '' });
  const [cfm, setCfm] = React.useState('');
  const defaults = [
    'Levocardia',
    'AV-VA concordance',
    'Situs solitus',
    'All cardiac chambers are normal.',
    'All valves are normal.',
    'Intact IAS and IVS.',
    'No PDA.',
    'No other congenital heart disease.',
    'No clot/vegetation seen.',
  ];
  const [checks, setChecks] = React.useState<boolean[]>(defaults.map(()=>true));
  const [conclusion, setConclusion] = React.useState('Normal study. Ref to paeds cardiologist for detailed ECHO.');

  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return
    try {
      const parsed = JSON.parse(value||'')
      if (parsed && typeof parsed === 'object'){
        if (Array.isArray(parsed.rows)) setRows(parsed.rows)
        if (parsed.doppler && typeof parsed.doppler === 'object') setDoppler(parsed.doppler)
        if (typeof parsed.cfm === 'string') setCfm(parsed.cfm)
        if (Array.isArray(parsed.report)){
          const arr = defaults.map(lbl => (parsed.report as string[]).includes(lbl))
          setChecks(arr)
        }
        if (typeof parsed.conclusion === 'string') setConclusion(parsed.conclusion)
        prefillRef.current = true
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  React.useEffect(() => {
    const payload = {
      rows,
      doppler,
      cfm,
      report: defaults.filter((_, idx)=> !!checks[idx]),
      conclusion,
    }
    onChange(JSON.stringify(payload))
  }, [rows, doppler, cfm, checks, conclusion, onChange]);

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border">
        <div className="px-3 py-2 font-medium border-b flex items-center gap-2">
          <span>B/M Mode Dimensions</span>
          <button type="button" className="ml-auto px-2 h-8 text-xs rounded border hover:bg-gray-50" onClick={()=>setRows(prev=>[...prev, {label:'',normal:'',result:''}])}>Add Parameter</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2 w-[40%]">Parameter</th>
                <th className="p-2 w-[30%]">Normal</th>
                <th className="p-2 w-[30%]">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.label} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], label:v }; return n; }); }} /></td>
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.normal} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], normal:v }; return n; }); }} /></td>
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.result} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], result:v }; return n; }); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded border">
        <div className="px-3 py-2 font-medium border-b">Doppler</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
          {(['mitral','tricuspid','aortic','pulmonary'] as const).map(k => (
            <div key={k}>
              <label className="block text-sm text-gray-600 mb-1 capitalize">{k}</label>
              <input className="w-full border rounded px-2 h-8" value={(doppler as any)[k]||''} onChange={e=>setDoppler(prev=>({ ...prev, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Color Flow Mapping</label>
        <textarea className="w-full border rounded px-2 py-2 min-h-[88px]" value={cfm} onChange={e=>setCfm(e.target.value)} placeholder="Describe color flow mapping" />
      </div>

      <div className="bg-white rounded border p-3">
        <div className="text-sm font-medium mb-2">Report</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {defaults.map((lbl, i) => (
            <EchoCheckbox key={i} label={lbl} checked={checks[i]} onChange={(v)=>setChecks(prev=>{ const n=[...prev]; n[i]=v; return n; })} />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Conclusion</label>
        <textarea className="w-full border rounded px-2 py-2 min-h-[88px]" value={conclusion} onChange={e=>setConclusion(e.target.value)} />
      </div>
    </div>
  );
};

export default Echocardiography;

export function buildEchocardiographyBodyHtml(value: string){
  function esc(s: any){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
  let data: any = {}
  try { data = JSON.parse(String(value||'{}')) } catch {}
  const rows: Array<{ label: string; normal: string; result: string }> = Array.isArray(data?.rows) ? data.rows : []
  const leftRows = rows.slice(0, Math.ceil(rows.length/2))
  const rightRows = rows.slice(Math.ceil(rows.length/2))
  const dop = (data?.doppler && typeof data.doppler === 'object') ? data.doppler : {}
  const dopplerLines: string[] = []
  if (dop?.mitral) dopplerLines.push(`Mitral: ${dop.mitral}`)
  if (dop?.tricuspid) dopplerLines.push(`Tricuspid: ${dop.tricuspid}`)
  if (dop?.aortic) dopplerLines.push(`Aortic: ${dop.aortic}`)
  if (dop?.pulmonary) dopplerLines.push(`Pulmonary: ${dop.pulmonary}`)
  const cfm = String(data?.cfm||'')
  const report: string[] = Array.isArray(data?.report) ? data.report : []
  const conclusion = String(data?.conclusion||'')
  const maxLen = Math.max(leftRows.length, rightRows.length)
  let body = ''
  body += `<div class="echo-title">ECHOCARDIOGRAPHIC IMAGING REPORT</div>`
  body += `<table class="echo-table"><thead>`
  body += `<tr><th class="head" colspan="6">B/M MODE DIMENSIONS</th><th class="head">DOPPLER</th></tr>`
  body += `<tr><th class="cell head-sm">Parameter</th><th class="cell head-sm">Normal</th><th class="cell head-sm">Result</th>`
  body += `<th class="cell head-sm">Parameter</th><th class="cell head-sm">Normal</th><th class="cell head-sm">Result</th><th class="cell head-sm"></th></tr>`
  body += `</thead><tbody>`
  for (let i=0;i<Math.max(4, maxLen); i++){
    const a = leftRows[i]||{}
    const b = rightRows[i]||{}
    body += `<tr>`
    body += `<td class="cell">${esc(a?.label||'')}</td>`
    body += `<td class="cell">${esc(a?.normal||'')}</td>`
    body += `<td class="cell">${esc(a?.result||'')}</td>`
    body += `<td class="cell">${esc(b?.label||'')}</td>`
    body += `<td class="cell">${esc(b?.normal||'')}</td>`
    body += `<td class="cell">${esc(b?.result||'')}</td>`
    body += `<td class="cell">${esc(dopplerLines[i]||'')}</td>`
    body += `</tr>`
  }
  body += `</tbody></table>`
  body += `<table class="echo-cfm-table"><tr><td class="cell"><strong>COLOR FLOW MAPPING :-</strong> ${esc(cfm)}</td></tr></table>`
  const bullets = report.map(it=>`<li> ${esc(it||'')} </li>`).join('')
  body += `<div class="section"><div class="section-title">REPORT</div><ul class="bullets">${bullets}</ul></div>`
  body += `<div class="section"><div class="section-title">CONCLUSION</div><div class="section-text">${esc(conclusion)}</div></div>`
  return body
}

export async function printEchocardiographyReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const extraStyles = `
    .echo-title { font-size:16px; font-weight:700; text-align:center; margin-top:6px; text-transform:uppercase; color:#0f172a; letter-spacing:0.3px }
    .echo-table { width:100%; border-collapse:collapse; margin-top:8px; border:1.5px solid #0f172a }
    .echo-table .head { background:#f8fafc; border-bottom:2px solid #0f172a; padding:6px; font-weight:700; text-align:center }
    .echo-table .head-sm { background:#ffffff; border-bottom:1px solid #0f172a; padding:6px; text-align:left }
    .echo-table .cell { border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; padding:6px; font-size:11.5px }
    .echo-table tr > .cell:last-child { border-right:0 }
    .echo-cfm-table { width:100%; border-collapse:collapse; border:1.5px solid #0f172a; border-top:0; margin-top:0; margin-bottom:8px }
    .echo-cfm-table .cell { padding:6px; font-size:11.5px }
    .section { margin-top:8px }
    .section-title { font-weight:700; margin:6px 0 4px 0; text-transform:uppercase; font-size:12.5px; color:#334155; letter-spacing:0.4px }
    .bullets { margin:0 0 4px 18px; padding:0 }
    .bullets li { margin:2px 0; font-size:12px }
    .section-text { white-space:pre-wrap; font-size:12px }
  `
  await printDiagnosticReport({
    tokenNo: input.tokenNo,
    createdAt: input.createdAt,
    reportedAt: input.reportedAt,
    patient: input.patient,
    referringConsultant: input.referringConsultant,
    reportTitle: 'Echocardiography Report',
    sections: [{ key: 'findings', title: 'Echocardiographic Findings', html: buildEchocardiographyBodyHtml(input.value) }],
    extraStyles,
  })
}
