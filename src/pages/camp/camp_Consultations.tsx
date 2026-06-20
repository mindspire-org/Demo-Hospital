import { useEffect, useState } from 'react'
import { campApi } from '../../features/camp/camp.api'
import { Search, Save, Stethoscope } from 'lucide-react'

export default function Camp_Consultations() {
  const [patients, setPatients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [q, setQ] = useState('')
  const [vitals, setVitals] = useState<any>({})
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [history, setHistory] = useState('')
  const [examination, setExamination] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [consultedBy, setConsultedBy] = useState('')

  const load = async () => {
    const res: any = await campApi.listPatients({ q })
    setPatients(res?.items || [])
  }

  useEffect(() => { load() }, [q])

  const selectPatient = (p: any) => {
    setSelected(p)
    setVitals(p.vitals || {})
    setChiefComplaint(p.chiefComplaint || '')
    setHistory(p.history || '')
    setExamination(p.examination || '')
    setDiagnosis(p.diagnosis || '')
    setPrescription(p.prescription || '')
    setConsultedBy(p.consultedBy || '')
  }

  const [error, setError] = useState('')

  const save = async () => {
    if (!selected) return
    setError('')
    try {
      await campApi.updatePatient(selected._id, {
        vitals,
        chiefComplaint,
        history,
        examination,
        diagnosis,
        prescription,
        consultedBy,
        consultationDate: new Date().toISOString(),
      })
      alert('Consultation saved')
      load()
    } catch (err: any) {
      setError(err?.message || 'Failed to save consultation')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="h-6 w-6 text-emerald-600" /> Consultations</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patients..." className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="max-h-[70vh] overflow-y-auto space-y-2">
            {patients.map(p => (
              <button key={p._id} onClick={() => selectPatient(p)} className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition ${selected?._id === p._id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                <div className="font-medium text-slate-800">{p.tokenNo} — {p.fullName}</div>
                <div className="text-xs text-slate-500">{p.age} / {p.gender} • {p.chiefComplaint || 'No complaint'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Consultation form */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {!selected ? (
            <div className="py-20 text-center text-slate-400">Select a patient to start consultation</div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-lg font-semibold text-slate-800">{selected.fullName}</div>
                  <div className="text-sm text-slate-500">Token: {selected.tokenNo} • {selected.age} / {selected.gender}</div>
                </div>
                <button onClick={save} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Save className="h-4 w-4" /> Save</button>
              </div>

              {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">{error}</div>}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Consulted By</label>
                <input value={consultedBy} onChange={e => setConsultedBy(e.target.value)} placeholder="Doctor name" className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['bp', 'pulse', 'temp', 'spo2', 'weight', 'height', 'bmi', 'rr'].map(key => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-slate-500 uppercase">{key}</label>
                    <input value={vitals[key] || ''} onChange={e => setVitals({ ...vitals, [key]: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Chief Complaint</label>
                <textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">History</label>
                <textarea value={history} onChange={e => setHistory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Examination</label>
                <textarea value={examination} onChange={e => setExamination(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis</label>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500" rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Prescription</label>
                <textarea value={prescription} onChange={e => setPrescription(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500 font-mono" rows={5} placeholder="Medicine | Dose | Frequency | Days" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
