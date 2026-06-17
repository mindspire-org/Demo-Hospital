import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi, ipdApi } from '../../../../utils/api'
import ConfirmDialog from '../../../common/ConfirmDialog'

type RecordItem = { id: string; createdAt?: string; parsed?: any }

export default function Hospital_IpdSurgicalSafetyTimeOut({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecordItem[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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
      const res = (await ipdApi.listIpdSurgicalSafety(encounterId, { limit: 200 })) as any
      const rows = (res?.surgicalSafetyRecords || []) as any[]

      const filtered: RecordItem[] = rows
        .filter((n: any) => n?.timeOut?.timeOutCompletedAt) // Only show completed Time Out records
        .map((n: any) => ({
          id: String(n?._id || n?.id || Math.random()),
          createdAt: n?.timeOut?.timeOutCompletedAt || n?.createdAt,
          parsed: n?.timeOut || null,
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
      await ipdApi.createIpdSurgicalSafety(encounterId, {
        timeOut: {
          teamMembersIntroduced: form.teamIntroduced,
          surgeonName: form.doctorName,
          anesthesiologistName: form.doctorName,
          scrubNurseName: form.doctorName,
          procedureConfirmed: form.confirmProcedure,
          correctSiteConfirmed: form.confirmSite,
          correctPatientConfirmed: form.confirmPatient,
          correctProcedureConfirmed: form.confirmProcedure,
          criticalStepsDiscussed: form.criticalEventsSurgeon || form.criticalEventsAnaesthesia || form.criticalEventsNursing ? 'Yes' : undefined,
          criticalEventsSurgeon: form.criticalEventsSurgeon,
          criticalEventsAnaesthesia: form.criticalEventsAnaesthesia,
          criticalEventsNursing: form.criticalEventsNursing,
          expectedDuration: '',
          anticipatedProblems: form.criticalEventsAnaesthesia,
          antibioticGiven: form.antibioticProphylaxis === 'YES',
          antibioticName: form.antibioticProphylaxis === 'YES' ? 'Prophylaxis' : undefined,
          antibioticGivenAt: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          dvtProphylaxis: false,
          dvtProphylaxisType: '',
          imagingDisplayed: form.imagingDisplayed,
          timeOutCompletedAt: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          timeOutCompletedBy: form.doctorName,
        },
        surgeonSignature: form.signature,
        status: 'time-out-complete',
      })
      setOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function update(form: any) {
    if (!editingId) return
    setLoading(true)
    setError(null)
    try {
      await ipdApi.updateIpdSurgicalSafety(editingId, {
        timeOut: {
          teamMembersIntroduced: form.teamIntroduced,
          surgeonName: form.doctorName,
          anesthesiaProfessionalName: form.anesthesiologistName,
          nurseName: form.nurseName,
          patientConfirmed: form.confirmIdentity && form.confirmSite && form.confirmProcedure && form.confirmConsent,
          siteMarked: true,
          surgicalSiteConfirmed: form.siteMarked === 'YES',
          anesthesiaSafetyCheckCompleted: true,
          pulseOximeterOn: true,
          antibioticProphylaxisGiven: form.antibioticProphylaxis === 'YES',
          anticipatedCriticalEvents: {
            surgeonReviews: {
              steps: form.surgeonReviewsSteps,
              duration: form.surgeonReviewsDuration,
              bloodLoss: form.surgeonReviewsBloodLoss,
            },
            anesthesiaReviews: {
              concerns: form.anesthesiaReviewsConcerns,
            },
            nursingReviews: {
              sterilityConfirmed: form.nursingReviewsSterility,
              equipmentIssues: form.nursingReviewsEquipment,
            },
          },
          imagingDisplayed: form.imagingDisplayed === 'YES',
          timeOutCompletedAt: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          timeOutCompletedBy: form.doctorName,
        },
        status: 'time-out-complete',
      })
      setEditingId(null); setEditingData(null); setOpen(false); await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const remove = (id: string) => { setDeleteId(id); setDeleteConfirmOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      await ipdApi.deleteIpdSurgicalSafety(deleteId)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    } finally {
      setLoading(false)
      setDeleteId(null)
    }
  }

  const startEdit = (it: RecordItem) => {
    setEditingId(it.id)
    setEditingData(it.parsed)
    setOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Surgical Safety Checklist - Time Out</div>
            <div className="mt-1 text-sm text-slate-600">Before skin incision</div>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Add Form</button>
        </div>

        {error && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {!loading && sorted.length === 0 && <div className="text-sm text-slate-600">No records yet.</div>}

          {sorted.map((it) => (
            <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Record</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(it)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                    <button onClick={() => remove(it.id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>

              {it.parsed ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Team members introduced" value={it.parsed?.teamMembersIntroduced ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: patient" value={it.parsed?.correctPatientConfirmed ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: site" value={it.parsed?.correctSiteConfirmed ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: procedure" value={it.parsed?.correctProcedureConfirmed ? 'Yes' : 'No'} />
                  <Field label="Anticipated critical events (surgeon)" value={it.parsed?.criticalStepsDiscussed || '-'} />
                  <Field label="Anticipated critical events (anaesthesia)" value={it.parsed?.anticipatedProblems || '-'} />
                  <Field label="Anticipated critical events (nursing)" value={it.parsed?.scrubNurseName || '-'} />
                  <Field label="Antibiotic prophylaxis within 60 min" value={it.parsed?.antibioticGiven ? 'Yes' : 'No'} />
                  <Field label="Essential imaging displayed" value={it.parsed?.imagingDisplayed || '-'} />
                  <Field label="Doctor Name" value={it.parsed?.timeOutCompletedBy} />
                  <Field label="Date" value={it.parsed?.timeOutCompletedAt?.slice(0, 10)} />
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">Invalid record data.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <TimeOutDialog key={editingId || 'add'} open={open} onClose={() => { setOpen(false); setEditingId(null); setEditingData(null) }} onSave={editingId ? update : save} initial={editingData} />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Record"
        message="Are you sure you want to delete this surgical safety record?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
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

function TimeOutDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const [form, setForm] = useState({
    teamIntroduced: false,
    confirmPatient: false,
    confirmSite: false,
    confirmProcedure: false,
    confirmConsent: false,
    siteMarked: 'YES' as 'YES' | 'NO',
    antibioticProphylaxis: 'YES' as 'YES' | 'NO' | 'NOT_APPLICABLE',
    criticalEventsSurgeon: '',
    criticalEventsAnaesthesia: '',
    criticalEventsNursing: '',
    imagingDisplayed: 'YES' as 'YES' | 'NO' | 'NOT_APPLICABLE',
    doctorName: '',
    signature: '',
    date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          teamIntroduced: !!initial.teamMembersIntroduced,
          confirmPatient: !!initial.correctPatientConfirmed,
          confirmSite: !!initial.correctSiteConfirmed,
          confirmProcedure: !!initial.correctProcedureConfirmed,
          confirmConsent: !!initial.correctProcedureConfirmed,
          siteMarked: initial.surgicalSiteConfirmed ? 'YES' : 'NO',
          antibioticProphylaxis: initial.antibioticProphylaxisGiven ? 'YES' : 'NO',
          criticalEventsSurgeon: initial.criticalStepsDiscussed || '',
          criticalEventsAnaesthesia: initial.anticipatedProblems || '',
          criticalEventsNursing: initial.nursingSterilityEquipmentDiscussed || '',
          imagingDisplayed: initial.imagingDisplayed ? 'YES' : 'NO',
          doctorName: initial.surgeonName || '',
          signature: '',
          date: initial.timeOutCompletedAt ? initial.timeOutCompletedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        })
      } else {
        setForm({
          teamIntroduced: false,
          confirmPatient: false,
          confirmSite: false,
          confirmProcedure: false,
          confirmConsent: false,
          siteMarked: 'YES' as 'YES' | 'NO',
          antibioticProphylaxis: 'YES' as 'YES' | 'NO' | 'NOT_APPLICABLE',
          criticalEventsSurgeon: '',
          criticalEventsAnaesthesia: '',
          criticalEventsNursing: '',
          imagingDisplayed: 'YES' as 'YES' | 'NO' | 'NOT_APPLICABLE',
          doctorName: '',
          signature: '',
          date: new Date().toISOString().slice(0, 10),
        })
      }
    }
  }, [open, initial])
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
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{initial ? 'Edit Time Out' : 'Time Out'}</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Before skin incision</div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <Checkbox label="Confirm all team members have introduced themselves by name and role" checked={form.teamIntroduced} onChange={(v) => setForm({ ...form, teamIntroduced: v })} />
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Surgeon, anaesthesia professional and nurse verbally confirm</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
              <Checkbox label="Patient" checked={form.confirmPatient} onChange={(v) => setForm({ ...form, confirmPatient: v })} />
              <Checkbox label="Site" checked={form.confirmSite} onChange={(v) => setForm({ ...form, confirmSite: v })} />
              <Checkbox label="Procedure" checked={form.confirmProcedure} onChange={(v) => setForm({ ...form, confirmProcedure: v })} />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Anticipated critical events</div>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <Textarea label="Surgeon review" value={form.criticalEventsSurgeon} onChange={(v) => setForm({ ...form, criticalEventsSurgeon: v })} />
              <Textarea label="Anaesthesia team review" value={form.criticalEventsAnaesthesia} onChange={(v) => setForm({ ...form, criticalEventsAnaesthesia: v })} />
              <Textarea label="Nursing team review" value={form.criticalEventsNursing} onChange={(v) => setForm({ ...form, criticalEventsNursing: v })} />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Has antibiotic prophylaxis been given within the last 60 minutes?</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <Radio label="Yes" checked={form.antibioticProphylaxis === 'YES'} onChange={() => setForm({ ...form, antibioticProphylaxis: 'YES' })} />
              <Radio label="No" checked={form.antibioticProphylaxis === 'NO'} onChange={() => setForm({ ...form, antibioticProphylaxis: 'NO' })} />
              <Radio
                label="Not applicable"
                checked={form.antibioticProphylaxis === 'NOT_APPLICABLE'}
                onChange={() => setForm({ ...form, antibioticProphylaxis: 'NOT_APPLICABLE' })}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Is essential imaging displayed?</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <Radio label="Yes" checked={form.imagingDisplayed === 'YES'} onChange={() => setForm({ ...form, imagingDisplayed: 'YES' })} />
              <Radio label="No" checked={form.imagingDisplayed === 'NO'} onChange={() => setForm({ ...form, imagingDisplayed: 'NO' })} />
              <Radio
                label="Not applicable"
                checked={form.imagingDisplayed === 'NOT_APPLICABLE'}
                onChange={() => setForm({ ...form, imagingDisplayed: 'NOT_APPLICABLE' })}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div ref={dropdownRef} className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.doctorName || doctorSearch}
                onChange={(e) => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); setForm({ ...form, doctorName: '' }); }}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder="Search doctor..."
              />
              {showDoctorDropdown && filteredDoctors.length > 0 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                  {filteredDoctors.map(d => (
                    <div
                      key={d._id}
                      onClick={() => { setForm({ ...form, doctorName: d.name }); setDoctorSearch(d.name); setShowDoctorDropdown(false); }}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                    >
                      {d.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input label="Signature" value={form.signature} onChange={(v) => setForm({ ...form, signature: v })} />
            <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">Save</button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-800">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-800">
      <input type="radio" className="h-4 w-4" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
