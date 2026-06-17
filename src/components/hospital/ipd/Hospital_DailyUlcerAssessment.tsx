export default function DailyUlcerAssessment({ data, onChange }: { data: any; onChange: (data: any) => void }) {
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

  const updateNestedAssessment = (index: number, parent: string, field: string, value: any) => {
    const assessments = exam.assessments || []
    const updated = [...assessments]
    if (!updated[index]) {
      updated[index] = {}
    }
    if (!updated[index][parent]) {
      updated[index][parent] = {}
    }
    updated[index][parent] = { ...updated[index][parent], [field]: value }
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

  const assessments = exam.assessments || []

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">
          INITIAL / DAILY ULCER ASSESSMENT
        </h4>
        
        <div className="overflow-x-auto">
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1 text-left min-w-[200px]">DESCRIPTIONS</th>
                {assessments.map((_: any, index: number) => (
                  <th key={index} className="border border-slate-300 px-2 py-1 min-w-[80px]">
                    <div className="flex items-center justify-between gap-1">
                      <span>Day {index + 1}</span>
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
                    title="Add day"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* DATE */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">DATE:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      placeholder="Date"
                      value={assessments[index]?.date || ''}
                      onChange={(e) => updateAssessment(index, 'date', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* SIZE */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">SIZE : (Length x Width)</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.size || ''}
                      onChange={(e) => updateAssessment(index, 'size', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* DEPTH */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">DEPTH</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.depth || ''}
                      onChange={(e) => updateAssessment(index, 'depth', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* EDGE */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">EDGE</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Clear, Visible</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.edge?.clearVisible || false}
                      onChange={(e) => updateNestedAssessment(index, 'edge', 'clearVisible', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Attached to the wound base</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.edge?.attachedToWoundBase || false}
                      onChange={(e) => updateNestedAssessment(index, 'edge', 'attachedToWoundBase', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Fibrotic, scarred</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.edge?.fibroticScarred || false}
                      onChange={(e) => updateNestedAssessment(index, 'edge', 'fibroticScarred', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* UNDERMINING */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">UNDERMINING:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.undermining || ''}
                      onChange={(e) => updateAssessment(index, 'undermining', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* NECROTIC TISSUE */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">NECROTIC TISSUE:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.necroticTissue || ''}
                      onChange={(e) => updateAssessment(index, 'necroticTissue', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* SLOUGH */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">SLOUGH:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.slough || ''}
                      onChange={(e) => updateAssessment(index, 'slough', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* ESCHAR */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">ESCHAR:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.eschar || ''}
                      onChange={(e) => updateAssessment(index, 'eschar', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* EXUDATE */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">EXUDATE:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Serous</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.exudate?.serous || false}
                      onChange={(e) => updateNestedAssessment(index, 'exudate', 'serous', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Serosanguinous</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.exudate?.serosanguinous || false}
                      onChange={(e) => updateNestedAssessment(index, 'exudate', 'serosanguinous', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Purulent</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.exudate?.purulent || false}
                      onChange={(e) => updateNestedAssessment(index, 'exudate', 'purulent', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* GRANULATION */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">GRANULATION:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Healthy Granulation</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.granulation?.healthy || false}
                      onChange={(e) => updateNestedAssessment(index, 'granulation', 'healthy', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Septic Granulation</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.granulation?.septic || false}
                      onChange={(e) => updateNestedAssessment(index, 'granulation', 'septic', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* EPITHELIALIZATION */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">EPITHELIALIZATION:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.epithelialization || ''}
                      onChange={(e) => updateAssessment(index, 'epithelialization', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* SURROUNDING SKIN */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">SURROUNDING SKIN:</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1"></td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Bright Red</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.surroundingSkin?.brightRed || false}
                      onChange={(e) => updateNestedAssessment(index, 'surroundingSkin', 'brightRed', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Blanchable</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.surroundingSkin?.blanchable || false}
                      onChange={(e) => updateNestedAssessment(index, 'surroundingSkin', 'blanchable', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Edematous</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.surroundingSkin?.edematous || false}
                      onChange={(e) => updateNestedAssessment(index, 'surroundingSkin', 'edematous', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 text-xs pl-6">☐ Indurated</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={assessments[index]?.surroundingSkin?.indurated || false}
                      onChange={(e) => updateNestedAssessment(index, 'surroundingSkin', 'indurated', e.target.checked)}
                      className="h-3 w-3"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* STAGE OF PRESSURE ULCER */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">STAGE OF PRESSURE ULCER:<br /><span className="font-normal text-xs">As per scale</span></td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.stageOfPressureUlcer || ''}
                      onChange={(e) => updateAssessment(index, 'stageOfPressureUlcer', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>

              {/* NURSE'S SIGNATURE AND I.D. NO. */}
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-semibold">NURSE'S SIGNATURE AND I.D. NO.</td>
                {assessments.map((_: any, index: number) => (
                  <td key={index} className="border border-slate-300 px-2 py-1">
                    <input
                      type="text"
                      value={assessments[index]?.nurseSignatureId || ''}
                      onChange={(e) => updateAssessment(index, 'nurseSignatureId', e.target.value)}
                      className="w-full border-0 px-1 py-0.5 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-slate-300"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-xs italic mt-2">
          NOTE: Check ☐ when applicable. Use separate form for each pressure ulcer
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
