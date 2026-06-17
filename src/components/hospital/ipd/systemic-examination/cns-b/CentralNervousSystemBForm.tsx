export default function CentralNervousSystemBForm({
  data,
  onChange,
}: {
  data: any
  onChange: (data: any) => void
}) {
  const updateNested = (section: string, field: string, value: any) => {
    onChange({
      ...data,
      [section]: { ...(data[section] || {}), [field]: value },
    })
  }

  const updateReflexes = (reflex: string, side: 'right' | 'left', value: string) => {
    onChange({
      ...data,
      reflexes: {
        ...(data.reflexes || {}),
        [reflex]: {
          ...(data.reflexes?.[reflex] || {}),
          [side]: value,
        },
      },
    })
  }

  const updateLimbs = (limb: string, value: string) => {
    onChange({
      ...data,
      limbs: {
        ...(data.limbs || {}),
        [limb]: value,
      },
    })
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
        <h4 className="mb-4 font-semibold text-slate-900">CENTRAL NERVOUS SYSTEM EXAMINATION (B)</h4>

        {/* Sensory Function */}
        <div className="mb-4">
          <div className="mb-2 font-semibold text-slate-700">Sensory Function</div>
          <div className="grid grid-cols-3 gap-4">
            {['fineTouch', 'crudeTouch', 'temperature', 'position', 'vibration', 'pain'].map((sense) => {
              const labels: any = { fineTouch: 'Fine Touch', crudeTouch: 'Crude Touch', temperature: 'Temperature', position: 'Position', vibration: 'Vibration', pain: 'Pain' }
              return (
                <div key={sense}>
                  <label className="mb-1 block text-xs text-slate-600">{labels[sense]}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={data.sensoryFunction?.[sense]?.intact || false} onChange={(e) => updateNested('sensoryFunction', sense, { ...(data.sensoryFunction?.[sense] || {}), intact: e.target.checked })} className="rounded" />
                      <span className="text-xs">Intact</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={data.sensoryFunction?.[sense]?.notIntact || false} onChange={(e) => updateNested('sensoryFunction', sense, { ...(data.sensoryFunction?.[sense] || {}), notIntact: e.target.checked })} className="rounded" />
                      <span className="text-xs">Not Intact</span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Motor Function */}
        <div className="mb-4">
          <div className="mb-2 font-semibold text-slate-700">Motor Function</div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.normal || false} onChange={(e) => updateNested('motorFunction', 'normal', e.target.checked)} className="rounded" /><span className="text-xs">Normal</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.involuntaryMovement || false} onChange={(e) => updateNested('motorFunction', 'involuntaryMovement', e.target.checked)} className="rounded" /><span className="text-xs">Involuntary Movement</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.neckStiffness || false} onChange={(e) => updateNested('motorFunction', 'neckStiffness', e.target.checked)} className="rounded" /><span className="text-xs">Neck Stiffness</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.kerningSign || false} onChange={(e) => updateNested('motorFunction', 'kerningSign', e.target.checked)} className="rounded" /><span className="text-xs">Kerning's Sign</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.straightLegRaising || false} onChange={(e) => updateNested('motorFunction', 'straightLegRaising', e.target.checked)} className="rounded" /><span className="text-xs">Straight Leg Raising</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={data.motorFunction?.brudzinskiSign || false} onChange={(e) => updateNested('motorFunction', 'brudzinskiSign', e.target.checked)} className="rounded" /><span className="text-xs">Brudzinski's Sign</span></label>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Others</label>
              <textarea value={data.motorFunction?.others || ''} onChange={(e) => updateNested('motorFunction', 'others', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" rows={2} placeholder="Other motor function findings..." />
            </div>
          </div>
        </div>

        {/* Reflexes */}
        <div className="mb-4">
          <div className="mb-2 font-semibold text-slate-700">Reflexes</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-2 text-xs font-medium text-slate-600">Right</div>
              <div className="space-y-2">
                {['Biceps', 'Triceps', 'Supinator', 'Abdominal', 'Knee', 'Ankle', 'Plantar', 'Babinski', 'Clonus'].map((reflex) => (
                  <div key={reflex}>
                    <label className="mb-1 block text-xs text-slate-600">{reflex}</label>
                    <input type="text" value={data.reflexes?.[reflex.toLowerCase()]?.right || ''} onChange={(e) => updateReflexes(reflex.toLowerCase(), 'right', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-slate-600">Left</div>
              <div className="space-y-2">
                {['Biceps', 'Triceps', 'Supinator', 'Abdominal', 'Knee', 'Ankle', 'Plantar', 'Babinski', 'Clonus'].map((reflex) => (
                  <div key={reflex}>
                    <label className="mb-1 block text-xs text-slate-600">{reflex}</label>
                    <input type="text" value={data.reflexes?.[reflex.toLowerCase()]?.left || ''} onChange={(e) => updateReflexes(reflex.toLowerCase(), 'left', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Limbs - Bulk/Tone/Power table */}
        <div className="mb-4">
          <div className="mb-2 font-semibold text-slate-700">Bulk / Tone / Power</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1"></th>
                  <th className="border border-slate-300 px-2 py-1">UPPER LIMB (R)</th>
                  <th className="border border-slate-300 px-2 py-1">UPPER LIMB (L)</th>
                  <th className="border border-slate-300 px-2 py-1">LOWER LIMB (R)</th>
                  <th className="border border-slate-300 px-2 py-1">LOWER LIMB (L)</th>
                </tr>
              </thead>
              <tbody>
                {['bulk', 'tone', 'power'].map((row) => (
                  <tr key={row}>
                    <td className="border border-slate-300 px-2 py-1 font-medium capitalize">{row}</td>
                    {['UpperRight', 'UpperLeft', 'LowerRight', 'LowerLeft'].map((col) => (
                      <td key={col} className="border border-slate-300 px-1 py-1">
                        <input type="text" value={data.limbs?.[`${row}${col}`] || ''} onChange={(e) => updateLimbs(`${row}${col}`, e.target.value)} className="w-full border-0 bg-transparent px-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
