import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import { Calendar, Clock, Plus, ArrowLeft, AlertTriangle, CheckCircle, Shield, Siren } from 'lucide-react'
import { OTBookingModal } from '../../../components/hospital/OT_BookingModal'

export default function OT_Schedule() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<any[]>([])
  const [safetyChecks, setSafetyChecks] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showTimeoutModal, setShowTimeoutModal] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await hospitalApi.listOTBookings({ limit: 100 }) as any
      const bookingsData = res?.bookings || []
      setBookings(bookingsData)
      
      // Load safety check status for in-progress surgeries
      const inProgressBookings = bookingsData.filter((b: any) => b.status === 'in-progress')
      const safetyData: Record<string, any> = {}
      for (const booking of inProgressBookings) {
        if (booking.encounterId?._id) {
          try {
            const safetyRes = await hospitalApi.getIpdSurgicalSafety?.(booking.encounterId._id) as any
            if (safetyRes) safetyData[booking._id] = safetyRes
          } catch {}
        }
      }
      setSafetyChecks(safetyData)
    } catch {}
    setLoading(false)
  }

  function getTimeoutStatus(booking: any) {
    const safety = safetyChecks[booking._id]
    if (!safety) return 'pending'
    if (safety.status === 'completed' || safety.status === 'time-out-complete') return 'completed'
    if (safety.timeOut?.timeOutCompletedAt) return 'completed'
    if (safety.status === 'sign-in-complete') return 'sign-in-done'
    return 'pending'
  }

  function openTimeoutModal(booking: any) {
    setSelectedBooking(booking)
    setShowTimeoutModal(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hospital/ot')} className="text-slate-600 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">Surgery Schedule</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <span className="font-medium">All Scheduled Surgeries</span>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </button>
        </div>

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
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const timeoutStatus = getTimeoutStatus(b)
                  const showTimeoutAlert = b.status === 'in-progress' && timeoutStatus !== 'completed'
                  const isEmergency = b.priority === 'emergency'
                  
                  return (
                  <tr key={b._id} className={`border-b border-slate-100 hover:bg-slate-50 ${showTimeoutAlert ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '-'}
                        {isEmergency && <Siren className="h-4 w-4 text-red-600 ml-1" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">{b.patientId?.fullName || b.patientData?.fullName || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {b.procedure}
                        {b.anesthesiaDetails?.asaClass && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {b.anesthesiaDetails.asaClass}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">{b.roomId?.name || '-'}</td>
                    <td className="px-3 py-2">{b.surgeonId?.name || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium w-fit ${
                          b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                          b.status === 'completed' ? 'bg-green-100 text-green-700' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {b.status}
                        </span>
                        {showTimeoutAlert && (
                          <button
                            onClick={() => openTimeoutModal(b)}
                            className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 w-fit"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            TIMEOUT REQUIRED
                          </button>
                        )}
                        {b.status === 'in-progress' && timeoutStatus === 'completed' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Timeout Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <OTBookingModal
          onClose={() => setShowBookingModal(false)}
          onCreated={() => { setShowBookingModal(false); load() }}
        />
      )}

      {/* Timeout Enforcement Modal */}
      {showTimeoutModal && selectedBooking && (
        <TimeoutEnforcementModal
          booking={selectedBooking}
          onClose={() => setShowTimeoutModal(false)}
          onCompleted={() => { setShowTimeoutModal(false); load() }}
        />
      )}
    </div>
  )
}

// WHO Timeout Enforcement Modal
function TimeoutEnforcementModal({ booking, onClose, onCompleted }: { booking: any; onClose: () => void; onCompleted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [checks, setChecks] = useState({
    patientConfirmed: false,
    procedureConfirmed: false,
    siteConfirmed: false,
    antibioticGiven: false,
    antibioticName: '',
    antibioticTime: '',
    imagingDisplayed: false,
    criticalStepsDiscussed: false,
  })

  // Calculate if within 60-min window
  const incisionTime = new Date()
  const antibioticTime = checks.antibioticTime ? new Date(checks.antibioticTime) : null
  const minutesToIncision = antibioticTime 
    ? Math.round((incisionTime.getTime() - antibioticTime.getTime()) / 60000)
    : null
  const isWithinWindow = minutesToIncision !== null && minutesToIncision >= 0 && minutesToIncision <= 60

  async function handleComplete() {
    if (!checks.patientConfirmed || !checks.procedureConfirmed || !checks.siteConfirmed) {
      alert('All critical confirmations (Patient, Procedure, Site) are mandatory per WHO guidelines')
      return
    }
    
    setLoading(true)
    try {
      // Update surgical safety record
      await hospitalApi.updateIpdSurgicalSafety?.(booking.encounterId._id, {
        timeOut: {
          teamMembersIntroduced: true,
          procedureConfirmed: checks.procedureConfirmed,
          correctSiteConfirmed: checks.siteConfirmed,
          correctPatientConfirmed: checks.patientConfirmed,
          antibioticGiven: checks.antibioticGiven,
          antibioticName: checks.antibioticName || undefined,
          antibioticGivenAt: checks.antibioticTime || undefined,
          imagingDisplayed: checks.imagingDisplayed ? 'Yes' : 'No',
          criticalStepsDiscussed: checks.criticalStepsDiscussed ? 'Yes' : 'No',
          timeOutCompletedAt: new Date().toISOString(),
          surgeonName: booking.surgeonId?.name,
        },
        status: 'time-out-complete'
      })
      onCompleted()
    } catch (e: any) {
      alert(e?.message || 'Failed to complete timeout')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-200 bg-amber-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <Shield className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">WHO Surgical Timeout</h2>
                <p className="text-sm text-slate-600">Mandatory before incision per JCI/WHO standards</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Info Banner */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Patient:</span> <strong>{booking.patientId?.fullName || booking.patientData?.fullName}</strong></div>
              <div><span className="text-slate-500">Procedure:</span> <strong>{booking.procedure}</strong></div>
              <div><span className="text-slate-500">Surgeon:</span> <strong>{booking.surgeonId?.name}</strong></div>
              <div><span className="text-slate-500">Room:</span> <strong>{booking.roomId?.name}</strong></div>
            </div>
            {booking.priority === 'emergency' && (
              <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded text-sm">
                <Siren className="h-4 w-4" />
                <strong>Emergency Surgery - Document any waived items</strong>
              </div>
            )}
          </div>

          {/* Critical Confirmations */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Critical Confirmations (Mandatory)
            </h3>
            
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.patientConfirmed}
                onChange={(e) => setChecks({...checks, patientConfirmed: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
              />
              <div>
                <div className="font-medium text-slate-800">Correct Patient Verified</div>
                <div className="text-sm text-slate-500">Patient identity confirmed with ID band and verbal confirmation</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.procedureConfirmed}
                onChange={(e) => setChecks({...checks, procedureConfirmed: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
              />
              <div>
                <div className="font-medium text-slate-800">Correct Procedure Confirmed</div>
                <div className="text-sm text-slate-500">Procedure name and laterality confirmed with team</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.siteConfirmed}
                onChange={(e) => setChecks({...checks, siteConfirmed: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
              />
              <div>
                <div className="font-medium text-slate-800">Surgical Site Marked & Confirmed</div>
                <div className="text-sm text-slate-500">Site marked and visible, laterality confirmed</div>
              </div>
            </label>
          </div>

          {/* Antibiotic Prophylaxis */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-800">Antibiotic Prophylaxis (SCIP/NICE Guidelines)</h3>
            
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.antibioticGiven}
                onChange={(e) => setChecks({...checks, antibioticGiven: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Antibiotic Prophylaxis Given</div>
                {checks.antibioticGiven && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Antibiotic name (e.g., Cefazolin)"
                      value={checks.antibioticName}
                      onChange={(e) => setChecks({...checks, antibioticName: e.target.value})}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={checks.antibioticTime}
                        onChange={(e) => setChecks({...checks, antibioticTime: e.target.value})}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      {minutesToIncision !== null && (
                        <div className={`flex items-center px-3 py-2 rounded text-sm font-medium ${
                          isWithinWindow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isWithinWindow 
                            ? `✓ Within 60-min window (${minutesToIncision} min)` 
                            : `⚠ ${minutesToIncision > 60 ? 'Given >60 min ago' : 'Not yet given'}`}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Per SCIP guidelines: Antibiotics should be given within 60 minutes before incision (120 min for Vancomycin)
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Additional Checks */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-800">Additional Team Confirmations</h3>
            
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.imagingDisplayed}
                onChange={(e) => setChecks({...checks, imagingDisplayed: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600"
              />
              <div>
                <div className="font-medium text-slate-800">Required Imaging Displayed</div>
                <div className="text-sm text-slate-500">X-ray/CT/MRI visible and correctly oriented</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={checks.criticalStepsDiscussed}
                onChange={(e) => setChecks({...checks, criticalStepsDiscussed: e.target.checked})}
                className="mt-1 h-4 w-4 rounded border border-slate-300 text-amber-600"
              />
              <div>
                <div className="font-medium text-slate-800">Critical Steps & Risks Discussed</div>
                <div className="text-sm text-slate-500">Expected duration, blood loss risk, special equipment discussed</div>
              </div>
            </label>
          </div>

          {/* Emergency Override Note */}
          {booking.priority === 'emergency' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <Siren className="h-4 w-4" />
                Emergency Override Documentation
              </div>
              <p className="text-sm text-amber-700 mb-2">
                For emergency surgeries, document any items that were waived due to time constraints:
              </p>
              <textarea
                placeholder="e.g., Imaging not available - proceeding based on clinical assessment..."
                className="w-full rounded-md border border-amber-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {booking.priority === 'emergency' ? 'Emergency protocol active - document waived items' : 'All critical items mandatory per WHO'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={loading || !checks.patientConfirmed || !checks.procedureConfirmed || !checks.siteConfirmed}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Complete Timeout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}