export default function CentralNervousExam({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const cns = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...cns, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...cns, [parent]: { ...(cns[parent] || {}), [field]: value } })
  }

  const updateDeepNested = (parent: string, child: string, field: string, value: any) => {
    onChange({ 
      ...cns, 
      [parent]: { 
        ...(cns[parent] || {}), 
        [child]: { 
          ...(cns[parent]?.[child] || {}), 
          [field]: value 
        } 
      } 
    })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1">CENTRAL NERVOUS SYSTEM</h4>

      {/* Row 1: Symptoms */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cns.headaches || false}
            onChange={(e) => update('headaches', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Headaches</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cns.dizziness || false}
            onChange={(e) => update('dizziness', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Dizziness</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cns.faintingOrLossOfConsciousness || false}
            onChange={(e) => update('faintingOrLossOfConsciousness', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Fainting or Loss of Consciousness</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cns.numbnessOrTingling || false}
            onChange={(e) => update('numbnessOrTingling', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Numbness or Tingling</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cns.memoryLoss || false}
            onChange={(e) => update('memoryLoss', e.target.checked)}
            className="h-4 w-4"
          />
          <label>Memory Loss</label>
        </div>
      </div>

      {/* Orientation Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Orientation</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block mb-1">Oriented</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cns.orientation?.oriented?.yes || false}
                  onChange={(e) => updateDeepNested('orientation', 'oriented', 'yes', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cns.orientation?.oriented?.no || false}
                  onChange={(e) => updateDeepNested('orientation', 'oriented', 'no', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>No</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block mb-1 text-xs">If No, Disoriented to:</label>
            <input
              type="text"
              value={cns.orientation?.disorientedTo || ''}
              onChange={(e) => updateNested('orientation', 'disorientedTo', e.target.value)}
              className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.orientation?.time || false}
              onChange={(e) => updateNested('orientation', 'time', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Time</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.orientation?.place || false}
              onChange={(e) => updateNested('orientation', 'place', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Place</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.orientation?.person || false}
              onChange={(e) => updateNested('orientation', 'person', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Person</span>
          </label>
        </div>
        <div>
          <label className="block mb-1 text-xs">Other</label>
          <input
            type="text"
            value={cns.orientation?.other || ''}
            onChange={(e) => updateNested('orientation', 'other', e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
          />
        </div>
      </div>

      {/* Behavior Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Behavior</label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.behavior?.appropriateCooperative || false}
              onChange={(e) => updateNested('behavior', 'appropriateCooperative', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Appropriate / Cooperative</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.behavior?.anxious || false}
              onChange={(e) => updateNested('behavior', 'anxious', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Anxious</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.behavior?.agitated || false}
              onChange={(e) => updateNested('behavior', 'agitated', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Agitated</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.behavior?.violent || false}
              onChange={(e) => updateNested('behavior', 'violent', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Violent</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.behavior?.withdrawnQuite || false}
              onChange={(e) => updateNested('behavior', 'withdrawnQuite', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Withdrawn/Quite</span>
          </label>
        </div>
        <div>
          <label className="block mb-1 text-xs">Other</label>
          <input
            type="text"
            value={cns.behavior?.other || ''}
            onChange={(e) => updateNested('behavior', 'other', e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
          />
        </div>
      </div>

      {/* Speech Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Speech</label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.normal || false}
              onChange={(e) => updateNested('speech', 'normal', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Normal</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.slurred || false}
              onChange={(e) => updateNested('speech', 'slurred', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Slurred</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.aphasic || false}
              onChange={(e) => updateNested('speech', 'aphasic', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Aphasic</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.stammering || false}
              onChange={(e) => updateNested('speech', 'stammering', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Stammering</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.withArtificialAirway || false}
              onChange={(e) => updateNested('speech', 'withArtificialAirway', e.target.checked)}
              className="h-3 w-3"
            />
            <span>With Artificial Airway</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.dysarthria || false}
              onChange={(e) => updateNested('speech', 'dysarthria', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Dysarthria</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={cns.speech?.spastic || false}
              onChange={(e) => updateNested('speech', 'spastic', e.target.checked)}
              className="h-3 w-3"
            />
            <span>Spastic</span>
          </label>
        </div>
        <div>
          <label className="block mb-1 text-xs">Other</label>
          <input
            type="text"
            value={cns.speech?.other || ''}
            onChange={(e) => updateNested('speech', 'other', e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
          />
        </div>
      </div>

      {/* Level of Consciousness Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Level of Consciousness</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.alert || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'alert', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Alert</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.respondsToVoice || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'respondsToVoice', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Responds to Voice</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.respondsToPain || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'respondsToPain', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Responds to Pain</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.unconscious || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'unconscious', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Unconscious</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.drowsy || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'drowsy', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Drowsy</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={cns.levelOfConsciousness?.lethargy || false}
                onChange={(e) => updateNested('levelOfConsciousness', 'lethargy', e.target.checked)}
                className="h-3 w-3"
              />
              <span>Lethargy</span>
            </label>
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">Glasgow Coma Scale</label>
            <div className="space-y-1">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cns.glasgowComaScale?.eyeResponse || false}
                  onChange={(e) => updateNested('glasgowComaScale', 'eyeResponse', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Eye Response</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cns.glasgowComaScale?.verbalResponse || false}
                  onChange={(e) => updateNested('glasgowComaScale', 'verbalResponse', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Verbal Response</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={cns.glasgowComaScale?.motorResponse || false}
                  onChange={(e) => updateNested('glasgowComaScale', 'motorResponse', e.target.checked)}
                  className="h-3 w-3"
                />
                <span>Motor Response</span>
              </label>
              <div>
                <label className="block mb-1 text-xs">Total ___/15</label>
                <input
                  type="text"
                  value={cns.glasgowComaScale?.total || ''}
                  onChange={(e) => updateNested('glasgowComaScale', 'total', e.target.value)}
                  className="w-full border border-slate-300 px-2 py-1 text-xs rounded"
                  placeholder="/15"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cranial Nerves Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Cranial Nerves - Observations to be Made</label>
        <table className="w-full border border-slate-300 text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left">Nerve</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Observation</th>
              <th className="border border-slate-300 px-2 py-1">Right</th>
              <th className="border border-slate-300 px-2 py-1">Left</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-2 py-1">I-Olfactory</td>
              <td className="border border-slate-300 px-2 py-1">Smell, Anosmia, Parosmia, Hallucination</td>
              <td className="border border-slate-300 px-2 py-1">
                <input
                  type="text"
                  value={cns.cranialNerves?.olfactory?.right || ''}
                  onChange={(e) => updateDeepNested('cranialNerves', 'olfactory', 'right', e.target.value)}
                  className="w-full border-0 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input
                  type="text"
                  value={cns.cranialNerves?.olfactory?.left || ''}
                  onChange={(e) => updateDeepNested('cranialNerves', 'olfactory', 'left', e.target.value)}
                  className="w-full border-0 px-1 py-0.5 text-xs"
                />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1" rowSpan={3}>II-Optic</td>
              <td className="border border-slate-300 px-2 py-1">Visual Acuity - Far & Near</td>
              <td className="border border-slate-300 px-2 py-1">
                <input
                  type="text"
                  value={cns.cranialNerves?.optic?.visualAcuity?.right || ''}
                  onChange={(e) => {
                    const newCN = {
                      ...(cns.cranialNerves || {}),
                      optic: {
                        ...(cns.cranialNerves?.optic || {}),
                        visualAcuity: {
                          ...(cns.cranialNerves?.optic?.visualAcuity || {}),
                          right: e.target.value
                        }
                      }
                    }
                    onChange({ ...cns, cranialNerves: newCN })
                  }}
                  className="w-full border-0 px-1 py-0.5 text-xs"
                />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input
                  type="text"
                  value={cns.cranialNerves?.optic?.visualAcuity?.left || ''}
                  onChange={(e) => {
                    const newCN = {
                      ...(cns.cranialNerves || {}),
                      optic: {
                        ...(cns.cranialNerves?.optic || {}),
                        visualAcuity: {
                          ...(cns.cranialNerves?.optic?.visualAcuity || {}),
                          left: e.target.value
                        }
                      }
                    }
                    onChange({ ...cns, cranialNerves: newCN })
                  }}
                  className="w-full border-0 px-1 py-0.5 text-xs"
                />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">Visual Fields - Black & White (Grey Scale) / Colour</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.optic?.visualFields?.right || ''} onChange={(e) => {
                    const newCN = { ...(cns.cranialNerves || {}), optic: { ...(cns.cranialNerves?.optic || {}), visualFields: { ...(cns.cranialNerves?.optic?.visualFields || {}), right: e.target.value } } }
                    onChange({ ...cns, cranialNerves: newCN })
                  }} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.optic?.visualFields?.left || ''} onChange={(e) => {
                    const newCN = { ...(cns.cranialNerves || {}), optic: { ...(cns.cranialNerves?.optic || {}), visualFields: { ...(cns.cranialNerves?.optic?.visualFields || {}), left: e.target.value } } }
                    onChange({ ...cns, cranialNerves: newCN })
                  }} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">Fundus - On Fundoscopy</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.optic?.fundus?.right || ''} onChange={(e) => {
                    const newCN = { ...(cns.cranialNerves || {}), optic: { ...(cns.cranialNerves?.optic || {}), fundus: { ...(cns.cranialNerves?.optic?.fundus || {}), right: e.target.value } } }
                    onChange({ ...cns, cranialNerves: newCN })
                  }} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.optic?.fundus?.left || ''} onChange={(e) => {
                    const newCN = { ...(cns.cranialNerves || {}), optic: { ...(cns.cranialNerves?.optic || {}), fundus: { ...(cns.cranialNerves?.optic?.fundus || {}), left: e.target.value } } }
                    onChange({ ...cns, cranialNerves: newCN })
                  }} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">III-IV-VI Oculomotor, Trochlear & Abducens</td>
              <td className="border border-slate-300 px-2 py-1 text-xs">i) Movement of Eye Ball<br/>ii) Pupils, Size, Shape, Equality, Accommodation Reflex<br/>iii) Reaction to Light (Light Reflex Cr.2,3), Consensual Reflex<br/>iv) Strabismus, Paralytic, Concomitant Diplopia</td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.oculomotor?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'oculomotor', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.oculomotor?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'oculomotor', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">V-Trigeminal</td>
              <td className="border border-slate-300 px-2 py-1 text-xs">Sensory Part-Corneal & Conjunctival Reflex, Sensation in 3 Divisions<br/>Motor part-Muscles of Mastication, Movements of Jaw, Clenching of Teeth & Jaw Jerk</td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.trigeminal?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'trigeminal', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.trigeminal?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'trigeminal', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">VII-Facial</td>
              <td className="border border-slate-300 px-2 py-1 text-xs">Judgment whether the lesion is in UMN or LMN Frowning, Closing of Eye, Naso-Labial Fold, Angle of Mouth, Whistling out, Blowing Cheeks, Showing of Teeth, Taste on Anterior 2/3 of Tongue, and Facial Expression</td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.facial?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'facial', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <textarea value={cns.cranialNerves?.facial?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'facial', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs min-h-[60px]" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">VIII-Vestibulocochlear</td>
              <td className="border border-slate-300 px-2 py-1">Hearing, Rinne's test, Weber's test & Vertigo</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.vestibulocochlear?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'vestibulocochlear', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.vestibulocochlear?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'vestibulocochlear', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">IX-Glossopharyngeal</td>
              <td className="border border-slate-300 px-2 py-1">Taste on Posterior 1/3 of Tongue, Tickling of Pharynx Reflex (Gag Reflex)</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.glossopharyngeal?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'glossopharyngeal', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.glossopharyngeal?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'glossopharyngeal', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">X-Vagus nerve</td>
              <td className="border border-slate-300 px-2 py-1">Movement of Palate during Phonation (Ah-test), Nasal Twang, Hoarseness</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.vagus?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'vagus', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.vagus?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'vagus', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">XI-Accessory</td>
              <td className="border border-slate-300 px-2 py-1">Power of Sternocleidomastoid, and Trapezius</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.accessory?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'accessory', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.accessory?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'accessory', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1">XII-Hypoglossal</td>
              <td className="border border-slate-300 px-2 py-1">Tongue position, Deviation, Movements of Tongue (Comparison and Power), Wasting, and Fasciculation of Tongue</td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.hypoglossal?.right || ''} onChange={(e) => updateDeepNested('cranialNerves', 'hypoglossal', 'right', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
              <td className="border border-slate-300 px-2 py-1">
                <input type="text" value={cns.cranialNerves?.hypoglossal?.left || ''} onChange={(e) => updateDeepNested('cranialNerves', 'hypoglossal', 'left', e.target.value)} className="w-full border-0 px-1 py-0.5 text-xs" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Gait Section */}
      <div className="border border-slate-300 p-2 space-y-2">
        <label className="font-semibold text-xs">Gait</label>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.normal || false} onChange={(e) => updateNested('gait', 'normal', e.target.checked)} className="h-3 w-3" />
            <span>Normal</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.sensory || false} onChange={(e) => updateNested('gait', 'sensory', e.target.checked)} className="h-3 w-3" />
            <span>Sensory</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.neuropathicHighStepping || false} onChange={(e) => updateNested('gait', 'neuropathicHighStepping', e.target.checked)} className="h-3 w-3" />
            <span>Neuropathic/High-stepping</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.hemiplegic || false} onChange={(e) => updateNested('gait', 'hemiplegic', e.target.checked)} className="h-3 w-3" />
            <span>Hemiplegic</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.choreiform || false} onChange={(e) => updateNested('gait', 'choreiform', e.target.checked)} className="h-3 w-3" />
            <span>Choreiform</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.diplegicSpastic || false} onChange={(e) => updateNested('gait', 'diplegicSpastic', e.target.checked)} className="h-3 w-3" />
            <span>Diplegic/Spastic</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.myopathicWaddling || false} onChange={(e) => updateNested('gait', 'myopathicWaddling', e.target.checked)} className="h-3 w-3" />
            <span>Myopathic/Waddling</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.parkinsonianFestinant || false} onChange={(e) => updateNested('gait', 'parkinsonianFestinant', e.target.checked)} className="h-3 w-3" />
            <span>Parkinsonian/Festinant</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cns.gait?.drunken || false} onChange={(e) => updateNested('gait', 'drunken', e.target.checked)} className="h-3 w-3" />
            <span>Drunken</span>
          </label>
        </div>
      </div>

      {/* Others */}
      <div>
        <label className="block mb-1 text-xs font-semibold">Others</label>
        <textarea value={cns.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
      </div>
    </div>
  )
}
