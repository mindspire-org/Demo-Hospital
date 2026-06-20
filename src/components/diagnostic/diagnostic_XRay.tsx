import React from 'react';
import { printDiagnosticReport } from './diagnosticPrint';

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
  const reportHtml = `<p>${input.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join('</p><p>')}</p>`
  await printDiagnosticReport({
    tokenNo: input.tokenNo,
    createdAt: input.createdAt,
    reportedAt: input.reportedAt,
    patient: input.patient,
    referringConsultant: input.referringConsultant,
    reportTitle: 'X-Ray Report',
    sections: [{ key: 'findings', title: 'Findings / Report', html: reportHtml }],
  })
}
