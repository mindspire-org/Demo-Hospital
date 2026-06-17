export default function HerniaRectalExam({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const exam = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...exam, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...exam, [parent]: { ...(exam[parent] || {}), [field]: value } })
  }

  const updateDeepNested = (parent: string, child: string, field: string, value: any) => {
    onChange({ 
      ...exam, 
      [parent]: { 
        ...(exam[parent] || {}), 
        [child]: { 
          ...(exam[parent]?.[child] || {}), 
          [field]: value 
        } 
      } 
    })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      {/* HERNIA Section */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">HERNIA</h4>
        
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1">Type</th>
              <th className="border border-slate-300 px-2 py-1">Location</th>
              <th className="border border-slate-300 px-2 py-1">Reducibility</th>
              <th className="border border-slate-300 px-2 py-1">Cough Impulse Test</th>
              <th className="border border-slate-300 px-2 py-1">Other</th>
            </tr>
          </thead>
          <tbody>
            {/* Inguinal/Direct/Indirect */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.type?.direct || false} onChange={(e) => { const newH = { ...(exam.hernia || {}), inguinal: { ...(exam.hernia?.inguinal || {}), type: { ...(exam.hernia?.inguinal?.type || {}), direct: e.target.checked } } }; onChange({ ...exam, hernia: newH }) }} className="h-3 w-3" />
                    <span>Inguinal</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.type?.indirect || false} onChange={(e) => { const newH = { ...(exam.hernia || {}), inguinal: { ...(exam.hernia?.inguinal || {}), type: { ...(exam.hernia?.inguinal?.type || {}), indirect: e.target.checked } } }; onChange({ ...exam, hernia: newH }) }} className="h-3 w-3" />
                    <span>Direct</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.type?.indirect2 || false} onChange={(e) => { const newH = { ...(exam.hernia || {}), inguinal: { ...(exam.hernia?.inguinal || {}), type: { ...(exam.hernia?.inguinal?.type || {}), indirect2: e.target.checked } } }; onChange({ ...exam, hernia: newH }) }} className="h-3 w-3" />
                    <span>Indirect</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.location?.bilateral || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'location', { ...exam.hernia?.inguinal?.location, bilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Bilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.location?.unilateral || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'location', { ...exam.hernia?.inguinal?.location, unilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Unilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.location?.l || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'location', { ...exam.hernia?.inguinal?.location, l: e.target.checked })} className="h-3 w-3" />
                    <span>L</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.location?.r || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'location', { ...exam.hernia?.inguinal?.location, r: e.target.checked })} className="h-3 w-3" />
                    <span>R</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.reducibility?.reducible || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'reducibility', { ...exam.hernia?.inguinal?.reducibility, reducible: e.target.checked })} className="h-3 w-3" />
                    <span>Reducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.reducibility?.irreducible || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'reducibility', { ...exam.hernia?.inguinal?.reducibility, irreducible: e.target.checked })} className="h-3 w-3" />
                    <span>Irreducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.reducibility?.strangulated || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'reducibility', { ...exam.hernia?.inguinal?.reducibility, strangulated: e.target.checked })} className="h-3 w-3" />
                    <span>Strangulated</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.coughImpulse?.positive || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'coughImpulse', { ...exam.hernia?.inguinal?.coughImpulse, positive: e.target.checked })} className="h-3 w-3" />
                    <span>+ve</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.inguinal?.coughImpulse?.negative || false} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'coughImpulse', { ...exam.hernia?.inguinal?.coughImpulse, negative: e.target.checked })} className="h-3 w-3" />
                    <span>-ve</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={exam.hernia?.inguinal?.other || ''} onChange={(e) => updateDeepNested('hernia', 'inguinal', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>

            {/* Femoral */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={exam.hernia?.femoral?.present || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'present', e.target.checked)} className="h-3 w-3" />
                  <span>Femoral</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.location?.bilateral || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'location', { ...exam.hernia?.femoral?.location, bilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Bilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.location?.unilateral || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'location', { ...exam.hernia?.femoral?.location, unilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Unilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.location?.l || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'location', { ...exam.hernia?.femoral?.location, l: e.target.checked })} className="h-3 w-3" />
                    <span>L</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.location?.r || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'location', { ...exam.hernia?.femoral?.location, r: e.target.checked })} className="h-3 w-3" />
                    <span>R</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.reducibility?.reducible || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'reducibility', { ...exam.hernia?.femoral?.reducibility, reducible: e.target.checked })} className="h-3 w-3" />
                    <span>Reducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.reducibility?.irreducible || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'reducibility', { ...exam.hernia?.femoral?.reducibility, irreducible: e.target.checked })} className="h-3 w-3" />
                    <span>Irreducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.reducibility?.strangulated || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'reducibility', { ...exam.hernia?.femoral?.reducibility, strangulated: e.target.checked })} className="h-3 w-3" />
                    <span>Strangulated</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.coughImpulse?.positive || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'coughImpulse', { ...exam.hernia?.femoral?.coughImpulse, positive: e.target.checked })} className="h-3 w-3" />
                    <span>+ve</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.femoral?.coughImpulse?.negative || false} onChange={(e) => updateDeepNested('hernia', 'femoral', 'coughImpulse', { ...exam.hernia?.femoral?.coughImpulse, negative: e.target.checked })} className="h-3 w-3" />
                    <span>-ve</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={exam.hernia?.femoral?.other || ''} onChange={(e) => updateDeepNested('hernia', 'femoral', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>

            {/* Umbilical */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={exam.hernia?.umbilical?.present || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'present', e.target.checked)} className="h-3 w-3" />
                  <span>Umbilical</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.location?.bilateral || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'location', { ...exam.hernia?.umbilical?.location, bilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Bilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.location?.unilateral || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'location', { ...exam.hernia?.umbilical?.location, unilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Unilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.location?.l || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'location', { ...exam.hernia?.umbilical?.location, l: e.target.checked })} className="h-3 w-3" />
                    <span>L</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.location?.r || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'location', { ...exam.hernia?.umbilical?.location, r: e.target.checked })} className="h-3 w-3" />
                    <span>R</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.reducibility?.reducible || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'reducibility', { ...exam.hernia?.umbilical?.reducibility, reducible: e.target.checked })} className="h-3 w-3" />
                    <span>Reducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.reducibility?.irreducible || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'reducibility', { ...exam.hernia?.umbilical?.reducibility, irreducible: e.target.checked })} className="h-3 w-3" />
                    <span>Irreducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.reducibility?.strangulated || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'reducibility', { ...exam.hernia?.umbilical?.reducibility, strangulated: e.target.checked })} className="h-3 w-3" />
                    <span>Strangulated</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.coughImpulse?.positive || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'coughImpulse', { ...exam.hernia?.umbilical?.coughImpulse, positive: e.target.checked })} className="h-3 w-3" />
                    <span>+ve</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.umbilical?.coughImpulse?.negative || false} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'coughImpulse', { ...exam.hernia?.umbilical?.coughImpulse, negative: e.target.checked })} className="h-3 w-3" />
                    <span>-ve</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={exam.hernia?.umbilical?.other || ''} onChange={(e) => updateDeepNested('hernia', 'umbilical', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>

            {/* Surgical */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={exam.hernia?.surgical?.present || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'present', e.target.checked)} className="h-3 w-3" />
                  <span>Surgical</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.location?.bilateral || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'location', { ...exam.hernia?.surgical?.location, bilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Bilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.location?.unilateral || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'location', { ...exam.hernia?.surgical?.location, unilateral: e.target.checked })} className="h-3 w-3" />
                    <span>Unilateral</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.location?.l || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'location', { ...exam.hernia?.surgical?.location, l: e.target.checked })} className="h-3 w-3" />
                    <span>L</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.location?.r || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'location', { ...exam.hernia?.surgical?.location, r: e.target.checked })} className="h-3 w-3" />
                    <span>R</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.reducibility?.reducible || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'reducibility', { ...exam.hernia?.surgical?.reducibility, reducible: e.target.checked })} className="h-3 w-3" />
                    <span>Reducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.reducibility?.irreducible || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'reducibility', { ...exam.hernia?.surgical?.reducibility, irreducible: e.target.checked })} className="h-3 w-3" />
                    <span>Irreducible</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.reducibility?.strangulated || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'reducibility', { ...exam.hernia?.surgical?.reducibility, strangulated: e.target.checked })} className="h-3 w-3" />
                    <span>Strangulated</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.coughImpulse?.positive || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'coughImpulse', { ...exam.hernia?.surgical?.coughImpulse, positive: e.target.checked })} className="h-3 w-3" />
                    <span>+ve</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={exam.hernia?.surgical?.coughImpulse?.negative || false} onChange={(e) => updateDeepNested('hernia', 'surgical', 'coughImpulse', { ...exam.hernia?.surgical?.coughImpulse, negative: e.target.checked })} className="h-3 w-3" />
                    <span>-ve</span>
                  </label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={exam.hernia?.surgical?.other || ''} onChange={(e) => updateDeepNested('hernia', 'surgical', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RECTAL Section */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">RECTAL</h4>
        
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.fissures || false} onChange={(e) => updateNested('rectal', 'fissures', e.target.checked)} className="h-3 w-3" />
            <span>Fissures</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.hemorrhoids || false} onChange={(e) => updateNested('rectal', 'hemorrhoids', e.target.checked)} className="h-3 w-3" />
            <span>Hemorrhoids</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.prolapse || false} onChange={(e) => updateNested('rectal', 'prolapse', e.target.checked)} className="h-3 w-3" />
            <span>Prolapse</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.perinalAbscess || false} onChange={(e) => updateNested('rectal', 'perinalAbscess', e.target.checked)} className="h-3 w-3" />
            <span>Perianal Abscess</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.abnormalMasses || false} onChange={(e) => updateNested('rectal', 'abnormalMasses', e.target.checked)} className="h-3 w-3" />
            <span>Abnormal Masses</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.analWarts || false} onChange={(e) => updateNested('rectal', 'analWarts', e.target.checked)} className="h-3 w-3" />
            <span>Anal Warts</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={exam.rectal?.analTags || false} onChange={(e) => updateNested('rectal', 'analTags', e.target.checked)} className="h-3 w-3" />
            <span>Anal Tags</span>
          </label>
        </div>

        <div className="border border-slate-300 p-2">
          <label className="block mb-1 text-xs font-semibold">Others</label>
          <input type="text" value={exam.rectal?.others || ''} onChange={(e) => updateNested('rectal', 'others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        <div className="border border-slate-300 p-2 space-y-2">
          <label className="font-semibold text-xs">Digital Rectal Examination Findings</label>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.rectal?.digitalExam?.performed || false} onChange={(e) => updateDeepNested('rectal', 'digitalExam', 'performed', e.target.checked)} className="h-3 w-3" />
              <span>Performed</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={exam.rectal?.digitalExam?.notPerformed || false} onChange={(e) => updateDeepNested('rectal', 'digitalExam', 'notPerformed', e.target.checked)} className="h-3 w-3" />
              <span>Not Performed</span>
            </label>
          </div>
          <div>
            <label className="block mb-1 text-xs">If Performed, Findings:</label>
            <textarea value={exam.rectal?.digitalExam?.findings || ''} onChange={(e) => updateDeepNested('rectal', 'digitalExam', 'findings', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
          </div>
        </div>
      </div>

      {/* Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={exam.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
      </div>
    </div>
  )
}
