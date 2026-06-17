import { Calendar, Clock, Filter } from 'lucide-react'
import { fmt12 } from '../../../utils/timeFormat'

export default function LabReportsFilters({ from, setFrom, to, setTo, fromTime, setFromTime, toTime, setToTime, filterShiftId, setFilterShiftId, shifts, autoRefresh, setAutoRefresh, refreshMs, setRefreshMs, onApply }: {
  from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void
  fromTime: string; setFromTime: (v: string) => void; toTime: string; setToTime: (v: string) => void
  filterShiftId: string; setFilterShiftId: (v: string) => void; shifts: any[]
  autoRefresh: boolean; setAutoRefresh: (v: boolean) => void; refreshMs: number; setRefreshMs: (v: number) => void
  onApply: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Filter className="h-4 w-4" /> Filters
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">From Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">To Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Shift</label>
            <select value={filterShiftId} onChange={e => setFilterShiftId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option value="">All Shifts</option>
              {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto
          </label>
          <select value={String(refreshMs)} onChange={e => setRefreshMs(Number(e.target.value) || 30000)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="10000">10s</option>
            <option value="30000">30s</option>
            <option value="60000">1m</option>
            <option value="300000">5m</option>
          </select>
          <button onClick={onApply} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition">Apply</button>
        </div>
      </div>
    </div>
  )
}
