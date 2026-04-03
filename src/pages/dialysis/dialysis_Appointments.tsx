import { useEffect, useRef, useState } from 'react'
import { dialysisApi } from '../../utils/api'
import { getLocalDate } from '../../utils/date'
import Dialysis_AppointmentsList from '../../components/dialysis/Dialysis_AppointmentsList'

type Appointment = {
  _id: string
  labPatientId?: string
  mrn?: string
  newPatientName?: string
  newPatientPhone?: string
  newPatientGender?: string
  newPatientAge?: string
  patientName?: string
  patientPhone?: string
  patientGender?: string
  patientAge?: string
  isNewPatient?: boolean
  appointmentDate: string
  appointmentTime?: string
  sessionTypeId?: string
  sessionTypeName?: string
  shiftId?: string
  shiftName?: string
  machineId?: string
  machineName?: string
  dialyzerTypeId?: string
  dialyzerTypeName?: string
  duration?: number
  notes?: string
  status?: string
  convertedToTokenId?: string
  createdAt?: string
}

export default function Dialysis_Appointments() {
  const [view, setView] = useState<'list' | 'book'>('list')
  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState<Array<{ _id: string; name: string }>>([])
  const [shifts, setShifts] = useState<Array<{ _id: string; name: string }>>([])
  const [sessionTypes, setSessionTypes] = useState<Array<{ _id: string; name: string; price?: number }>>([])
  const [dialyzerTypes, setDialyzerTypes] = useState<Array<{ _id: string; name: string }>>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Booking form
  const [form, setForm] = useState({
    phone: '',
    mrn: '',
    patientName: '',
    age: '',
    gender: '',
    guardianName: '',
    guardianRel: '',
    cnic: '',
    address: '',
    appointmentDate: getLocalDate(),
    appointmentTime: '09:00',
    sessionTypeId: '',
    shiftId: '',
    machineId: '',
    dialyzerTypeId: '',
    duration: '4',
    notes: '',
  })
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [isNewPatient, setIsNewPatient] = useState(false)

  // Patient suggestions
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false)
  const [nameSuggestItems, setNameSuggestItems] = useState<any[]>([])
  const nameSuggestWrapRef = useRef<HTMLDivElement>(null)

  // Convert modal
  const [convertModal, setConvertModal] = useState<{ open: boolean; appt: Appointment | null; fee: string; discount: string; receivedAmount: string }>({
    open: false, appt: null, fee: '0', discount: '0', receivedAmount: '0',
  })

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Load settings
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [mRes, sRes, tRes, dRes] = await Promise.all([
          dialysisApi.listMachines() as any,
          dialysisApi.listShifts() as any,
          dialysisApi.listSessionTypes() as any,
          dialysisApi.listDialyzerTypes() as any,
        ])
        if (!mounted) return
        setMachines((mRes?.items || mRes || []).map((x: any) => ({ _id: String(x._id || x.id), name: x.name })))
        setShifts((sRes?.items || sRes || []).map((x: any) => ({ _id: String(x._id || x.id), name: x.name })))
        setSessionTypes((tRes?.items || tRes || []).map((x: any) => ({ _id: String(x._id || x.id), name: x.name, price: x.price })))
        setDialyzerTypes((dRes?.items || dRes || []).map((x: any) => ({ _id: String(x._id || x.id), name: x.name })))
        setForm(prev => ({
          ...prev,
          sessionTypeId: prev.sessionTypeId || String((tRes?.items?.[0] as any)?._id || ''),
          shiftId: prev.shiftId || String((sRes?.items?.[0] as any)?._id || ''),
          dialyzerTypeId: prev.dialyzerTypeId || String((dRes?.items?.[0] as any)?._id || ''),
        }))
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // List component refresh key to force reload after booking
  const [listKey, setListKey] = useState(0)

  // Close suggestion dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (phoneSuggestWrapRef.current && !phoneSuggestWrapRef.current.contains(e.target as Node)) {
        setPhoneSuggestOpen(false)
      }
      if (nameSuggestWrapRef.current && !nameSuggestWrapRef.current.contains(e.target as Node)) {
        setNameSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Phone suggestion lookup
  async function lookupByPhone(digits: string) {
    if (digits.length < 4) {
      setPhoneSuggestOpen(false)
      return
    }
    try {
      const r: any = await dialysisApi.searchPatients({ phone: digits, limit: 8 })
      const list = Array.isArray(r?.patients) ? r.patients : []
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
      if (list.length === 0) {
        setIsNewPatient(true)
        setSelectedPatientId('')
      }
    } catch {
      setPhoneSuggestOpen(false)
    }
  }

  // Name suggestion lookup
  async function lookupByName(name: string) {
    if (name.length < 2) {
      setNameSuggestOpen(false)
      return
    }
    try {
      const r: any = await dialysisApi.searchPatients({ name, limit: 8 })
      const list = Array.isArray(r?.patients) ? r.patients : []
      setNameSuggestItems(list)
      setNameSuggestOpen(list.length > 0)
    } catch {
      setNameSuggestOpen(false)
    }
  }

  function selectPatient(p: any) {
    setForm(prev => ({
      ...prev,
      phone: p.phoneNormalized || prev.phone,
      mrn: p.mrn || '',
      patientName: p.fullName || '',
      age: p.age || '',
      gender: p.gender || '',
      guardianName: p.fatherName || '',
      guardianRel: p.guardianRel || '',
      cnic: p.cnicNormalized || '',
      address: p.address || '',
    }))
    setSelectedPatientId(String(p._id || ''))
    setIsNewPatient(false)
    setPhoneSuggestOpen(false)
    setNameSuggestOpen(false)
    showToast('success', 'Existing patient selected - MRN will be preserved')
  }

  function clearPatient() {
    setForm(prev => ({
      ...prev,
      phone: '',
      mrn: '',
      patientName: '',
      age: '',
      gender: '',
      guardianName: '',
      guardianRel: '',
      cnic: '',
      address: '',
    }))
    setSelectedPatientId('')
    setIsNewPatient(false)
  }

  async function handleBook() {
    if (!form.appointmentDate) {
      showToast('error', 'Appointment date is required')
      return
    }
    if (!selectedPatientId && !form.patientName) {
      showToast('error', 'Patient name is required')
      return
    }

    setLoading(true)
    try {
      const st = sessionTypes.find(s => s._id === form.sessionTypeId)
      const sh = shifts.find(s => s._id === form.shiftId)
      const m = machines.find(m => m._id === form.machineId)
      const d = dialyzerTypes.find(d => d._id === form.dialyzerTypeId)

      await dialysisApi.createAppointment({
        labPatientId: selectedPatientId || undefined,
        mrn: form.mrn || undefined,
        patientName: form.patientName,
        phone: form.phone,
        cnic: form.cnic,
        gender: form.gender,
        age: form.age,
        guardianName: form.guardianName,
        guardianRel: form.guardianRel,
        address: form.address,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        sessionTypeId: form.sessionTypeId,
        sessionTypeName: st?.name,
        shiftId: form.shiftId,
        shiftName: sh?.name,
        machineId: form.machineId,
        machineName: m?.name,
        dialyzerTypeId: form.dialyzerTypeId,
        dialyzerTypeName: d?.name,
        duration: parseInt(form.duration) || 4,
        notes: form.notes,
      })
      showToast('success', 'Appointment booked successfully')
      setView('list')
      setListKey(k => k + 1)
      clearPatient()
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  function openConvertModal(appt: Appointment) {
    const st = sessionTypes.find(s => s._id === appt.sessionTypeId)
    const fee = st?.price || 0
    setConvertModal({ open: true, appt, fee: String(fee), discount: '0', receivedAmount: String(fee) })
  }

  async function handleConvert() {
    const { appt, fee, discount, receivedAmount } = convertModal
    if (!appt) return
    setLoading(true)
    try {
      const res: any = await dialysisApi.convertAppointmentToToken(appt._id, {
        fee: parseFloat(fee) || 0,
        discount: parseFloat(discount) || 0,
        receivedAmount: parseFloat(receivedAmount) || 0,
      })
      showToast('success', `Token ${res?.token?.tokenNo} created successfully`)
      setConvertModal({ open: false, appt: null, fee: '0', discount: '0', receivedAmount: '0' })
      setListKey(k => k + 1)
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to convert')
    } finally {
      setLoading(false)
    }
  }

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="p-4 min-h-screen bg-slate-50 dark:bg-slate-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Dialysis Center Information</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('list')} className={`px-4 py-2 rounded ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 dark:text-slate-200'}`}>
            List
          </button>
          <button onClick={() => setView('book')} className={`px-4 py-2 rounded ${view === 'book' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 dark:text-slate-200'}`}>
            Book Appointment
          </button>
        </div>
      </div>

      {view === 'list' && (
        <Dialysis_AppointmentsList
          key={listKey}
          onConvert={openConvertModal}
          showToast={showToast}
        />
      )}

      {view === 'book' && (
        <div className="bg-white dark:bg-slate-800 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4 dark:text-slate-100">Book New Appointment</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            If patient exists, their MRN will be preserved. New patients will NOT get an MRN until the appointment is converted to a token.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Patient Info */}
            <div className="col-span-full">
              <h3 className="font-medium text-gray-700 dark:text-slate-300 mb-2">Patient Information</h3>
            </div>

            <div className="relative" ref={phoneSuggestWrapRef}>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => { update('phone', e.target.value); lookupByPhone(e.target.value.replace(/\D+/g, '')) }}
                placeholder="Enter phone to search patient"
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
              {phoneSuggestOpen && phoneSuggestItems.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow max-h-48 overflow-y-auto">
                  {phoneSuggestItems.map(p => (
                    <div key={p._id} onClick={() => selectPatient(p)} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer text-sm dark:text-slate-200">
                      <div className="font-medium">{p.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">MRN: {p.mrn} | {p.phoneNormalized}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={nameSuggestWrapRef}>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Patient Name</label>
              <input
                type="text"
                value={form.patientName}
                onChange={e => { update('patientName', e.target.value); lookupByName(e.target.value) }}
                placeholder="Enter name"
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
              />
              {nameSuggestOpen && nameSuggestItems.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow max-h-48 overflow-y-auto">
                  {nameSuggestItems.map(p => (
                    <div key={p._id} onClick={() => selectPatient(p)} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-600 cursor-pointer text-sm dark:text-slate-200">
                      <div className="font-medium">{p.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">MRN: {p.mrn} | {p.phoneNormalized}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">MRN {selectedPatientId ? '(Existing)' : isNewPatient ? '(Will be assigned on conversion)' : ''}</label>
              <input
                type="text"
                value={form.mrn}
                onChange={e => update('mrn', e.target.value)}
                placeholder="MRN"
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-600 dark:text-slate-300"
                readOnly={!!selectedPatientId}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Age</label>
              <input type="text" value={form.age} onChange={e => update('age', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Gender</label>
              <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">CNIC</label>
              <input type="text" value={form.cnic} onChange={e => update('cnic', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Guardian Name</label>
              <input type="text" value={form.guardianName} onChange={e => update('guardianName', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Guardian Relation</label>
              <select value={form.guardianRel} onChange={e => update('guardianRel', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                <option value="Father">Father</option>
                <option value="Husband">Husband</option>
                <option value="Son">Son</option>
                <option value="Brother">Brother</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Address</label>
              <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            {/* Appointment Details */}
            <div className="col-span-full mt-4">
              <h3 className="font-medium text-gray-700 dark:text-slate-300 mb-2">Appointment Details</h3>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Appointment Date *</label>
              <input type="date" value={form.appointmentDate} onChange={e => update('appointmentDate', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Time</label>
              <input type="time" value={form.appointmentTime} onChange={e => update('appointmentTime', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Session Type</label>
              <select value={form.sessionTypeId} onChange={e => update('sessionTypeId', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                {sessionTypes.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Shift</label>
              <select value={form.shiftId} onChange={e => update('shiftId', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                {shifts.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Machine</label>
              <select value={form.machineId} onChange={e => update('machineId', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                {machines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Dialyzer Type</label>
              <select value={form.dialyzerTypeId} onChange={e => update('dialyzerTypeId', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                <option value="">Select</option>
                {dialyzerTypes.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Duration (hrs)</label>
              <input type="number" value={form.duration} onChange={e => update('duration', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleBook} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>
            <button onClick={clearPatient} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600">Clear</button>
            <button onClick={() => setView('list')} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Convert to Token Modal */}
      {convertModal.open && convertModal.appt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Convert Appointment to Token</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Patient: <strong className="dark:text-slate-200">{convertModal.appt.patientName}</strong>
              {convertModal.appt.isNewPatient && <span className="ml-2 text-blue-600 dark:text-blue-400">(New patient - MRN will be assigned)</span>}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Fee</label>
                <input type="number" value={convertModal.fee} onChange={e => setConvertModal(prev => ({ ...prev, fee: e.target.value }))} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Discount</label>
                <input type="number" value={convertModal.discount} onChange={e => setConvertModal(prev => ({ ...prev, discount: e.target.value }))} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Received Amount</label>
                <input type="number" value={convertModal.receivedAmount} onChange={e => setConvertModal(prev => ({ ...prev, receivedAmount: e.target.value }))} className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleConvert} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Converting...' : 'Convert to Token'}
              </button>
              <button onClick={() => setConvertModal({ open: false, appt: null, fee: '0', discount: '0', receivedAmount: '0' })} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
