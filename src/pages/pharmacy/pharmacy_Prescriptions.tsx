import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Search, ArrowRight, FileText } from 'lucide-react'
import MiniDashboard from '../../components/common/MiniDashboard'

export default function Pharmacy_Prescriptions(){
  const [id, setId] = useState('')
  const navigate = useNavigate()

  const open = (e?: React.FormEvent) => {
    e?.preventDefault()
    const v = id.trim()
    if (!v) return
    navigate(`/pharmacy/prescriptions/${encodeURIComponent(v)}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><ClipboardList className="h-5 w-5" /></div>
        <h1 className="text-xl font-bold text-slate-800">Prescription Intake</h1>
      </div>

      <MiniDashboard cards={[
        { label: 'Quick Import', value: 'Enter ID', icon: Search, color: 'bg-violet-500' },
        { label: 'Auto-forward', value: '→ POS', icon: ArrowRight, color: 'bg-sky-500' },
        { label: 'Source', value: 'Doctor Rx', icon: FileText, color: 'bg-emerald-500' },
        { label: 'Status', value: 'Ready', icon: ClipboardList, color: 'bg-amber-500' },
      ]} />

      <form onSubmit={open} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm text-slate-600">Paste the Prescription ID shared by the doctor to import medicines directly into POS.</div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={id} onChange={e=>setId(e.target.value)} placeholder="Prescription ID" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none" />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Open <ArrowRight className="h-4 w-4" /></button>
        </div>
      </form>
    </div>
  )
}
