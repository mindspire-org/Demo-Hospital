import { useEffect, useState } from 'react'
import { dialysisApi } from '../../utils/api'

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

type Props = {
  onConvert: (appt: Appointment) => void
  showToast: (type: 'success' | 'error', message: string) => void
}

export default function Dialysis_AppointmentsList({ onConvert, showToast }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPatientName, setFilterPatientName] = useState('')
  const [filterPhone, setFilterPhone] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const totalPages = Math.ceil(total / limit)

  useEffect(() => {
    loadAppointments()
  }, [filterDate, filterStatus, page, limit])

  async function loadAppointments() {
    setLoading(true)
    try {
      const res: any = await dialysisApi.listAppointments({
        date: filterDate || undefined,
        status: filterStatus || undefined,
        patientName: filterPatientName || undefined,
        phone: filterPhone || undefined,
        page,
        limit,
      })
      setAppointments(res?.items || [])
      setTotal(res?.total || 0)
    } catch {
      showToast('error', 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return
    try {
      await dialysisApi.updateAppointment(id, { status: 'cancelled' })
      showToast('success', 'Appointment cancelled')
      loadAppointments()
    } catch {
      showToast('error', 'Failed to cancel')
    }
  }

  function handleSearch() {
    setPage(1)
    loadAppointments()
  }

  function handlePrev() {
    if (page > 1) setPage(page - 1)
  }

  function handleNext() {
    if (page < totalPages) setPage(page + 1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded shadow p-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1) }}
            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="converted">Converted</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Patient Name</label>
          <input
            type="text"
            value={filterPatientName}
            onChange={e => setFilterPatientName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search..."
            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded px-2 py-1 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Phone</label>
          <input
            type="text"
            value={filterPhone}
            onChange={e => setFilterPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Phone..."
            className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded px-2 py-1 text-sm w-32"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
          Search
        </button>
        <button onClick={() => { setFilterDate(''); setFilterStatus(''); setFilterPatientName(''); setFilterPhone(''); setPage(1) }} className="px-3 py-1 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded text-sm">
          Reset
        </button>
      </div>

      {/* Appointments Table */}
      <div className="bg-white dark:bg-slate-800 rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-700">
            <tr>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">#</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Date</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Time</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Patient</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Phone</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">MRN</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Type</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Shift</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Status</th>
              <th className="text-left p-2 text-slate-700 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-4 text-center text-gray-500 dark:text-slate-400">Loading...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={10} className="p-4 text-center text-gray-500 dark:text-slate-400">No appointments found</td></tr>
            ) : appointments.map((a, idx) => (
              <tr key={a._id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                <td className="p-2 text-gray-500 dark:text-slate-400">{(page - 1) * limit + idx + 1}</td>
                <td className="p-2 dark:text-slate-200">{a.appointmentDate}</td>
                <td className="p-2 dark:text-slate-200">{a.appointmentTime || '-'}</td>
                <td className="p-2 dark:text-slate-200">
                  {a.patientName || '-'}
                  {a.isNewPatient && <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(New)</span>}
                </td>
                <td className="p-2 dark:text-slate-200">{a.patientPhone || '-'}</td>
                <td className="p-2">{a.mrn || <span className="text-gray-400 dark:text-slate-500">-</span>}</td>
                <td className="p-2 dark:text-slate-200">{a.sessionTypeName || '-'}</td>
                <td className="p-2 dark:text-slate-200">{a.shiftName || '-'}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    a.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    a.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    a.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                    a.status === 'converted' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}>
                    {a.status || 'scheduled'}
                  </span>
                </td>
                <td className="p-2">
                  {a.status === 'scheduled' && (
                    <div className="flex gap-1">
                      <button onClick={() => onConvert(a)} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Convert</button>
                      <button onClick={() => handleCancel(a._id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Cancel</button>
                    </div>
                  )}
                  {a.status === 'converted' && a.convertedToTokenId && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">Token created</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded shadow p-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-slate-400">
            Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} appointments
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="px-3 py-1 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              Prev
            </button>
            <span className="text-sm dark:text-slate-300">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
