export default function UrogenitalMusculoskeletalForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
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
      {/* UROGENITAL SYSTEM */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">UROGENITAL SYSTEM</h4>
        
        {/* Row 1 */}
        <div className="grid grid-cols-6 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.unableToVoid || false} onChange={(e) => updateNested('urogenital', 'unableToVoid', e.target.checked)} className="h-3 w-3" /><span>Unable to void</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.continent || false} onChange={(e) => updateNested('urogenital', 'continent', e.target.checked)} className="h-3 w-3" /><span>Continent</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.incontinent || false} onChange={(e) => updateNested('urogenital', 'incontinent', e.target.checked)} className="h-3 w-3" /><span>Incontinent</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.bedWetting || false} onChange={(e) => updateNested('urogenital', 'bedWetting', e.target.checked)} className="h-3 w-3" /><span>Bed Wetting</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.urine || false} onChange={(e) => updateNested('urogenital', 'urine', e.target.checked)} className="h-3 w-3" /><span>Urine</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.clear || false} onChange={(e) => updateNested('urogenital', 'clear', e.target.checked)} className="h-3 w-3" /><span>Clear</span></label>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-6 gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.colour || false} onChange={(e) => updateNested('urogenital', 'colour', e.target.checked)} className="h-3 w-3" /><span>Colour</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.cloudy || false} onChange={(e) => updateNested('urogenital', 'cloudy', e.target.checked)} className="h-3 w-3" /><span>Cloudy</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.sediment || false} onChange={(e) => updateNested('urogenital', 'sediment', e.target.checked)} className="h-3 w-3" /><span>Sediment</span></label>
          <div><input type="text" placeholder="Voiding Amount" value={exam.urogenital?.voidingAmount || ''} onChange={(e) => updateNested('urogenital', 'voidingAmount', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.sufficient || false} onChange={(e) => updateNested('urogenital', 'sufficient', e.target.checked)} className="h-3 w-3" /><span>Sufficient</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.notSufficient || false} onChange={(e) => updateNested('urogenital', 'notSufficient', e.target.checked)} className="h-3 w-3" /><span>Not Sufficient</span></label>
        </div>

        {/* Voiding Aid */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Voiding Aid</label>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.voidingAid?.diapers || false} onChange={(e) => updateDeepNested('urogenital', 'voidingAid', 'diapers', e.target.checked)} className="h-3 w-3" /><span>Diapers</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.voidingAid?.sanitaryPads || false} onChange={(e) => updateDeepNested('urogenital', 'voidingAid', 'sanitaryPads', e.target.checked)} className="h-3 w-3" /><span>Sanitary Pads</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.voidingAid?.urisheath || false} onChange={(e) => updateDeepNested('urogenital', 'voidingAid', 'urisheath', e.target.checked)} className="h-3 w-3" /><span>Urisheath</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.voidingAid?.supraPubicCatheter || false} onChange={(e) => updateDeepNested('urogenital', 'voidingAid', 'supraPubicCatheter', e.target.checked)} className="h-3 w-3" /><span>Supra Pubic Catheter</span></label>
            <div><input type="text" placeholder="Other" value={exam.urogenital?.voidingAid?.other || ''} onChange={(e) => updateDeepNested('urogenital', 'voidingAid', 'other', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Bladder */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Bladder</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.bladder?.distendedBladder || false} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'distendedBladder', e.target.checked)} className="h-3 w-3" /><span>Distended Bladder</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.bladder?.empty || false} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'empty', e.target.checked)} className="h-3 w-3" /><span>Empty</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.bladder?.urinal || false} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'urinal', e.target.checked)} className="h-3 w-3" /><span>Urinal</span></label>
            <div><input type="text" placeholder="Foley's Catheter Size" value={exam.urogenital?.bladder?.foleyCatheterSize || ''} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'foleyCatheterSize', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
            <div><input type="text" placeholder="Date Inserted" value={exam.urogenital?.bladder?.dateInserted || ''} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'dateInserted', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
            <div><input type="text" placeholder="Others" value={exam.urogenital?.bladder?.others || ''} onChange={(e) => updateDeepNested('urogenital', 'bladder', 'others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Genital Anomaly */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Genital Anomaly (If Any, Mention Briefly)</label>
          <textarea value={exam.urogenital?.genitalAnomaly || ''} onChange={(e) => updateNested('urogenital', 'genitalAnomaly', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* Male */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Male</label>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.male?.normal || false} onChange={(e) => updateDeepNested('urogenital', 'male', 'normal', e.target.checked)} className="h-3 w-3" /><span>Normal</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.male?.hydrocele || false} onChange={(e) => updateDeepNested('urogenital', 'male', 'hydrocele', e.target.checked)} className="h-3 w-3" /><span>Hydrocele</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.male?.varicocele || false} onChange={(e) => updateDeepNested('urogenital', 'male', 'varicocele', e.target.checked)} className="h-3 w-3" /><span>Varicocele</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.male?.undescended || false} onChange={(e) => updateDeepNested('urogenital', 'male', 'undescended', e.target.checked)} className="h-3 w-3" /><span>Undescended</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.male?.signOfInflammation || false} onChange={(e) => updateDeepNested('urogenital', 'male', 'signOfInflammation', e.target.checked)} className="h-3 w-3" /><span>Sign of Inflammation</span></label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div><input type="text" placeholder="Clear" value={exam.urogenital?.male?.clear || ''} onChange={(e) => updateDeepNested('urogenital', 'male', 'clear', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Female */}
        <div className="border border-slate-300 p-2">
          <label className="font-semibold text-xs mb-1 block">Female</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.vulvalHygiene || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'vulvalHygiene', e.target.checked)} className="h-3 w-3" /><span>Vulval Hygiene</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.colporrhagy || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'colporrhagy', e.target.checked)} className="h-3 w-3" /><span>Colporrhagy</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.urethralOpt || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'urethralOpt', e.target.checked)} className="h-3 w-3" /><span>Urethral Opt</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.cystocele || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'cystocele', e.target.checked)} className="h-3 w-3" /><span>Cystocele</span></label>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs mt-2">
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.vaginalBleeding || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'vaginalBleeding', e.target.checked)} className="h-3 w-3" /><span>Vaginal Bleeding</span></label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={exam.urogenital?.female?.vaginalDischarge || false} onChange={(e) => updateDeepNested('urogenital', 'female', 'vaginalDischarge', e.target.checked)} className="h-3 w-3" /><span>Vaginal Discharge</span></label>
            <div className="col-span-2"><input type="text" placeholder="If Yes, Then Color, Odor, Amount, Consistency" value={exam.urogenital?.female?.dischargeDetails || ''} onChange={(e) => updateDeepNested('urogenital', 'female', 'dischargeDetails', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" /></div>
          </div>
        </div>

        {/* Others */}
        <div className="border border-slate-300 p-2">
          <label className="block mb-1 text-xs font-semibold">Others</label>
          <textarea value={exam.urogenital?.others || ''} onChange={(e) => updateNested('urogenital', 'others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>
      </div>

      {/* MUSCULOSKELETAL SYSTEM */}
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">MUSCULOSKELETAL SYSTEM</h4>
        
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1"></th>
              <th className="border border-slate-300 px-2 py-1">Range of Movement</th>
              <th className="border border-slate-300 px-2 py-1">Weakness / Paralysis</th>
              <th className="border border-slate-300 px-2 py-1">Contractures</th>
              <th className="border border-slate-300 px-2 py-1">Deformities</th>
              <th className="border border-slate-300 px-2 py-1">Fracture</th>
              <th className="border border-slate-300 px-2 py-1">Ambulatory Devices</th>
            </tr>
          </thead>
          <tbody>
            {/* Passive / Restricted */}
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.rangeType?.passive || false} onChange={(e) => updateDeepNested('musculoskeletal', 'rangeType', 'passive', e.target.checked)} className="h-3 w-3" /><span>Passive</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.rangeType?.restricted || false} onChange={(e) => updateDeepNested('musculoskeletal', 'rangeType', 'restricted', e.target.checked)} className="h-3 w-3" /><span>Restricted</span></label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Location" value={exam.musculoskeletal?.rangeOfMovement?.location || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'rangeOfMovement', 'location', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Location" value={exam.musculoskeletal?.weaknessParalysis?.location || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'weaknessParalysis', 'location', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Location" value={exam.musculoskeletal?.contractures?.location || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'contractures', 'location', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Location" value={exam.musculoskeletal?.deformities?.location || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'deformities', 'location', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.fracture?.new || false} onChange={(e) => updateDeepNested('musculoskeletal', 'fracture', 'new', e.target.checked)} className="h-3 w-3" /><span>New</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.fracture?.splint || false} onChange={(e) => updateDeepNested('musculoskeletal', 'fracture', 'splint', e.target.checked)} className="h-3 w-3" /><span>Splint</span></label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.ambulatoryDevices?.withPatient || false} onChange={(e) => updateDeepNested('musculoskeletal', 'ambulatoryDevices', 'withPatient', e.target.checked)} className="h-3 w-3" /><span>With Patient</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.ambulatoryDevices?.atHome || false} onChange={(e) => updateDeepNested('musculoskeletal', 'ambulatoryDevices', 'atHome', e.target.checked)} className="h-3 w-3" /><span>At Home</span></label>
                </div>
              </td>
            </tr>

            {/* Limb */}
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Limb</td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Cast" value={exam.musculoskeletal?.limb?.cast || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'limb', 'cast', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Other" value={exam.musculoskeletal?.limb?.other || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'limb', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
            </tr>

            {/* Back */}
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Back</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.back?.sacralDimple || false} onChange={(e) => updateDeepNested('musculoskeletal', 'back', 'sacralDimple', e.target.checked)} className="h-3 w-3" /><span>Sacral Dimple</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.back?.kyphosis || false} onChange={(e) => updateDeepNested('musculoskeletal', 'back', 'kyphosis', e.target.checked)} className="h-3 w-3" /><span>Kyphosis</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.back?.lordosis || false} onChange={(e) => updateDeepNested('musculoskeletal', 'back', 'lordosis', e.target.checked)} className="h-3 w-3" /><span>Lordosis</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.back?.scoliosis || false} onChange={(e) => updateDeepNested('musculoskeletal', 'back', 'scoliosis', e.target.checked)} className="h-3 w-3" /><span>Scoliosis</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><input type="text" placeholder="Other" value={exam.musculoskeletal?.back?.other || ''} onChange={(e) => updateDeepNested('musculoskeletal', 'back', 'other', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" /></td>
              <td className="border border-slate-300 px-2 py-1"></td>
            </tr>

            {/* Joints */}
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Joints</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.joints?.mobile || false} onChange={(e) => updateDeepNested('musculoskeletal', 'joints', 'mobile', e.target.checked)} className="h-3 w-3" /><span>Mobile</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.joints?.swelling || false} onChange={(e) => updateDeepNested('musculoskeletal', 'joints', 'swelling', e.target.checked)} className="h-3 w-3" /><span>Swelling</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.joints?.tenderOrInflamedJoints || false} onChange={(e) => updateDeepNested('musculoskeletal', 'joints', 'tenderOrInflamedJoints', e.target.checked)} className="h-3 w-3" /><span>Tender or Inflamed Joints</span></label></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1"></td>
            </tr>

            {/* Spine */}
            <tr>
              <td className="border border-slate-300 px-2 py-1 font-semibold">Spine</td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.inTowing || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'inTowing', e.target.checked)} className="h-3 w-3" /><span>In Towing</span></label></td>
              <td className="border border-slate-300 px-2 py-1"><label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.notTowing || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'notTowing', e.target.checked)} className="h-3 w-3" /><span>Not Towing</span></label></td>
              <td className="border border-slate-300 px-2 py-1"></td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.bowType || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'bowType', e.target.checked)} className="h-3 w-3" /><span>Bow type</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.knockKnee || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'knockKnee', e.target.checked)} className="h-3 w-3" /><span>Knock knee</span></label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.limp || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'limp', e.target.checked)} className="h-3 w-3" /><span>Limp</span></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={exam.musculoskeletal?.spine?.knee || false} onChange={(e) => updateDeepNested('musculoskeletal', 'spine', 'knee', e.target.checked)} className="h-3 w-3" /><span>Knee</span></label>
                </div>
              </td>
              <td className="border border-slate-300 px-2 py-1"></td>
            </tr>
          </tbody>
        </table>

        {/* Others */}
        <div>
          <label className="block mb-1 text-xs font-semibold">Others</label>
          <textarea value={exam.musculoskeletal?.others || ''} onChange={(e) => updateNested('musculoskeletal', 'others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
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
