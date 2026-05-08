import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ClipboardCheck, LayoutGrid, Printer, Download, Save, FileStack } from 'lucide-react'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Hospital_BloodDonationConsent from '../../components/hospital/hospital_BloodDonationConsent'
import Hospital_TestTubeConsent from '../../components/hospital/hospital_TestTubeConsent'
import IpdDischargeForm from '../../components/hospital/hospital_IpdDischargeForm'
import IpdInvoiceSlip from '../../components/hospital/hospital_IpdInvoiceslip'
import ReceivedDeathForm from '../../components/hospital/hospital_ReceivedDeathForm'
import Hospital_ShortStayForm from '../../components/hospital/hospital_ShortStayForm'
import DeathCertificateForm from '../../components/hospital/hospital_DeathCertificateForm'
import Hospital_BirthCertificateForm from '../../components/hospital/hospital_BirthCertificateForm'
import { hospitalApi } from '../../utils/api'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const formDefs = [
  { key: 'DischargeSummary', label: 'Discharge Summary', render: (p: any) => (
    <IpdDischargeForm encounterId={p?.encounterId} patient={{ ...p, encounterType: p?.encounterType }} />
  ) },
  { key: 'Invoice', label: 'Final Invoice', render: (p: any) => (
    <IpdInvoiceSlip encounterId={p?.encounterId} encounterType={p?.encounterType} patient={p} embedded />
  ) },
  { key: 'ShortStay', label: 'Short Stay', render: (p: any) => <Hospital_ShortStayForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'DeathCertificate', label: 'Death Certificate', render: (p: any) => <DeathCertificateForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'BirthCertificate', label: 'Birth Certificate', render: (p: any) => <Hospital_BirthCertificateForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'ReceivedDeath', label: 'Received Death', render: (p: any) => <ReceivedDeathForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'BloodDonationConsent', label: 'Blood Donation Consent', render: (p: any) => <Hospital_BloodDonationConsent patient={{ name: p?.name, phone: p?.phone, address: p?.address }} /> },
  { key: 'TestTubeConsent', label: 'Test Tube Consent', render: (p: any) => <Hospital_TestTubeConsent patient={{ name: p?.name, phone: p?.phone, address: p?.address }} /> },
]

