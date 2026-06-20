import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { ArrowLeft, CheckCircle, Clock, User, Stethoscope, FileText } from 'lucide-react'

export default function OT_CompletedSurgeries() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listOTBookings({ status: 'completed', limit: 200 }) as any
      setBookings(res?.bookings || [])
    } catch {}
    setLoading(false)
  }

  function formatDuration(minutes?: number) {
    if (!minutes) return '-'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot/schedule')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">Completed Surgeries</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Date/Time</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Procedure</th>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Surgeon</th>
                  <th className="px-3 py-2 text-left">Duration</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{b.patientId?.fullName || b.patientData?.fullName || '-'}</td>
                    <td className="px-3 py-2">{b.procedure}</td>
                    <td className="px-3 py-2">{b.roomId?.name || '-'}</td>
                    <td className="px-3 py-2">{b.surgeonId?.name || '-'}</td>
                    <td className="px-3 py-2">{formatDuration(b.estimatedDuration)}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FileText className="h-3 w-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      No completed surgeries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-1.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Surgery Details</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <User className="h-4 w-4" /> Patient
                </div>
                <div className="text-sm text-slate-900">
                  {selectedBooking.patientId?.fullName || selectedBooking.patientData?.fullName || '-'}
                </div>
                {selectedBooking.patientId?.mrn && (
                  <div className="text-xs text-slate-500">MRN: {selectedBooking.patientId.mrn}</div>
                )}
              </div>

              {/* Procedure */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Stethoscope className="h-4 w-4" /> Procedure
                </div>
                <div className="text-sm text-slate-900">{selectedBooking.procedure}</div>
                {selectedBooking.procedureCode && (
                  <div className="text-xs text-slate-500">Code: {selectedBooking.procedureCode}</div>
                )}
              </div>

              {/* Team & Logistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Room</div>
                  <div className="text-sm text-slate-900">{selectedBooking.roomId?.name || '-'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Surgeon</div>
                  <div className="text-sm text-slate-900">{selectedBooking.surgeonId?.name || '-'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Scheduled</div>
                  <div className="text-sm text-slate-900">
                    {selectedBooking.scheduledAt ? new Date(selectedBooking.scheduledAt).toLocaleString() : '-'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Duration</div>
                  <div className="text-sm text-slate-900">{formatDuration(selectedBooking.estimatedDuration)}</div>
                </div>
              </div>

              {/* Anesthesia */}
              {selectedBooking.anesthesiaDetails && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Anesthesia</div>
                  <div className="text-sm text-slate-700">
                    {selectedBooking.anesthesiaType && <span className="mr-3">Type: {selectedBooking.anesthesiaType}</span>}
                    {selectedBooking.anesthesiaDetails.asaClass && <span>ASA: {selectedBooking.anesthesiaDetails.asaClass}</span>}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {selectedBooking.equipment?.requiredEquipment && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Required Equipment</div>
                  <div className="text-sm text-slate-700">{selectedBooking.equipment.requiredEquipment}</div>
                </div>
              )}

              {/* Implants */}
              {selectedBooking.equipment?.implants && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Implants / Consumables</div>
                  <div className="text-sm text-slate-700">{selectedBooking.equipment.implants}</div>
                </div>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</div>
                  <div className="text-sm text-slate-700">{selectedBooking.notes}</div>
                </div>
              )}

              {/* Post-op */}
              {selectedBooking.postOpPlan && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Post-Op Plan</div>
                  <div className="text-sm text-slate-700">
                    {selectedBooking.postOpPlan.destination && <div>Destination: {selectedBooking.postOpPlan.destination}</div>}
                    {selectedBooking.postOpPlan.instructions && <div>Instructions: {selectedBooking.postOpPlan.instructions}</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
