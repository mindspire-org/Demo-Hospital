import { useEffect, useMemo, useState } from 'react'
import { Filter, Printer, RefreshCw, Search, Plus, X, User } from 'lucide-react'
import { api } from '../../api'
import { openPatientCardPrint } from '../../components/lab/PatientCardPrint'

type Card = {
  _id: string
  patientId: string
  cardKind: string
  cardNo: string
  issuedAt: string
  expiresAt?: string
  validVisits: number
  visitsUsed: number
  scheme?: string
  status: 'active' | 'expired' | 'cancelled'
  patientName?: string
  mrn?: string
  hospitalRegistrationNumber?: string
  patientImageUrl?: string
  phone?: string
  cnic?: string
  bloodGroup?: string
}

type LabSettings = {
  labName?: string
  phone?: string
  address?: string
  email?: string
}

const KIND_INFO: Record<string, { label: string; months: number; visits: number }> = {
  general: { label: 'General (12 m, Unlimited)', months: 12, visits: 0 },
  gynae9m: { label: 'Gynaecology (9 m, 9 Visits)', months: 9, visits: 9 },
  hep3m: { label: 'Hepatitis (3 m, 6 Visits)', months: 3, visits: 6 },
  tb2y: { label: 'TB (24 m, 24 Visits)', months: 24, visits: 24 },
  mdrtb2y: { label: 'MDR-TB (24 m, 36 Visits)', months: 24, visits: 36 },
  admitted: { label: 'Admitted (1 m, Unlimited)', months: 1, visits: 0 },
}

