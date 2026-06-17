export default function GastrointestinalForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const gi = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...gi, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...gi, [parent]: { ...(gi[parent] || {}), [field]: value } })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">GASTROINTESTINAL SYSTEM</h4>

      {/* Alternative Route */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Alternative Route</label>
        <div className="grid grid-cols-6 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.alternativeRoute?.gastrostomy || false} onChange={(e) => updateNested('alternativeRoute', 'gastrostomy', e.target.checked)} className="h-3 w-3" /><span>Gastrostomy</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.alternativeRoute?.jejunostomy || false} onChange={(e) => updateNested('alternativeRoute', 'jejunostomy', e.target.checked)} className="h-3 w-3" /><span>Jejunostomy</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.alternativeRoute?.nasoGastric || false} onChange={(e) => updateNested('alternativeRoute', 'nasoGastric', e.target.checked)} className="h-3 w-3" /><span>Naso-Gastric</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.alternativeRoute?.urogastric || false} onChange={(e) => updateNested('alternativeRoute', 'urogastric', e.target.checked)} className="h-3 w-3" /><span>Urogastric</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.alternativeRoute?.ivh || false} onChange={(e) => updateNested('alternativeRoute', 'ivh', e.target.checked)} className="h-3 w-3" /><span>IVH</span></label>
          <div><input type="text" placeholder="Other" value={gi.alternativeRoute?.other || ''} onChange={(e) => updateNested('alternativeRoute', 'other', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
        </div>
      </div>

      {/* Symptoms Row 1 */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.heartBurnEpigastricPain || false} onChange={(e) => update('heartBurnEpigastricPain', e.target.checked)} className="h-3 w-3" /><span>Heart Burn / Epigastric Pain</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.abdPain || false} onChange={(e) => update('abdPain', e.target.checked)} className="h-3 w-3" /><span>Abd. Pain</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.nausea || false} onChange={(e) => update('nausea', e.target.checked)} className="h-3 w-3" /><span>Nausea</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.vomiting || false} onChange={(e) => update('vomiting', e.target.checked)} className="h-3 w-3" /><span>Vomiting</span></label></div>
      </div>

      {/* Symptoms Row 2 */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.chronicConstipation || false} onChange={(e) => update('chronicConstipation', e.target.checked)} className="h-3 w-3" /><span>Chronic Constipation</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.diarrhoea || false} onChange={(e) => update('diarrhoea', e.target.checked)} className="h-3 w-3" /><span>Diarrhoea</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.dyspepsia || false} onChange={(e) => update('dyspepsia', e.target.checked)} className="h-3 w-3" /><span>Dyspepsia</span></label></div>
        <div className="border border-slate-300 p-2"><label className="flex items-center gap-1"><input type="checkbox" checked={gi.dysphagia || false} onChange={(e) => update('dysphagia', e.target.checked)} className="h-3 w-3" /><span>Dysphagia</span></label></div>
      </div>

      {/* Bowel Content */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Bowel Content</label>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.bowelContent?.formed || false} onChange={(e) => updateNested('bowelContent', 'formed', e.target.checked)} className="h-3 w-3" /><span>Formed</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.bowelContent?.watery || false} onChange={(e) => updateNested('bowelContent', 'watery', e.target.checked)} className="h-3 w-3" /><span>Watery</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.bowelContent?.hard || false} onChange={(e) => updateNested('bowelContent', 'hard', e.target.checked)} className="h-3 w-3" /><span>Hard</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.bowelContent?.mucus || false} onChange={(e) => updateNested('bowelContent', 'mucus', e.target.checked)} className="h-3 w-3" /><span>Mucus</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.bowelContent?.blood || false} onChange={(e) => updateNested('bowelContent', 'blood', e.target.checked)} className="h-3 w-3" /><span>Blood</span></label>
        </div>
      </div>

      {/* Bowel Frequency */}
      <div className="border border-slate-300 p-2">
        <label className="block mb-1 text-xs font-semibold">Bowel Frequency</label>
        <input type="text" value={gi.bowelFrequency || ''} onChange={(e) => update('bowelFrequency', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
      </div>

      {/* Inspection */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Inspection</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.normal || false} onChange={(e) => updateNested('inspection', 'normal', e.target.checked)} className="h-3 w-3" /><span>Normal</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.distorted || false} onChange={(e) => updateNested('inspection', 'distorted', e.target.checked)} className="h-3 w-3" /><span>Distorted</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.scaphoid || false} onChange={(e) => updateNested('inspection', 'scaphoid', e.target.checked)} className="h-3 w-3" /><span>Scaphoid</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.sunken || false} onChange={(e) => updateNested('inspection', 'sunken', e.target.checked)} className="h-3 w-3" /><span>Sunken</span></label>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.synus || false} onChange={(e) => updateNested('inspection', 'synus', e.target.checked)} className="h-3 w-3" /><span>Synus</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.pigmentation || false} onChange={(e) => updateNested('inspection', 'pigmentation', e.target.checked)} className="h-3 w-3" /><span>Pigmentation</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.dilatedVeins || false} onChange={(e) => updateNested('inspection', 'dilatedVeins', e.target.checked)} className="h-3 w-3" /><span>Dilated Veins</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.inspection?.other || false} onChange={(e) => updateNested('inspection', 'other', e.target.checked)} className="h-3 w-3" /><span>Other</span></label>
        </div>
      </div>

      {/* Palpation */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Palpation</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.soft || false} onChange={(e) => updateNested('palpation', 'soft', e.target.checked)} className="h-3 w-3" /><span>Soft</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.rigid || false} onChange={(e) => updateNested('palpation', 'rigid', e.target.checked)} className="h-3 w-3" /><span>Rigid</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.tender || false} onChange={(e) => updateNested('palpation', 'tender', e.target.checked)} className="h-3 w-3" /><span>Tender</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.reboundTenderness || false} onChange={(e) => updateNested('palpation', 'reboundTenderness', e.target.checked)} className="h-3 w-3" /><span>Rebound Tenderness</span></label>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.palpableMasses || false} onChange={(e) => updateNested('palpation', 'palpableMasses', e.target.checked)} className="h-3 w-3" /><span>Palpable Masses</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.organomegaly || false} onChange={(e) => updateNested('palpation', 'organomegaly', e.target.checked)} className="h-3 w-3" /><span>Organomegaly</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.palpation?.fluidThrill || false} onChange={(e) => updateNested('palpation', 'fluidThrill', e.target.checked)} className="h-3 w-3" /><span>Fluid Thrill</span></label>
        </div>
      </div>

      {/* Percussion */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Percussion</label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.percussion?.tympanic || false} onChange={(e) => updateNested('percussion', 'tympanic', e.target.checked)} className="h-3 w-3" /><span>Tympanic</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.percussion?.shiftingDullness || false} onChange={(e) => updateNested('percussion', 'shiftingDullness', e.target.checked)} className="h-3 w-3" /><span>Shifting Dullness</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.percussion?.absent || false} onChange={(e) => updateNested('percussion', 'absent', e.target.checked)} className="h-3 w-3" /><span>Absent</span></label>
        </div>
      </div>

      {/* Auscultation */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Auscultation</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.bowelSounds || false} onChange={(e) => updateNested('auscultation', 'bowelSounds', e.target.checked)} className="h-3 w-3" /><span>Bowel Sounds</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.normoactive || false} onChange={(e) => updateNested('auscultation', 'normoactive', e.target.checked)} className="h-3 w-3" /><span>Normoactive</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.hyperPeristalsis || false} onChange={(e) => updateNested('auscultation', 'hyperPeristalsis', e.target.checked)} className="h-3 w-3" /><span>Hyper Peristalsis</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.hypoPeristalsis || false} onChange={(e) => updateNested('auscultation', 'hypoPeristalsis', e.target.checked)} className="h-3 w-3" /><span>Hypo Peristalsis</span></label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.liverBruit || false} onChange={(e) => updateNested('auscultation', 'liverBruit', e.target.checked)} className="h-3 w-3" /><span>Liver Bruit</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={gi.auscultation?.renalBruit || false} onChange={(e) => updateNested('auscultation', 'renalBruit', e.target.checked)} className="h-3 w-3" /><span>Renal Bruit</span></label>
        </div>
      </div>

      {/* Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={gi.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
      </div>
    </div>
  )
}
