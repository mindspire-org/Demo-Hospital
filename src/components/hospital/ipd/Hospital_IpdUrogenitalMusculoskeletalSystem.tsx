import { useState } from 'react'
import UrogenitalMusculoskeletalExam from './Hospital_UrogenitalMusculoskeletalExam'

export default function Hospital_IpdUrogenitalMusculoskeletalSystem({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'urogenital-musculoskeletal-exam', limit: 200 }) as any
      const items = (res.notes || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        data: n.data || {},
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      console.log('Saving urogenital & musculoskeletal exam data:', d)
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'urogenital-musculoskeletal-exam',
        sign: '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving urogenital & musculoskeletal examination:', e)
      alert(e?.message || e?.error || 'Failed to save urogenital & musculoskeletal examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Urogenital & Musculoskeletal Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No urogenital & musculoskeletal examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <UrogenitalMusculoskeletalExamDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <UrogenitalMusculoskeletalDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function UrogenitalMusculoskeletalDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({})

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Urogenital & Musculoskeletal Examination</h3>

        <UrogenitalMusculoskeletalExam
          data={form}
          onChange={(data) => setForm(data)}
        />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function UrogenitalMusculoskeletalExamDisplay({ data }: { data: any }) {
  const exam = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">UROGENITAL & MUSCULOSKELETAL EXAMINATION</h5>

      {/* Urogenital Section */}
      {exam.urogenital && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Urogenital System:</div>
          <div className="flex flex-wrap gap-2">
            {exam.urogenital.unableToVoid && <div>✓ Unable to void</div>}
            {exam.urogenital.continent && <div>✓ Continent</div>}
            {exam.urogenital.incontinent && <div>✓ Incontinent</div>}
            {exam.urogenital.bedWetting && <div>✓ Bed Wetting</div>}
            {exam.urogenital.urine && <div>✓ Urine</div>}
            {exam.urogenital.clear && <div>✓ Clear</div>}
            {exam.urogenital.colour && <div>✓ Colour</div>}
            {exam.urogenital.cloudy && <div>✓ Cloudy</div>}
            {exam.urogenital.sediment && <div>✓ Sediment</div>}
            {exam.urogenital.voidingAmount && <div>Voiding Amount: {exam.urogenital.voidingAmount}</div>}
            {exam.urogenital.sufficient && <div>✓ Sufficient</div>}
            {exam.urogenital.notSufficient && <div>✓ Not Sufficient</div>}
          </div>
          
          {exam.urogenital.voidingAid && (
            <div className="mt-2">
              <div className="font-semibold">Voiding Aid:</div>
              <div className="flex flex-wrap gap-2">
                {exam.urogenital.voidingAid.diapers && <div>✓ Diapers</div>}
                {exam.urogenital.voidingAid.sanitaryPads && <div>✓ Sanitary Pads</div>}
                {exam.urogenital.voidingAid.urisheath && <div>✓ Urisheath</div>}
                {exam.urogenital.voidingAid.supraPubicCatheter && <div>✓ Supra Pubic Catheter</div>}
                {exam.urogenital.voidingAid.other && <div>Other: {exam.urogenital.voidingAid.other}</div>}
              </div>
            </div>
          )}

          {exam.urogenital.bladder && (
            <div className="mt-2">
              <div className="font-semibold">Bladder:</div>
              <div className="flex flex-wrap gap-2">
                {exam.urogenital.bladder.distendedBladder && <div>✓ Distended Bladder</div>}
                {exam.urogenital.bladder.empty && <div>✓ Empty</div>}
                {exam.urogenital.bladder.urinal && <div>✓ Urinal</div>}
                {exam.urogenital.bladder.foleyCatheterSize && <div>Foley's Catheter Size: {exam.urogenital.bladder.foleyCatheterSize}</div>}
                {exam.urogenital.bladder.dateInserted && <div>Date Inserted: {exam.urogenital.bladder.dateInserted}</div>}
                {exam.urogenital.bladder.others && <div>Others: {exam.urogenital.bladder.others}</div>}
              </div>
            </div>
          )}

          {exam.urogenital.genitalAnomaly && (
            <div className="mt-2">
              <div className="font-semibold">Genital Anomaly:</div>
              <div>{exam.urogenital.genitalAnomaly}</div>
            </div>
          )}

          {exam.urogenital.male && (
            <div className="mt-2">
              <div className="font-semibold">Male:</div>
              <div className="flex flex-wrap gap-2">
                {exam.urogenital.male.normal && <div>✓ Normal</div>}
                {exam.urogenital.male.hydrocele && <div>✓ Hydrocele</div>}
                {exam.urogenital.male.varicocele && <div>✓ Varicocele</div>}
                {exam.urogenital.male.undescended && <div>✓ Undescended</div>}
                {exam.urogenital.male.signOfInflammation && <div>✓ Sign of Inflammation</div>}
                {exam.urogenital.male.clear && <div>Clear: {exam.urogenital.male.clear}</div>}
              </div>
            </div>
          )}

          {exam.urogenital.female && (
            <div className="mt-2">
              <div className="font-semibold">Female:</div>
              <div className="flex flex-wrap gap-2">
                {exam.urogenital.female.vulvalHygiene && <div>✓ Vulval Hygiene</div>}
                {exam.urogenital.female.colporrhagy && <div>✓ Colporrhagy</div>}
                {exam.urogenital.female.urethralOpt && <div>✓ Urethral Opt</div>}
                {exam.urogenital.female.cystocele && <div>✓ Cystocele</div>}
                {exam.urogenital.female.vaginalBleeding && <div>✓ Vaginal Bleeding</div>}
                {exam.urogenital.female.vaginalDischarge && <div>✓ Vaginal Discharge</div>}
                {exam.urogenital.female.dischargeDetails && <div>Discharge Details: {exam.urogenital.female.dischargeDetails}</div>}
              </div>
            </div>
          )}

          {exam.urogenital.others && (
            <div className="mt-2">
              <div className="font-semibold">Others:</div>
              <div>{exam.urogenital.others}</div>
            </div>
          )}
        </div>
      )}

      {/* Musculoskeletal Section */}
      {exam.musculoskeletal && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Musculoskeletal System:</div>
          
          {exam.musculoskeletal.rangeType && (
            <div className="flex flex-wrap gap-2">
              {exam.musculoskeletal.rangeType.passive && <div>✓ Passive</div>}
              {exam.musculoskeletal.rangeType.restricted && <div>✓ Restricted</div>}
            </div>
          )}

          {exam.musculoskeletal.rangeOfMovement?.location && (
            <div className="mt-1">Range of Movement Location: {exam.musculoskeletal.rangeOfMovement.location}</div>
          )}
          {exam.musculoskeletal.weaknessParalysis?.location && (
            <div className="mt-1">Weakness/Paralysis Location: {exam.musculoskeletal.weaknessParalysis.location}</div>
          )}
          {exam.musculoskeletal.contractures?.location && (
            <div className="mt-1">Contractures Location: {exam.musculoskeletal.contractures.location}</div>
          )}
          {exam.musculoskeletal.deformities?.location && (
            <div className="mt-1">Deformities Location: {exam.musculoskeletal.deformities.location}</div>
          )}

          {exam.musculoskeletal.fracture && (
            <div className="mt-2">
              <div className="font-semibold">Fracture:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.fracture.new && <div>✓ New</div>}
                {exam.musculoskeletal.fracture.splint && <div>✓ Splint</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.ambulatoryDevices && (
            <div className="mt-2">
              <div className="font-semibold">Ambulatory Devices:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.ambulatoryDevices.withPatient && <div>✓ With Patient</div>}
                {exam.musculoskeletal.ambulatoryDevices.atHome && <div>✓ At Home</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.limb && (
            <div className="mt-2">
              <div className="font-semibold">Limb:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.limb.cast && <div>Cast: {exam.musculoskeletal.limb.cast}</div>}
                {exam.musculoskeletal.limb.other && <div>Other: {exam.musculoskeletal.limb.other}</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.back && (
            <div className="mt-2">
              <div className="font-semibold">Back:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.back.sacralDimple && <div>✓ Sacral Dimple</div>}
                {exam.musculoskeletal.back.kyphosis && <div>✓ Kyphosis</div>}
                {exam.musculoskeletal.back.lordosis && <div>✓ Lordosis</div>}
                {exam.musculoskeletal.back.scoliosis && <div>✓ Scoliosis</div>}
                {exam.musculoskeletal.back.other && <div>Other: {exam.musculoskeletal.back.other}</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.joints && (
            <div className="mt-2">
              <div className="font-semibold">Joints:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.joints.mobile && <div>✓ Mobile</div>}
                {exam.musculoskeletal.joints.swelling && <div>✓ Swelling</div>}
                {exam.musculoskeletal.joints.tenderOrInflamedJoints && <div>✓ Tender or Inflamed Joints</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.spine && (
            <div className="mt-2">
              <div className="font-semibold">Spine:</div>
              <div className="flex flex-wrap gap-2">
                {exam.musculoskeletal.spine.inTowing && <div>✓ In Towing</div>}
                {exam.musculoskeletal.spine.notTowing && <div>✓ Not Towing</div>}
                {exam.musculoskeletal.spine.bowType && <div>✓ Bow type</div>}
                {exam.musculoskeletal.spine.knockKnee && <div>✓ Knock knee</div>}
                {exam.musculoskeletal.spine.limp && <div>✓ Limp</div>}
                {exam.musculoskeletal.spine.knee && <div>✓ Knee</div>}
              </div>
            </div>
          )}

          {exam.musculoskeletal.others && (
            <div className="mt-2">
              <div className="font-semibold">Others:</div>
              <div>{exam.musculoskeletal.others}</div>
            </div>
          )}
        </div>
      )}

      {exam.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{exam.others}</div>
        </div>
      )}
    </div>
  )
}
