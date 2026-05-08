import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { Info } from 'lucide-react'

export default function Hospital_IpdPrintReport(){
  const { id } = useParams()
  const encounterId = String(id || '')
  const navigate = useNavigate()

  const [settings, setSettings] = useState<any>({
    name: 'Hospital',
    phone: '',
    address: '',
    logoDataUrl: '',
    slipFooter: '',
  })

  const [encounter, setEncounter] = useState<any | null>(null)
  const [anesPre, setAnesPre] = useState<any[]>([])
  const [anesIntra, setAnesIntra] = useState<any[]>([])
  const [anesRecovery, setAnesRecovery] = useState<any[]>([])
  const [anesPostRecovery, setAnesPostRecovery] = useState<any[]>([])
  const [anesAdverse, setAnesAdverse] = useState<any[]>([])

  const [preop, setPreop] = useState<any[]>([])
  const [operation, setOperation] = useState<any[]>([])
  const [postop, setPostop] = useState<any[]>([])
  const [consultant, setConsultant] = useState<any[]>([])

  const [vitals, setVitals] = useState<any[]>([])
  const [progress, setProgress] = useState<any[]>([])
  const [medOrders, setMedOrders] = useState<any[]>([])

  const [billItems, setBillItems] = useState<any[]>([])
  const [billPayments, setBillPayments] = useState<any[]>([])

  const [consent, setConsent] = useState<any[]>([])
  const [infectionControl, setInfectionControl] = useState<any[]>([])
  const [surgicalSafety, setSurgicalSafety] = useState<any[]>([])
  const [bloodTransfusion, setBloodTransfusion] = useState<any[]>([])
  const [operationConsent, setOperationConsent] = useState<any[]>([])
  const [historyExam, setHistoryExam] = useState<any[]>([])

  useEffect(()=>{ if(encounterId){ loadAll() } }, [encounterId])

  async function loadAll(){
    try{
      const promises: Promise<any>[] = [
        hospitalApi.getSettings(),
        hospitalApi.getIPDAdmissionById(encounterId),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-pre', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-intra', limit: 200 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-recovery', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-post-recovery', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-adverse', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'preop', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'postop', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'consultant', limit: 500 }),
        hospitalApi.listIpdVitals(encounterId, { limit: 500 }),
        hospitalApi.listIpdDoctorVisits(encounterId, { limit: 500 }),
        hospitalApi.listIpdMedOrders(encounterId, { limit: 500 }),
        hospitalApi.listIpdNotes(encounterId, { limit: 500 }), // This will catch the new form types

        // Invoice
        hospitalApi.listIpdBillingItems(encounterId, { limit: 2000 } as any),
        hospitalApi.listIpdPayments(encounterId, { limit: 2000 } as any),
      ]
      const [settingsRes, encRes, pre, intra, rec, postRec, adv, preopRes, opRes, postopRes, consRes, vitalsRes, visitsRes, medsRes, notesRes, billItemsRes, billPaysRes] = await Promise.all(promises)
      setSettings((settingsRes as any) || {})
      setEncounter(encRes?.encounter || null)
      setAnesPre(pre?.notes || [])
      setAnesIntra(intra?.notes || [])
      setAnesRecovery(rec?.notes || [])
      setAnesPostRecovery(postRec?.notes || [])
      setAnesAdverse(adv?.notes || [])
      setPreop(preopRes?.notes || [])
      setOperation(opRes?.notes || [])
      setPostop(postopRes?.notes || [])
      setConsultant(consRes?.notes || [])
      setVitals(vitalsRes?.vitals || [])
      // Filter daily progress from doctor visits (has any SOAP field)
      const visits = (visitsRes?.visits || []).map((v: any)=>({
        _id: String(v._id), when: String(v.when || v.createdAt || new Date().toISOString()),
        doctorName: v?.doctorId?.name, subjective: v.subjective, objective: v.objective, assessment: v.assessment, plan: v.plan,
      }))
      const prog = visits.filter((r: any)=>{
        const s = (r.subjective||'').trim(); const o = (r.objective||'').trim(); const a = (r.assessment||'').trim(); const p = (r.plan||'').trim();
        return !!(s || o || a || p)
      }).sort((a: any,b: any)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setProgress(prog)
      setMedOrders(medsRes?.orders || [])

      setBillItems(billItemsRes?.items || [])
      setBillPayments(billPaysRes?.payments || [])

      // Process and set other notes
      const allNotes = notesRes?.notes || []
      setConsent(allNotes.filter((n: any) => n.text?.startsWith('[CONSENT_FORM]:')))
      setInfectionControl(allNotes.filter((n: any) => n.text?.startsWith('[INFECTION_CONTROL]:')))
      setSurgicalSafety(allNotes.filter((n: any) => n.text?.startsWith('[SURGICAL_SAFETY]:')))
      setBloodTransfusion(allNotes.filter((n: any) => n.text?.startsWith('[BLOOD_TRANSFUSION]:')))
      setOperationConsent(allNotes.filter((n: any) => n.text?.startsWith('[OPERATION_CONSENT]:')))
      setHistoryExam(allNotes.filter((n: any) => n.text?.startsWith('[HISTORY_EXAM]:')))
    }catch{}
  }

  const patient = useMemo(()=> (encounter as any)?.patientId || {}, [encounter])
  const doctorName = useMemo(()=> (encounter as any)?.doctorId?.name || '', [encounter])

  const printNow = () => {
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewCurrent === 'function') { api.printPreviewCurrent({}); return }
    }catch{}
    try { window.print() } catch {}
  }

  return (
    <div className="ipd-print-root bg-slate-100 p-8 min-h-screen">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html, body { background: #fff !important; color: #000 !important; }
          .ipd-print-root { background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          
          /* Force consistency for professional standard */
          .section-block { break-inside: avoid; border: 2px solid #334 !important; border-radius: 0 !important; margin-bottom: 20px !important; }
          .section-header { background: #e11d48 !important; color: white !important; -webkit-print-color-adjust: exact; }
          .table-header { background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important; }
          
          /* Better spacing for A4 */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; }
        }

        /* Screen Styles for perfect preview */
        .section-block { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .section-header { background: #e11d48; padding: 0.75rem 1.5rem; color: white; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.875rem; }
        .data-label { background: #f8fafc; font-weight: 700; color: #475569; width: 120px; font-size: 0.75rem; text-transform: uppercase; }
        .data-value { font-weight: 800; color: #0f172a; font-size: 0.875rem; }
        .wrap-break-word { word-break: break-word; overflow-wrap: break-word; }
      `}</style>

      <div className="mx-auto w-full max-w-[1000px]">
        {/* Actions - No Print */}
        <div className="no-print mb-8 flex items-center justify-between rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Encounter Report</h1>
            <p className="text-sm font-medium text-slate-500">Perfect print preview for patient medical records</p>
          </div>
          <div className="flex gap-3">
            <button 
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button 
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
              onClick={printNow}
            >
              Print Report
            </button>
          </div>
        </div>

        {/* Report Header */}
        <div className="section-block">
          <div className="p-8 border-b-4 border-rose-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {(settings?.logoDataUrl || '') ? (
                  <img src={settings.logoDataUrl} alt="logo" className="h-24 w-24 rounded-2xl border-2 border-slate-100 object-contain shadow-sm" />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-slate-50 border-2 border-slate-100" />
                )}
                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">{settings?.name || 'Hospital'}</h2>
                  <p className="max-w-md text-sm font-bold text-slate-500 leading-tight">{settings?.address || ''}</p>
                  <div className="flex gap-4 text-xs font-black text-rose-600 uppercase tracking-widest">
                    {settings?.phone && <span>Tel: {settings.phone}</span>}
                    {settings?.email && <span>Email: {settings.email}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white uppercase tracking-widest">
                  Medical Record
                </div>
                <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Confidential Document
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-slate-100 border-b border-slate-100">
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</span>
              <p className="text-sm font-black text-slate-900 uppercase">{patient?.fullName || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRN Number</span>
              <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{patient?.mrn || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age / Gender</span>
              <p className="text-sm font-black text-slate-900">{patient?.age || '-'} / {patient?.gender || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
              <p className="text-sm font-black text-slate-900">{patient?.phoneNormalized || patient?.phone || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultant</span>
              <p className="text-sm font-black text-slate-900 uppercase">Dr. {doctorName || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location / Bed</span>
              <p className="text-sm font-black text-slate-900 uppercase">{(encounter as any)?.bedLabel || (encounter as any)?.bedId || '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admission Date</span>
              <p className="text-sm font-black text-slate-900">{(encounter as any)?.startAt ? new Date(String((encounter as any)?.startAt)).toLocaleString() : '-'}</p>
            </div>
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record Status</span>
              <p className="text-sm font-black text-rose-600 uppercase tracking-wider">{(encounter as any)?.status || '-'}</p>
            </div>
          </div>
        </div>

        <AnesthesiaSection pre={anesPre} intra={anesIntra} rec={anesRecovery} postRec={anesPostRecovery} adv={anesAdverse} />
        <SurgerySection preop={preop} operation={operation} postop={postop} consultant={consultant} />
        <DailyMonitoringSection vitals={vitals} />
        <DailyProgressSection rows={progress} />
        <MedicationSection orders={medOrders} />
        <InvoiceSection encounter={encounter} items={billItems} payments={billPayments} settings={settings} />
        <OtherFormsSection 
          consent={consent}
          infectionControl={infectionControl}
          surgicalSafety={surgicalSafety}
          bloodTransfusion={bloodTransfusion}
          operationConsent={operationConsent}
          historyExam={historyExam}
        />

        {/* Report Footer */}
        <div className="section-block bg-slate-50/50 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generated By</p>
              <p className="text-sm font-bold text-slate-700 uppercase">MIS Automated Systems</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hospital Authorization</p>
              <div className="h-10 w-40 border-b-2 border-dashed border-slate-300 mx-auto" />
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Timestamp</p>
              <p className="text-sm font-bold text-slate-700">{new Date().toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              {(settings?.slipFooter || '').trim() ? String(settings.slipFooter) : `This document is a certified medical record from ${settings?.name || 'Hospital'}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: any }){
  return (
    <div className="section-header">
      <div className="flex items-center gap-3">
        <span className="h-4 w-1 rounded-full bg-white/40" />
        {children}
      </div>
    </div>
  )
}

function InvoiceSection({ encounter, items, payments }: { encounter: any; items: any[]; payments: any[]; settings: any }){
  const rows = (items || []).map((r: any, idx: number)=> ({
    sr: idx + 1,
    description: String(r.description || ''),
    qty: Number(r.qty || 1) || 1,
    unitPrice: Number(r.unitPrice || r.rate || 0) || 0,
    amount: Number(r.amount != null ? r.amount : (Number(r.unitPrice || 0) * (Number(r.qty || 1) || 1))) || 0,
  }))

  const discountRow = rows.find(r => /^discount$/i.test((r.description || '').trim()))
  const discount = discountRow ? Math.abs(Number(discountRow.amount || 0)) : 0
  const gross = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
  const net = Math.max(0, gross - discount)

  const deposit = Number(encounter?.deposit || 0)
  const paid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) + deposit
  const balance = Math.max(0, net - paid)

  return (
    <section className="section-block">
      <SectionTitle>FINAL INVOICE</SectionTitle>
      <div className="p-4 space-y-4">
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross</div>
                <div className="mt-1 text-lg font-black text-slate-900">{gross.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Discount</div>
                <div className="mt-1 text-lg font-black text-emerald-700">{discount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">Balance</div>
                <div className="mt-1 text-lg font-black text-rose-700">{balance.toLocaleString()}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="table-header text-slate-500 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-3 py-3 w-12">#</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 w-16 text-right">Qty</th>
                    <th className="px-3 py-3 w-28 text-right">Rate</th>
                    <th className="px-3 py-3 w-28 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
                  {rows
                    .filter(r => !/^discount$/i.test((r.description || '').trim()))
                    .map((r) => (
                      <tr key={r.sr}>
                        <td className="px-3 py-2 text-slate-500 font-medium">{r.sr}</td>
                        <td className="px-3 py-2 wrap-break-word">{r.description || '-'}</td>
                        <td className="px-3 py-2 text-right">{r.qty}</td>
                        <td className="px-3 py-2 text-right">{r.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{r.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-3 py-2" colSpan={4}>Gross Total</td>
                    <td className="px-3 py-2 text-right">{gross.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2" colSpan={4}>Discount</td>
                    <td className="px-3 py-2 text-right">{discount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2" colSpan={4}>Net Total</td>
                    <td className="px-3 py-2 text-right">{net.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2" colSpan={4}>Paid (Deposit + Payments)</td>
                    <td className="px-3 py-2 text-right">{paid.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-black" colSpan={4}>Balance</td>
                    <td className="px-3 py-2 text-right font-black">{balance.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function AnesthesiaSection({ pre, intra: _intra, rec: _rec, postRec: _postRec, adv: _adv }: { pre: any[]; intra: any[]; rec: any[]; postRec: any[]; adv: any[] }){
  return (
    <section className="section-block">
      <SectionTitle>ANESTHESIA</SectionTitle>
      <div className="p-4 space-y-6">
        <div>
          <SubTitle>Pre-Assessment</SubTitle>
          {pre.length === 0 ? <Empty /> : (
            <ul className="space-y-4">{pre.map((n: any)=>(
              <li key={n._id} className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <HeaderLine when={n.recordedAt||n.createdAt} doctor={n.doctorName} sign={n.sign} />
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Existing Problems</div>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-tighter">
                          <tr>
                            <th className="px-2 py-1.5">CVS</th>
                            <th className="px-2 py-1.5">Renal</th>
                            <th className="px-2 py-1.5">Resp</th>
                            <th className="px-2 py-1.5">Hepatic</th>
                            <th className="px-2 py-1.5">Diabetes</th>
                            <th className="px-2 py-1.5">GIT</th>
                            <th className="px-2 py-1.5">Neuro</th>
                            <th className="px-2 py-1.5">Hx</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
                          <tr>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.cvs || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.renal || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.respiration || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.hepatic || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.diabetic || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.git || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.neurology || '-'}</td>
                            <td className="px-2 py-1.5">{(n.data||{}).existingProblems?.anesthesiaHistory || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </li>))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function SurgerySection({ preop, operation, postop: _postop, consultant: _consultant }: { preop: any[]; operation: any[]; postop: any[]; consultant: any[] }){
  return (
    <section className="section-block">
      <SectionTitle>SURGERY</SectionTitle>
      <div className="p-4 space-y-6">
        <div>
          <SubTitle>Pre-Operative Care</SubTitle>
          {preop.length === 0 ? <Empty /> : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="table-header text-slate-500 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-3 py-3">Date/Time</th>
                    <th className="px-3 py-3">NPO From</th>
                    <th className="px-3 py-3">Maintain I/V</th>
                    <th className="px-3 py-3">Shave & Prep</th>
                    <th className="px-3 py-3">Medication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
                  {preop.map((r: any)=> (
                    <tr key={r._id}>
                      <td className="px-3 py-2 text-slate-500 font-medium">{new Date(String(r.recordedAt||r.createdAt)).toLocaleString()}</td>
                      <td className="px-3 py-2">{(r.data||{}).npoFrom || '-'}</td>
                      <td className="px-3 py-2">{(r.data||{}).maintainIV || '-'}</td>
                      <td className="px-3 py-2">{(r.data||{}).shavePrepare || '-'}</td>
                      <td className="px-3 py-2">{(r.data||{}).medication || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <SubTitle>Operation Details</SubTitle>
          {operation.length === 0 ? <Empty /> : (
            <div className="space-y-4">
              {operation.map((r: any)=> (
                <div key={r._id} className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                  <HeaderLine when={r.recordedAt||r.createdAt} doctor={r.doctorName} sign={r.sign} />
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procedure</span>
                      <p className="text-sm font-bold text-slate-900">{(r.data||{}).procedure || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incision</span>
                      <p className="text-sm font-bold text-slate-900">{(r.data||{}).incision || '-'}</p>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Findings</span>
                      <p className="text-sm font-medium text-slate-700 wrap-break-word">{(r.data||{}).findings || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DailyMonitoringSection({ vitals }: { vitals: any[] }){
  return (
    <section className="section-block">
      <SectionTitle>DAILY MONITORING (VITALS)</SectionTitle>
      <div className="p-4">
        {vitals.length === 0 ? <Empty /> : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="table-header text-slate-500 font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-3">Date/Time</th>
                  <th className="px-3 py-3">BP</th>
                  <th className="px-3 py-3">HR</th>
                  <th className="px-3 py-3">RR</th>
                  <th className="px-3 py-3">Temp</th>
                  <th className="px-3 py-3">SpO2</th>
                  <th className="px-3 py-3">BSR</th>
                  <th className="px-3 py-3">Urine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
                {vitals.map((v: any)=> (
                  <tr key={v._id}>
                    <td className="px-3 py-2 text-slate-500 font-medium">{new Date(String(v.recordedAt||v.createdAt)).toLocaleString()}</td>
                    <td className="px-3 py-2">{v.bp || '-'}</td>
                    <td className="px-3 py-2">{v.hr ?? '-'}</td>
                    <td className="px-3 py-2">{v.rr ?? '-'}</td>
                    <td className="px-3 py-2">{v.temp ?? '-'}</td>
                    <td className="px-3 py-2">{v.spo2 ?? '-'}</td>
                    <td className="px-3 py-2">{v.bsr ?? '-'}</td>
                    <td className="px-3 py-2">{v.urine || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function DailyProgressSection({ rows }: { rows: any[] }){
  return (
    <section className="section-block">
      <SectionTitle>DAILY PROGRESS NOTES</SectionTitle>
      <div className="p-4">
        {rows.length === 0 ? <Empty /> : (
          <div className="space-y-4">
            {rows.map((r: any)=>{
              const d = new Date(r.when); const date = d.toLocaleDateString(); const time = d.toTimeString().slice(0,5)
              return (
                <div key={r._id} className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{date} @ {time}</span>
                    <span className="text-xs font-black text-rose-600 uppercase tracking-widest">DR. {r.doctorName || '-'}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subjective / Objective</span>
                      <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap">{[r.subjective, r.objective].filter(Boolean).join('\n') || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assessment / Plan</span>
                      <p className="text-xs font-black text-slate-900 whitespace-pre-wrap">{[r.assessment, r.plan].filter(Boolean).join('\n') || '-'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function MedicationSection({ orders }: { orders: any[] }){
  return (
    <section className="section-block">
      <SectionTitle>MEDICATION ORDERS</SectionTitle>
      <div className="p-4">
        {orders.length === 0 ? <Empty /> : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="table-header text-slate-500 font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-3">Medicine</th>
                  <th className="px-3 py-3">Dose / Route</th>
                  <th className="px-3 py-3">Frequency</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Physician</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900 font-bold">
                {orders.map((o: any)=> (
                  <tr key={o._id}>
                    <td className="px-3 py-2 text-sm uppercase tracking-tight">{o.drugName || '-'}</td>
                    <td className="px-3 py-2">{o.dose || '-'} / {o.route || '-'}</td>
                    <td className="px-3 py-2 uppercase text-[10px] tracking-widest">{o.frequency || '-'}</td>
                    <td className="px-3 py-2">{o.duration || '-'}</td>
                    <td className="px-3 py-2 capitalize">
                      <span className={o.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}>{o.status || '-'}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-medium">{o.prescribedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function OtherFormsSection({ 
  consent, infectionControl: _infectionControl, surgicalSafety: _surgicalSafety, 
  bloodTransfusion, operationConsent, historyExam 
}: any) {
  return (
    <div className="space-y-6">
      {historyExam.length > 0 && (
        <section className="section-block">
          <SectionTitle>HISTORY & EXAMINATION</SectionTitle>
          <div className="p-4 space-y-4">
            {historyExam.map((n: any) => <GenericNoteView key={n._id} note={n} prefix="[HISTORY_EXAM]:" />)}
          </div>
        </section>
      )}
      {consent.length > 0 && (
        <section className="section-block">
          <SectionTitle>CONSENT FORMS</SectionTitle>
          <div className="p-4 space-y-4">
            {consent.map((n: any) => <GenericNoteView key={n._id} note={n} prefix="[CONSENT_FORM]:" />)}
          </div>
        </section>
      )}
      {operationConsent.length > 0 && (
        <section className="section-block">
          <SectionTitle>OPERATION CONSENTS</SectionTitle>
          <div className="p-4 space-y-4">
            {operationConsent.map((n: any) => <GenericNoteView key={n._id} note={n} prefix="[OPERATION_CONSENT]:" />)}
          </div>
        </section>
      )}
      {bloodTransfusion.length > 0 && (
        <section className="section-block">
          <SectionTitle>BLOOD TRANSFUSION NOTES</SectionTitle>
          <div className="p-4 space-y-4">
            {bloodTransfusion.map((n: any) => <GenericNoteView key={n._id} note={n} prefix="[BLOOD_TRANSFUSION]:" />)}
          </div>
        </section>
      )}
    </div>
  )
}

function GenericNoteView({ note, prefix }: { note: any; prefix: string }) {
  const data = useMemo(() => {
    try {
      const raw = note.text || note.note || ''
      return JSON.parse(raw.replace(prefix, ''))
    } catch { return null }
  }, [note.text, note.note, prefix])

  if (!data) return <div className="text-xs text-rose-500 italic p-4 bg-rose-50 rounded-xl">Invalid form data structure</div>

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Recorded: {new Date(note.recordedAt || note.createdAt).toLocaleString()}
        </span>
        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
          Staff: {note.createdBy || '-'}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Object.entries(data).map(([key, value]: [string, any]) => {
          if (!value || typeof value === 'object') return null
          return (
            <div key={key} className="space-y-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight leading-none">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="text-xs font-bold text-slate-900 leading-tight">{String(value)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SubTitle({ children }: { children: any }){ 
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-1">
      <div className="h-1.5 w-1.5 rounded-full bg-rose-600" />
      <div className="text-sm font-black uppercase tracking-wider text-slate-800">{children}</div>
    </div>
  ) 
}

function HeaderLine({ when, doctor, sign }: { when?: string; doctor?: string; sign?: string }){
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {when ? new Date(String(when)).toLocaleString() : '-'}
      </div>
      <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
        {doctor ? `Dr: ${doctor}` : ''} {sign ? ` [Verified]` : ''}
      </div>
    </div>
  )
}

function Empty(){ 
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-100 p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
      <Info className="h-4 w-4" />
      No medical records found for this section
    </div>
  ) 
}
