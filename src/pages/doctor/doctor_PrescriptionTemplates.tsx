import { useEffect, useState, useMemo } from 'react'
import { hospitalApi, pharmacyApi, labApi } from '../../utils/api'
import PrescriptionMedication from '../../components/doctor/PrescriptionMedication'
import SuggestField from '../../components/SuggestField'
import Toast from '../../components/ui/Toast'
import type { ToastState } from '../../components/ui/Toast'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  Search, 
  Layout, 
  ClipboardList, 
  Stethoscope, 
  Microscope, 
  Info,
  ChevronRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'

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
  allergyHistory?: string
  treatmentHistory?: string
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
  const [searchTerm, setSearchTerm] = useState('')
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
  
  const [medNameSuggestions, setMedNameSuggestions] = useState<string[]>([])
  const [labTestSuggestions, setLabTestSuggestions] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
    } catch { }
  }, [])

  useEffect(() => {
    if (doc?.id) loadTemplates()
  }, [doc?.id, page, limit])

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

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates
    const q = searchTerm.toLowerCase()
    return templates.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.diagnosis?.toLowerCase().includes(q)
    )
  }, [templates, searchTerm])

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
        setToast({ type: 'success', message: 'Template updated successfully' })
      } else {
        await hospitalApi.createPrescriptionTemplate(data)
        setToast({ type: 'success', message: 'New template created successfully' })
      }
      resetForm()
      loadTemplates()
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save template' })
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return
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
    <div className="max-w-[1600px] mx-auto px-4 py-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layout className="h-6 w-6 text-sky-600" />
            Prescription Templates
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Standardize your clinical protocols for faster prescribing.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Create New Template
          </button>
        )}
      </div>

      {loading && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-12 w-12 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Analyzing Templates...</p>
        </div>
      ) : showForm ? (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={resetForm} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={saveTemplate}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-sky-700 transition-all shadow-md shadow-sky-100"
            >
              <Save className="h-4 w-4" />
              Save Protocol
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main Form Area */}
            <div className="lg:col-span-8 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Identification</h3>
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Template Name (e.g., Acute Respiratory Infection, Hypertension Follow-up)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-800 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <Stethoscope className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Clinical Assessment</h3>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Complaint</label>
                    <textarea
                      value={form.primaryComplaint}
                      onChange={e => setForm(f => ({ ...f, primaryComplaint: e.target.value }))}
                      rows={3}
                      placeholder="Typical chief complaints..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all bg-slate-50/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Examination Findings</label>
                    <textarea
                      value={form.examFindings}
                      onChange={e => setForm(f => ({ ...f, examFindings: e.target.value }))}
                      rows={3}
                      placeholder="Standard physical findings..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all bg-slate-50/30"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Working Diagnosis</label>
                  <textarea
                    value={form.diagnosis}
                    onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                    rows={2}
                    placeholder="Differential or confirmed diagnosis..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all bg-slate-50/30"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Medications & Treatment</h3>
                </div>
                <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-6">
                  <PrescriptionMedication
                    initialMedicines={form.meds}
                    onChange={(meds) => setForm(f => ({ ...f, meds }))}
                    suggestions={{ medName: medNameSuggestions }}
                  />
                </div>
              </section>
            </div>

            {/* Sidebar Areas */}
            <div className="lg:col-span-4 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <Microscope className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Investigations</h3>
                </div>
                <div className="space-y-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Laboratory Orders</label>
                    <SuggestField
                      mode="lab-tests"
                      rows={3}
                      value={form.labTestsText}
                      onChange={v => setForm(f => ({ ...f, labTestsText: v }))}
                      suggestions={labTestSuggestions}
                      placeholder="Enter tests (one per line)..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Imaging & Diagnostics</label>
                    <SuggestField
                      mode="lab-tests"
                      rows={3}
                      value={form.diagnosticTestsText}
                      onChange={v => setForm(f => ({ ...f, diagnosticTestsText: v }))}
                      suggestions={labTestSuggestions}
                      placeholder="X-Ray, MRI, ECG..."
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sky-600">
                  <Info className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Patient Advice</h3>
                </div>
                <textarea
                  value={form.advice}
                  onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
                  rows={6}
                  placeholder="Special instructions, follow-up advice, dietary restrictions..."
                  className="w-full rounded-3xl border border-slate-200 px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all bg-white shadow-sm"
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : templates.length === 0 ? (
    <div className="mt-8 bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-20 text-center animate-in fade-in zoom-in duration-500">
      <div className="p-6 bg-slate-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
        <FileText className="h-10 w-10 text-slate-300" />
      </div>
      <h2 className="text-xl font-black text-slate-800">No Clinical Protocols Yet</h2>
      <p className="mt-2 text-slate-500 max-w-md mx-auto font-medium">Create custom templates for common conditions to save time during busy clinics and ensure consistent care.</p>
      <button
        onClick={() => { resetForm(); setShowForm(true) }}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-xl active:scale-95"
      >
        <Plus className="h-5 w-5" />
        Get Started
      </button>
    </div>
  ) : (
    <>
      {/* Search Bar */}
      <div className="mb-6 relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Quick search templates by name or diagnosis..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[28px] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTemplates.map(t => (
          <div key={t._id} className="group bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => editTemplate(t)}
                className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                title="Edit Template"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteTemplate(t._id)}
                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                title="Delete Template"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4">
              <div className="h-12 w-12 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="font-black text-slate-900 text-lg leading-tight line-clamp-2">{t.name}</h3>
            </div>

            <div className="mt-auto space-y-4">
              {t.diagnosis && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Diagnosis</span>
                  <p className="text-xs font-bold text-slate-600 line-clamp-1 italic">"{t.diagnosis}"</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {(t.items?.length || 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-sky-600">{t.items?.length}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Meds</span>
                  </div>
                )}
                {(t.labTests?.length || 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-emerald-600">{t.labTests?.length}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Labs</span>
                  </div>
                )}
                <button 
                  onClick={() => editTemplate(t)}
                  className="ml-auto flex items-center gap-1 text-[10px] font-black text-sky-600 uppercase tracking-widest hover:translate-x-1 transition-transform"
                >
                  View Details
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Improved Pagination */}
      <div className="mt-12 flex items-center justify-between bg-white rounded-[32px] border border-slate-200 px-8 py-4 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
            Total <span className="text-slate-900">{total}</span> Templates
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-xs font-black text-sky-600 focus:ring-0 cursor-pointer p-0"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-slate-400 hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                  page === i + 1 
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-100 scale-110' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 text-slate-400 hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  )}

  {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
</div>
)
}
