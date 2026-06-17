export default function GynecologicalObstetricForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const exam = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...exam, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...exam, [parent]: { ...(exam[parent] || {}), [field]: value } })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      {/* GYNECOLOGICAL / OBSTETRIC HISTORY */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">GYNECOLOGICAL / OBSTETRIC HISTORY</h4>
        
        {/* Menstruating */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Menstruating</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstruating?.no || false} onChange={(e) => updateNested('menstruating', 'no', e.target.checked)} className="h-3 w-3" /><span>No</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstruating?.yes || false} onChange={(e) => updateNested('menstruating', 'yes', e.target.checked)} className="h-3 w-3" /><span>Yes</span></label>
            <div><input type="text" placeholder="Age at Menarche" value={exam.menstruating?.ageAtMenarche || ''} onChange={(e) => updateNested('menstruating', 'ageAtMenarche', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Last Menstrual Period" value={exam.menstruating?.lastMenstrualPeriod || ''} onChange={(e) => updateNested('menstruating', 'lastMenstrualPeriod', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Menstrual Cycle */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Menstrual Cycle</label>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualCycle?.regular || false} onChange={(e) => updateNested('menstrualCycle', 'regular', e.target.checked)} className="h-3 w-3" /><span>Regular</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualCycle?.irregular || false} onChange={(e) => updateNested('menstrualCycle', 'irregular', e.target.checked)} className="h-3 w-3" /><span>Irregular</span></label>
            <div><input type="text" placeholder="Duration (Days)" value={exam.menstrualCycle?.duration || ''} onChange={(e) => updateNested('menstrualCycle', 'duration', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div className="col-span-2">
              <label className="block mb-1">Contraceptive Use</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualCycle?.contraceptiveNo || false} onChange={(e) => updateNested('menstrualCycle', 'contraceptiveNo', e.target.checked)} className="h-3 w-3" /><span>No</span></label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualCycle?.contraceptiveYes || false} onChange={(e) => updateNested('menstrualCycle', 'contraceptiveYes', e.target.checked)} className="h-3 w-3" /><span>Yes</span></label>
                <input type="text" placeholder="If Yes, then Type" value={exam.menstrualCycle?.contraceptiveType || ''} onChange={(e) => updateNested('menstrualCycle', 'contraceptiveType', e.target.value)} className="flex-1 border border-slate-300 px-2 py-1 text-xs rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Menstrual Loss */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Menstrual Loss</label>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualLoss?.scanty || false} onChange={(e) => updateNested('menstrualLoss', 'scanty', e.target.checked)} className="h-3 w-3" /><span>Scanty</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualLoss?.moderate || false} onChange={(e) => updateNested('menstrualLoss', 'moderate', e.target.checked)} className="h-3 w-3" /><span>Moderate</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menstrualLoss?.excessive || false} onChange={(e) => updateNested('menstrualLoss', 'excessive', e.target.checked)} className="h-3 w-3" /><span>Excessive</span></label>
            <div><input type="text" placeholder="Pads Used/Day" value={exam.menstrualLoss?.padsUsed || ''} onChange={(e) => updateNested('menstrualLoss', 'padsUsed', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="PAP Smear Findings" value={exam.menstrualLoss?.papSmearFindings || ''} onChange={(e) => updateNested('menstrualLoss', 'papSmearFindings', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Dysmenorrhea & Dyspareunia */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-300 p-2">
            <label className="font-semibold text-xs mb-1 block">Dysmenorrhea</label>
            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={exam.dysmenorrhea?.beforeOnset || false} onChange={(e) => updateNested('dysmenorrhea', 'beforeOnset', e.target.checked)} className="h-3 w-3" /><span>Before Onset</span></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={exam.dysmenorrhea?.zeroToTwoDays || false} onChange={(e) => updateNested('dysmenorrhea', 'zeroToTwoDays', e.target.checked)} className="h-3 w-3" /><span>0-2 Days of Menses</span></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={exam.dysmenorrhea?.afterMenses || false} onChange={(e) => updateNested('dysmenorrhea', 'afterMenses', e.target.checked)} className="h-3 w-3" /><span>After Menses</span></label>
            </div>
          </div>
          <div className="border border-slate-300 p-2">
            <label className="font-semibold text-xs mb-1 block">Dyspareunia</label>
            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={exam.dyspareunia?.superficial || false} onChange={(e) => updateNested('dyspareunia', 'superficial', e.target.checked)} className="h-3 w-3" /><span>Superficial</span></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={exam.dyspareunia?.deep || false} onChange={(e) => updateNested('dyspareunia', 'deep', e.target.checked)} className="h-3 w-3" /><span>Deep</span></label>
            </div>
          </div>
        </div>

        {/* GPA */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">G P A</label>
          <div className="grid grid-cols-6 gap-2 text-xs">
            <div><input type="text" placeholder="Gravida" value={exam.gpa?.gravida || ''} onChange={(e) => updateNested('gpa', 'gravida', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Para" value={exam.gpa?.para || ''} onChange={(e) => updateNested('gpa', 'para', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Abortions" value={exam.gpa?.abortions || ''} onChange={(e) => updateNested('gpa', 'abortions', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Last born" value={exam.gpa?.lastBornChild || ''} onChange={(e) => updateNested('gpa', 'lastBornChild', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Living children" value={exam.gpa?.livingChildren || ''} onChange={(e) => updateNested('gpa', 'livingChildren', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Complications" value={exam.gpa?.complications || ''} onChange={(e) => updateNested('gpa', 'complications', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Menopause */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Menopause</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menopause?.no || false} onChange={(e) => updateNested('menopause', 'no', e.target.checked)} className="h-3 w-3" /><span>No</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.menopause?.yes || false} onChange={(e) => updateNested('menopause', 'yes', e.target.checked)} className="h-3 w-3" /><span>Yes</span></label>
            <div><input type="text" placeholder="Age" value={exam.menopause?.age || ''} onChange={(e) => updateNested('menopause', 'age', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Skin */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Skin</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.rash || false} onChange={(e) => updateNested('skin', 'rash', e.target.checked)} className="h-3 w-3" /><span>Rash</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.scar || false} onChange={(e) => updateNested('skin', 'scar', e.target.checked)} className="h-3 w-3" /><span>Scar</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.diaphoretic || false} onChange={(e) => updateNested('skin', 'diaphoretic', e.target.checked)} className="h-3 w-3" /><span>Diaphoretic</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.petechiae || false} onChange={(e) => updateNested('skin', 'petechiae', e.target.checked)} className="h-3 w-3" /><span>Petechiae</span></label>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.ecchymosed || false} onChange={(e) => updateNested('skin', 'ecchymosed', e.target.checked)} className="h-3 w-3" /><span>Ecchymosed</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.bruises || false} onChange={(e) => updateNested('skin', 'bruises', e.target.checked)} className="h-3 w-3" /><span>Bruises</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.pressureSores || false} onChange={(e) => updateNested('skin', 'pressureSores', e.target.checked)} className="h-3 w-3" /><span>Pressure Sores</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skin?.incisionsDrains || false} onChange={(e) => updateNested('skin', 'incisionsDrains', e.target.checked)} className="h-3 w-3" /><span>Incisions/Drains</span></label>
          </div>
          <div className="mt-2"><input type="text" placeholder="Others" value={exam.skin?.others || ''} onChange={(e) => updateNested('skin', 'others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
        </div>

        {/* Skin Color */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Skin Color</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.normal || false} onChange={(e) => updateNested('skinColor', 'normal', e.target.checked)} className="h-3 w-3" /><span>Normal</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.pale || false} onChange={(e) => updateNested('skinColor', 'pale', e.target.checked)} className="h-3 w-3" /><span>Pale</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.flushed || false} onChange={(e) => updateNested('skinColor', 'flushed', e.target.checked)} className="h-3 w-3" /><span>Flushed</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.cyanotic || false} onChange={(e) => updateNested('skinColor', 'cyanotic', e.target.checked)} className="h-3 w-3" /><span>Cyanotic</span></label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.jaundiced || false} onChange={(e) => updateNested('skinColor', 'jaundiced', e.target.checked)} className="h-3 w-3" /><span>Jaundiced</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinColor?.mottled || false} onChange={(e) => updateNested('skinColor', 'mottled', e.target.checked)} className="h-3 w-3" /><span>Mottled</span></label>
            <div><input type="text" placeholder="Other" value={exam.skinColor?.other || ''} onChange={(e) => updateNested('skinColor', 'other', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Skin Turgor */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Skin Turgor</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinTurgor?.adequate || false} onChange={(e) => updateNested('skinTurgor', 'adequate', e.target.checked)} className="h-3 w-3" /><span>Adequate</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinTurgor?.poor || false} onChange={(e) => updateNested('skinTurgor', 'poor', e.target.checked)} className="h-3 w-3" /><span>Poor</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinTurgor?.good || false} onChange={(e) => updateNested('skinTurgor', 'good', e.target.checked)} className="h-3 w-3" /><span>Good</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinTurgor?.moist || false} onChange={(e) => updateNested('skinTurgor', 'moist', e.target.checked)} className="h-3 w-3" /><span>Moist</span></label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.skinTurgor?.taut || false} onChange={(e) => updateNested('skinTurgor', 'taut', e.target.checked)} className="h-3 w-3" /><span>Taut</span></label>
            <div><input type="text" placeholder="Other" value={exam.skinTurgor?.other || ''} onChange={(e) => updateNested('skinTurgor', 'other', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Hair / Scalp */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Hair / Scalp</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.clean || false} onChange={(e) => updateNested('hairScalp', 'clean', e.target.checked)} className="h-3 w-3" /><span>Clean</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.lice || false} onChange={(e) => updateNested('hairScalp', 'lice', e.target.checked)} className="h-3 w-3" /><span>Lice</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.flakes || false} onChange={(e) => updateNested('hairScalp', 'flakes', e.target.checked)} className="h-3 w-3" /><span>Flakes</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.wound || false} onChange={(e) => updateNested('hairScalp', 'wound', e.target.checked)} className="h-3 w-3" /><span>Wound</span></label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.lesion || false} onChange={(e) => updateNested('hairScalp', 'lesion', e.target.checked)} className="h-3 w-3" /><span>Lesion</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.hairScalp?.ulcers || false} onChange={(e) => updateNested('hairScalp', 'ulcers', e.target.checked)} className="h-3 w-3" /><span>Ulcers</span></label>
            <div><input type="text" placeholder="Other" value={exam.hairScalp?.other || ''} onChange={(e) => updateNested('hairScalp', 'other', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
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
