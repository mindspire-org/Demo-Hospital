export default function NewBornBabyNotes({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  const exam = data || {}

  const update = (field: string, value: any) => {
    onChange({ ...exam, [field]: value })
  }

  const updateNested = (parent: string, field: string, value: any) => {
    onChange({ ...exam, [parent]: { ...(exam[parent] || {}), [field]: value } })
  }

  return (
    <div className="space-y-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
      <div className="border border-slate-300 p-3 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 bg-slate-200 px-2 py-1 text-center">
          NEW BORN BABY NOTES
        </h4>
        
        {/* DATE and TIME */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold">DATE:</label>
            <input type="text" value={exam.date || ''} onChange={(e) => update('date', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">TIME:</label>
            <input type="text" value={exam.time || ''} onChange={(e) => update('time', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>

        {/* PATIENT'S PARTICULARS */}
        <div className="border border-slate-300 p-2 bg-white">
          <h5 className="text-xs font-bold mb-2">PATIENT'S PARTICULARS</h5>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block mb-1 text-xs font-semibold">NAME:</label>
              <input type="text" value={exam.patientName || ''} onChange={(e) => update('patientName', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">AGE:</label>
              <input type="text" value={exam.patientAge || ''} onChange={(e) => update('patientAge', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>

          <div className="mb-2">
            <label className="block mb-1 text-xs font-semibold">ADDRESS:</label>
            <input type="text" value={exam.patientAddress || ''} onChange={(e) => update('patientAddress', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block mb-1 text-xs font-semibold">GYNAECOLOGIST:</label>
              <input type="text" value={exam.gynaecologist || ''} onChange={(e) => update('gynaecologist', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">ANAESTHETIST:</label>
              <input type="text" value={exam.anaesthetist || ''} onChange={(e) => update('anaesthetist', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block mb-1 text-xs font-semibold">OT SISTER:</label>
              <input type="text" value={exam.otSister || ''} onChange={(e) => update('otSister', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">AYA:</label>
              <input type="text" value={exam.aya || ''} onChange={(e) => update('aya', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="block mb-1 text-xs font-semibold">DAGNOSIS:</label>
              <input type="text" value={exam.diagnosis || ''} onChange={(e) => update('diagnosis', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">OPERATION:</label>
              <input type="text" value={exam.operation || ''} onChange={(e) => update('operation', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">ANAESTHESIA:</label>
              <input type="text" value={exam.anaesthesia || ''} onChange={(e) => update('anaesthesia', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 text-xs font-semibold">BABY'S SEX:</label>
              <input type="text" value={exam.babySex || ''} onChange={(e) => update('babySex', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold">ANY CONGEITAL ABNORMALTY:</label>
              <input type="text" value={exam.congenitalAbnormality || ''} onChange={(e) => update('congenitalAbnormality', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>
        </div>

        {/* APGAR scoring system */}
        <div className="border border-slate-300 p-2 bg-white">
          <h5 className="text-xs font-bold mb-2 italic">APGAR scoring system:</h5>
          
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-300 text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">Sign</th>
                  <th className="border border-slate-300 px-2 py-1">Score 0</th>
                  <th className="border border-slate-300 px-2 py-1">Score 1</th>
                  <th className="border border-slate-300 px-2 py-1">Score 2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Appearance (Colour)</td>
                  <td className="border border-slate-300 px-2 py-1">Blue, pale</td>
                  <td className="border border-slate-300 px-2 py-1">Pink body, blue extremities</td>
                  <td className="border border-slate-300 px-2 py-1">Pink</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Plas (Heart rate)</td>
                  <td className="border border-slate-300 px-2 py-1">Absent</td>
                  <td className="border border-slate-300 px-2 py-1">&lt; 100</td>
                  <td className="border border-slate-300 px-2 py-1">&gt; 100</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Grimace (Reflex</td>
                  <td className="border border-slate-300 px-2 py-1">No response</td>
                  <td className="border border-slate-300 px-2 py-1">Some movement</td>
                  <td className="border border-slate-300 px-2 py-1">Strong</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Irritability</td>
                  <td className="border border-slate-300 px-2 py-1"></td>
                  <td className="border border-slate-300 px-2 py-1"></td>
                  <td className="border border-slate-300 px-2 py-1">withdrawal</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Activity (Muscle tone)</td>
                  <td className="border border-slate-300 px-2 py-1">Limp</td>
                  <td className="border border-slate-300 px-2 py-1">Poor Tone</td>
                  <td className="border border-slate-300 px-2 py-1">Good Tone</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Respiratory</td>
                  <td className="border border-slate-300 px-2 py-1">Absent</td>
                  <td className="border border-slate-300 px-2 py-1">weak cry</td>
                  <td className="border border-slate-300 px-2 py-1">Strong cry</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 border border-slate-300 p-2 bg-slate-50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-semibold">APGRA SCORE AT 1 MINUTE=</label>
                <input type="text" value={exam.apgarScore1Min || ''} onChange={(e) => update('apgarScore1Min', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold">APGRA SCORE AT 5 MINUTE=</label>
                <input type="text" value={exam.apgarScore5Min || ''} onChange={(e) => update('apgarScore5Min', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Remarks and Baby's Right Foot Print */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold italic">Remarks :-</label>
            <textarea value={exam.remarks || ''} onChange={(e) => update('remarks', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[150px]" />
          </div>
          <div className="border border-slate-300 p-2 bg-white">
            <label className="block mb-1 text-xs font-semibold text-center">BABY'S RIGHT FOOT PRINT</label>
            <div className="border border-slate-300 min-h-[130px] bg-white flex items-center justify-center text-slate-400 text-xs">
              (Foot print area)
            </div>
            <div className="mt-2">
              <label className="block mb-1 text-xs">Notes:</label>
              <textarea value={exam.footPrintNotes || ''} onChange={(e) => update('footPrintNotes', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
