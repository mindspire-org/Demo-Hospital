import { useEffect, useState } from 'react'
import { ipdApi } from '../../../../features/hospital/ipd'
import ConfirmDialog from '../../../common/ConfirmDialog'
import {  Plus, Droplets, ArrowUpCircle, ArrowDownCircle, Minus } from 'lucide-react'

type FluidBalanceRecord = {
  _id: string
  date: string
  shift?: 'morning' | 'evening' | 'night'
  intake?: {
    oral?: number
    ivFluids?: Array<{ name?: string; volume?: number; rate?: string }>
    ivTotal?: number
    tpn?: number
    bloodProducts?: Array<{ type?: string; volume?: number }>
    bloodTotal?: number
    medications?: Array<{ name?: string; volume?: number }>
    medicationTotal?: number
    other?: number
    otherDescription?: string
    total?: number
  }
  output?: {
    urine?: number
    urineColor?: string
    urineSpecificGravity?: number
    vomitus?: number
    vomitusDescription?: string
    stool?: number
    stoolDescription?: string
    drains?: Array<{ location?: string; type?: string; volume?: number }>
    drainTotal?: number
    bloodLoss?: number
    bloodLossDescription?: string
    other?: number
    otherDescription?: string
    total?: number
  }
  netBalance?: number
  cumulativeBalance?: number
  recordedBy?: string
  recordedAt?: string
  verifiedBy?: string
  notes?: string
}

