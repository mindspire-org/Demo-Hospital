// Ophthalmology examination form for the doctor prescription page. Controlled
// component — the parent owns the value and receives updates via onChange.

export type EyeGlasses = { sph?: string; cyl?: string; axis?: string; add?: string }

export type EyeExaminationValue = {
  visualAcuityRight?: string
  visualAcuityLeft?: string
  nearVisionRight?: string
  nearVisionLeft?: string
  iopRight?: string
  iopLeft?: string
  refractionRight?: string
  refractionLeft?: string
  slitLamp?: string
  fundus?: string
  diagnosis?: string
  glassesRight?: EyeGlasses
  glassesLeft?: EyeGlasses
  generalNotes?: string
}

export function emptyEyeExamination(): EyeExaminationValue {
  return {
    visualAcuityRight: '', visualAcuityLeft: '',
    nearVisionRight: '', nearVisionLeft: '',
    iopRight: '', iopLeft: '',
    refractionRight: '', refractionLeft: '',
    slitLamp: '', fundus: '', diagnosis: '',
    glassesRight: { sph: '', cyl: '', axis: '', add: '' },
    glassesLeft: { sph: '', cyl: '', axis: '', add: '' },
    generalNotes: '',
  }
}

type Props = {
  value: EyeExaminationValue
  onChange?: (next: EyeExaminationValue) => void
  readOnly?: boolean
}

const fieldCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60'

const cellCls =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-60'

export default function EyeExamination({ value, onChange, readOnly = false }: Props) {
  const v = value || {}
  const set = (patch: Partial<EyeExaminationValue>) => onChange?.({ ...v, ...patch })
  const setGlasses = (eye: 'glassesRight' | 'glassesLeft', patch: Partial<EyeGlasses>) =>
    onChange?.({ ...v, [eye]: { ...(v[eye] || {}), ...patch } })

  // Helpers return JSX and are CALLED inline (not mounted as <Component/>) so the
  // inputs keep their identity across renders and don't lose focus while typing.
  const pair = (label: string, rightKey: keyof EyeExaminationValue, leftKey: keyof EyeExaminationValue, placeholder?: string) => (
    <div className="group" key={label}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">Right (OD)</span>
          <input
            type="text"
            disabled={readOnly}
            value={(v[rightKey] as string) || ''}
            onChange={(e) => set({ [rightKey]: e.target.value } as any)}
            placeholder={placeholder}
            className={fieldCls}
          />
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] font-medium text-slate-400">Left (OS)</span>
          <input
            type="text"
            disabled={readOnly}
            value={(v[leftKey] as string) || ''}
            onChange={(e) => set({ [leftKey]: e.target.value } as any)}
            placeholder={placeholder}
            className={fieldCls}
          />
        </div>
      </div>
    </div>
  )

  const glassesRow = (eye: 'glassesRight' | 'glassesLeft', label: string) => {
    const g = v[eye] || {}
    return (
      <tr key={eye}>
        <td className="border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">{label}</td>
        {(['sph', 'cyl', 'axis', 'add'] as (keyof EyeGlasses)[]).map((k) => (
          <td key={k} className="border border-slate-200 p-1">
            <input
              type="text"
              disabled={readOnly}
              value={(g[k] as string) || ''}
              onChange={(e) => setGlasses(eye, { [k]: e.target.value } as any)}
              className={cellCls}
            />
          </td>
        ))}
      </tr>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {pair('Visual Acuity', 'visualAcuityRight', 'visualAcuityLeft', 'e.g. 6/6, 6/9')}
        {pair('Near Vision', 'nearVisionRight', 'nearVisionLeft', 'e.g. N6')}
        {pair('IOP (mmHg)', 'iopRight', 'iopLeft', 'e.g. 14')}
        {pair('Refraction', 'refractionRight', 'refractionLeft', 'e.g. -1.00 DS')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Slit Lamp Examination</label>
          <textarea rows={3} disabled={readOnly} value={v.slitLamp || ''} onChange={(e) => set({ slitLamp: e.target.value })} placeholder="Anterior segment findings..." className={fieldCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Fundus Examination</label>
          <textarea rows={3} disabled={readOnly} value={v.fundus || ''} onChange={(e) => set({ fundus: e.target.value })} placeholder="Posterior segment findings..." className={fieldCls} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Diagnosis</label>
        <input type="text" disabled={readOnly} value={v.diagnosis || ''} onChange={(e) => set({ diagnosis: e.target.value })} placeholder="e.g. Cataract, Glaucoma, Refractive error, Conjunctivitis" className={fieldCls} />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Glasses Prescription</label>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600">Eye</th>
                <th className="border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600">SPH</th>
                <th className="border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600">CYL</th>
                <th className="border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600">AXIS</th>
                <th className="border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600">ADD</th>
              </tr>
            </thead>
            <tbody>
              {glassesRow('glassesRight', 'Right (OD)')}
              {glassesRow('glassesLeft', 'Left (OS)')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">General Eye Notes</label>
        <textarea rows={3} disabled={readOnly} value={v.generalNotes || ''} onChange={(e) => set({ generalNotes: e.target.value })} placeholder="Additional findings, advice, follow-up..." className={fieldCls} />
      </div>
    </div>
  )
}
