export default function RespiratoryForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const resp = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...resp, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...resp, [parent]: { ...(resp[parent] || {}), [field]: value } })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">RESPIRATORY SYSTEM</h4>

      {/* Row 1: Dyspnoea, Tachypnoea, Use of Accessory Muscles, Orthopnoea, Running Nose */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={resp.dyspnoea || false} onChange={(e) => update('dyspnoea', e.target.checked)} className="h-4 w-4" />
          <label>Dyspnoea</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={resp.tachypnoea || false} onChange={(e) => update('tachypnoea', e.target.checked)} className="h-4 w-4" />
          <label>Tachypnoea</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={resp.useOfAccessoryMuscles || false} onChange={(e) => update('useOfAccessoryMuscles', e.target.checked)} className="h-4 w-4" />
          <label>Use of Accessory Muscles</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={resp.orthopnoea || false} onChange={(e) => update('orthopnoea', e.target.checked)} className="h-4 w-4" />
          <label>Orthopnoea</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={resp.runningNose || false} onChange={(e) => update('runningNose', e.target.checked)} className="h-4 w-4" />
          <label>Running Nose</label>
        </div>
      </div>

      {/* Row 2: Cough */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Cough (If Yes)</label>
        <div className="grid grid-cols-6 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.dry || false} onChange={(e) => updateNested('cough', 'dry', e.target.checked)} className="h-3 w-3" /><span>Dry</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.productive || false} onChange={(e) => updateNested('cough', 'productive', e.target.checked)} className="h-3 w-3" /><span>Productive</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.colour || false} onChange={(e) => updateNested('cough', 'colour', e.target.checked)} className="h-3 w-3" /><span>Colour</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.white || false} onChange={(e) => updateNested('cough', 'white', e.target.checked)} className="h-3 w-3" /><span>White</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.yellow || false} onChange={(e) => updateNested('cough', 'yellow', e.target.checked)} className="h-3 w-3" /><span>Yellow</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.cough?.green || false} onChange={(e) => updateNested('cough', 'green', e.target.checked)} className="h-3 w-3" /><span>Green</span></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs">If Yes</label>
            <input type="text" value={resp.cough?.ifYes || ''} onChange={(e) => updateNested('cough', 'ifYes', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 text-xs">Central</label>
              <input type="text" value={resp.cough?.central || ''} onChange={(e) => updateNested('cough', 'central', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs">Peripheral</label>
              <input type="text" value={resp.cough?.peripheral || ''} onChange={(e) => updateNested('cough', 'peripheral', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Inspection */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Inspection</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.inspection?.symmetrical || false} onChange={(e) => updateNested('inspection', 'symmetrical', e.target.checked)} className="h-3 w-3" /><span>Symmetrical</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.inspection?.asymmetrical || false} onChange={(e) => updateNested('inspection', 'asymmetrical', e.target.checked)} className="h-3 w-3" /><span>Asymmetrical (If Chest is Asymmetrical)</span></label>
        </div>
      </div>

      {/* Row 4: Expansion */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Expansion</label>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.pigeon || false} onChange={(e) => updateNested('expansion', 'pigeon', e.target.checked)} className="h-3 w-3" /><span>Pigeon</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.flat || false} onChange={(e) => updateNested('expansion', 'flat', e.target.checked)} className="h-3 w-3" /><span>Flat</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.dumBell || false} onChange={(e) => updateNested('expansion', 'dumBell', e.target.checked)} className="h-3 w-3" /><span>Dum Bell</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.kyphosis || false} onChange={(e) => updateNested('expansion', 'kyphosis', e.target.checked)} className="h-3 w-3" /><span>Kyphosis</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.funnel || false} onChange={(e) => updateNested('expansion', 'funnel', e.target.checked)} className="h-3 w-3" /><span>Funnel</span></label>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.barrel || false} onChange={(e) => updateNested('expansion', 'barrel', e.target.checked)} className="h-3 w-3" /><span>Barrel</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.expansion?.other || false} onChange={(e) => updateNested('expansion', 'other', e.target.checked)} className="h-3 w-3" /><span>Other</span></label>
        </div>
      </div>

      {/* Row 5: Transverse Diameter */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Transverse Diameter (At the level of Nipples during Inspiration / Expiration)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs">R/R</label>
            <input type="text" value={resp.transverseDiameter?.rr || ''} onChange={(e) => updateNested('transverseDiameter', 'rr', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs">Breaths/min</label>
            <input type="text" value={resp.transverseDiameter?.breathsPerMin || ''} onChange={(e) => updateNested('transverseDiameter', 'breathsPerMin', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>
      </div>

      {/* Row 6: Intotrusion of Chest */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Intotrusion of Chest (If Yes)</label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.intotrusionOfChest?.unilateral || false} onChange={(e) => updateNested('intotrusionOfChest', 'unilateral', e.target.checked)} className="h-3 w-3" /><span>Unilateral</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.intotrusionOfChest?.bilateral || false} onChange={(e) => updateNested('intotrusionOfChest', 'bilateral', e.target.checked)} className="h-3 w-3" /><span>Bilateral</span></label>
          <div>
            <label className="block mb-1 text-xs">Hollowing of Chest (Where?)</label>
            <input type="text" value={resp.intotrusionOfChest?.hollowingOfChest || ''} onChange={(e) => updateNested('intotrusionOfChest', 'hollowingOfChest', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>
      </div>

      {/* Row 7: Breathing Pattern */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Breathing Pattern</label>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.breathingPattern?.abdominoThoracic || false} onChange={(e) => updateNested('breathingPattern', 'abdominoThoracic', e.target.checked)} className="h-3 w-3" /><span>Abdomino-thoracic</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.breathingPattern?.thoracoAbdominal || false} onChange={(e) => updateNested('breathingPattern', 'thoracoAbdominal', e.target.checked)} className="h-3 w-3" /><span>Thoraco-abdominal</span></label>
          <div>
            <label className="block mb-1 text-xs">Mediastinal Shift</label>
            <input type="text" value={resp.breathingPattern?.mediastinalShift || ''} onChange={(e) => updateNested('breathingPattern', 'mediastinalShift', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.breathingPattern?.central || false} onChange={(e) => updateNested('breathingPattern', 'central', e.target.checked)} className="h-3 w-3" /><span>Central</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.breathingPattern?.left || false} onChange={(e) => updateNested('breathingPattern', 'left', e.target.checked)} className="h-3 w-3" /><span>Left</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.breathingPattern?.right || false} onChange={(e) => updateNested('breathingPattern', 'right', e.target.checked)} className="h-3 w-3" /><span>Right</span></label>
        </div>
      </div>

      {/* Row 8: Palpation */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Palpation</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1 text-xs">Tender Spot</label>
            <input type="text" value={resp.palpation?.tenderSpot || ''} onChange={(e) => updateNested('palpation', 'tenderSpot', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs">Swelling</label>
            <input type="text" value={resp.palpation?.swelling || ''} onChange={(e) => updateNested('palpation', 'swelling', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs">Trachea</label>
            <div className="flex gap-2 text-xs">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={resp.palpation?.trachea?.vocalFremitus || false} onChange={(e) => {
                  const newPalp = { ...(resp.palpation || {}), trachea: { ...(resp.palpation?.trachea || {}), vocalFremitus: e.target.checked } }
                  onChange({ ...resp, palpation: newPalp })
                }} className="h-3 w-3" />
                <span>Vocal Fremitus</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Row 9: Percussion */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Percussion</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.percussion?.normal || false} onChange={(e) => updateNested('percussion', 'normal', e.target.checked)} className="h-3 w-3" /><span>Normal</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.percussion?.dull || false} onChange={(e) => updateNested('percussion', 'dull', e.target.checked)} className="h-3 w-3" /><span>Dull</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.percussion?.stonyDull || false} onChange={(e) => updateNested('percussion', 'stonyDull', e.target.checked)} className="h-3 w-3" /><span>Stony Dull</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.percussion?.resonant || false} onChange={(e) => updateNested('percussion', 'resonant', e.target.checked)} className="h-3 w-3" /><span>Resonant</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.percussion?.hyperResonant || false} onChange={(e) => updateNested('percussion', 'hyperResonant', e.target.checked)} className="h-3 w-3" /><span>Hyper Resonant</span></label>
        </div>
      </div>

      {/* Row 10: Auscultation */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Auscultation</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1 text-xs">Breathing</label>
            <input type="text" value={resp.auscultation?.breathing || ''} onChange={(e) => updateNested('auscultation', 'breathing', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div className="flex gap-2 text-xs items-center">
            <label className="flex items-center gap-1"><input type="checkbox" checked={resp.auscultation?.vesicular || false} onChange={(e) => updateNested('auscultation', 'vesicular', e.target.checked)} className="h-3 w-3" /><span>Vesicular</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={resp.auscultation?.bronchial || false} onChange={(e) => updateNested('auscultation', 'bronchial', e.target.checked)} className="h-3 w-3" /><span>Bronchial</span></label>
          </div>
          <div>
            <label className="block mb-1 text-xs">Additional Sounds</label>
            <input type="text" value={resp.auscultation?.additionalSounds || ''} onChange={(e) => updateNested('auscultation', 'additionalSounds', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.auscultation?.wheezeOrStridor || false} onChange={(e) => updateNested('auscultation', 'wheezeOrStridor', e.target.checked)} className="h-3 w-3" /><span>Wheeze or Stridor</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={resp.auscultation?.pleuralRub || false} onChange={(e) => updateNested('auscultation', 'pleuralRub', e.target.checked)} className="h-3 w-3" /><span>Pleural Rub</span></label>
        </div>
      </div>

      {/* Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={resp.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
      </div>
    </div>
  )
}
