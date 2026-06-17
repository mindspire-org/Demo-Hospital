export default function MusculoskeletalForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const msk = data || {}

  const update = (field: string, value: any) => onChange({ ...msk, [field]: value })
  const updateNested = (parent: string, field: string, value: any) =>
    onChange({ ...msk, [parent]: { ...(msk[parent] || {}), [field]: value } })
  const updateDeepNested = (parent: string, child: string, field: string, value: any) =>
    onChange({ ...msk, [parent]: { ...(msk[parent] || {}), [child]: { ...(msk[parent]?.[child] || {}), [field]: value } } })

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">MUSCULOSKELETAL SYSTEM</h4>

      {/* Main Table */}
      <div className="border border-slate-300">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left">SENSORY FUNCTION</th>
              <th className="border border-slate-300 px-2 py-1">INTACT</th>
              <th className="border border-slate-300 px-2 py-1">NOT INTACT</th>
              <th className="border border-slate-300 px-2 py-1"></th>
              <th className="border border-slate-300 px-2 py-1">UPPER LIMB (R)</th>
              <th className="border border-slate-300 px-2 py-1">UPPER LIMB (L)</th>
              <th className="border border-slate-300 px-2 py-1">LOWER LIMB (R)</th>
              <th className="border border-slate-300 px-2 py-1">LOWER LIMB (L)</th>
            </tr>
          </thead>
          <tbody>
            {/* Fine Touch + Bulk */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Fine Touch</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.fineTouch?.intact||false} onChange={e=>updateDeepNested('sensory','fineTouch','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.fineTouch?.notIntact||false} onChange={e=>updateDeepNested('sensory','fineTouch','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Bulk</td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.bulk?.upperR||''} onChange={e=>updateNested('bulk','upperR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.bulk?.upperL||''} onChange={e=>updateNested('bulk','upperL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.bulk?.lowerR||''} onChange={e=>updateNested('bulk','lowerR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.bulk?.lowerL||''} onChange={e=>updateNested('bulk','lowerL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Crude Touch + Tone */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Crude Touch</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.crudeTouch?.intact||false} onChange={e=>updateDeepNested('sensory','crudeTouch','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.crudeTouch?.notIntact||false} onChange={e=>updateDeepNested('sensory','crudeTouch','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Tone</td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.tone?.upperR||''} onChange={e=>updateNested('tone','upperR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.tone?.upperL||''} onChange={e=>updateNested('tone','upperL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.tone?.lowerR||''} onChange={e=>updateNested('tone','lowerR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.tone?.lowerL||''} onChange={e=>updateNested('tone','lowerL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Temperature + Power */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Temperature</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.temperature?.intact||false} onChange={e=>updateDeepNested('sensory','temperature','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.temperature?.notIntact||false} onChange={e=>updateDeepNested('sensory','temperature','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Power</td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.power?.upperR||''} onChange={e=>updateNested('power','upperR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.power?.upperL||''} onChange={e=>updateNested('power','upperL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.power?.lowerR||''} onChange={e=>updateNested('power','lowerR',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" value={msk.power?.lowerL||''} onChange={e=>updateNested('power','lowerL',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Position + Reflexes header */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Position</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.position?.intact||false} onChange={e=>updateDeepNested('sensory','position','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.position?.notIntact||false} onChange={e=>updateDeepNested('sensory','position','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 font-bold">Reflexes</td>
              <td className="border border-slate-300 px-2 py-1 text-center font-semibold" colSpan={2}>Right</td>
              <td className="border border-slate-300 px-2 py-1 text-center font-semibold" colSpan={2}>Left</td>
            </tr>
            {/* Vibration + Biceps */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Vibration</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.vibration?.intact||false} onChange={e=>updateDeepNested('sensory','vibration','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.vibration?.notIntact||false} onChange={e=>updateDeepNested('sensory','vibration','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1">Biceps</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.biceps?.right||''} onChange={e=>updateDeepNested('reflexes','biceps','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.biceps?.left||''} onChange={e=>updateDeepNested('reflexes','biceps','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Pain + Triceps */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">Pain</td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.pain?.intact||false} onChange={e=>updateDeepNested('sensory','pain','intact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1 text-center"><input type="checkbox" checked={msk.sensory?.pain?.notIntact||false} onChange={e=>updateDeepNested('sensory','pain','notIntact',e.target.checked)} className="h-3 w-3"/></td>
              <td className="border border-slate-300 px-2 py-1">Triceps</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.triceps?.right||''} onChange={e=>updateDeepNested('reflexes','triceps','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.triceps?.left||''} onChange={e=>updateDeepNested('reflexes','triceps','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Motor Function header + Supinator */}
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-bold text-center" colSpan={3}>Motor Function</td>
              <td className="border border-slate-300 px-2 py-1">Supinator</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.supinator?.right||''} onChange={e=>updateDeepNested('reflexes','supinator','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.supinator?.left||''} onChange={e=>updateDeepNested('reflexes','supinator','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Normal + Involuntary + Abdominal */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={msk.motorFunction?.normal||false} onChange={e=>updateNested('motorFunction','normal',e.target.checked)} className="h-3 w-3"/><span>Normal</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={msk.motorFunction?.involuntaryMovement||false} onChange={e=>updateNested('motorFunction','involuntaryMovement',e.target.checked)} className="h-3 w-3"/><span>Involuntary Movement</span></label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">Abdominal</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.abdominal?.right||''} onChange={e=>updateDeepNested('reflexes','abdominal','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.abdominal?.left||''} onChange={e=>updateDeepNested('reflexes','abdominal','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Neck Stiffness + Knee */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.motorFunction?.neckStiffness||false} onChange={e=>updateNested('motorFunction','neckStiffness',e.target.checked)} className="h-3 w-3"/><span>Neck Stiffness</span></label>
              </td>
              <td className="border border-slate-300 px-2 py-1">Knee</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.knee?.right||''} onChange={e=>updateDeepNested('reflexes','knee','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.knee?.left||''} onChange={e=>updateDeepNested('reflexes','knee','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Kernig + Ankle */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.motorFunction?.kernigSign||false} onChange={e=>updateNested('motorFunction','kernigSign',e.target.checked)} className="h-3 w-3"/><span>Kernig&apos;s Sign</span></label>
              </td>
              <td className="border border-slate-300 px-2 py-1">Ankle</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.ankle?.right||''} onChange={e=>updateDeepNested('reflexes','ankle','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.ankle?.left||''} onChange={e=>updateDeepNested('reflexes','ankle','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Brudzinski + Plantar */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.motorFunction?.brudzinskiSign||false} onChange={e=>updateNested('motorFunction','brudzinskiSign',e.target.checked)} className="h-3 w-3"/><span>Brudzinski&apos;s Sign</span></label>
              </td>
              <td className="border border-slate-300 px-2 py-1">Plantar</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.plantar?.right||''} onChange={e=>updateDeepNested('reflexes','plantar','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.plantar?.left||''} onChange={e=>updateDeepNested('reflexes','plantar','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Straight Leg + Babinski */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.motorFunction?.straightLegRaising||false} onChange={e=>updateNested('motorFunction','straightLegRaising',e.target.checked)} className="h-3 w-3"/><span>Straight Leg Raising</span></label>
              </td>
              <td className="border border-slate-300 px-2 py-1">Babinski</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.babinski?.right||''} onChange={e=>updateDeepNested('reflexes','babinski','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.babinski?.left||''} onChange={e=>updateDeepNested('reflexes','babinski','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
            {/* Others + Clonus */}
            <tr>
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                <div className="flex items-center gap-1 text-xs">
                  <span>Others.....</span>
                  <input type="text" value={msk.motorFunction?.others||''} onChange={e=>updateNested('motorFunction','others',e.target.value)} className="flex-1 border border-slate-300 px-1 py-0.5 text-xs rounded"/>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">Clonus</td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.clonus?.right||''} onChange={e=>updateDeepNested('reflexes','clonus','right',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
              <td className="border border-slate-300 px-2 py-1" colSpan={2}><input type="text" value={msk.reflexes?.clonus?.left||''} onChange={e=>updateDeepNested('reflexes','clonus','left',e.target.value)} className="w-full border-0 text-xs px-1"/></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Joint Examination */}
      <div className="border border-slate-300 p-2 bg-white">
        <label className="block mb-1 text-xs font-semibold">Joint Examination:</label>
        <div className="flex flex-wrap gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.swelling||false} onChange={e=>updateNested('jointExamination','swelling',e.target.checked)} className="h-3 w-3"/><span>Swelling</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.tenderness||false} onChange={e=>updateNested('jointExamination','tenderness',e.target.checked)} className="h-3 w-3"/><span>Tenderness</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.deformity||false} onChange={e=>updateNested('jointExamination','deformity',e.target.checked)} className="h-3 w-3"/><span>Deformity</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.rangeOfMotion||false} onChange={e=>updateNested('jointExamination','rangeOfMotion',e.target.checked)} className="h-3 w-3"/><span>Range of Motion</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.crepitus||false} onChange={e=>updateNested('jointExamination','crepitus',e.target.checked)} className="h-3 w-3"/><span>Crepitus</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.jointExamination?.instability||false} onChange={e=>updateNested('jointExamination','instability',e.target.checked)} className="h-3 w-3"/><span>Instability</span></label>
        </div>
        <textarea placeholder="Joint Details" value={msk.jointExamination?.details||''} onChange={e=>updateNested('jointExamination','details',e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]"/>
      </div>

      {/* Spine Examination */}
      <div className="border border-slate-300 p-2 bg-white">
        <label className="block mb-1 text-xs font-semibold">Spine Examination:</label>
        <div className="flex flex-wrap gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.normalCurvature||false} onChange={e=>updateNested('spineExamination','normalCurvature',e.target.checked)} className="h-3 w-3"/><span>Normal Curvature</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.kyphosis||false} onChange={e=>updateNested('spineExamination','kyphosis',e.target.checked)} className="h-3 w-3"/><span>Kyphosis</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.lordosis||false} onChange={e=>updateNested('spineExamination','lordosis',e.target.checked)} className="h-3 w-3"/><span>Lordosis</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.scoliosis||false} onChange={e=>updateNested('spineExamination','scoliosis',e.target.checked)} className="h-3 w-3"/><span>Scoliosis</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.tenderness||false} onChange={e=>updateNested('spineExamination','tenderness',e.target.checked)} className="h-3 w-3"/><span>Tenderness</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.spineExamination?.rangeOfMotion||false} onChange={e=>updateNested('spineExamination','rangeOfMotion',e.target.checked)} className="h-3 w-3"/><span>Range of Motion</span></label>
        </div>
        <textarea placeholder="Spine Details" value={msk.spineExamination?.details||''} onChange={e=>updateNested('spineExamination','details',e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]"/>
      </div>

      {/* Gait */}
      <div className="border border-slate-300 p-2 bg-white">
        <label className="block mb-1 text-xs font-semibold">Gait:</label>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.normal||false} onChange={e=>updateNested('gait','normal',e.target.checked)} className="h-3 w-3"/><span>Normal</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.antalgic||false} onChange={e=>updateNested('gait','antalgic',e.target.checked)} className="h-3 w-3"/><span>Antalgic</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.trendelenburg||false} onChange={e=>updateNested('gait','trendelenburg',e.target.checked)} className="h-3 w-3"/><span>Trendelenburg</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.ataxic||false} onChange={e=>updateNested('gait','ataxic',e.target.checked)} className="h-3 w-3"/><span>Ataxic</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.waddling||false} onChange={e=>updateNested('gait','waddling',e.target.checked)} className="h-3 w-3"/><span>Waddling</span></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={msk.gait?.steppage||false} onChange={e=>updateNested('gait','steppage',e.target.checked)} className="h-3 w-3"/><span>Steppage</span></label>
        </div>
      </div>

      {/* Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={msk.others||''} onChange={e=>update('others',e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]"/>
      </div>
    </div>
  )
}
