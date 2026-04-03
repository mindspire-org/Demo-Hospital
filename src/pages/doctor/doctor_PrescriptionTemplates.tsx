import { useEffect, useMemo, useState } from 'react'
import { hospitalApi, pharmacyApi, labApi } from '../../utils/api'
import PrescriptionMedication from '../../components/doctor/PrescriptionMedication'
import SuggestField from '../../components/SuggestField'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'
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
    labTestsText: '',
    diagnosticTestsText: '',
    meds: [{ name: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }] as Array<{ name: string; qty?: string; route?: string; instruction?: string; durationText?: string; freqText?: string }>,
  })
  const medsRef = useState<any>(null)
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])

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
  }, [doc?.id])

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

  async function loadTemplates() {
    if (!doc?.id) return
    setLoading(true)
    try {
      const res = await hospitalApi.getPrescriptionTemplatesByDoctor(doc.id) as any
      setTemplates(res?.templates || [])
    } catch {
      setTemplates([])
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
      labTestsText: (t.labTests || []).join('\n'),
      diagnosticTestsText: (t.diagnosticTests || []).join('\n'),
      meds: (t.items || []).map(it => ({
        name: it.name,
        qty: it.dose || '',
        route: it.route || '',
        instruction: it.instruction || '',
        durationText: it.duration || '',
        freqText: it.frequency || '',
      })).length ? (t.items || []).map(it => ({
        name: it.name,
        qty: it.dose || '',
        route: it.route || '',
        instruction: it.instruction || '',
        durationText: it.duration || '',
        freqText: it.frequency || '',
      })) : [{ name: '', qty: '', route: '', instruction: '', durationText: '', freqText: '' }],
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

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.doctorId === doc?.id)
  }, [templates, doc?.id])

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
                <label className="mb-1 block text-sm font-medium text-slate-700">Primary Complaint</label>
                <textarea
                  value={form.primaryComplaint}
                  onChange={e => setForm(f => ({ ...f, primaryComplaint: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">History of Primary Complaint</label>
                <textarea
                  value={form.primaryComplaintHistory}
                  onChange={e => setForm(f => ({ ...f, primaryComplaintHistory: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Risk Factors / Medical History</label>
                <textarea
                  value={form.history}
                  onChange={e => setForm(f => ({ ...f, history: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis</label>
                <textarea
                  value={form.diagnosis}
                  onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Family History</label>
                <textarea
                  value={form.familyHistory}
                  onChange={e => setForm(f => ({ ...f, familyHistory: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Allergy History</label>
                <textarea
                  value={form.allergyHistory}
                  onChange={e => setForm(f => ({ ...f, allergyHistory: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Exam Findings</label>
                <textarea
                  value={form.examFindings}
                  onChange={e => setForm(f => ({ ...f, examFindings: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Advice</label>
                <textarea
                  value={form.advice}
                  onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  suggestions={labTestSuggestions}
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
                suggestions={{ medName: medNameSuggestions }}
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
      ) : filteredTemplates.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No templates yet. Create your first template to speed up prescriptions.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(t => (
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
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