export default function Lab_PatientCards() {
  const [items, setItems] = useState<Card[]>([])
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<LabSettings>({})

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [cardKind, setCardKind] = useState('general')
  const [validVisits, setValidVisits] = useState(0)
  const [scheme, setScheme] = useState('')
  const [notes, setNotes] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadSettings() {
    try {
      const res = await api('/lab/settings')
      if (res) setSettings(res)
    } catch (err) {
      console.error('Failed to load settings', err)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const qParams = new URLSearchParams()
      if (kind) qParams.set('kind', kind)
      if (status) qParams.set('status', status)
      const r = await api(`/lab/patient-cards?${qParams}`)
      setItems(r.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    load()
  }, [kind, status])

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase()
    if (!f) return items
    return items.filter(c => 
      String(c.cardNo || '').toLowerCase().includes(f) || 
      String(c.patientName || '').toLowerCase().includes(f) || 
      String(c.mrn || '').toLowerCase().includes(f) || 
      String(c.hospitalRegistrationNumber || '').toLowerCase().includes(f)
    )
  }, [items, q])

  // Prefill visits based on kind
  useEffect(() => {
    const info = KIND_INFO[cardKind]
    if (info) {
      setValidVisits(info.visits)
    }
  }, [cardKind])

  // Search patients for issuing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await api(`/lab/patients?search=${encodeURIComponent(searchQuery)}&limit=10`)
        setSearchResults(res?.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) return

    setIsSubmitting(false)
    try {
      const payload = {
        patientId: selectedPatient._id,
        cardKind,
        validVisits,
        scheme,
        notes,
      }
      const newCard = await api('/lab/patient-cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // Close and reset
      setIsModalOpen(false)
      setSelectedPatient(null)
      setSearchQuery('')
      setScheme('')
      setNotes('')
      setCardKind('general')

      // Reload
      await load()

      // Automatically print the newly generated card!
      if (newCard) {
        print({
          ...newCard,
          patientName: selectedPatient.fullName,
          mrn: selectedPatient.mrn,
          hospitalRegistrationNumber: selectedPatient.hospitalRegistrationNumber,
          patientImageUrl: selectedPatient.patientImageUrl,
          phone: selectedPatient.phoneNormalized,
          cnic: selectedPatient.cnicNormalized,
          bloodGroup: selectedPatient.bloodGroup,
        })
      }
    } catch (err) {
      console.error(err)
      alert('Failed to issue patient card')
    }
  }

  function print(c: Card) {
    openPatientCardPrint({
      patientId: c.patientId,
      fullName: c.patientName || '',
      mrn: c.mrn,
      hospitalRegistrationNumber: c.hospitalRegistrationNumber,
      patientImageUrl: c.patientImageUrl,
      phone: c.phone,
      cnic: c.cnic,
      bloodGroup: c.bloodGroup,
      cardNo: c.cardNo,
      cardKind: c.cardKind,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      validVisits: c.validVisits,
      labName: settings.labName,
      labAddress: settings.address,
      labPhone: settings.phone,
      email: settings.email,
    })
    api(`/lab/patient-cards/${c._id}/printed`, { method: 'POST', body: JSON.stringify({}) }).catch(() => {})
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Patient Cards</h2>
            <div className="mt-0.5 text-sm text-sky-100">Print and track issued patient cards</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3px]" /> Issue New Card
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-sky-700">Total Cards</div>
            <div className="text-3xl font-extrabold tracking-tight text-sky-900">{items.length}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-emerald-700">Active</div>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-900">{items.filter(x => x.status === 'active').length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="text-xs font-medium text-amber-700">Expired</div>
            <div className="text-3xl font-extrabold tracking-tight text-amber-900">{items.filter(x => x.status === 'expired').length}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 pb-2">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Kind</span>
            <select value={kind} onChange={e => setKind(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
              <option value="">All</option>
              <option value="gynae9m">Gynaecology (9 m)</option>
              <option value="hep3m">Hepatitis (3 m)</option>
              <option value="tb2y">TB (2 y)</option>
              <option value="mdrtb2y">MDR-TB (2 y)</option>
              <option value="admitted">Admitted</option>
              <option value="general">General</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search card#, patient, MRN, HRN..." className="w-full rounded-md border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3.5">Card #</th>
              <th className="px-4 py-3.5">Patient Name</th>
              <th className="px-4 py-3.5">MRN / HRN</th>
              <th className="px-4 py-3.5">Kind</th>
              <th className="px-4 py-3.5">Issued</th>
              <th className="px-4 py-3.5">Expires</th>
              <th className="px-4 py-3.5">Visits</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-sky-500" /> Loading card details...
                  </div>
                </td>
              </tr>
            )}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">No cards found.</td>
              </tr>
            )}
            {!loading && rows.map(c => (
              <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-sky-700">{c.cardNo}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{c.patientName || '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="font-mono text-xs">{c.mrn || '-'}</div>
                  <div className="text-slate-400 text-[10px]">{c.hospitalRegistrationNumber || '-'}</div>
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium">
                  {c.cardKind === 'general' ? 'General' :
                   c.cardKind === 'gynae9m' ? 'Gynaecology' :
                   c.cardKind === 'hep3m' ? 'Hepatitis' :
                   c.cardKind === 'tb2y' ? 'TB' :
                   c.cardKind === 'mdrtb2y' ? 'MDR-TB' : c.cardKind}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-slate-700 font-semibold">{c.visitsUsed} / {c.validVisits || '∞'}</td>
                <td className="px-4 py-3">
                  {c.status === 'active' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                  ) : c.status === 'expired' ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">Expired</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">Cancelled</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => print(c)} 
                      className="inline-flex items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors shadow-xs"
                      title="Print Patient Card"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print Card
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issuing Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Issue Patient Membership Card</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedPatient(null)
                  setSearchQuery('')
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCard} className="p-6 space-y-4">
              {/* Step 1: Patient Search */}
              <div className="space-y-1 relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                
                {selectedPatient ? (
                  <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50/50 p-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-sky-100 p-2 text-sky-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{selectedPatient.fullName}</div>
                        <div className="text-xs font-mono text-slate-500">
                          MRN: {selectedPatient.mrn} {selectedPatient.phoneNormalized ? `• Phone: ${selectedPatient.phoneNormalized}` : ''}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedPatient(null)}
                      className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search patient by name, phone or MRN..." 
                        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        required
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
                        {searchResults.map(p => (
                          <div 
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p)
                              setSearchResults([])
                            }}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{p.fullName}</div>
                              <div className="text-xs text-slate-500">MRN: {p.mrn} • Phone: {p.phoneNormalized || 'No phone'}</div>
                            </div>
                            <span className="text-xs text-sky-600 font-bold">Select</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Card Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Card Kind
                  </label>
                  <select 
                    value={cardKind} 
                    onChange={e => setCardKind(e.target.value)} 
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {Object.entries(KIND_INFO).map(([k, info]) => (
                      <option key={k} value={k}>{info.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Valid Visits
                  </label>
                  <input 
                    type="number"
                    value={validVisits}
                    onChange={e => setValidVisits(Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    title="0 means unlimited"
                  />
                  <div className="text-[10px] text-slate-400 font-medium">0 means unlimited visits</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Scheme / Program (Optional)
                </label>
                <input 
                  type="text"
                  value={scheme}
                  onChange={e => setScheme(e.target.value)}
                  placeholder="e.g. Free OPD, Corporate, Sehat Card"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional remarks or notes..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm h-20 resize-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setSelectedPatient(null)
                    setSearchQuery('')
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!selectedPatient || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 disabled:opacity-50 hover:bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Issuing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 stroke-[2.5px]" /> Issue & Print
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
