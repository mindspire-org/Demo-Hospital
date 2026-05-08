export type ReportRow = {
  test: string
  value?: string
  unit?: string
  normal?: string
  flag?: 'normal' | 'abnormal' | 'critical' | string
  prevValue?: string
  comment?: string
  kind?: 'quantitative' | 'qualitative'
  qualitativeValue?: string
  reference?: string
  sectionKey?: string
  drugSensitivities?: Array<{ drug: string; result: string }>
}

export type ReportInput = {
  testName: string
  template?: string
  rows: ReportRow[]
  interpretation?: string
  autoInterpretation?: string
  reportNotes?: string
  patient?: { fullName?: string; age?: string; gender?: string; mrn?: string; hospitalRegistrationNumber?: string; phone?: string }
  reportedAt?: string
  performedBy?: string
  approvedBy?: string
  sections?: Array<{ key: string; title: string; rows: ReportRow[] }>
  hideEmpty?: boolean
}

/** Returns rows whose value should appear in the printed report. */
export function filterPrintable(rows: ReportRow[] | undefined, hideEmpty = true): ReportRow[] {
  const list = rows || []
  if (!hideEmpty) return list
  return list.filter(r => {
    const v = (r.value ?? r.qualitativeValue ?? '').toString().trim()
    if (v) return true
    // keep sensitivity rows that have at least one drug result
    if (r.drugSensitivities?.some(d => d.result)) return true
    return false
  })
}

export function FlagPill({ flag }: { flag?: string }) {
  if (!flag || flag === 'normal') return null
  const cls = flag === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
  const lbl = flag === 'critical' ? 'Critical' : 'Abnormal'
  return <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${cls}`}>{lbl}</span>
}

export function PatientHeader({ p, reportedAt }: { p?: ReportInput['patient']; reportedAt?: string }) {
  if (!p) return null
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 text-sm">
      <div><span className="font-semibold">Patient:</span> {p.fullName}</div>
      <div className="text-right"><span className="font-semibold">MRN:</span> {p.mrn || '-'}</div>
      <div><span className="font-semibold">Age/Gender:</span> {p.age || '-'} / {p.gender || '-'}</div>
      <div className="text-right"><span className="font-semibold">Hospital Reg #:</span> {p.hospitalRegistrationNumber || '-'}</div>
      {p.phone && <div><span className="font-semibold">Phone:</span> {p.phone}</div>}
      {reportedAt && <div className="text-right"><span className="font-semibold">Date:</span> {new Date(reportedAt).toLocaleString()}</div>}
    </div>
  )
}

export function TitleBar({ title }: { title: string }) {
  return (
    <h2 className="mb-2 border-b-2 border-slate-700 pb-1 text-center text-lg font-bold uppercase tracking-wide">{title}</h2>
  )
}

export function StandardTable({ rows, hideEmpty }: { rows: ReportRow[]; hideEmpty?: boolean }) {
  const list = filterPrintable(rows, hideEmpty)
  if (!list.length) return null
  return (
    <table className="w-full border border-slate-300 text-sm">
      <thead className="bg-slate-100">
        <tr>
          <th className="border px-2 py-1 text-left">Test</th>
          <th className="border px-2 py-1 text-left">Result</th>
          <th className="border px-2 py-1 text-left">Unit</th>
          <th className="border px-2 py-1 text-left">Reference Range</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r, i) => (
          <tr key={i}>
            <td className="border px-2 py-1">{r.test}</td>
            <td className={`border px-2 py-1 font-medium ${r.flag === 'critical' ? 'text-rose-700' : r.flag === 'abnormal' ? 'text-amber-700' : ''}`}>
              {r.value || r.qualitativeValue || '-'}
              <FlagPill flag={r.flag} />
            </td>
            <td className="border px-2 py-1">{r.unit || ''}</td>
            <td className="border px-2 py-1">{r.normal || r.reference || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InterpretationBlock({ auto, manual, notes }: { auto?: string; manual?: string; notes?: string }) {
  if (!auto && !manual && !notes) return null
  return (
    <div className="mt-4 space-y-2 text-sm">
      {auto && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-2">
          <div className="text-xs font-semibold uppercase text-emerald-800">Interpretation</div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{auto}</pre>
        </div>
      )}
      {manual && (
        <div className="rounded border bg-slate-50 p-2">
          <div className="text-xs font-semibold uppercase text-slate-700">Comments</div>
          <p className="text-sm">{manual}</p>
        </div>
      )}
      {notes && <div className="text-xs italic text-slate-600">{notes}</div>}
    </div>
  )
}

export function SignBlock({ performed, approved }: { performed?: string; approved?: string }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-6 text-xs">
      <div className="border-t pt-1 text-center">Performed by<br/><span className="font-semibold">{performed || '—'}</span></div>
      <div className="border-t pt-1 text-center">Approved / Verified by<br/><span className="font-semibold">{approved || '—'}</span></div>
    </div>
  )
}
