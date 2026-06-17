import { useEffect, useState } from 'react'
import { hospitalApi, pharmacyApi, labApi, diagnosticApi } from '../../utils/api'
import PrescriptionMedication from '../../components/doctor/PrescriptionMedication'
import SuggestField from '../../components/SuggestField'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'
import DoctorCustomEntriesModal from '../../components/doctor/DoctorCustomEntriesModal'
import { Plus, Pencil, Trash2, Save, X, FileText } from 'lucide-react'

type DoctorSession = { id: string; name: string; username: string }

type Template = {
  _id: string
  doctorId: string
  name: string
  items?: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string; route?: string; instruction?: string }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  treatmentHistory?: string
  allergyHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  createdAt: string
}

export default function Doctor_PrescriptionTemplates() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    primaryComplaint: '',
    primaryComplaintHistory: '',
    familyHistory: '',
    allergyHistory: '',
    treatmentHistory: '',
    history: '',
    examFindings: '',
    diagnosis: '',
    advice: '',
    nextFollowUp: '',
    labTestsText: '',
    diagnosticTestsText: '',
    meds: [{ name: '', qty: '', route: '', instruction: '', notes: '', durationText: '', freqText: '' }] as Array<{ name: string; qty?: string; route?: string; instruction?: string; notes?: string; durationText?: string; freqText?: string }>,
  })
  const medsRef = useState<any>(null)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])
  const [diagnosticTestSuggestions, setDiagnosticTestSuggestions] = useState<string[]>([])
  const [customEntriesModalOpen, setCustomEntriesModalOpen] = useState(false)
  const [customEntriesCategory, setCustomEntriesCategory] = useState('primaryComplaint')
  const [doctorCustomSuggestions, setDoctorCustomSuggestions] = useState<{
    primaryComplaint: string[]
    history: string[]
    primaryComplaintHistory: string[]
    familyHistory: string[]
    allergyHistory: string[]
    treatmentHistory: string[]
    examFindings: string[]
    diagnosis: string[]
    advice: string[]
  }>({
    primaryComplaint: [],
    history: [],
    primaryComplaintHistory: [],
    familyHistory: [],
    allergyHistory: [],
    treatmentHistory: [],
    examFindings: [],
    diagnosis: [],
    advice: [],
  })

  // Default suggestions for medication fields
  const defaultDoses = ['1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg', '200 mg', '250 mg', '500 mg', '1 g', '1 ml', '2 ml', '5 ml', '10 ml', '1 tsp', '1 tbsp', '1 drop', '2 drops', '1 puff', '1 tablet', '2 tablets', '1 capsule', '1 sachet']
  const defaultRoutes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Sublingual', 'Rectal', 'Vaginal', 'Inhalation', 'Nasal', 'Ocular', 'Ear drops', 'Local application']
  const defaultInstructions = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Bed time', 'Morning', 'Night', 'Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'PRN', 'Stat', 'As directed']
  const defaultDurations = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '1 week', '2 weeks', '3 weeks', '4 weeks', '1 month', '2 months', '3 months', '6 months']
  const defaultFrequencies = ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times daily (QID)', 'Every morning', 'Every night', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'Stat', 'Alternate days', 'Weekly', 'Monthly']

  // Load doctor custom entries
  useEffect(() => {
    ;(async () => {
      try {
        if (!doc?.id) return
        const categories = ['primaryComplaint', 'history', 'primaryComplaintHistory', 'familyHistory', 'allergyHistory', 'treatmentHistory', 'examFindings', 'diagnosis', 'advice']
        const custom: any = {
          primaryComplaint: [],
          history: [],
          primaryComplaintHistory: [],
          familyHistory: [],
          allergyHistory: [],
          treatmentHistory: [],
          examFindings: [],
          diagnosis: [],
          advice: [],
        }
        for (const cat of categories) {
          try {
            const res = await hospitalApi.getDoctorCustomEntriesByCategory(doc.id, cat)
            custom[cat] = res?.entryTexts || []
          } catch {}
        }
        setDoctorCustomSuggestions(custom)
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      const hex24 = /^[a-f\d]{24}$/i
      if (sess && !hex24.test(String(sess.id || ''))) {
        ;(async () => {
          try {
            const res = await hospitalApi.listDoctors() as any
            const docs: any[] = res?.doctors || []
            const match = docs.find(d => String(d.username || '').toLowerCase() === String(sess.username || '').toLowerCase()) ||
              docs.find(d => String(d.name || '').toLowerCase() === String(sess.name || '').toLowerCase())
            if (match) {
              const fixed = { ...sess, id: String(match._id || match.id) }
              try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch { }
              setDoc(fixed)
            }
          } catch { }
        })()
      }
    } catch { }
  }, [])

  useEffect(() => {
    if (doc?.id) loadTemplates()
  }, [doc?.id, page, limit])

  // Fetch medicine names from pharmacy inventory
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await pharmacyApi.getAllMedicines()
        const meds: any[] = res?.medicines ?? res?.items ?? res ?? []
        const names = meds.map((m: any) => String(m?.name || m?.genericName || m || '').trim()).filter(Boolean)
        if (!cancelled) setMedNameSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Fetch lab tests from lab module
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await labApi.listTests({ q: '', page: 1, limit: 2000 })
        const tests: any[] = res?.tests ?? res?.items ?? res ?? []
        const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
        if (!cancelled) setLabTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Fetch diagnostic tests from diagnostic module
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await diagnosticApi.listTests({ q: '', page: 1, limit: 2000 })
        const tests: any[] = res?.tests ?? res?.items ?? res ?? []
        const names = tests.map((t: any) => String(t?.name || t?.testName || t || '').trim()).filter(Boolean)
        if (!cancelled) setDiagnosticTestSuggestions(Array.from(new Set(names)).slice(0, 2000))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  async function loadTemplates() {
    if (!doc?.id) return
    setLoading(true)
    try {
      const res = await hospitalApi.listPrescriptionTemplates({ doctorId: doc.id, page, limit }) as any
      setTemplates(res?.templates || [])
      setTotal(res?.total || 0)
    } catch {
      setTemplates([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      primaryComplaint: '',
      primaryComplaintHistory: '',
      familyHistory: '',
      allergyHistory: '',
      treatmentHistory: '',
      history: '',
      examFindings: '',
      diagnosis: '',
      advice: '',
      labTestsText: '',
      diagnosticTestsText: '',
      meds: [{ name: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }],
    })
    setEditingId(null)
    setShowForm(false)
  }

  function editTemplate(t: Template) {
    setForm({
      name: t.name || '',
      primaryComplaint: t.primaryComplaint || '',
      primaryComplaintHistory: t.primaryComplaintHistory || '',
      familyHistory: t.familyHistory || '',
      allergyHistory: t.allergyHistory || '',
      treatmentHistory: t.treatmentHistory || '',
      history: t.history || '',
      examFindings: t.examFindings || '',
      diagnosis: t.diagnosis || '',
      advice: t.advice || '',
      nextFollowUp: (t as any).nextFollowUp || '',
      labTestsText: (t.labTests || []).join(', '),
      diagnosticTestsText: (t.diagnosticTests || []).join(', '),
      meds: Array.isArray(t.items) && t.items.length ? t.items.map((it: any) => ({
        name: it.name,
        qty: it.dose || '',
        route: it.route || '',
        instruction: it.instruction || '',
        notes: it.notes || '',
        durationText: it.duration || '',
        freqText: it.frequency || '',
      })) : [{ name: '', qty: '', route: '', instruction: '', notes: '', durationText: '', freqText: '' }],
    })
    setEditingId(t._id)
    setShowForm(true)
  }

  async function saveTemplate() {
    if (!doc?.id) return
    if (!form.name.trim()) {
      setToast({ type: 'error', message: 'Template name is required' })
      return
    }

    const items = form.meds
      .filter(m => m.name.trim())
      .map(m => ({
        name: m.name.trim(),
        dose: m.qty?.trim() || undefined,
        frequency: m.freqText?.trim() || undefined,
        duration: m.durationText?.trim() || undefined,
        route: m.route?.trim() || undefined,
        instruction: m.instruction?.trim() || undefined,
        notes: m.notes?.trim() || undefined,
      }))

    const labTests = form.labTestsText.split(/\n|,/).map(s => s.trim()).filter(Boolean)
    const diagnosticTests = form.diagnosticTestsText.split(/\n|,/).map(s => s.trim()).filter(Boolean)

    const data: any = {
      doctorId: doc.id,
      name: form.name.trim(),
      items,
      labTests: labTests.length ? labTests : undefined,
      diagnosticTests: diagnosticTests.length ? diagnosticTests : undefined,
      primaryComplaint: form.primaryComplaint || undefined,
      primaryComplaintHistory: form.primaryComplaintHistory || undefined,
      familyHistory: form.familyHistory || undefined,
      treatmentHistory: form.treatmentHistory || undefined,
      allergyHistory: form.allergyHistory || undefined,
      history: form.history || undefined,
      examFindings: form.examFindings || undefined,
      diagnosis: form.diagnosis || undefined,
      advice: form.advice || undefined,
      nextFollowUp: form.nextFollowUp || undefined,
    }

    try {
      if (editingId) {
        await hospitalApi.updatePrescriptionTemplate(editingId, data)
        setToast({ type: 'success', message: 'Template updated' })
      } else {
        await hospitalApi.createPrescriptionTemplate(data)
        setToast({ type: 'success', message: 'Template created' })
      }
      resetForm()
      loadTemplates()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save template' })
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    try {
      await hospitalApi.deletePrescriptionTemplate(id)
      setToast({ type: 'success', message: 'Template deleted' })
      loadTemplates()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to delete template' })
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Prescription Templates</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="mt-4 text-center text-slate-500">Loading...</div>
      ) : showForm ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Template Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Fever, Cold, Diabetes Follow-up"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Primary Complaint</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('primaryComplaint'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.primaryComplaint}
                  onChange={v => setForm(f => ({ ...f, primaryComplaint: v }))}
                  suggestions={doctorCustomSuggestions.primaryComplaint}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">History of Primary Complaint</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('primaryComplaintHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.primaryComplaintHistory}
                  onChange={v => setForm(f => ({ ...f, primaryComplaintHistory: v }))}
                  suggestions={doctorCustomSuggestions.primaryComplaintHistory}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Risk Factors / Medical History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('history'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.history}
                  onChange={v => setForm(f => ({ ...f, history: v }))}
                  suggestions={doctorCustomSuggestions.history}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Family History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('familyHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.familyHistory}
                  onChange={v => setForm(f => ({ ...f, familyHistory: v }))}
                  suggestions={doctorCustomSuggestions.familyHistory}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Allergy History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('allergyHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.allergyHistory}
                  onChange={v => setForm(f => ({ ...f, allergyHistory: v }))}
                  suggestions={doctorCustomSuggestions.allergyHistory}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Treatment History</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('treatmentHistory'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.treatmentHistory}
                  onChange={v => setForm(f => ({ ...f, treatmentHistory: v }))}
                  suggestions={doctorCustomSuggestions.treatmentHistory}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Examination Findings</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('examFindings'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.examFindings}
                  onChange={v => setForm(f => ({ ...f, examFindings: v }))}
                  suggestions={doctorCustomSuggestions.examFindings}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Diagnosis / Disease</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('diagnosis'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  as="input"
                  value={form.diagnosis}
                  onChange={v => setForm(f => ({ ...f, diagnosis: v }))}
                  suggestions={doctorCustomSuggestions.diagnosis}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Advice/Referral</label>
                  <button
                    type="button"
                    onClick={() => { setCustomEntriesCategory('advice'); setCustomEntriesModalOpen(true) }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Manage custom entries"
                  >
                    ✏️ Manage
                  </button>
                </div>
                <SuggestField
                  rows={2}
                  value={form.advice}
                  onChange={v => setForm(f => ({ ...f, advice: v }))}
                  suggestions={doctorCustomSuggestions.advice}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Next Follow Up</label>
                <SuggestField
                  as="input"
                  value={form.nextFollowUp}
                  onChange={v => setForm(f => ({ ...f, nextFollowUp: v }))}
                  suggestions={['After 3 days', 'After 1 week', 'After 2 weeks', 'After 1 month', 'SOS']}
                  placeholder="e.g. After 1 week"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lab Tests (one per line)</label>
                <SuggestField
                  mode="lab-tests"
                  rows={2}
                  value={form.labTestsText}
                  onChange={v => setForm(f => ({ ...f, labTestsText: v }))}
                  suggestions={labTestSuggestions}
                  placeholder="CBC, LFT, RFT"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Diagnostic Tests (one per line)</label>
                <SuggestField
                  mode="lab-tests"
                  rows={2}
                  value={form.diagnosticTestsText}
                  onChange={v => setForm(f => ({ ...f, diagnosticTestsText: v }))}
                  suggestions={diagnosticTestSuggestions}
                  placeholder="Ultrasound, X-Ray"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medications</label>
              <PrescriptionMedication
                ref={medsRef[0]}
                initialMedicines={form.meds}
                onChange={(meds) => setForm(f => ({ ...f, meds }))}
                suggestions={{
                  medName: medNameSuggestions,
                  dose: defaultDoses,
                  route: defaultRoutes,
                  instruction: defaultInstructions,
                  duration: defaultDurations,
                  frequency: defaultFrequencies,
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTemplate}
                className="flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                <Save className="h-4 w-4" />
                Save Template
              </button>
            </div>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No templates yet. Create your first template to speed up prescriptions.</p>
        </div>
      ) : (
        <>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{t.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => editTemplate(t)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-sky-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t._id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {(t.items?.length || 0) > 0 && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">{t.items?.length || 0}</span> medication{(t.items?.length || 0) !== 1 ? 's' : ''}
                </div>
              )}
              {t.diagnosis && (
                <div className="mt-1 text-sm text-slate-500">
                  Dx: {t.diagnosis}
                </div>
              )}
              {(t.labTests?.length || 0) > 0 && (
                <div className="mt-1 text-xs text-slate-400">
                  Labs: {t.labTests?.slice(0, 3).join(', ')}{(t.labTests?.length || 0) > 3 ? '...' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              Page <span className="font-medium">{page}</span> / {totalPages}
            </span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
      {customEntriesModalOpen && (
        <DoctorCustomEntriesModal
          isOpen={customEntriesModalOpen}
          onClose={() => setCustomEntriesModalOpen(false)}
          doctorId={doc?.id || ''}
          onSelectEntry={(entryText) => {
            setForm(f => ({ ...f, [customEntriesCategory]: entryText }))
          }}
          initialCategory={customEntriesCategory}
        />
      )}
    </div>
  )
}
