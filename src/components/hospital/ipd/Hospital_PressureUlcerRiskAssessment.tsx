export default function PressureUlcerRiskAssessment({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const exam = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...exam, [field]: value })
  }

  const updateAssessment = (index: number, field: string, value: any) => {
    const assessments = exam.assessments || []
    const updated = [...assessments]
    if (!updated[index]) {
      updated[index] = {}
    }
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...exam, assessments: updated })
  }

  const addAssessmentColumn = () => {
    const assessments = exam.assessments || []
    onChange({ ...exam, assessments: [...assessments, {}] })
  }

  const removeAssessmentColumn = (index: number) => {
    const assessments = exam.assessments || []
    onChange({ ...exam, assessments: assessments.filter((_: any, i: number) => i !== index) })
  }

  const updateAffectedSite = (site: string, checked: boolean) => {
    const sites = exam.affectedSites || []
    if (checked) {
      onChange({ ...exam, affectedSites: [...sites, site] })
    } else {
      onChange({ ...exam, affectedSites: sites.filter((s: string) => s !== site) })
    }
  }

  const assessments = exam.assessments || []

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      {/* SECTION I - Risk Assessment Table */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">
          RISK ASSESSMENT TOOL FOR PREDICTING PRESSURE ULCERS<br />
          (REFER TO GUIDELINES)
        </h4>
        
        <div className="text-xs font-semibold mb-2">SECTION I</div>

        <div className="overflow-x-auto">
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left min-w-[200px]">DATES:</th>
                {assessments.map((_: any, index: number) => (
                  <th key={index} className="border border-slate-300 px-2 py-1 min-w-[80px]">
                    <div className="flex items-center justify-between gap-1">
                      <input
                        type="text"
                        placeholder="Date"
                        value={assessments[index]?.date || ''}
                        onChange={(e) => updateAssessment(index, 'date', e.target.value)}
                        className="w-full border-0 px-1 py-0.5 text-xs bg-transparent"
                      />
                      <button
                        onClick={() => removeAssessmentColumn(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                        title="Remove column"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
                <th className="border border-slate-300 px-2 py-1">
                  <button
                    onClick={addAssessmentColumn}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                    title="Add column"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">SENSORY PERCEPTION:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.sensoryPerception || ''}
                      onChange={(e) => updateAssessment(index, 'sensoryPerception', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs">Ability to respond meaningfully to pressure related discomfort.</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">MOISTURE:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.moisture || ''}
                      onChange={(e) => updateAssessment(index, 'moisture', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs">Degree of which skin exposed to wetness and/or fluids.</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">ACTIVITY:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.activity || ''}
                      onChange={(e) => updateAssessment(index, 'activity', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs">Degree of physical ability to work and bear weight.</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">MOBILITY:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.mobility || ''}
                      onChange={(e) => updateAssessment(index, 'mobility', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs">Ability to change and control body position.</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">NUTRITION:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.nutrition || ''}
                      onChange={(e) => updateAssessment(index, 'nutrition', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs">Usual food intake patterns</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">FRICTION AND SHEARING:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.frictionShearing || ''}
                      onChange={(e) => updateAssessment(index, 'frictionShearing', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr className="bg-slate-100">
                <td className="border border-slate-300 px-2 py-1 font-semibold">TOTAL SCORE</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.totalScore || ''}
                      onChange={(e) => updateAssessment(index, 'totalScore', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs font-semibold bg-slate-100"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">NURSE NAME SIGN & ID</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.nurseNameSignId || ''}
                      onChange={(e) => updateAssessment(index, 'nurseNameSignId', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Risk Factor */}
        <div className="border border-slate-300 p-2 bg-white">
          <label className="font-semibold text-xs mb-2 block">Risk Factor</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.riskFactor?.highRisk || false} onChange={(e) => update('riskFactor', { ...exam.riskFactor, highRisk: e.target.checked })} className="h-3 w-3" />
              <span>High Risk (H)</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.riskFactor?.moderate || false} onChange={(e) => update('riskFactor', { ...exam.riskFactor, moderate: e.target.checked })} className="h-3 w-3" />
              <span>Moderate (12-14)</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.riskFactor?.mild || false} onChange={(e) => update('riskFactor', { ...exam.riskFactor, mild: e.target.checked })} className="h-3 w-3" />
              <span>Mild (15-18)</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.riskFactor?.notAtRisk || false} onChange={(e) => update('riskFactor', { ...exam.riskFactor, notAtRisk: e.target.checked })} className="h-3 w-3" />
              <span>Not at Risk (&gt;18)</span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION II - Affected Sites */}
      <div className="border border-slate-300 p-3 space-y-3">
        <div className="text-xs font-semibold mb-2">SECTION II</div>
        <div className="font-semibold text-xs mb-2">Circle the affected site with Pressure Ulcer</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('occipital-bone')} onChange={(e) => updateAffectedSite('occipital-bone', e.target.checked)} className="h-3 w-3" />
              <span>Occipital bone</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('scapula')} onChange={(e) => updateAffectedSite('scapula', e.target.checked)} className="h-3 w-3" />
              <span>Scapula</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('spinous-process')} onChange={(e) => updateAffectedSite('spinous-process', e.target.checked)} className="h-3 w-3" />
              <span>Spinous process</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('elbow')} onChange={(e) => updateAffectedSite('elbow', e.target.checked)} className="h-3 w-3" />
              <span>Elbow</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('iliac-crest')} onChange={(e) => updateAffectedSite('iliac-crest', e.target.checked)} className="h-3 w-3" />
              <span>Iliac Crest</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('sacrum')} onChange={(e) => updateAffectedSite('sacrum', e.target.checked)} className="h-3 w-3" />
              <span>Sacrum</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('ischium')} onChange={(e) => updateAffectedSite('ischium', e.target.checked)} className="h-3 w-3" />
              <span>Ischium</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('achilles-tendon')} onChange={(e) => updateAffectedSite('achilles-tendon', e.target.checked)} className="h-3 w-3" />
              <span>Achilles Tendon</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('heel')} onChange={(e) => updateAffectedSite('heel', e.target.checked)} className="h-3 w-3" />
              <span>Heel</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('sole')} onChange={(e) => updateAffectedSite('sole', e.target.checked)} className="h-3 w-3" />
              <span>Sole</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('ear')} onChange={(e) => updateAffectedSite('ear', e.target.checked)} className="h-3 w-3" />
              <span>Ear</span>
            </label>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('shoulder')} onChange={(e) => updateAffectedSite('shoulder', e.target.checked)} className="h-3 w-3" />
              <span>Shoulder</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('anterior-iliac-spine')} onChange={(e) => updateAffectedSite('anterior-iliac-spine', e.target.checked)} className="h-3 w-3" />
              <span>Anterior Iliac Spine</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('trochanter')} onChange={(e) => updateAffectedSite('trochanter', e.target.checked)} className="h-3 w-3" />
              <span>Trochanter</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('thigh')} onChange={(e) => updateAffectedSite('thigh', e.target.checked)} className="h-3 w-3" />
              <span>Thigh</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('medial-knee')} onChange={(e) => updateAffectedSite('medial-knee', e.target.checked)} className="h-3 w-3" />
              <span>Medial Knee</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('lateral-knee')} onChange={(e) => updateAffectedSite('lateral-knee', e.target.checked)} className="h-3 w-3" />
              <span>Lateral Knee</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('lower-leg')} onChange={(e) => updateAffectedSite('lower-leg', e.target.checked)} className="h-3 w-3" />
              <span>Lower Leg</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('medial-malleolus')} onChange={(e) => updateAffectedSite('medial-malleolus', e.target.checked)} className="h-3 w-3" />
              <span>Medial Malleolus</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('lateral-malleolus')} onChange={(e) => updateAffectedSite('lateral-malleolus', e.target.checked)} className="h-3 w-3" />
              <span>Lateral Malleolus</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={(exam.affectedSites || []).includes('posterior-knee')} onChange={(e) => updateAffectedSite('posterior-knee', e.target.checked)} className="h-3 w-3" />
              <span>Posterior Knee</span>
            </label>
          </div>
        </div>

        {/* Date and time of completion */}
        <div className="border border-slate-300 p-2 bg-white mt-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block mb-1 font-semibold">Date and time of completion</label>
              <input type="text" placeholder="Date / Time : AM/PM" value={exam.completionDateTime || ''} onChange={(e) => update('completionDateTime', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Counter Checked By:</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={exam.counterCheckedBy?.headNurse || false} onChange={(e) => update('counterCheckedBy', { ...exam.counterCheckedBy, headNurse: e.target.checked })} className="h-3 w-3" />
                  <span>Head Nurse</span>
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={exam.counterCheckedBy?.chargeNurse || false} onChange={(e) => update('counterCheckedBy', { ...exam.counterCheckedBy, chargeNurse: e.target.checked })} className="h-3 w-3" />
                  <span>Charge Nurse</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Nurse Name, Sign & ID */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold">Nurse Name:</label>
            <input type="text" value={exam.nurseName || ''} onChange={(e) => update('nurseName', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">Sign & ID:</label>
            <input type="text" value={exam.nurseSignId || ''} onChange={(e) => update('nurseSignId', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-xs font-semibold">Name Sign & ID:</label>
          <input type="text" value={exam.nameSignId || ''} onChange={(e) => update('nameSignId', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
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
