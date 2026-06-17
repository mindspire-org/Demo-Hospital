export default function CardiovascularExam({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const cvs = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...cvs, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...cvs, [parent]: { ...(cvs[parent] || {}), [field]: value } })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">CARDIOVASCULAR SYSTEM</h4>

      {/* Row 1: Chest Tenderness, Palpitations, Dyspnoea, Orthopnoea */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cvs.chestTenderness || false}
            onChange={(e) => update('chestTenderness', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Chest Tenderness</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cvs.palpitations || false}
            onChange={(e) => update('palpitations', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Palpitations</label>
        </div>
        <div className="space-y-1">
          <label className="font-semibold">Dyspnoea</label>
          <div className="flex gap-2">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cvs.dyspnoea?.rest || false}
                onChange={(e) => updateNested('dyspnoea', 'rest', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Rest</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cvs.dyspnoea?.exertion || false}
                onChange={(e) => updateNested('dyspnoea', 'exertion', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Exertion</span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cvs.orthopnoea || false}
            onChange={(e) => update('orthopnoea', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Orthopnoea</label>
        </div>
      </div>

      {/* Row 2: Radial Pulse */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Radial Pulse</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block mb-1">Rate</label>
            <input
              type="text"
              value={cvs.radialPulse?.rate || ''}
              onChange={(e) => updateNested('radialPulse', 'rate', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Rhythm</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.radialPulse?.regular || false}
                  onChange={(e) => updateNested('radialPulse', 'regular', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Regular</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.radialPulse?.irregular || false}
                  onChange={(e) => updateNested('radialPulse', 'irregular', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Irregular</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block mb-1">Volume</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.radialPulse?.normal || false}
                  onChange={(e) => updateNested('radialPulse', 'normal', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Normal</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.radialPulse?.weak || false}
                  onChange={(e) => updateNested('radialPulse', 'weak', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Weak</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.radialPulse?.bounding || false}
                  onChange={(e) => updateNested('radialPulse', 'bounding', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Bounding</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Character */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Character</label>
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.character?.radial || false}
              onChange={(e) => updateNested('character', 'radial', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Radial</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.character?.radioRadialDelay || false}
              onChange={(e) => updateNested('character', 'radioRadialDelay', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Radio Radial Delay</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.character?.radioFemoralDelay || false}
              onChange={(e) => updateNested('character', 'radioFemoralDelay', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Radio Femoral Delay</span>
          </label>
        </div>
      </div>

      {/* Row 4: Blood Pressure */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Blood Pressure</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block mb-1">Supine / Sitting</label>
            <input
              type="text"
              value={cvs.bloodPressure?.supineSitting || ''}
              onChange={(e) => updateNested('bloodPressure', 'supineSitting', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Systolic / Diastolic</label>
            <input
              type="text"
              value={cvs.bloodPressure?.systolicDiastolic || ''}
              onChange={(e) => updateNested('bloodPressure', 'systolicDiastolic', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Standing: Systolic / Diastolic</label>
            <input
              type="text"
              value={cvs.bloodPressure?.standingSystolicDiastolic || ''}
              onChange={(e) => updateNested('bloodPressure', 'standingSystolicDiastolic', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cvs.bloodPressure?.posturalHypotension || false}
              onChange={(e) => updateNested('bloodPressure', 'posturalHypotension', e.target.checked)}
              className="h-3 w-3"
            />
            <label>Postural Hypotension</label>
          </div>
        </div>
      </div>

      {/* Row 5: Apex Beat */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Apex Beat</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block mb-1">Location</label>
            <input
              type="text"
              value={cvs.apexBeat?.location || ''}
              onChange={(e) => updateNested('apexBeat', 'location', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Character</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.apexBeat?.tapping || false}
                  onChange={(e) => updateNested('apexBeat', 'tapping', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Tapping</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cvs.apexBeat?.thrill || false}
                  onChange={(e) => updateNested('apexBeat', 'thrill', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Thrill</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cvs.apexBeat?.leftParasternalHeave || false}
              onChange={(e) => updateNested('apexBeat', 'leftParasternalHeave', e.target.checked)}
              className="h-3 w-3"
            />
            <label>Left Parasternal Heave</label>
          </div>
        </div>
      </div>

      {/* Row 6: Venous Pulsations */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Venous Pulsations</label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.neckVeins || false}
              onChange={(e) => updateNested('venousPulsations', 'neckVeins', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Neck Veins</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.pericardialFrictionRub || false}
              onChange={(e) => updateNested('venousPulsations', 'pericardialFrictionRub', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Pericardial Friction Rub</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.exocardialSounds || false}
              onChange={(e) => updateNested('venousPulsations', 'exocardialSounds', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Exocardial Sounds</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.bruit || false}
              onChange={(e) => updateNested('venousPulsations', 'bruit', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Bruit</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.varicoseVeins || false}
              onChange={(e) => updateNested('venousPulsations', 'varicoseVeins', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Varicose Veins</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.capillaryPulsation || false}
              onChange={(e) => updateNested('venousPulsations', 'capillaryPulsation', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Capillary Pulsation</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cvs.venousPulsations?.intermittentClaudication || false}
              onChange={(e) => updateNested('venousPulsations', 'intermittentClaudication', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Intermittent Claudication</span>
          </label>
        </div>
      </div>

      {/* Row 7: Auscultation */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Auscultation</label>
        
        {/* Murmur Table */}
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1" colSpan={2}>Murmur</th>
              <th className="border border-slate-300 px-2 py-1" rowSpan={2}>Others</th>
            </tr>
            <tr>
              <th className="border border-slate-300 px-2 py-1">Systolic</th>
              <th className="border border-slate-300 px-2 py-1">Diastolic</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.midEjection || false} onChange={(e) => updateNested('auscultation', 'midEjection', e.target.checked)} className="h-3 w-3" />
                  <span>Mid Ejection</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.early || false} onChange={(e) => updateNested('auscultation', 'early', e.target.checked)} className="h-3 w-3" />
                  <span>Early</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1" rowSpan={3}>
                <div className="text-xs mb-1">Condition of Vessel wall</div>
                <textarea value={cvs.auscultation?.others?.conditionOfVesselWall || ''} onChange={(e) => {
                    const newAusc = { ...(cvs.auscultation || {}), others: { conditionOfVesselWall: e.target.value } }
                    onChange({ ...cvs, auscultation: newAusc })
                  }} className="w-full border border-slate-300 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.pan || false} onChange={(e) => updateNested('auscultation', 'pan', e.target.checked)} className="h-3 w-3" />
                  <span>Pan</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.mid || false} onChange={(e) => updateNested('auscultation', 'mid', e.target.checked)} className="h-3 w-3" />
                  <span>Mid</span>
                </label>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.late || false} onChange={(e) => updateNested('auscultation', 'late', e.target.checked)} className="h-3 w-3" />
                  <span>Late</span>
                </label>
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={cvs.auscultation?.diastolicLate || false} onChange={(e) => updateNested('auscultation', 'diastolicLate', e.target.checked)} className="h-3 w-3" />
                  <span>Late</span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>

        {/* S1, S2, S3, S4 */}
        <div className="flex gap-4 text-xs mt-2">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cvs.auscultation?.s1 || false} onChange={(e) => updateNested('auscultation', 's1', e.target.checked)} className="h-3 w-3" />
            <span>S1</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cvs.auscultation?.s2 || false} onChange={(e) => updateNested('auscultation', 's2', e.target.checked)} className="h-3 w-3" />
            <span>S2</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cvs.auscultation?.s3 || false} onChange={(e) => updateNested('auscultation', 's3', e.target.checked)} className="h-3 w-3" />
            <span>S3</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cvs.auscultation?.s4 || false} onChange={(e) => updateNested('auscultation', 's4', e.target.checked)} className="h-3 w-3" />
            <span>S4</span>
          </label>
        </div>

        {/* Others */}
        <div className="mt-2">
          <label className="block mb-1 text-xs font-semibold">Others</label>
          <textarea value={cvs.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* Peripheral Pulses */}
        <div className="border-t border-slate-300 pt-2 mt-2">
          <label className="block mb-2 text-xs font-semibold">Peripheral Pulses</label>
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
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.carotid?.right || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          carotid: { ...(cvs.auscultation?.peripheralPulses?.carotid || {}), right: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.carotid?.left || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          carotid: { ...(cvs.auscultation?.peripheralPulses?.carotid || {}), left: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1">Femoral</td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.femoral?.right || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          femoral: { ...(cvs.auscultation?.peripheralPulses?.femoral || {}), right: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.femoral?.left || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          femoral: { ...(cvs.auscultation?.peripheralPulses?.femoral || {}), left: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1">Popliteal</td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.popliteal?.right || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          popliteal: { ...(cvs.auscultation?.peripheralPulses?.popliteal || {}), right: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.popliteal?.left || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          popliteal: { ...(cvs.auscultation?.peripheralPulses?.popliteal || {}), left: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1">Dorsalis Pedis</td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.dorsalisPedis?.right || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          dorsalisPedis: { ...(cvs.auscultation?.peripheralPulses?.dorsalisPedis || {}), right: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
                <td className="border border-slate-300 px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={cvs.auscultation?.peripheralPulses?.dorsalisPedis?.left || false}
                    onChange={(e) => {
                      const newAusc = {
                        ...(cvs.auscultation || {}),
                        peripheralPulses: {
                          ...(cvs.auscultation?.peripheralPulses || {}),
                          dorsalisPedis: { ...(cvs.auscultation?.peripheralPulses?.dorsalisPedis || {}), left: e.target.checked }
                        }
                      }
                      onChange({ ...cvs, auscultation: newAusc })
                    }}
                    className="h-3 w-3"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
