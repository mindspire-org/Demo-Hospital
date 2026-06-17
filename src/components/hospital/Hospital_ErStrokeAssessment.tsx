import { useState, useEffect } from 'react'
import { erApi } from '../../features/hospital/er'
import { Plus, Trash2, Printer } from 'lucide-react'

export default function Hospital_ErStrokeAssessment({ encounterId }: { encounterId: string }) {
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<any>({
    assessedBy: '',
    assessmentTime: new Date().toISOString().slice(0, 16),
    mrsBeforeIllness: '',
    lastSeenWell: '',
    presentingComplaints: '',
    previousPciCabg: '',
    comorbidities: '',
    vitals: { pulse: '', bp: '', rr: '', temp: '', spo2: '', bsr: '' },
    cvsExam: '',
    chestExam: '',
    consciousLevel: '',
    pupilResponse: '',
    eyeDeviation: '',
    faceDeviation: '',
    speech: '',
    comprehension: '',
    power: { rightArm: '', rightLeg: '', leftArm: '', leftLeg: '' },
    plantarResponse: { right: '', left: '' },
    nihss: '',
    abdomenExam: '',
    otherExam: '',
    provisionalDiagnosis: '',
    ecg: '',
    cardiacEnzymes: '',
    echoFindings: '',
    managementPlan: '',
    referralAdmission: ''
  })

  useEffect(() => {
    fetchAssessments()
  }, [encounterId])

  const fetchAssessments = async () => {
    try {
      const res: any = await erApi.listErStrokeAssessments(encounterId)
      setAssessments(res.assessments || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await erApi.createErStrokeAssessment(encounterId, formData)
      setShowForm(false)
      fetchAssessments()
    } catch (e) {
      console.error(e)
      alert('Failed to save assessment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return
    try {
      await erApi.deleteErStrokeAssessment(id)
      fetchAssessments()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h3 className="font-semibold text-lg">Acute Stroke Assessment</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"
        >
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 print:hidden">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assessed By</label>
              <input type="text" required className="w-full border rounded p-2" value={formData.assessedBy} onChange={e => setFormData({...formData, assessedBy: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input type="datetime-local" required className="w-full border rounded p-2" value={formData.assessmentTime} onChange={e => setFormData({...formData, assessmentTime: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">mRS before current illness</label>
              <input type="text" className="w-full border rounded p-2" value={formData.mrsBeforeIllness} onChange={e => setFormData({...formData, mrsBeforeIllness: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LAST SEEN WELL (time)</label>
              <input type="text" className="w-full border rounded p-2" value={formData.lastSeenWell} onChange={e => setFormData({...formData, lastSeenWell: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Presenting Complaints</label>
            <input type="text" className="w-full border rounded p-2" value={formData.presentingComplaints} onChange={e => setFormData({...formData, presentingComplaints: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Previous PCI / CABG</label>
              <input type="text" className="w-full border rounded p-2" value={formData.previousPciCabg} onChange={e => setFormData({...formData, previousPciCabg: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Co-Morbidities/Risk Factors</label>
              <input type="text" className="w-full border rounded p-2" value={formData.comorbidities} onChange={e => setFormData({...formData, comorbidities: e.target.value})} />
            </div>
          </div>

          <div className="border p-3 rounded bg-white">
            <h4 className="font-semibold mb-2">Vitals</h4>
            <div className="grid grid-cols-6 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Pulse</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.pulse} onChange={e => setFormData({...formData, vitals: {...formData.vitals, pulse: e.target.value}})} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">BP</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.bp} onChange={e => setFormData({...formData, vitals: {...formData.vitals, bp: e.target.value}})} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">RR</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.rr} onChange={e => setFormData({...formData, vitals: {...formData.vitals, rr: e.target.value}})} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Temp</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.temp} onChange={e => setFormData({...formData, vitals: {...formData.vitals, temp: e.target.value}})} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">SPO2</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.spo2} onChange={e => setFormData({...formData, vitals: {...formData.vitals, spo2: e.target.value}})} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">BSR</label>
                <input type="text" className="w-full border rounded p-1" value={formData.vitals.bsr} onChange={e => setFormData({...formData, vitals: {...formData.vitals, bsr: e.target.value}})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border p-3 rounded bg-white">
            <div>
              <label className="block text-sm font-medium mb-1">1. CVS exam</label>
              <input type="text" className="w-full border rounded p-2" value={formData.cvsExam} onChange={e => setFormData({...formData, cvsExam: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">2. Chest exam</label>
              <input type="text" className="w-full border rounded p-2" value={formData.chestExam} onChange={e => setFormData({...formData, chestExam: e.target.value})} />
            </div>
          </div>

          <div className="border p-3 rounded bg-white space-y-4">
            <h4 className="font-semibold">Findings in patients with suspicion of Acute Stroke</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">3. Conscious level</label>
                <select className="w-full border rounded p-2" value={formData.consciousLevel} onChange={e => setFormData({...formData, consciousLevel: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Full Conscious">Full Conscious</option>
                  <option value="Agitated">Agitated</option>
                  <option value="Drowsy">Drowsy</option>
                  <option value="No response">No response</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">4. Pupil response to light</label>
                <select className="w-full border rounded p-2" value={formData.pupilResponse} onChange={e => setFormData({...formData, pupilResponse: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Equally reactive bilaterally">Equally reactive bilaterally</option>
                  <option value="Equally non-reactive bilated">Equally non-reactive bilated</option>
                  <option value="Unequal">Unequal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">5. Eye Deviation</label>
                <select className="w-full border rounded p-2" value={formData.eyeDeviation} onChange={e => setFormData({...formData, eyeDeviation: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="No deviation">No deviation</option>
                  <option value="Both eyes deviated">Both eyes deviated</option>
                  <option value="One eye deviated">One eye deviated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">6. Face Deviation</label>
                <select className="w-full border rounded p-2" value={formData.faceDeviation} onChange={e => setFormData({...formData, faceDeviation: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="No Deviation">No Deviation</option>
                  <option value="Deviated towards right">Deviated towards right</option>
                  <option value="Deviated towards left">Deviated towards left</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">7. Speech</label>
                <select className="w-full border rounded p-2" value={formData.speech} onChange={e => setFormData({...formData, speech: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Fluent">Fluent</option>
                  <option value="Non-fluent">Non-fluent</option>
                  <option value="Aphasia">Aphasia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">8. Comprehension</label>
                <select className="w-full border rounded p-2" value={formData.comprehension} onChange={e => setFormData({...formData, comprehension: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Intact">Intact</option>
                  <option value="Impaired">Impaired</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">9. Power (/5)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Right Arm" className="border rounded p-1" value={formData.power.rightArm} onChange={e => setFormData({...formData, power: {...formData.power, rightArm: e.target.value}})} />
                  <input type="text" placeholder="Right Leg" className="border rounded p-1" value={formData.power.rightLeg} onChange={e => setFormData({...formData, power: {...formData.power, rightLeg: e.target.value}})} />
                  <input type="text" placeholder="Left Arm" className="border rounded p-1" value={formData.power.leftArm} onChange={e => setFormData({...formData, power: {...formData.power, leftArm: e.target.value}})} />
                  <input type="text" placeholder="Left Leg" className="border rounded p-1" value={formData.power.leftLeg} onChange={e => setFormData({...formData, power: {...formData.power, leftLeg: e.target.value}})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">10. Plantar Response</label>
                <div className="space-y-2">
                  <input type="text" placeholder="Right plantar reflex" className="w-full border rounded p-1" value={formData.plantarResponse.right} onChange={e => setFormData({...formData, plantarResponse: {...formData.plantarResponse, right: e.target.value}})} />
                  <input type="text" placeholder="Left plantar reflex" className="w-full border rounded p-1" value={formData.plantarResponse.left} onChange={e => setFormData({...formData, plantarResponse: {...formData.plantarResponse, left: e.target.value}})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">11. NIHSS</label>
              <input type="text" className="w-full border rounded p-2" value={formData.nihss} onChange={e => setFormData({...formData, nihss: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">12. Abdomen and related exam</label>
                <input type="text" className="w-full border rounded p-2" value={formData.abdomenExam} onChange={e => setFormData({...formData, abdomenExam: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">13. Any other exam finding</label>
                <input type="text" className="w-full border rounded p-2" value={formData.otherExam} onChange={e => setFormData({...formData, otherExam: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provisional diagnosis</label>
              <input type="text" className="w-full border rounded p-2" value={formData.provisionalDiagnosis} onChange={e => setFormData({...formData, provisionalDiagnosis: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ECG</label>
              <input type="text" className="w-full border rounded p-2" value={formData.ecg} onChange={e => setFormData({...formData, ecg: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cardiac Enzymes/Troponins</label>
              <input type="text" className="w-full border rounded p-2" value={formData.cardiacEnzymes} onChange={e => setFormData({...formData, cardiacEnzymes: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Echo Findings</label>
              <input type="text" className="w-full border rounded p-2" value={formData.echoFindings} onChange={e => setFormData({...formData, echoFindings: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Management Plan</label>
            <textarea className="w-full border rounded p-2" rows={3} value={formData.managementPlan} onChange={e => setFormData({...formData, managementPlan: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Referral/Admission</label>
            <input type="text" className="w-full border rounded p-2" value={formData.referralAdmission} onChange={e => setFormData({...formData, referralAdmission: e.target.value})} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save Assessment</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {assessments.map((a: any) => (
          <div key={a._id} className="bg-white border rounded-lg p-4 relative shadow-sm">
            <button onClick={() => handleDelete(a._id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 print:hidden"><Trash2 className="w-4 h-4" /></button>
            
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <p><strong>Time:</strong> {new Date(a.assessmentTime).toLocaleString()}</p>
              <p><strong>Assessed By:</strong> {a.assessedBy}</p>
              <p><strong>mRS before illness:</strong> {a.mrsBeforeIllness}</p>
              <p><strong>Last seen well:</strong> {a.lastSeenWell}</p>
              <p className="col-span-2"><strong>Complaints:</strong> {a.presentingComplaints}</p>
              <p><strong>Previous PCI/CABG:</strong> {a.previousPciCabg}</p>
              <p><strong>Co-Morbidities:</strong> {a.comorbidities}</p>
            </div>
            
            <div className="mt-3 bg-slate-50 p-2 rounded text-sm grid grid-cols-6 gap-2">
              <p><strong>P:</strong> {a.vitals?.pulse}</p>
              <p><strong>BP:</strong> {a.vitals?.bp}</p>
              <p><strong>RR:</strong> {a.vitals?.rr}</p>
              <p><strong>Temp:</strong> {a.vitals?.temp}</p>
              <p><strong>SPO2:</strong> {a.vitals?.spo2}</p>
              <p><strong>BSR:</strong> {a.vitals?.bsr}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <p><strong>CVS Exam:</strong> {a.cvsExam}</p>
              <p><strong>Chest Exam:</strong> {a.chestExam}</p>
              <p><strong>Conscious Level:</strong> {a.consciousLevel}</p>
              <p><strong>Pupil Response:</strong> {a.pupilResponse}</p>
              <p><strong>Eye Deviation:</strong> {a.eyeDeviation}</p>
              <p><strong>Face Deviation:</strong> {a.faceDeviation}</p>
              <p><strong>Speech:</strong> {a.speech}</p>
              <p><strong>Comprehension:</strong> {a.comprehension}</p>
              <div>
                <strong>Power (/5):</strong>
                <p>R.Arm: {a.power?.rightArm}, R.Leg: {a.power?.rightLeg}</p>
                <p>L.Arm: {a.power?.leftArm}, L.Leg: {a.power?.leftLeg}</p>
              </div>
              <div>
                <strong>Plantar Response:</strong>
                <p>Right: {a.plantarResponse?.right}</p>
                <p>Left: {a.plantarResponse?.left}</p>
              </div>
              <p className="col-span-2"><strong>NIHSS:</strong> {a.nihss}</p>
              <p><strong>Abdomen Exam:</strong> {a.abdomenExam}</p>
              <p><strong>Other Exam:</strong> {a.otherExam}</p>
              <p><strong>Prov. Diagnosis:</strong> {a.provisionalDiagnosis}</p>
              <p><strong>ECG:</strong> {a.ecg}</p>
              <p><strong>Cardiac Enzymes:</strong> {a.cardiacEnzymes}</p>
              <p><strong>Echo Findings:</strong> {a.echoFindings}</p>
              <p className="col-span-2"><strong>Management:</strong> {a.managementPlan}</p>
              <p className="col-span-2"><strong>Referral/Admission:</strong> {a.referralAdmission}</p>
            </div>
          </div>
        ))}
        {assessments.length === 0 && !showForm && (
          <div className="text-center text-slate-500 py-8">No stroke assessments found.</div>
        )}
      </div>
    </div>
  )
}
