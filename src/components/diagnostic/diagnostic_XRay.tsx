import React from 'react';
import { diagnosticApi } from '../../utils/api';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const XRayGeneric: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">X-Ray Findings / Report</label>
        <textarea
          className="w-full rounded-lg border border-slate-300 p-4 min-h-[400px] focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-slate-800"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter detailed X-ray findings here..."
        />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700 font-medium">Tip: You can type or paste the complete report content above. This content will be printed exactly as shown.</p>
      </div>
    </div>
  );
};

export default XRayGeneric;

export async function printXRayReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}) {
  const s: any = await diagnosticApi.getSettings().catch(() => ({}));
  const name = s?.diagnosticName || 'Diagnostic Center';
  const address = s?.address || '-';
  const phone = s?.phone || '';
  const email = s?.email || '';
  const department = s?.department || 'Department of Radiology (X-Ray)';
  const logo = s?.logoDataUrl || '';
  const footer = s?.reportFooter || 'System Generated Report. No Signature Required.';

  const esc = (x: any) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fmt = (iso?: string) => { const d = iso ? new Date(iso) : new Date(); return d.toLocaleDateString() + " " + d.toLocaleTimeString() };

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; line-height: 1.5; }
    .wrap{ padding: 0 4mm; min-height: 100vh; display:flex; flex-direction:column }
    .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
    .hdr .title{font-size:28px;font-weight:800;text-align:center}
    .hdr .muted{color:#64748b;font-size:12px;text-align:center}
    .dept{font-style:italic;text-align:center;margin:8px 0 4px 0}
    .hr{border-bottom:2px solid #0f172a;margin:6px 0}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}
    .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}
    .title-mid{font-size:18px;font-weight:800;text-align:center;margin:12px 0;text-decoration:underline}
    .report-content{white-space:pre-wrap; font-size: 14px; margin-top: 20px; min-height: 400px;}
    .footnote{margin-top:18px;text-align:center;color:#475569;font-size: 12px;}
    .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
    .spacer{flex:1}
  </style></head><body>
    <div class="wrap">
      <div class="hdr">
        <div>${logo ? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title">${esc(name)}</div>
          <div class="muted">${esc(address)}</div>
          <div class="muted">Ph: ${esc(phone)} ${email ? ' • ' + esc(email) : ''}</div>
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
          <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
        </div>
      </div>
      <div class="title-mid">X-RAY REPORT</div>
      <div class="report-content">${esc(input.value)}</div>
      <div class="spacer"></div>
      <div class="footer-block">
        <div class="footnote">${esc(footer)}</div>
        <div class="foot-hr"></div>
      </div>
    </div>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { }
    setTimeout(() => { try { iframe.remove(); } catch { } }, 8000);
  };
}