export default function Hospital_DischargeWizard(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [encounterId, setEncounterId] = useState<string>('')
  const [encounterType, setEncounterType] = useState<'IPD'|'EMERGENCY'|null>(null)
  const [loading, setLoading] = useState(true)

  const [patient, setPatient] = useState<any>({ id: '', name: '', bed: '', doctor: '', admitted: '', mrn: '', admissionNo: '', address: '', phone: '', age: '', gender: '', encounterType: null })

  // Resolve encounter (treat :id as encounterId if possible; else fallback by patientId)
  useEffect(()=>{ (async()=>{
    const routeId = String(id||'')
    if (!routeId) { setLoading(false); return }
    try {
      const e = await hospitalApi.getIPDAdmissionById(routeId) as any
      const enc = e?.encounter
      if (enc && enc._id){
        setEncounterId(String(enc._id))
        setEncounterType('IPD')
        setPatient({
          id: String(enc.patientId?._id||''),
          name: String(enc.patientId?.fullName||''),
          bed: enc.bedLabel||'',
          doctor: enc.doctorId?.name||'',
          admitted: enc.startAt,
          mrn: enc.patientId?.mrn||'',
          address: enc.patientId?.address||'',
          phone: enc.patientId?.phoneNormalized||'',
          age: enc.patientId?.age||'',
          gender: enc.patientId?.gender||'',
          admissionNo: enc.admissionNo || '',
          encounterType: 'IPD',
        })
        setLoading(false)
        return
      }
    } catch {}

    // ER encounter fallback (routeId is encounterId)
    try {
      const s: any = await hospitalApi.erBillingSummary(routeId).catch(()=>null)
      const enc = s?.encounter
      if (enc && enc._id){
        setEncounterId(String(enc._id))
        setEncounterType('EMERGENCY')
        setPatient({
          id: String(enc.patientId?._id||''),
          name: String(enc.patientId?.fullName||''),
          bed: enc.bedLabel||'',
          doctor: enc.doctorId?.name||'',
          admitted: enc.startAt,
          mrn: enc.patientId?.mrn||'',
          address: enc.patientId?.address||'',
          phone: enc.patientId?.phoneNormalized||'',
          age: enc.patientId?.age||'',
          gender: enc.patientId?.gender||'',
          admissionNo: enc.admissionNo || '',
          encounterType: 'EMERGENCY',
        })
        setLoading(false)
        return
      }
    } catch {}

    // Fallback: assume :id is patientId -> get most recent admitted/discharged
    try {
      const res = await hospitalApi.listIPDAdmissions({ patientId: routeId, limit: 1 }) as any
      const enc = (res?.admissions||[])[0]
      if (enc){
        setEncounterId(String(enc._id))
        setEncounterType('IPD')
        setPatient({
          id: routeId,
          name: String(enc.patientId?.fullName||''),
          bed: enc.bedLabel||'',
          doctor: enc.doctorId?.name||'',
          admitted: enc.startAt,
          mrn: enc.patientId?.mrn||'',
          address: enc.patientId?.address||'',
          phone: enc.patientId?.phoneNormalized||'',
          age: enc.patientId?.age||'',
          gender: enc.patientId?.gender||'',
          admissionNo: enc.admissionNo || '',
          encounterType: 'IPD',
        })
      }
    } catch {}
    setLoading(false)
  })() }, [id])

  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>(['DischargeSummary','Invoice'])
  const [discharging, setDischarging] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const handleFinishDischarge = async () => {
    if (!encounterId) return
    setDischarging(true)
    try {
      // 1. Mark as discharged in backend — use the correct API based on encounter type
      if (encounterType === 'EMERGENCY') {
        await hospitalApi.dischargeER(encounterId, { endAt: new Date().toISOString(), disposition: 'discharged' })
        // Also mark the associated token as completed so the dashboard reflects the change
        try {
          const tokenRes: any = await hospitalApi.listTokens({ encounterId, limit: 1 })
          const tokenId = (tokenRes?.tokens?.[0]?._id || tokenRes?.tokens?.[0]?.id || '') as string
          if (tokenId) await hospitalApi.updateTokenStatus(tokenId, 'completed' as any)
        } catch {}
      } else {
        await hospitalApi.dischargeIPD(encounterId, { endAt: new Date().toISOString() })
      }
      
      // 2. Navigate to the correct discharged list based on encounter type
      navigate(encounterType === 'EMERGENCY' ? '/hospital/er-discharged' : '/hospital/discharged')
    } catch (e: any) {
      alert(e?.message || 'Failed to complete discharge')
    } finally {
      setDischarging(false)
    }
  }


  const handleSaveForm = async (k: string) => {
    // In many forms, the save logic is inside the form component itself.
    // This button can trigger a custom save event or handle it via refs if needed.
    // For now, we'll show a notification.
    setToast({ type: 'success', message: `${k} changes have been recorded.` })
    try { window.dispatchEvent(new CustomEvent('dw:form-action', { detail: { key: k, action: 'save' } })) } catch {}
  }

  const handleDownloadForm = async (k: string) => {
    // Basic download implementation - could be enhanced to generate PDF
    setToast({ type: 'info', message: `Downloading ${k}...` })
    try { window.dispatchEvent(new CustomEvent('dw:form-action', { detail: { key: k, action: 'download' } })) } catch {}
  }

  const handlePrintForm = (k: string, label: string) => {
    setToast({ type: 'info', message: `Preparing ${label} for printing...` })
    try { window.dispatchEvent(new CustomEvent('dw:form-action', { detail: { key: k, action: 'print' } })) } catch {}
  }

  const handleSaveAllSelected = async () => {
    if (!selected.length) return
    setToast({ type: 'info', message: 'Saving all selected documents...' })
    for (const k of selected){
      try { window.dispatchEvent(new CustomEvent('dw:form-action', { detail: { key: k, action: 'save' } })) } catch {}
      await new Promise(r => setTimeout(r, 50))
    }
    setToast({ type: 'success', message: 'Save request sent for all selected documents.' })
  }

  const handlePrintAllWithInvoice = async () => {
    // This function will combine all selected forms and the invoice into a single printable view
    const s: any = await hospitalApi.getSettings().catch(() => ({}))
    const hospitalName = String(s?.name || 'Hospital')
    const hospitalLogo = String(s?.logoDataUrl || '')
    const esc = (v?: string) => (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const w = window.open('', '_blank')
    if (!w) { alert('Please allow popups to print.'); return }

    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Complete Discharge Bundle - ${esc(hospitalName)}</title><style>
      @page{size:A4;margin:10mm}
      body{font-family:system-ui,-apple-system,sans-serif;color:#111;margin:0;padding:20px;}
      .page-break{page-break-after:always}
      @media print{.no-print{display:none}}
    </style></head><body>
      <div class="no-print" style="background:#f8fafc;padding:20px;border-bottom:1px solid #e2e8f0;margin:-20px -20px 20px -20px;display:flex;justify-content:between;align-items:center;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${hospitalLogo ? `<img src="${hospitalLogo}" style="height:32px;object-fit:contain;" />` : ''}
          <div>
            <h1 style="margin:0;font-size:18px;">Discharge Bundle</h1>
            <p style="margin:0;font-size:12px;color:#64748b;">${selected.length} Documents Included</p>
          </div>
        </div>
        <button onclick="window.print()" style="background:#0f172a;color:white;border:none;padding:8px 20px;border-radius:8px;font-weight:bold;cursor:pointer;margin-left:auto;">Print All Documents</button>
      </div>
      <div id="bundle-content">
        <p style="text-align:center;padding:100px;color:#64748b;">Preparing discharge bundle... Please wait.</p>
      </div>
    </body></html>`)

    // We can't easily "capture" React component HTML from here without significant changes to those components
    // So we'll navigate to a dedicated print all route if it exists, or provide instructions.
    // Given the current architecture, the most reliable way is to trigger the print-all route.
    if (encounterId) {
      w.location.href = `/hospital/patient/${encodeURIComponent(encounterId)}/print?forms=${selected.join(',')}&includeInvoice=true`
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-4 text-slate-500">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-navy" />
        <p className="text-sm font-medium">Loading encounter details...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 hover:shadow"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 transition-colors group-hover:text-slate-900" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Discharge Wizard</h1>
            <p className="text-sm font-medium text-slate-500">
              Patient: <span className="text-navy">{patient.name}</span> • MRN: <span className="text-navy">{patient.mrn}</span>
            </p>
          </div>
        </div>

        {/* Wizard Progress */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-1">
          {[
            { label: 'Select Forms', icon: LayoutGrid },
            { label: 'Fill Forms', icon: ClipboardCheck }
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => step > i && setStep(i)}
              disabled={step < i}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                step === i
                  ? 'bg-navy text-white shadow-lg shadow-navy/20'
                  : step > i
                  ? 'text-navy hover:bg-white'
                  : 'text-slate-400'
              }`}
            >
              <s.icon className={`h-4 w-4 ${step === i ? 'text-white' : ''}`} />
              <span className="hidden sm:inline">{s.label}</span>
              {i === 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
            </button>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">Step 1: Select Required Forms</h2>
              <p className="text-sm font-medium text-slate-500">Choose the documents you need to prepare for this discharge.</p>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {formDefs.map(fd => (
                <label
                  key={fd.key}
                  className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border-2 p-4 transition-all ${
                    selected.includes(fd.key)
                      ? 'border-navy bg-navy/5 ring-4 ring-navy/5'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    selected.includes(fd.key) ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    {selected.includes(fd.key) ? <ClipboardCheck className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-bold transition-colors ${selected.includes(fd.key) ? 'text-navy' : 'text-slate-700'}`}>
                      {fd.label}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-navy focus:ring-navy transition-all"
                    checked={selected.includes(fd.key)}
                    onChange={(e) => setSelected(s => e.target.checked ? [...s, fd.key] : s.filter(x => x !== fd.key))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {selected.length} form{selected.length !== 1 ? 's' : ''} selected
              </p>
              <button
                disabled={selected.length === 0}
                onClick={() => setStep(1)}
                className="group flex items-center gap-2 rounded-2xl bg-navy px-8 py-4 text-sm font-black text-white shadow-xl shadow-navy/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue to Fill Forms
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Step 2: Fill Forms</h2>
              <p className="text-sm font-medium text-slate-500">Complete the selected documents below.</p>
            </div>
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Modify Selection
            </button>
          </div>

          <div className="space-y-8">
            {selected.map(k => {
              const fd = formDefs.find(x => x.key === k)
              if (!fd) return null
              return (
                <div key={k} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-navy" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">{fd.label}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveForm(k)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:text-emerald-600 hover:ring-emerald-600"
                          title="Save Changes"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadForm(k)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:text-navy hover:ring-navy"
                          title="Download as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Print specific form
                            handlePrintForm(k, fd.label)
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:text-navy hover:ring-navy"
                          title="Print This Form"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="overflow-auto">
                      {fd.render({ ...patient, encounterId, encounterType })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="sticky bottom-4 z-10 flex items-center justify-center px-2">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-3 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </button>
              <div className="hidden h-6 w-px bg-slate-200 mx-1 md:block" />
              <button
                onClick={handlePrintAllWithInvoice}
                className="flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 shadow-lg shadow-slate-900/20"
              >
                <FileStack className="h-4 w-4" />
                Print Everything (Forms + Invoice)
              </button>
              <div className="hidden h-6 w-px bg-slate-200 mx-1 md:block" />
              <button
                onClick={handleSaveAllSelected}
                className="flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-lg shadow-emerald-700/20"
              >
                <Save className="h-4 w-4" />
                Save Data
              </button>
              <div className="hidden h-6 w-px bg-slate-200 mx-1 md:block" />
              <button
                onClick={() => setConfirmFinish(true)}
                disabled={discharging}
                className="flex items-center gap-2 rounded-xl bg-navy px-8 py-3 text-sm font-black text-white shadow-xl shadow-navy/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {discharging ? 'Processing...' : 'Complete Discharge'}
                <ClipboardCheck className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ConfirmDialog
            open={confirmFinish}
            title="Complete Discharge"
            message="Are you sure you want to complete discharge? Please confirm that all required forms are filled and the final invoice is correct."
            confirmText={discharging ? 'Processing...' : 'Yes, Complete'}
            onCancel={() => setConfirmFinish(false)}
            onConfirm={async () => {
              setConfirmFinish(false)
              await handleFinishDischarge()
            }}
          />
          <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}

