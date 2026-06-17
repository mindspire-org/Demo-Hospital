export default function PressureUlcerRiskForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const exam = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...exam, [field]: value })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">PRESSURE ULCER RISK ASSESSMENT</h4>
        
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left">Assessment Item</th>
              <th className="border border-slate-300 px-2 py-1">Score 1</th>
              <th className="border border-slate-300 px-2 py-1">Score 2</th>
              <th className="border border-slate-300 px-2 py-1">Score 3</th>
              <th className="border border-slate-300 px-2 py-1">Score 4</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Sensory Perception</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="sensory" checked={exam.sensoryPerception === 1} onChange={() => update('sensoryPerception', 1)} className="h-3 w-3" /><span>Completely limited</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="sensory" checked={exam.sensoryPerception === 2} onChange={() => update('sensoryPerception', 2)} className="h-3 w-3" /><span>Very limited</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="sensory" checked={exam.sensoryPerception === 3} onChange={() => update('sensoryPerception', 3)} className="h-3 w-3" /><span>Slightly limited</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="sensory" checked={exam.sensoryPerception === 4} onChange={() => update('sensoryPerception', 4)} className="h-3 w-3" /><span>No impairment</span></label></td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Moisture</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="moisture" checked={exam.moisture === 1} onChange={() => update('moisture', 1)} className="h-3 w-3" /><span>Constantly moist</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="moisture" checked={exam.moisture === 2} onChange={() => update('moisture', 2)} className="h-3 w-3" /><span>Very moist</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="moisture" checked={exam.moisture === 3} onChange={() => update('moisture', 3)} className="h-3 w-3" /><span>Occasionally moist</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="moisture" checked={exam.moisture === 4} onChange={() => update('moisture', 4)} className="h-3 w-3" /><span>Rarely moist</span></label></td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Activity</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="activity" checked={exam.activity === 1} onChange={() => update('activity', 1)} className="h-3 w-3" /><span>Bedbound</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="activity" checked={exam.activity === 2} onChange={() => update('activity', 2)} className="h-3 w-3" /><span>Chairbound</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="activity" checked={exam.activity === 3} onChange={() => update('activity', 3)} className="h-3 w-3" /><span>Walks occasionally</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="activity" checked={exam.activity === 4} onChange={() => update('activity', 4)} className="h-3 w-3" /><span>Walks frequently</span></label></td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Mobility</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="mobility" checked={exam.mobility === 1} onChange={() => update('mobility', 1)} className="h-3 w-3" /><span>Completely immobile</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="mobility" checked={exam.mobility === 2} onChange={() => update('mobility', 2)} className="h-3 w-3" /><span>Very limited</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="mobility" checked={exam.mobility === 3} onChange={() => update('mobility', 3)} className="h-3 w-3" /><span>Slightly limited</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="mobility" checked={exam.mobility === 4} onChange={() => update('mobility', 4)} className="h-3 w-3" /><span>No limitation</span></label></td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Nutrition</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="nutrition" checked={exam.nutrition === 1} onChange={() => update('nutrition', 1)} className="h-3 w-3" /><span>Very poor</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="nutrition" checked={exam.nutrition === 2} onChange={() => update('nutrition', 2)} className="h-3 w-3" /><span>Probably inadequate</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="nutrition" checked={exam.nutrition === 3} onChange={() => update('nutrition', 3)} className="h-3 w-3" /><span>Adequate</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="nutrition" checked={exam.nutrition === 4} onChange={() => update('nutrition', 4)} className="h-3 w-3" /><span>Excellent</span></label></td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Friction & Shear</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="friction" checked={exam.frictionShear === 1} onChange={() => update('frictionShear', 1)} className="h-3 w-3" /><span>Problem</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="friction" checked={exam.frictionShear === 2} onChange={() => update('frictionShear', 2)} className="h-3 w-3" /><span>Potential problem</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="radio" name="friction" checked={exam.frictionShear === 3} onChange={() => update('frictionShear', 3)} className="h-3 w-3" /><span>No apparent problem</span></label></td>
              <td className="border border-slate-300 px-2 py-1">-</td>
            </tr>
          </tbody>
        </table>

        <div className="border border-slate-300 p-2">
          <label className="block mb-1 text-xs font-semibold">Total Score: {(exam.sensoryPerception || 0) + (exam.moisture || 0) + (exam.activity || 0) + (exam.mobility || 0) + (exam.nutrition || 0) + (exam.frictionShear || 0)}</label>
          <div className="text-xs text-slate-600">
            Risk Level: {((exam.sensoryPerception || 0) + (exam.moisture || 0) + (exam.activity || 0) + (exam.mobility || 0) + (exam.nutrition || 0) + (exam.frictionShear || 0)) <= 14 ? 'High Risk' : ((exam.sensoryPerception || 0) + (exam.moisture || 0) + (exam.activity || 0) + (exam.mobility || 0) + (exam.nutrition || 0) + (exam.frictionShear || 0)) <= 18 ? 'Moderate Risk' : 'Low Risk'}
          </div>
        </div>

        <div className="border border-slate-300 p-2">
          <label className="block mb-1 text-xs font-semibold">Notes / Recommendations</label>
          <textarea value={exam.notes || ''} onChange={(e) => update('notes', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
        </div>
      </div>

      {/* Overall Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={exam.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
      </div>
    </div>
  )
}
