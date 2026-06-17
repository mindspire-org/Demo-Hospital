import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, ArrowRight, Bed, Home, Building2, User, LogOut, FileText, AlertCircle } from 'lucide-react'

export default function ICU_Transfer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null)
  const [wards, setWards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const admissionId = searchParams.get('admission')

  const [form, setForm] = useState({
    destination: 'ward' as 'ward' | 'home' | 'other-hospital' | 'deceased',
    targetWardId: '',
    targetHospital: '',
    dischargeSummary: '',
    followUpInstructions: '',
    medications: '',
    dischargedAt: new Date().toISOString().slice(0, 16),
  })

  useEffect(() => {
    loadAdmissions()
    loadWards()
  }, [])

  useEffect(() => {
    if (admissionId && admissions.length > 0) {
      const adm = admissions.find(a => a._id === admissionId)
      if (adm) setSelectedAdmission(adm)
    }
  }, [admissionId, admissions])

  async function loadAdmissions() {
    setLoading(true)
    try {
      const res = await hospitalApi.listICUAdmissions({ status: 'active', limit: 100 }) as any
      const list = res?.admissions || []
      setAdmissions(list)
      if (admissionId && list.length > 0) {
        const adm = list.find((a: any) => a._id === admissionId)
        if (adm) setSelectedAdmission(adm)
      }
    } catch {}
    setLoading(false)
  }

  async function loadWards() {
    try {
      const res = await hospitalApi.listWards({ active: true }) as any
      setWards(res?.wards || [])
    } catch {}
  }

  function selectAdmission(adm: any) {
    setSelectedAdmission(adm)
    setSearchParams({ admission: adm._id })
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAdmission) return
    if (!confirm(`Transfer/discharge patient ${patientName}?`)) return

    setSaving(true)
    try {
      const data: any = {
        status: form.destination === 'deceased' ? 'deceased' : 'discharged',
        dischargeDestination: form.destination,
        dischargeSummary: form.dischargeSummary,
        dischargedAt: form.dischargedAt,
      }
      await hospitalApi.updateICUAdmission(selectedAdmission._id, data)
      navigate('/hospital/icu')
    } catch {}
    setSaving(false)
  }

  const patientName = selectedAdmission?.patientId
    ? `${selectedAdmission.patientId.firstName || ''} ${selectedAdmission.patientId.lastName || ''}`.trim() || 'Unknown'
    : 'Select Patient'

  const destinations = [
    { value: 'ward', label: 'General Ward', icon: Bed, desc: 'Transfer to IPD ward' },
    { value: 'home', label: 'Home Discharge', icon: Home, desc: 'Discharge to home' },
    { value: 'other-hospital', label: 'Other Hospital', icon: Building2, desc: 'Transfer to external facility' },
    { value: 'deceased', label: 'Deceased', icon: AlertCircle, desc: 'Record patient death', danger: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/icu')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">Transfer / Discharge Patient</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Patient List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-700">
            <User className="h-4 w-4" />
            Active Patients ({admissions.length})
          </h3>
          {loading ? (
            <div className="py-4 text-center text-sm text-slate-500">Loading...</div>
          ) : admissions.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-500">No active ICU patients</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {admissions.map((adm) => {
                const name = adm.patientId
                  ? `${adm.patientId.firstName || ''} ${adm.patientId.lastName || ''}`.trim() || 'Unknown'
                  : 'Unknown'
                const isSelected = selectedAdmission?._id === adm._id
                return (
                  <button
                    key={adm._id}
                    onClick={() => selectAdmission(adm)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-800">{name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Bed: {adm.bedId?.name || 'Unassigned'} • {new Date(adm.admittedAt).toLocaleDateString()}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Transfer Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2">
              <LogOut className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-800">{patientName}</h3>
              {selectedAdmission && (
                <p className="text-sm text-slate-500">
                  Bed: {selectedAdmission.bedId?.name || 'Unassigned'} • Admitted: {new Date(selectedAdmission.admittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {!selectedAdmission ? (
            <div className="py-12 text-center text-slate-500">
              <ArrowRight className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              Select a patient to transfer or discharge
            </div>
          ) : (
            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Destination Cards */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
                <div className="grid grid-cols-2 gap-3">
                  {destinations.map(({ value, label, icon: Icon, desc, danger }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, destination: value as any })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        form.destination === value
                          ? danger
                            ? 'border-red-500 bg-red-50'
                            : 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${danger ? 'text-red-600' : 'text-slate-600'}`} />
                        <span className={`font-medium ${danger ? 'text-red-700' : 'text-slate-800'}`}>{label}</span>
                      </div>
                      <div className={`mt-1 text-xs ${danger ? 'text-red-600' : 'text-slate-500'}`}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields */}
              {form.destination === 'ward' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Target Ward</label>
                  <select
                    value={form.targetWardId}
                    onChange={(e) => setForm({ ...form, targetWardId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select ward...</option>
                    {wards.map((w) => (
                      <option key={w._id} value={w._id}>{w.name} (Floor {w.floor})</option>
                    ))}
                  </select>
                </div>
              )}

              {form.destination === 'other-hospital' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Target Hospital/Facility</label>
                  <input
                    type="text"
                    value={form.targetHospital}
                    onChange={(e) => setForm({ ...form, targetHospital: e.target.value })}
                    placeholder="Enter hospital name"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              )}

              {/* Discharge Summary */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Discharge Summary
                </label>
                <textarea
                  value={form.dischargeSummary}
                  onChange={(e) => setForm({ ...form, dischargeSummary: e.target.value })}
                  placeholder="Clinical course, treatment provided, condition at discharge..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={4}
                />
              </div>

              {/* Follow-up / Medications */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Follow-up Instructions</label>
                  <textarea
                    value={form.followUpInstructions}
                    onChange={(e) => setForm({ ...form, followUpInstructions: e.target.value })}
                    placeholder="Appointment date, special instructions..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Discharge Medications</label>
                  <textarea
                    value={form.medications}
                    onChange={(e) => setForm({ ...form, medications: e.target.value })}
                    placeholder="Medications to continue..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>

              {/* Discharge Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Discharge Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.dischargedAt}
                  onChange={(e) => setForm({ ...form, dischargedAt: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/hospital/icu')}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-md px-4 py-2 text-sm text-white ${
                    form.destination === 'deceased'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {saving ? 'Processing...' : form.destination === 'deceased' ? 'Record Death' : 'Complete Transfer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
