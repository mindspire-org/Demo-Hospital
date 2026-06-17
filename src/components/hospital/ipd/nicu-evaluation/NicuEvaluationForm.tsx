export default function NicuEvaluationForm({ data, onChange }: { data: any; onChange: (data: any) => void }) {
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
          NICU EVALUATION PERFORMANCE
        </h4>
        
        {/* GPE */}
        <div>
          <label className="block mb-1 text-xs font-semibold">GPE:</label>
          <textarea value={exam.gpe || ''} onChange={(e) => update('gpe', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* COLOUR */}
        <div>
          <label className="block mb-1 text-xs font-semibold">COLOUR: PINK/CNETRAL CYNOSIS/PERPHERAL CYNOSIS/JAUNDIC</label>
          <input type="text" value={exam.colour || ''} onChange={(e) => update('colour', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* A/F and OFC */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold">A/F: OPEN / CLOSED / WIDE OPEN</label>
            <input type="text" value={exam.af || ''} onChange={(e) => update('af', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">NORMOTENSIVE/TENSE BULG/DEPRESSED</label>
            <input type="text" value={exam.afTension || ''} onChange={(e) => update('afTension', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>

        {/* OFC and WEIGHT */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold">OFC:</label>
            <input type="text" value={exam.ofc || ''} onChange={(e) => update('ofc', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">WEIGHT:</label>
            <input type="text" value={exam.weight || ''} onChange={(e) => update('weight', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>

        {/* EYES, EAR, NOSE */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1 text-xs font-semibold">EYES:</label>
            <input type="text" value={exam.eyes || ''} onChange={(e) => update('eyes', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">EAR:</label>
            <input type="text" value={exam.ear || ''} onChange={(e) => update('ear', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold">NOSE:</label>
            <input type="text" value={exam.nose || ''} onChange={(e) => update('nose', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
          </div>
        </div>

        {/* ORAL CAVITY/LIPS/PLATE */}
        <div>
          <label className="block mb-1 text-xs font-semibold">ORAL CAVITY/LIPS/PLATE:</label>
          <input type="text" value={exam.oralCavity || ''} onChange={(e) => update('oralCavity', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* CHEST AND ABDOMEN */}
        <div>
          <label className="block mb-1 text-xs font-semibold">CHEST AND ABDOMEN:</label>
          <textarea value={exam.chestAbdomen || ''} onChange={(e) => update('chestAbdomen', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* CORD */}
        <div>
          <label className="block mb-1 text-xs font-semibold">CORD:</label>
          <input type="text" value={exam.cord || ''} onChange={(e) => update('cord', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* GENETALIA */}
        <div>
          <label className="block mb-1 text-xs font-semibold">GENETALIA:</label>
          <input type="text" value={exam.genetalia || ''} onChange={(e) => update('genetalia', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* TESTIES */}
        <div>
          <label className="block mb-1 text-xs font-semibold">TESTIES:</label>
          <input type="text" value={exam.testies || ''} onChange={(e) => update('testies', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* BACK AND SPINE */}
        <div>
          <label className="block mb-1 text-xs font-semibold">BACK AND SPINE:</label>
          <input type="text" value={exam.backSpine || ''} onChange={(e) => update('backSpine', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* ANAL OPENING */}
        <div>
          <label className="block mb-1 text-xs font-semibold">ANAL OPENING:</label>
          <input type="text" value={exam.analOpening || ''} onChange={(e) => update('analOpening', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* HAND AND FOOT */}
        <div>
          <label className="block mb-1 text-xs font-semibold">HAND AND FOOT:</label>
          <input type="text" value={exam.handFoot || ''} onChange={(e) => update('handFoot', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* OTHERS */}
        <div>
          <label className="block mb-1 text-xs font-semibold">OTHERS:</label>
          <textarea value={exam.others || ''} onChange={(e) => update('others', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* VITALS */}
        <div className="border border-slate-300 p-2 bg-white">
          <label className="block mb-2 text-xs font-semibold">VITALS:</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block mb-1 text-xs">H/R:</label>
              <input type="text" value={exam.vitals?.hr || ''} onChange={(e) => updateNested('vitals', 'hr', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs">R/R:</label>
              <input type="text" value={exam.vitals?.rr || ''} onChange={(e) => updateNested('vitals', 'rr', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
            <div>
              <label className="block mb-1 text-xs">SPO2:</label>
              <input type="text" value={exam.vitals?.spo2 || ''} onChange={(e) => updateNested('vitals', 'spo2', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
            </div>
          </div>
        </div>

        {/* NEONATAL REFLEXES */}
        <div>
          <label className="block mb-1 text-xs font-semibold">NEONATAL REFLEXES:</label>
          <textarea value={exam.neonatalReflexes || ''} onChange={(e) => update('neonatalReflexes', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* SUCKING */}
        <div>
          <label className="block mb-1 text-xs font-semibold">SUCKING:</label>
          <input type="text" value={exam.sucking || ''} onChange={(e) => update('sucking', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* ROUTING */}
        <div>
          <label className="block mb-1 text-xs font-semibold">ROUTING:</label>
          <input type="text" value={exam.routing || ''} onChange={(e) => update('routing', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded" />
        </div>

        {/* SYESTEMIC */}
        <div>
          <label className="block mb-1 text-xs font-semibold">SYESTEMIC:</label>
          <textarea value={exam.syestemic || ''} onChange={(e) => update('syestemic', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* CVS */}
        <div>
          <label className="block mb-1 text-xs font-semibold">CVS:</label>
          <textarea value={exam.cvs || ''} onChange={(e) => update('cvs', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* CNS */}
        <div>
          <label className="block mb-1 text-xs font-semibold">CNS:</label>
          <textarea value={exam.cns || ''} onChange={(e) => update('cns', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* RESP */}
        <div>
          <label className="block mb-1 text-xs font-semibold">RESP:</label>
          <textarea value={exam.resp || ''} onChange={(e) => update('resp', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[40px]" />
        </div>

        {/* GIT */}
        <div>
          <label className="block mb-1 text-xs font-semibold">GIT:</label>
          <textarea value={exam.git || ''} onChange={(e) => update('git', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
        </div>

        {/* ADV */}
        <div>
          <label className="block mb-1 text-xs font-semibold">ADV:</label>
          <textarea value={exam.adv || ''} onChange={(e) => update('adv', e.target.value)} className="w-full border border-slate-300 px-2 py-1 text-xs rounded min-h-[60px]" />
        </div>
      </div>
    </div>
  )
}
