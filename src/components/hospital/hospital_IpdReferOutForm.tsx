import { useEffect, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'

export type ReferOutForm = {
  patientName?: string
  mrn?: string
  age?: string
  gender?: string
  address?: string
  phone?: string
  date?: string
  referredToHospital?: string
  referredToAddress?: string
  referredToContact?: string
  reasonForReferral?: string
  clinicalHistory?: string
  diagnosis?: string
  treatmentGiven?: string
  vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string; rr?: string }
  investigations?: string
  doctorName?: string
  doctorDesignation?: string
  signDate?: string
}

type Props = { encounterId?: string; patient?: { name?: string; mrn?: string; age?: string; gender?: string; address?: string; phone?: string; admitted?: string; doctor?: string; encounterType?: string } }

export default function Hospital_IpdReferOutForm(props: Props) {
  const [form, setForm] = useState<ReferOutForm>({ vitals: {} })
  const [settings, setSettings] = useState<any>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [saving, setSaving] = useState(false)
  const initialLoadRef = useRef(false)

  useEffect(() => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true
    ; (async () => {
      try {
        const s: any = await hospitalApi.getSettings()
        setSettings(s)
      } catch { }
      const today = new Date().toISOString().slice(0, 10)
      setForm(v => ({
        ...v,
        patientName: v.patientName || props.patient?.name || '',
        mrn: v.mrn || props.patient?.mrn || '',
        age: v.age || props.patient?.age || '',
        gender: v.gender || props.patient?.gender || '',
        address: v.address || props.patient?.address || '',
        phone: v.phone || props.patient?.phone || '',
        date: v.date || today,
        doctorName: v.doctorName || props.patient?.doctor || '',
      }))
    })()
  }, [props.patient])

  const update = (patch: Partial<ReferOutForm>) => setForm(v => ({ ...v, ...patch }))
  const updateVital = (key: keyof NonNullable<ReferOutForm['vitals']>, val: string) =>
    setForm(v => ({ ...v, vitals: { ...v.vitals, [key]: val } }))

  const save = async () => {
    setSaving(true)
    try {
      // Persist to localStorage as draft since backend endpoint doesn't exist yet
      const key = `refer-out-${props.encounterId || 'draft'}`
      localStorage.setItem(key, JSON.stringify(form))
      setToast({ type: 'success', message: 'Refer out form saved locally' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  const printView = () => {
    const F = form
    const S = settings || {}
    const hospName = S.hospitalName || 'Hospital'
    const hospAddr = S.address || ''
    const hospPhone = S.phone || ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Referral Letter</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Arial, sans-serif; color: #222; line-height: 1.4; margin: 0; padding: 0; }
  .page { max-width: 210mm; margin: 0 auto; padding: 16mm; }
  .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 20px; color: #1e3a5f; letter-spacing: 1px; }
  .header p { margin: 2px 0 0; font-size: 12px; color: #555; }
  .title { text-align: center; font-size: 16px; font-weight: bold; color: #1e3a5f; margin: 14px 0 10px; text-decoration: underline; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
  .row { display: grid; grid-template-columns: 140px 1fr; align-items: baseline; margin-top: 6px; }
  .lbl { font-weight: 700; font-size: 13px; }
  .line { border-bottom: 1px solid #222; min-height: 18px; font-size: 13px; padding: 0 4px; }
  .block { margin-top: 12px; }
  .block-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .block-body { border: 1px solid #222; min-height: 60px; padding: 6px; font-size: 13px; }
  .vitals { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 6px; }
  .vital-box { border: 1px solid #222; padding: 4px; text-align: center; }
  .vital-label { font-size: 10px; font-weight: 700; color: #555; }
  .vital-val { font-size: 13px; margin-top: 2px; }
  .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sig-row { display: flex; align-items: end; gap: 6px; margin-top: 8px; }
  .sig-line { border-bottom: 1px solid #222; width: 160px; min-height: 18px; }
  .stamp-box { border: 1px dashed #999; width: 100px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
</style></head><body>
<div class="page">
  <div class="header">
    <h1>${esc(hospName)}</h1>
    <p>${esc(hospAddr)} ${hospPhone ? '• Phone: ' + esc(hospPhone) : ''}</p>
  </div>

  <div class="title">REFERRAL / TRANSFER LETTER</div>

  <div class="grid2">
    <div class="row"><div class="lbl">Date:</div><div class="line">${esc(F.date)}</div></div>
    <div class="row"><div class="lbl">MR #:</div><div class="line">${esc(F.mrn)}</div></div>
  </div>

  <div class="row" style="margin-top:10px"><div class="lbl">Patient Name:</div><div class="line">${esc(F.patientName)}</div></div>

  <div class="grid2">
    <div class="row"><div class="lbl">Age:</div><div class="line">${esc(F.age)}</div></div>
    <div class="row"><div class="lbl">Gender:</div><div class="line">${esc(F.gender)}</div></div>
  </div>

  <div class="row"><div class="lbl">Address:</div><div class="line">${esc(F.address)}</div></div>
  <div class="row"><div class="lbl">Contact:</div><div class="line">${esc(F.phone)}</div></div>

  <div style="margin-top:14px; border-top:1px solid #ccc; padding-top:10px;">
    <div class="row"><div class="lbl">Referred To:</div><div class="line">${esc(F.referredToHospital)}</div></div>
    <div class="row"><div class="lbl">Hospital Address:</div><div class="line">${esc(F.referredToAddress)}</div></div>
    <div class="row"><div class="lbl">Hospital Contact:</div><div class="line">${esc(F.referredToContact)}</div></div>
  </div>

  <div class="block">
    <div class="block-title">Reason for Referral:</div>
    <div class="block-body">${esc(F.reasonForReferral)}</div>
  </div>

  <div class="block">
    <div class="block-title">Clinical History & Examination:</div>
    <div class="block-body">${esc(F.clinicalHistory)}</div>
  </div>

  <div class="block">
    <div class="block-title">Diagnosis:</div>
    <div class="block-body">${esc(F.diagnosis)}</div>
  </div>

  <div class="block">
    <div class="block-title">Treatment Given So Far:</div>
    <div class="block-body">${esc(F.treatmentGiven)}</div>
  </div>

  <div class="block">
    <div class="block-title">Investigations / Reports Enclosed:</div>
    <div class="block-body">${esc(F.investigations)}</div>
  </div>

  <div class="block">
    <div class="block-title">Vitals at Time of Referral:</div>
    <div class="vitals">
      <div class="vital-box"><div class="vital-label">BP</div><div class="vital-val">${esc(F.vitals?.bp)}</div></div>
      <div class="vital-box"><div class="vital-label">Pulse</div><div class="vital-val">${esc(F.vitals?.pulse)}</div></div>
      <div class="vital-box"><div class="vital-label">Temp</div><div class="vital-val">${esc(F.vitals?.temp)}</div></div>
      <div class="vital-box"><div class="vital-label">SpO2</div><div class="vital-val">${esc(F.vitals?.spo2)}</div></div>
      <div class="vital-box"><div class="vital-label">RR</div><div class="vital-val">${esc(F.vitals?.rr)}</div></div>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="sig-row"><div class="lbl">Doctor Name:</div><div class="sig-line">${esc(F.doctorName)}</div></div>
      <div class="sig-row"><div class="lbl">Designation:</div><div class="sig-line">${esc(F.doctorDesignation)}</div></div>
      <div class="sig-row"><div class="lbl">Date:</div><div class="sig-line">${esc(F.signDate)}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
      <div class="stamp-box">Stamp</div>
      <div style="font-size:11px;color:#666;margin-top:4px;">Official Stamp / Signature</div>
    </div>
  </div>
</div>
</body></html>`

    const w = window.open('', '_blank'); if (!w) return
    w.document.write(html); w.document.close(); w.focus(); w.print()
  }

  return (
    <div className="space-y-3">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="text-lg font-bold text-slate-800">Refer Out / Transfer Letter</div>

      {/* Patient Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Patient Information</div>
        <div className="grid md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Patient Name</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.patientName || ''} onChange={e => update({ patientName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">MR #</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.mrn || ''} onChange={e => update({ mrn: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.date || ''} onChange={e => update({ date: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-2 mt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Age</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.age || ''} onChange={e => update({ age: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Gender</label>
            <select className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.gender || ''} onChange={e => update({ gender: e.target.value })}>
              <option value="">-</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Address</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.address || ''} onChange={e => update({ address: e.target.value })} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs font-medium text-slate-600 mb-0.5">Contact Number</label>
          <input className="w-full md:w-1/2 border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.phone || ''} onChange={e => update({ phone: e.target.value })} />
        </div>
      </div>

      {/* Referred To */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Referred To (Destination Hospital)</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Hospital / Facility Name</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.referredToHospital || ''} onChange={e => update({ referredToHospital: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Hospital Contact</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.referredToContact || ''} onChange={e => update({ referredToContact: e.target.value })} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs font-medium text-slate-600 mb-0.5">Hospital Address</label>
          <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.referredToAddress || ''} onChange={e => update({ referredToAddress: e.target.value })} />
        </div>
      </div>

      {/* Clinical Details */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Clinical Details</div>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Reason for Referral</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-14 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" value={form.reasonForReferral || ''} onChange={e => update({ reasonForReferral: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Clinical History & Examination</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-20 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" value={form.clinicalHistory || ''} onChange={e => update({ clinicalHistory: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Diagnosis</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-14 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" value={form.diagnosis || ''} onChange={e => update({ diagnosis: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Treatment Given So Far</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-14 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" value={form.treatmentGiven || ''} onChange={e => update({ treatmentGiven: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Investigations / Reports Enclosed</label>
            <textarea className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-14 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none" value={form.investigations || ''} onChange={e => update({ investigations: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vitals at Time of Referral</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { k: 'bp', l: 'BP (mmHg)' },
            { k: 'pulse', l: 'Pulse (bpm)' },
            { k: 'temp', l: 'Temp (°C)' },
            { k: 'spo2', l: 'SpO2 (%)' },
            { k: 'rr', l: 'RR (/min)' },
          ].map(v => (
            <div key={v.k}>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{v.l}</label>
              <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={(form.vitals as any)?.[v.k] || ''} onChange={e => updateVital(v.k as any, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Authorized By</div>
        <div className="grid md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Doctor Name</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.doctorName || ''} onChange={e => update({ doctorName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Designation</label>
            <input className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.doctorDesignation || ''} onChange={e => update({ doctorDesignation: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Sign Date</label>
            <input type="date" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" value={form.signDate || ''} onChange={e => update({ signDate: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-start gap-2 pt-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={printView} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors">Print</button>
      </div>
    </div>
  )
}

function esc(s?: string) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]) }