export default function Hospital_IpdFluidBalance({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<FluidBalanceRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState<'morning' | 'evening' | 'night'>('morning')
  
  // Intake
  const [oralIntake, setOralIntake] = useState('')
  const [ivFluids, setIvFluids] = useState<Array<{ name: string; volume: string; rate: string }>>([{ name: '', volume: '', rate: '' }])
  const [tpn, setTpn] = useState('')
  const [bloodProducts, setBloodProducts] = useState<Array<{ type: string; volume: string }>>([])
  const [medications, setMedications] = useState<Array<{ name: string; volume: string }>>([])
  const [otherIntake, setOtherIntake] = useState('')
  const [otherIntakeDesc, setOtherIntakeDesc] = useState('')
  
  // Output
  const [urine, setUrine] = useState('')
  const [urineColor, setUrineColor] = useState('')
  const [vomitus, setVomitus] = useState('')
  const [vomitusDesc, setVomitusDesc] = useState('')
  const [stool, setStool] = useState('')
  const [stoolDesc, setStoolDesc] = useState('')
  const [drains, setDrains] = useState<Array<{ location: string; type: string; volume: string }>>([])
  const [bloodLoss, setBloodLoss] = useState('')
  const [bloodLossDesc, setBloodLossDesc] = useState('')
  const [otherOutput, setOtherOutput] = useState('')
  const [otherOutputDesc, setOtherOutputDesc] = useState('')
  
  const [recordedBy, setRecordedBy] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { load() }, [encounterId])

  async function load() {
    setLoading(true)
    try {
      const res = await ipdApi.listIpdFluidBalance(encounterId, { limit: 50 }) as any
      setRecords(res?.fluidBalanceRecords || [])
    } catch {}
    setLoading(false)
  }

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0])
    setShift('morning')
    setOralIntake('')
    setIvFluids([{ name: '', volume: '', rate: '' }])
    setTpn('')
    setBloodProducts([])
    setMedications([])
    setOtherIntake('')
    setOtherIntakeDesc('')
    setUrine('')
    setUrineColor('')
    setVomitus('')
    setVomitusDesc('')
    setStool('')
    setStoolDesc('')
    setDrains([])
    setBloodLoss('')
    setBloodLossDesc('')
    setOtherOutput('')
    setOtherOutputDesc('')
    setRecordedBy('')
    setNotes('')
  }

  async function save() {
    // Calculate totals
    const ivTotal = ivFluids.reduce((sum, iv) => sum + (parseFloat(iv.volume) || 0), 0)
    const bloodTotal = bloodProducts.reduce((sum, bp) => sum + (parseFloat(bp.volume) || 0), 0)
    const medicationTotal = medications.reduce((sum, med) => sum + (parseFloat(med.volume) || 0), 0)
    const drainTotal = drains.reduce((sum, d) => sum + (parseFloat(d.volume) || 0), 0)
    
    const intakeTotal = (parseFloat(oralIntake) || 0) + ivTotal + (parseFloat(tpn) || 0) + bloodTotal + medicationTotal + (parseFloat(otherIntake) || 0)
    const outputTotal = (parseFloat(urine) || 0) + (parseFloat(vomitus) || 0) + (parseFloat(stool) || 0) + drainTotal + (parseFloat(bloodLoss) || 0) + (parseFloat(otherOutput) || 0)
    const netBalance = intakeTotal - outputTotal

    try {
      if (editingId) {
        await ipdApi.updateIpdFluidBalance(editingId, {
          date,
          shift,
          intake: {
            oral: parseFloat(oralIntake) || 0,
            ivFluids: ivFluids.filter(iv => iv.name && iv.volume).map(iv => ({ name: iv.name, volume: parseFloat(iv.volume), rate: iv.rate })),
            ivTotal,
            tpn: parseFloat(tpn) || 0,
            bloodProducts: bloodProducts.filter(bp => bp.type && bp.volume).map(bp => ({ type: bp.type, volume: parseFloat(bp.volume) })),
            bloodTotal,
            medications: medications.filter(m => m.name && m.volume).map(m => ({ name: m.name, volume: parseFloat(m.volume) })),
            medicationTotal,
            other: parseFloat(otherIntake) || 0,
            otherDescription: otherIntakeDesc,
            total: intakeTotal,
          },
          output: {
            urine: parseFloat(urine) || 0,
            urineColor,
            vomitus: parseFloat(vomitus) || 0,
            vomitusDescription: vomitusDesc,
            stool: parseFloat(stool) || 0,
            stoolDescription: stoolDesc,
            drains: drains.filter(d => d.location && d.volume).map(d => ({ location: d.location, type: d.type, volume: parseFloat(d.volume) })),
            drainTotal,
            bloodLoss: parseFloat(bloodLoss) || 0,
            bloodLossDescription: bloodLossDesc,
            other: parseFloat(otherOutput) || 0,
            otherDescription: otherOutputDesc,
            total: outputTotal,
          },
          netBalance,
          recordedBy,
          notes,
        })
      } else {
        await ipdApi.createIpdFluidBalance(encounterId, {
        date,
        shift,
        intake: {
          oral: parseFloat(oralIntake) || 0,
          ivFluids: ivFluids.filter(iv => iv.name && iv.volume).map(iv => ({
            name: iv.name,
            volume: parseFloat(iv.volume),
            rate: iv.rate
          })),
          ivTotal,
          tpn: parseFloat(tpn) || 0,
          bloodProducts: bloodProducts.filter(bp => bp.type && bp.volume).map(bp => ({
            type: bp.type,
            volume: parseFloat(bp.volume)
          })),
          bloodTotal,
          medications: medications.filter(m => m.name && m.volume).map(m => ({
            name: m.name,
            volume: parseFloat(m.volume)
          })),
          medicationTotal,
          other: parseFloat(otherIntake) || 0,
          otherDescription: otherIntakeDesc,
          total: intakeTotal
        },
        output: {
          urine: parseFloat(urine) || 0,
          urineColor,
          vomitus: parseFloat(vomitus) || 0,
          vomitusDescription: vomitusDesc,
          stool: parseFloat(stool) || 0,
          stoolDescription: stoolDesc,
          drains: drains.filter(d => d.location && d.volume).map(d => ({
            location: d.location,
            type: d.type,
            volume: parseFloat(d.volume)
          })),
          drainTotal,
          bloodLoss: parseFloat(bloodLoss) || 0,
          bloodLossDescription: bloodLossDesc,
          other: parseFloat(otherOutput) || 0,
          otherDescription: otherOutputDesc,
          total: outputTotal
        },
        netBalance,
        recordedBy,
        notes
      })
      }
      setOpen(false)
      setEditingId(null)
      resetForm()
      load()
    } catch (err) {
      console.error('Failed to save fluid balance', err)
    }
  }

  const remove = async (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try { await ipdApi.deleteIpdFluidBalance(deleteId); await load() } catch (e: any) { alert(e?.message || 'Failed to delete') }
    setDeleteId(null)
  }

  function startEdit(rec: FluidBalanceRecord) {
    setEditingId(rec._id)
    setOpen(true)
    // Populate form from record
    setDate(rec.date || new Date().toISOString().split('T')[0])
    setShift(rec.shift || 'morning')
    setOralIntake(rec.intake?.oral?.toString() || '')
    setIvFluids(rec.intake?.ivFluids?.map(iv => ({ name: iv.name || '', volume: iv.volume?.toString() || '', rate: iv.rate || '' })) || [{ name: '', volume: '', rate: '' }])
    setTpn(rec.intake?.tpn?.toString() || '')
    setBloodProducts(rec.intake?.bloodProducts?.map(bp => ({ type: bp.type || '', volume: bp.volume?.toString() || '' })) || [])
    setMedications(rec.intake?.medications?.map(m => ({ name: m.name || '', volume: m.volume?.toString() || '' })) || [])
    setOtherIntake(rec.intake?.other?.toString() || '')
    setOtherIntakeDesc(rec.intake?.otherDescription || '')
    setUrine(rec.output?.urine?.toString() || '')
    setUrineColor(rec.output?.urineColor || '')
    setVomitus(rec.output?.vomitus?.toString() || '')
    setVomitusDesc(rec.output?.vomitusDescription || '')
    setStool(rec.output?.stool?.toString() || '')
    setStoolDesc(rec.output?.stoolDescription || '')
    setDrains(rec.output?.drains?.map(d => ({ location: d.location || '', type: d.type || '', volume: d.volume?.toString() || '' })) || [])
    setBloodLoss(rec.output?.bloodLoss?.toString() || '')
    setBloodLossDesc(rec.output?.bloodLossDescription || '')
    setOtherOutput(rec.output?.other?.toString() || '')
    setOtherOutputDesc(rec.output?.otherDescription || '')
    setRecordedBy(rec.recordedBy || '')
    setNotes(rec.notes || '')
  }

  function formatNumber(n?: number) {
    if (n === undefined || n === null) return '-'
    return n.toLocaleString()
  }

  function getNetBalanceColor(balance?: number) {
    if (balance === undefined || balance === null) return 'text-gray-500'
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">

          <Droplets className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-lg">Fluid Balance</h3>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No fluid balance records found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1.5 text-left">Date</th>
                <th className="border px-2 py-1.5 text-left">Shift</th>
                <th className="border px-2 py-1.5 text-right">Oral</th>
                <th className="border px-2 py-1.5 text-right">IV</th>
                <th className="border px-2 py-1.5 text-right">TPN</th>
                <th className="border px-2 py-1.5 text-right">Blood</th>
                <th className="border px-2 py-1.5 text-right bg-blue-50 font-semibold">Intake Total</th>
                <th className="border px-2 py-1.5 text-right">Urine</th>
                <th className="border px-2 py-1.5 text-right">Drains</th>
                <th className="border px-2 py-1.5 text-right">Blood Loss</th>
                <th className="border px-2 py-1.5 text-right bg-red-50 font-semibold">Output Total</th>
                <th className="border px-2 py-1.5 text-right font-semibold">Net Balance</th>
                <th className="border px-2 py-1.5 text-left">Recorded By</th>
                <th className="border px-2 py-1.5 text-left print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={rec._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border px-2 py-1">{rec.date ? new Date(rec.date).toLocaleDateString() : '-'}</td>
                  <td className="border px-2 py-1 capitalize">{rec.shift || '-'}</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.intake?.oral)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.intake?.ivTotal)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.intake?.tpn)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.intake?.bloodTotal)} ml</td>
                  <td className="border px-2 py-1 text-right bg-blue-50 font-semibold">{formatNumber(rec.intake?.total)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.output?.urine)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.output?.drainTotal)} ml</td>
                  <td className="border px-2 py-1 text-right">{formatNumber(rec.output?.bloodLoss)} ml</td>
                  <td className="border px-2 py-1 text-right bg-red-50 font-semibold">{formatNumber(rec.output?.total)} ml</td>
                  <td className={`border px-2 py-1 text-right font-semibold ${getNetBalanceColor(rec.netBalance)}`}>
                    {rec.netBalance !== undefined ? (rec.netBalance >= 0 ? '+' : '') + formatNumber(rec.netBalance) : '-'} ml
                  </td>
                  <td className="border px-2 py-1">{rec.recordedBy || '-'}</td>
                  <td className="border px-2 py-1 print:hidden">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(rec)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                      <button onClick={() => remove(rec._id)} className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editingId ? 'Edit Fluid Balance Record' : 'Add Fluid Balance Record'}</h3>
              <button onClick={() => { setOpen(false); resetForm() }} className="text-gray-500 hover:text-gray-700">
                <Minus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Date & Shift */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shift</label>
                  <select value={shift} onChange={e => setShift(e.target.value as any)} className="w-full border rounded px-3 py-2">
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              {/* Intake Section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowDownCircle className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold">Intake</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Oral (ml)</label>
                    <input type="number" value={oralIntake} onChange={e => setOralIntake(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">TPN (ml)</label>
                    <input type="number" value={tpn} onChange={e => setTpn(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                </div>

                {/* IV Fluids */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">IV Fluids</label>
                    <button onClick={() => setIvFluids([...ivFluids, { name: '', volume: '', rate: '' }])} className="text-blue-600 text-sm hover:underline">+ Add</button>
                  </div>
                  {ivFluids.map((iv, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                      <input type="text" value={iv.name} onChange={e => { const u = [...ivFluids]; u[i].name = e.target.value; setIvFluids(u) }} placeholder="Name (e.g., NS)" className="border rounded px-2 py-1 text-sm" />
                      <input type="number" value={iv.volume} onChange={e => { const u = [...ivFluids]; u[i].volume = e.target.value; setIvFluids(u) }} placeholder="Volume (ml)" className="border rounded px-2 py-1 text-sm" />
                      <input type="text" value={iv.rate} onChange={e => { const u = [...ivFluids]; u[i].rate = e.target.value; setIvFluids(u) }} placeholder="Rate (ml/hr)" className="border rounded px-2 py-1 text-sm" />
                      {ivFluids.length > 1 && (
                        <button onClick={() => setIvFluids(ivFluids.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">Remove</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Other Intake */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Other Intake (ml)</label>
                    <input type="number" value={otherIntake} onChange={e => setOtherIntake(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Description</label>
                    <input type="text" value={otherIntakeDesc} onChange={e => setOtherIntakeDesc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Description" />
                  </div>
                </div>
              </div>

              {/* Output Section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-semibold">Output</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Urine (ml)</label>
                    <input type="number" value={urine} onChange={e => setUrine(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Urine Color</label>
                    <input type="text" value={urineColor} onChange={e => setUrineColor(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Clear/Yellow/etc" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Vomitus (ml)</label>
                    <input type="number" value={vomitus} onChange={e => setVomitus(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Vomitus Description</label>
                    <input type="text" value={vomitusDesc} onChange={e => setVomitusDesc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Description" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Stool (ml)</label>
                    <input type="number" value={stool} onChange={e => setStool(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Stool Description</label>
                    <input type="text" value={stoolDesc} onChange={e => setStoolDesc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Description" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Blood Loss (ml)</label>
                    <input type="number" value={bloodLoss} onChange={e => setBloodLoss(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Blood Loss Description</label>
                    <input type="text" value={bloodLossDesc} onChange={e => setBloodLossDesc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Description" />
                  </div>
                </div>

                {/* Drains */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Drains</label>
                    <button onClick={() => setDrains([...drains, { location: '', type: '', volume: '' }])} className="text-blue-600 text-sm hover:underline">+ Add</button>
                  </div>
                  {drains.map((d, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                      <input type="text" value={d.location} onChange={e => { const u = [...drains]; u[i].location = e.target.value; setDrains(u) }} placeholder="Location" className="border rounded px-2 py-1 text-sm" />
                      <input type="text" value={d.type} onChange={e => { const u = [...drains]; u[i].type = e.target.value; setDrains(u) }} placeholder="Type" className="border rounded px-2 py-1 text-sm" />
                      <input type="number" value={d.volume} onChange={e => { const u = [...drains]; u[i].volume = e.target.value; setDrains(u) }} placeholder="Volume (ml)" className="border rounded px-2 py-1 text-sm" />
                      <button onClick={() => setDrains(drains.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">Remove</button>
                    </div>
                  ))}
                </div>

                {/* Other Output */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Other Output (ml)</label>
                    <input type="number" value={otherOutput} onChange={e => setOtherOutput(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Description</label>
                    <input type="text" value={otherOutputDesc} onChange={e => setOtherOutputDesc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Description" />
                  </div>
                </div>
              </div>

              {/* Recorded By & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recorded By</label>
                  <input type="text" value={recordedBy} onChange={e => setRecordedBy(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Nurse name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Any additional notes" />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => { setOpen(false); resetForm() }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Fluid Balance Record"
        message="Are you sure you want to delete this fluid balance record?"
        onConfirm={() => { handleDeleteConfirm(); setDeleteConfirmOpen(false) }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null) }}
      />
    </div>
  )
}
