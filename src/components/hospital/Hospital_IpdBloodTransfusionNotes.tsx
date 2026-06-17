import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, ipdApi } from '../../utils/api'

type RecordItem = {
  id: string
  createdAt?: string
  noteType?: string
  text?: string
  parsed?: any
}

export default function Hospital_IpdBloodTransfusionNotes({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecordItem[]>([])
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })
  }, [items])

  useEffect(() => {
    if (encounterId) void reload()
  }, [encounterId])

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = (await ipdApi.listIpdBloodTransfusions(encounterId, { limit: 200 })) as any
      const rows = (res?.bloodTransfusions || []) as any[]

      const filtered: RecordItem[] = rows.map((n: any) => ({
        id: String(n?._id || n?.id || Math.random()),
        createdAt: n?.transfusionDate || n?.createdAt,
        noteType: 'blood-transfusion',
        text: '',
        parsed: {
          bloodGroup: n?.bloodProduct?.bloodGroup || '',
          date: n?.transfusionDate || '',
          donorName: n?.bloodProduct?.donorId || '',
          labNo: n?.bloodProduct?.batchNumber || '',
          issueDateTime: n?.issueDateTime || '',
          screeningResults: n?.screeningResults || '',
          prePulse: String(n?.preTransfusionVitals?.hr || ''),
          preBP: n?.preTransfusionVitals?.bp || '',
          preTemp: String(n?.preTransfusionVitals?.temp || ''),
          preRespRate: String(n?.preTransfusionVitals?.rr || ''),
          preChest: n?.preTransfusionVitals?.chest || '',
          crossMatchSalinePhase: n?.bloodProduct?.crossMatchResult || '',
          crossMatchAlbuminPhase: n?.bloodProduct?.crossMatchAlbuminPhase || '',
          receivedInWard: n?.receivedInWard || '',
          transfusionStartedAt: n?.startTime || '',
          postPulse: String(n?.postTransfusionVitals?.hr || ''),
          postBP: n?.postTransfusionVitals?.bp || '',
          postTemp: String(n?.postTransfusionVitals?.temp || ''),
          postRespRate: String(n?.postTransfusionVitals?.rr || ''),
          postChest: n?.postTransfusionVitals?.chest || '',
          transfusionCompletedAt: n?.endTime || '',
          adverseReaction: n?.reactionOccurred ? n?.reactionType : '',
          medications: n?.notes || '',
          doctorStamp: n?.orderedByDoctorName || '',
          cnicNumber: n?.cnicNumber || '',
          signatureThumb: n?.signatureThumb || '',
        },
      }))

      setItems(filtered)
    } catch (e: any) {
      setError(e?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function save(form: any) {
    setLoading(true)
    setError(null)
    try {
      await ipdApi.createIpdBloodTransfusion(encounterId, {
        indication: form.adverseReaction || 'Blood transfusion',
        issueDateTime: form.issueDateTime || undefined,
        screeningResults: form.screeningResults || undefined,
        preTransfusionVitals: {
          bp: form.preBP || undefined,
          hr: form.prePulse || undefined,
          temp: form.preTemp || undefined,
          rr: form.preRespRate || undefined,
          spo2: undefined,
          chest: form.preChest || undefined,
        },
        bloodProduct: {
          type: 'PRBC',
          bloodGroup: form.bloodGroup,
          batchNumber: form.labNo,
          donorId: form.donorName,
          crossMatchResult: form.crossMatchSalinePhase === 'Compatible' ? 'compatible' : 'pending',
          crossMatchAlbuminPhase: form.crossMatchAlbuminPhase || undefined,
        },
        transfusionDate: form.date || new Date().toISOString().slice(0, 10),
        startTime: form.transfusionStartedAt || undefined,
        endTime: form.transfusionCompletedAt || undefined,
        receivedInWard: form.receivedInWard || undefined,
        reactionOccurred: !!(form.adverseReaction && form.adverseReaction.trim()),
        reactionType: form.adverseReaction || undefined,
        postTransfusionVitals: {
          bp: form.postBP || undefined,
          hr: form.postPulse || undefined,
          temp: form.postTemp || undefined,
          rr: form.postRespRate || undefined,
          chest: form.postChest || undefined,
        },
        orderedByDoctorName: form.doctorStamp || undefined,
        cnicNumber: form.cnicNumber || undefined,
        signatureThumb: form.signatureThumb || undefined,
        notes: form.medications || undefined,
        status: 'completed',
      })
      setOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Blood Transfusion Notes</div>
            <div className="mt-1 text-sm text-slate-600">Before and during transfusion notes + checklist</div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Add Form
          </button>
        </div>

        {error && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {!loading && sorted.length === 0 && <div className="text-sm text-slate-600">No records yet.</div>}

          {sorted.map((it) => (
            <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Record</div>
                <div className="text-xs text-slate-500">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</div>
              </div>

              {it.parsed ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Blood Group" value={it.parsed?.bloodGroup} />
                  <Field label="Date" value={it.parsed?.date} />
                  <Field label="Donor Name" value={it.parsed?.donorName} />
                  <Field label="Lab No" value={it.parsed?.labNo} />
                  <Field label="Issue Date/Time" value={it.parsed?.issueDateTime} />
                  <Field label="Screening Results" value={it.parsed?.screeningResults} />
                  <Field label="Blood Cross Match Saline Phase" value={it.parsed?.crossMatchSalinePhase} />
                  <Field label="Blood Cross Match Albumin Phase" value={it.parsed?.crossMatchAlbuminPhase} />

                  <Field label="Pre Vitals - Pulse" value={it.parsed?.prePulse} />
                  <Field label="Pre Vitals - BP" value={it.parsed?.preBP} />
                  <Field label="Pre Vitals - Temp" value={it.parsed?.preTemp} />
                  <Field label="Pre Vitals - Resp Rate" value={it.parsed?.preRespRate} />
                  <Field label="Pre Vitals - Chest" value={it.parsed?.preChest} />

                  <Field label="Received In Ward (Date/Time)" value={it.parsed?.receivedInWard} />
                  <Field label="Transfusion Started At (Date/Time)" value={it.parsed?.transfusionStartedAt} />

                  <Field label="Post Vitals - Pulse" value={it.parsed?.postPulse} />
                  <Field label="Post Vitals - BP" value={it.parsed?.postBP} />
                  <Field label="Post Vitals - Temp" value={it.parsed?.postTemp} />
                  <Field label="Post Vitals - Resp Rate" value={it.parsed?.postRespRate} />
                  <Field label="Post Vitals - Chest" value={it.parsed?.postChest} />

                  <Field label="Transfusion Completed At (Date/Time)" value={it.parsed?.transfusionCompletedAt} />
                  <Field label="Any Adverse Reaction" value={it.parsed?.adverseReaction} />
                  <Field label="Medications Given" value={it.parsed?.medications} />
                  <Field label="Name/Relative/Signature/Stamp/Doctor" value={it.parsed?.doctorStamp} />
                  <Field label="CNIC Number" value={it.parsed?.cnicNumber} />
                  <Field label="Signature/Thumb Impression" value={it.parsed?.signatureThumb} />
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">Invalid record data.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BloodTransfusionNotesDialog open={open} onClose={() => setOpen(false)} onSave={save} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value || '-'}</div>
    </div>
  )
}

function BloodTransfusionNotesDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({
    bloodGroup: '',
    date: new Date().toISOString().slice(0, 10),
    donorName: '',
    labNo: '',
    issueDateTime: new Date().toISOString().slice(0, 16),
    screeningResults: '',
    prePulse: '',
    preBP: '',
    preTemp: '',
    preRespRate: '',
    preChest: '',
    crossMatchSalinePhase: '',
    crossMatchAlbuminPhase: '',
    receivedInWard: '',
    transfusionStartedAt: '',
    postPulse: '',
    postBP: '',
    postTemp: '',
    postRespRate: '',
    postChest: '',
    transfusionCompletedAt: '',
    adverseReaction: '',
    medications: '',
    doctorStamp: '',
    cnicNumber: '',
    signatureThumb: '',
  })
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const filteredDoctors = doctors.filter(d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()))

  useEffect(() => {
    if (open) {
      setDoctorSearch('')
      setShowDoctorDropdown(false)
      ;(async () => {
        try {
          const res = await hospitalApi.listDoctors() as any
          const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>
          setDoctors(items)
        } catch {
          setDoctors([])
        }
      })()
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Blood Transfusion Notes</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold">Before and during TRANSFUSION please ensure the following:</div>
          <div className="mt-2 space-y-1 text-xs">
            <div>1. Start infusion within 30 minutes of issuance from the blood bank and complete it within 4 hours (or less in hot weather).</div>
            <div>2. Do not add any medicine or infusion solution other than normal saline to any blood/blood component.</div>
            <div>3. Use a separate IV line if an intravenous fluid other than normal saline or a medicine has to be given at the same time as for blood or blood components.</div>
            <div>4. Encourage the patient to notify a Nurse or Doctor immediately if he/she becomes aware of any reaction such as shivering, flushing, pain or shortness of breath etc.</div>
            <div>5. Ensure that the patient is in a setting where he or she can be directly observed.</div>
            <div>6. All unused blood products should be returned to the blood bank immediately so that their reuse or safe disposal can be ensured.</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input label="Blood Group" value={form.bloodGroup} onChange={(v) => setForm({ ...form, bloodGroup: v })} />
          <Input label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
          <Input label="Donor Name" value={form.donorName} onChange={(v) => setForm({ ...form, donorName: v })} />
          <Input label="Lab No" value={form.labNo} onChange={(v) => setForm({ ...form, labNo: v })} />
          <Input label="Issue Date/Time" value={form.issueDateTime} onChange={(v) => setForm({ ...form, issueDateTime: v })} type="datetime-local" />
          <Input label="Screening Results" value={form.screeningResults} onChange={(v) => setForm({ ...form, screeningResults: v })} />

          <Input label="Pre-transfusion Vitals: Pulse" value={form.prePulse} onChange={(v) => setForm({ ...form, prePulse: v })} />
          <Input label="Pre-transfusion Vitals: BP" value={form.preBP} onChange={(v) => setForm({ ...form, preBP: v })} />
          <Input label="Pre-transfusion Vitals: Temp" value={form.preTemp} onChange={(v) => setForm({ ...form, preTemp: v })} />
          <Input label="Pre-transfusion Vitals: Resp. Rate" value={form.preRespRate} onChange={(v) => setForm({ ...form, preRespRate: v })} />
          <Input label="Pre-transfusion Vitals: Chest" value={form.preChest} onChange={(v) => setForm({ ...form, preChest: v })} />

          <Input label="Blood Cross Match Saline Phase" value={form.crossMatchSalinePhase} onChange={(v) => setForm({ ...form, crossMatchSalinePhase: v })} />
          <Input label="Blood Cross Match Albumin Phase" value={form.crossMatchAlbuminPhase} onChange={(v) => setForm({ ...form, crossMatchAlbuminPhase: v })} />
          <Input label="Received In Ward (Date/Time AM/PM)" value={form.receivedInWard} onChange={(v) => setForm({ ...form, receivedInWard: v })} />
          <Input label="Transfusion Started At (Date/Time AM/PM)" value={form.transfusionStartedAt} onChange={(v) => setForm({ ...form, transfusionStartedAt: v })} />

          <Input label="Post-transfusion Vitals: Pulse" value={form.postPulse} onChange={(v) => setForm({ ...form, postPulse: v })} />
          <Input label="Post-transfusion Vitals: BP" value={form.postBP} onChange={(v) => setForm({ ...form, postBP: v })} />
          <Input label="Post-transfusion Vitals: Temp" value={form.postTemp} onChange={(v) => setForm({ ...form, postTemp: v })} />
          <Input label="Post-transfusion Vitals: Resp. Rate" value={form.postRespRate} onChange={(v) => setForm({ ...form, postRespRate: v })} />
          <Input label="Post-transfusion Vitals: Chest" value={form.postChest} onChange={(v) => setForm({ ...form, postChest: v })} />
          <Input label="Transfusion Completed At (Date/Time AM/PM)" value={form.transfusionCompletedAt} onChange={(v) => setForm({ ...form, transfusionCompletedAt: v })} />
          <Input label="Any Adverse Reaction" value={form.adverseReaction} onChange={(v) => setForm({ ...form, adverseReaction: v })} />

          <div className="col-span-2">
            <Textarea label="Any Medications given during transfusion" value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} />
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-slate-700">Ordering Doctor</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.doctorStamp || doctorSearch}
              onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setForm({ ...form, doctorStamp: '' }); }}
              onFocus={() => setShowDoctorDropdown(true)}
              placeholder="Search doctor..."
            />
            {showDoctorDropdown && filteredDoctors.length > 0 && (
              <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                {filteredDoctors.map(d => (
                  <div
                    key={d._id}
                    onClick={() => { setForm({ ...form, doctorStamp: d.name }); setDoctorSearch(d.name); setShowDoctorDropdown(false); }}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    {d.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input label="CNIC Number" value={form.cnicNumber} onChange={(v) => setForm({ ...form, cnicNumber: v })} />
          <Input label="Signature/Thumb Impression" value={form.signatureThumb} onChange={(v) => setForm({ ...form, signatureThumb: v })} />
        </div>

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

function Input({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
