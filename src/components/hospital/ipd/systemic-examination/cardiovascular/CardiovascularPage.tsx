import { useEffect, useState } from 'react'
import { hospitalApi } from '../../../../../utils/api'
import CardiovascularForm from './CardiovascularForm'

export default function CardiovascularPage({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    data: any
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdSystemicExams(encounterId, { systemType: 'cardiovascular', limit: 200 }) as any
      const items = (res.systemicExams || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        data: n.cardiovascular || n.data || {},
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      console.log('Saving cardiovascular exam data:', d)
      await hospitalApi.createIpdSystemicExam(encounterId, {
        systemType: 'cardiovascular',
        cardiovascular: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ 
      console.error('Error saving cardiovascular examination:', e)
      alert(e?.message || e?.error || 'Failed to save cardiovascular examination') 
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold text-slate-900">Cardiovascular System Examination</div>
        <button onClick={()=>setOpen(true)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Add Examination
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No cardiovascular examination records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <CardiovascularDisplay data={r.data} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <CardiovascularDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function CardiovascularDialog({
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Cardiovascular System Examination</h3>

        <CardiovascularForm
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

function CardiovascularDisplay({ data }: { data: any }) {
  const cvs = data || {}
  
  return (
    <div className="space-y-3 border border-slate-300 p-3 rounded-lg bg-slate-50 text-xs">
      <h5 className="font-bold text-slate-900 bg-slate-200 px-2 py-1">CARDIOVASCULAR SYSTEM</h5>

      {/* Row 1 */}
      <div className="grid grid-cols-4 gap-2">
        {cvs.chestTenderness && <div>✓ Chest Tenderness</div>}
        {cvs.palpitations && <div>✓ Palpitations</div>}
        {(cvs.dyspnoea?.rest || cvs.dyspnoea?.exertion) && (
          <div>Dyspnoea: {cvs.dyspnoea?.rest && 'Rest'} {cvs.dyspnoea?.exertion && 'Exertion'}</div>
        )}
        {cvs.orthopnoea && <div>✓ Orthopnoea</div>}
      </div>

      {/* Radial Pulse */}
      {cvs.radialPulse && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Radial Pulse:</div>
          <div className="grid grid-cols-3 gap-2">
            {cvs.radialPulse.rate && <div>Rate: {cvs.radialPulse.rate}</div>}
            {(cvs.radialPulse.regular || cvs.radialPulse.irregular) && (
              <div>Rhythm: {cvs.radialPulse.regular && 'Regular'} {cvs.radialPulse.irregular && 'Irregular'}</div>
            )}
            {(cvs.radialPulse.normal || cvs.radialPulse.weak || cvs.radialPulse.bounding) && (
              <div>Volume: {cvs.radialPulse.normal && 'Normal'} {cvs.radialPulse.weak && 'Weak'} {cvs.radialPulse.bounding && 'Bounding'}</div>
            )}
          </div>
        </div>
      )}

      {/* Character */}
      {cvs.character && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Character:</div>
          <div className="flex gap-3">
            {cvs.character.radial && <div>✓ Radial</div>}
            {cvs.character.radioRadialDelay && <div>✓ Radio Radial Delay</div>}
            {cvs.character.radioFemoralDelay && <div>✓ Radio Femoral Delay</div>}
          </div>
        </div>
      )}

      {/* Blood Pressure */}
      {cvs.bloodPressure && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Blood Pressure:</div>
          <div className="grid grid-cols-2 gap-2">
            {cvs.bloodPressure.supineSitting && <div>Supine/Sitting: {cvs.bloodPressure.supineSitting}</div>}
            {cvs.bloodPressure.systolicDiastolic && <div>Systolic/Diastolic: {cvs.bloodPressure.systolicDiastolic}</div>}
            {cvs.bloodPressure.standingSystolicDiastolic && <div>Standing: {cvs.bloodPressure.standingSystolicDiastolic}</div>}
            {cvs.bloodPressure.posturalHypotension && <div>✓ Postural Hypotension</div>}
          </div>
        </div>
      )}

      {/* Apex Beat */}
      {cvs.apexBeat && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Apex Beat:</div>
          <div className="grid grid-cols-3 gap-2">
            {cvs.apexBeat.location && <div>Location: {cvs.apexBeat.location}</div>}
            {(cvs.apexBeat.tapping || cvs.apexBeat.thrill) && (
              <div>Character: {cvs.apexBeat.tapping && 'Tapping'} {cvs.apexBeat.thrill && 'Thrill'}</div>
            )}
            {cvs.apexBeat.leftParasternalHeave && <div>✓ Left Parasternal Heave</div>}
          </div>
        </div>
      )}

      {/* Venous Pulsations */}
      {cvs.venousPulsations && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Venous Pulsations:</div>
          <div className="flex flex-wrap gap-2">
            {cvs.venousPulsations.neckVeins && <div>✓ Neck Veins</div>}
            {cvs.venousPulsations.pericardialFrictionRub && <div>✓ Pericardial Friction Rub</div>}
            {cvs.venousPulsations.exocardialSounds && <div>✓ Exocardial Sounds</div>}
            {cvs.venousPulsations.bruit && <div>✓ Bruit</div>}
            {cvs.venousPulsations.varicoseVeins && <div>✓ Varicose Veins</div>}
            {cvs.venousPulsations.capillaryPulsation && <div>✓ Capillary Pulsation</div>}
            {cvs.venousPulsations.intermittentClaudication && <div>✓ Intermittent Claudication</div>}
          </div>
        </div>
      )}

      {/* Auscultation */}
      {cvs.auscultation && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Auscultation:</div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {(cvs.auscultation.s1 || cvs.auscultation.midEjection || cvs.auscultation.pan) && (
                <div>Systolic: {cvs.auscultation.s1 && 'S1'} {cvs.auscultation.midEjection && 'Mid Ejection'} {cvs.auscultation.pan && 'Pan'}</div>
              )}
              {(cvs.auscultation.s2 || cvs.auscultation.early || cvs.auscultation.mid || cvs.auscultation.late) && (
                <div>Diastolic: {cvs.auscultation.s2 && 'S2'} {cvs.auscultation.early && 'Early'} {cvs.auscultation.mid && 'Mid'} {cvs.auscultation.late && 'Late'}</div>
              )}
            </div>
            {(cvs.auscultation.s3 || cvs.auscultation.s4) && (
              <div>Sounds: {cvs.auscultation.s3 && 'S3'} {cvs.auscultation.s4 && 'S4'}</div>
            )}
            {cvs.auscultation.others?.conditionOfVesselWall && (
              <div>Vessel Wall: {cvs.auscultation.others.conditionOfVesselWall}</div>
            )}
            
            {/* Peripheral Pulses */}
            {cvs.auscultation.peripheralPulses && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Peripheral Pulses:</div>
                <table className="w-full border border-slate-300 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1">Area</th>
                      <th className="border border-slate-300 px-2 py-1">Right</th>
                      <th className="border border-slate-300 px-2 py-1">Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">Carotid</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.carotid?.right ? '✓' : '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.carotid?.left ? '✓' : '-'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">Femoral</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.femoral?.right ? '✓' : '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.femoral?.left ? '✓' : '-'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">Popliteal</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.popliteal?.right ? '✓' : '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.popliteal?.left ? '✓' : '-'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">Dorsalis Pedis</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.dorsalisPedis?.right ? '✓' : '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{cvs.auscultation.peripheralPulses.dorsalisPedis?.left ? '✓' : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Others */}
      {cvs.others && (
        <div className="border border-slate-300 p-2 bg-white">
          <div className="font-semibold mb-1">Others:</div>
          <div>{cvs.others}</div>
        </div>
      )}
    </div>
  )
}
