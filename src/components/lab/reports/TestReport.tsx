import type { ReportInput, ReportRow } from './reportShared'
import {
  filterPrintable, FlagPill, PatientHeader, TitleBar,
  StandardTable, InterpretationBlock, SignBlock,
} from './reportShared'

/**
 * Single dispatcher component. Picks the right template based on `template`.
 * Each branch hides empty parameter rows by default.
 */
export default function TestReport(props: ReportInput) {
  const tpl = (props.template || 'general').toLowerCase()
  switch (tpl) {
    case 'cbc': return <CBCReport {...props} />
    case 'hba1c': return <HbA1cReport {...props} />
    case 'tft': return <TFTReport {...props} />
    case 'urine_re': return <UrineREReport {...props} />
    case 'semen': return <SemenReport {...props} />
    case 'blood_culture': return <BloodCultureReport {...props} />
    case 'qualitative': return <QualitativeReport {...props} />
    case 'lft':
    case 'rft':
    case 'lipid':
    case 'general':
    default:
      return <GeneralReport {...props} />
  }
}

function GeneralReport(p: ReportInput) {
  return (
    <div className="report-block">
      <TitleBar title={p.testName} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <StandardTable rows={p.rows} hideEmpty={p.hideEmpty} />
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function CBCReport(p: ReportInput) {
  const rows = filterPrintable(p.rows, p.hideEmpty !== false)
  // Group by sectionKey if present
  const counts = rows.filter(r => /neutroph|lymphoc|monoc|eosinop|basophil/i.test(r.test))
  const others = rows.filter(r => !counts.includes(r))
  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'Complete Blood Count (CBC)'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <StandardTable rows={others} hideEmpty={p.hideEmpty} />
      {!!counts.length && (
        <>
          <h3 className="mt-4 mb-1 text-sm font-bold uppercase">Differential Count</h3>
          <StandardTable rows={counts} hideEmpty={p.hideEmpty} />
        </>
      )}
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function HbA1cReport(p: ReportInput) {
  // HbA1c usually one parameter; the auto-interpretation block delivers the diagnosis.
  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'HbA1c (Glycated Haemoglobin)'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <StandardTable rows={p.rows} hideEmpty={p.hideEmpty} />
      <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-2 text-xs">
        <div className="font-semibold mb-1">Reference (ADA criteria):</div>
        <ul className="list-disc pl-5 leading-5">
          <li>≤ 5.6 % — Non-diabetic</li>
          <li>5.7 – 6.4 % — Pre-diabetic</li>
          <li>≥ 6.5 % — Diabetic</li>
          <li>&gt; 8 % — Poor glycaemic control</li>
        </ul>
      </div>
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function TFTReport(p: ReportInput) {
  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'Thyroid Function Test (TFT)'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <StandardTable rows={p.rows} hideEmpty={p.hideEmpty} />
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function bySection(input: ReportInput, fallback: Array<{ key: string; title: string; match: (r: ReportRow) => boolean }>): Array<{ key: string; title: string; rows: ReportRow[] }> {
  if (input.sections?.length) {
    return input.sections.map(s => ({ key: s.key, title: s.title, rows: filterPrintable(s.rows, input.hideEmpty !== false) }))
  }
  // Fall back: bucket the flat rows[] by name patterns.
  const allRows = filterPrintable(input.rows, input.hideEmpty !== false)
  return fallback.map(f => ({
    key: f.key,
    title: f.title,
    rows: allRows.filter(r => (r.sectionKey === f.key) || f.match(r)),
  }))
}

function UrineREReport(p: ReportInput) {
  const sections = bySection(p, [
    { key: 'physical', title: 'Physical Examination', match: r => /colou?r|appearance|volume|sp\.?\s*gr|pH|smell|odou?r/i.test(r.test) },
    { key: 'chemical', title: 'Chemical Examination', match: r => /sugar|protein|ketone|bilirubin|urobilinogen|nitrite|leuko/i.test(r.test) },
    { key: 'microscopic', title: 'Microscopic Examination', match: r => /pus|rbc|epith|cast|crystal|bacteri|hpf/i.test(r.test) },
  ])
  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'Urine Routine Examination (UCE)'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      {sections.map(s => s.rows.length ? (
        <div key={s.key} className="mb-3">
          <h3 className="mt-2 mb-1 text-sm font-bold uppercase">{s.title}</h3>
          <StandardTable rows={s.rows} hideEmpty={false} />
        </div>
      ) : null)}
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function SemenReport(p: ReportInput) {
  const sections = bySection(p, [
    { key: 'physical', title: 'Physical', match: r => /volume|colou?r|liquef|viscos|appearance|pH/i.test(r.test) },
    { key: 'microscopic', title: 'Microscopic', match: r => /count|motil|morpholog|sperm|pus|rbc|aggluti/i.test(r.test) },
    { key: 'comments', title: 'Comments', match: r => /comment|impression/i.test(r.test) },
  ])
  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'Semen Analysis'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      {sections.map(s => s.rows.length ? (
        <div key={s.key} className="mb-3">
          <h3 className="mt-2 mb-1 text-sm font-bold uppercase">{s.title}</h3>
          <StandardTable rows={s.rows} hideEmpty={false} />
        </div>
      ) : null)}
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function BloodCultureReport(p: ReportInput) {
  const rows = filterPrintable(p.rows, p.hideEmpty !== false)
  // Identify sensitivity rows
  const sensitivityRows = rows.filter(r => r.drugSensitivities && r.drugSensitivities.length)
  const otherRows = rows.filter(r => !sensitivityRows.includes(r))

  // Build sensitivity table: list every drug separately
  const drugs: Array<{ drug: string; result: string }> = []
  for (const r of sensitivityRows) for (const d of (r.drugSensitivities || [])) drugs.push(d)
  const sensitive = drugs.filter(d => d.result === 'Sensitive')
  const resistant = drugs.filter(d => d.result === 'Resistant')
  const intermediate = drugs.filter(d => d.result === 'Intermediate')

  return (
    <div className="report-block">
      <TitleBar title={p.testName || 'Blood Culture & Sensitivity'} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <h3 className="mt-2 mb-1 text-sm font-bold uppercase">Culture</h3>
      <StandardTable rows={otherRows} hideEmpty={false} />

      {!!drugs.length && (
        <>
          <h3 className="mt-4 mb-1 text-sm font-bold uppercase">Antibiotic Sensitivity</h3>
          <table className="w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border px-2 py-1 text-left">Drug</th>
                <th className="border px-2 py-1 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {drugs.map((d, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{d.drug}</td>
                  <td className={`border px-2 py-1 font-medium ${d.result === 'Resistant' ? 'text-rose-700' : d.result === 'Sensitive' ? 'text-emerald-700' : 'text-amber-700'}`}>{d.result || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded bg-emerald-50 p-2"><b>Sensitive ({sensitive.length}):</b> {sensitive.map(d => d.drug).join(', ') || '—'}</div>
            <div className="rounded bg-amber-50 p-2"><b>Intermediate ({intermediate.length}):</b> {intermediate.map(d => d.drug).join(', ') || '—'}</div>
            <div className="rounded bg-rose-50 p-2"><b>Resistant ({resistant.length}):</b> {resistant.map(d => d.drug).join(', ') || '—'}</div>
          </div>
        </>
      )}

      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}

function QualitativeReport(p: ReportInput) {
  // Show only test name and Positive/Negative result
  const rows = filterPrintable(p.rows, p.hideEmpty !== false)
  return (
    <div className="report-block">
      <TitleBar title={p.testName} />
      <PatientHeader p={p.patient} reportedAt={p.reportedAt} />
      <table className="w-full border text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border px-2 py-1 text-left">Test</th>
            <th className="border px-2 py-1 text-left">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const v = (r.qualitativeValue || r.value || '').toString()
            const isPos = /pos|reactive|present/i.test(v)
            const isNeg = /neg|non.?reactive|absent/i.test(v)
            return (
              <tr key={i}>
                <td className="border px-2 py-1">{r.test}</td>
                <td className={`border px-2 py-1 font-semibold ${isPos ? 'text-rose-700' : isNeg ? 'text-emerald-700' : ''}`}>{v || '-'}<FlagPill flag={r.flag} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <InterpretationBlock auto={p.autoInterpretation} manual={p.interpretation} notes={p.reportNotes} />
      <SignBlock performed={p.performedBy} approved={p.approvedBy} />
    </div>
  )
}
