import { useState, useEffect } from 'react'
import { X, TestTube, CheckCircle, FlaskConical, Droplets, Microscope } from 'lucide-react'
import { labApi } from '../../utils/api'

type SampleType = 'blood' | 'urine' | 'stool' | 'sputum' | 'csf' | 'tissue' | 'biopsy' | 'fluid' | 'swab' | 'other'

const sampleTypes: { value: SampleType; label: string; icon: any; color: string; bgColor: string; borderColor: string }[] = [
  { value: 'blood', label: 'Blood', icon: Droplets, color: 'text-rose-600', bgColor: 'bg-rose-100', borderColor: 'border-rose-200' },
  { value: 'urine', label: 'Urine', icon: FlaskConical, color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  { value: 'stool', label: 'Stool', icon: TestTube, color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' },
  { value: 'sputum', label: 'Sputum', icon: FlaskConical, color: 'text-sky-600', bgColor: 'bg-sky-100', borderColor: 'border-sky-200' },
  { value: 'csf', label: 'CSF', icon: Droplets, color: 'text-violet-600', bgColor: 'bg-violet-100', borderColor: 'border-violet-200' },
  { value: 'tissue', label: 'Tissue', icon: Microscope, color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200' },
  { value: 'biopsy', label: 'Biopsy', icon: Microscope, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100', borderColor: 'border-fuchsia-200' },
  { value: 'fluid', label: 'Body Fluid', icon: Droplets, color: 'text-cyan-600', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-200' },
  { value: 'swab', label: 'Swab', icon: TestTube, color: 'text-lime-600', bgColor: 'bg-lime-100', borderColor: 'border-lime-200' },
  { value: 'other', label: 'Other', icon: FlaskConical, color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-200' },
]

type SampleCondition = 'ok' | 'clotted' | 'hemolyzed' | 'lipemic' | 'icteric' | 'insufficient' | 'contaminated' | 'turbid' | 'clear'

const sampleConditions: { value: SampleCondition; label: string; color: string; desc: string }[] = [
  { value: 'ok', label: 'OK - Acceptable', color: 'text-emerald-700', desc: 'Sample quality is good for testing' },
  { value: 'clear', label: 'Clear', color: 'text-emerald-600', desc: 'Sample is clear and transparent' },
  { value: 'clotted', label: 'Clotted', color: 'text-rose-700', desc: 'Blood has clotted - may affect results' },
  { value: 'hemolyzed', label: 'Hemolyzed', color: 'text-rose-600', desc: 'RBCs ruptured - may affect potassium, LDH' },
  { value: 'lipemic', label: 'Lipemic', color: 'text-amber-700', desc: 'High lipid content - may affect chemistry tests' },
  { value: 'icteric', label: 'Icteric', color: 'text-amber-600', desc: 'High bilirubin - may affect color-based tests' },
  { value: 'insufficient', label: 'Insufficient Volume', color: 'text-orange-700', desc: 'Not enough sample for all requested tests' },
  { value: 'contaminated', label: 'Contaminated', color: 'text-red-700', desc: 'Sample appears contaminated - may need recollection' },
  { value: 'turbid', label: 'Turbid/Cloudy', color: 'text-blue-700', desc: 'Sample is cloudy - may affect results' },
]

type Sample = {
  id: string
  type: SampleType
  condition: SampleCondition
  collectedAt: string
  collectedBy: string
  tubeType?: string
  volume?: string
  notes?: string
  tests: string[]
}

type Test = {
  id: string
  name: string
  status: 'pending' | 'received' | 'completed'
}

type Props = {
  open: boolean
  onClose: () => void
  tokenNo: string
  tokenId: string
  patientName: string
  tests?: Array<string | { testId?: string; testName?: string }>
  onConvert: () => void
}

export default function Lab_SampleCollectionDialog({ open, onClose, tokenNo, tokenId, patientName, onConvert }: Props) {
  const [tests, setTests] = useState<Test[]>([])
  const [, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Multiple samples state
  const [samples, setSamples] = useState<Sample[]>([])
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null)
  
  // Form state for new sample
  const [selectedType, setSelectedType] = useState<SampleType>('blood')
  const [selectedCondition, setSelectedCondition] = useState<SampleCondition>('ok')
  const [tubeType, setTubeType] = useState('')
  const [volume, setVolume] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTests, setSelectedTests] = useState<string[]>([])

  useEffect(() => {
    if (open && tokenId) {
      fetchTests()
      // Reset form
      setSamples([])
      setActiveSampleId(null)
      setSelectedType('blood')
      setSelectedCondition('ok')
      setTubeType('')
      setVolume('')
      setNotes('')
      setSelectedTests([])
    }
  }, [open, tokenId])

  async function fetchTests() {
    setLoading(true)
    try {
      const res: any = await labApi.getToken(tokenId)
      const token = res?.token || res
      if (token && Array.isArray(token.tests) && token.tests.length > 0) {
        // Extract id + name from each test entry (strings or { testId, testName } objects)
        const parsed = token.tests.map((tid: any) => {
          if (typeof tid === 'object' && tid !== null) {
            const id = String(tid.testId || tid._id || tid.id || '')
            const name = tid.testName || tid.name || ''
            return { id, name }
          }
          return { id: String(tid), name: '' }
        }).filter((p: any) => p.id)

        // Fetch all tests from catalog to resolve names not embedded in token
        const missingNames = parsed.filter((p: any) => !p.name)
        let allTests: any[] = []
        if (missingNames.length > 0) {
          try {
            const testsRes: any = await labApi.listTests({ limit: 1000 })
            allTests = testsRes?.items || testsRes?.data || testsRes || []
          } catch {}
        }

        setTests(parsed.map((p: any) => {
          if (p.name) return { id: p.id, name: p.name, status: 'pending' as const }
          const t = allTests.find((x: any) => String(x._id) === p.id || String(x.id) === p.id)
          return { id: p.id, name: t?.name || t?.testName || 'Unknown Test', status: 'pending' as const }
        }))
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSample = () => {
    const newSample: Sample = {
      id: crypto.randomUUID(),
      type: selectedType,
      condition: selectedCondition,
      collectedAt: new Date().toISOString(),
      collectedBy: '',
      tubeType,
      volume,
      notes,
      tests: selectedTests.length > 0 ? [...selectedTests] : tests.map(t => t.id)
    }
    setSamples(prev => [...prev, newSample])
    setActiveSampleId(newSample.id)
    // Reset for next sample
    setTubeType('')
    setVolume('')
    setNotes('')
    setSelectedTests([])
  }

  const removeSample = (id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id))
    if (activeSampleId === id) {
      setActiveSampleId(null)
    }
  }

  const handleSave = async () => {
    if (samples.length === 0) {
      alert('Please add at least one sample')
      return
    }

    setSaving(true)
    try {
      const firstSample = samples[0]
      const multipleSamplesPayload = samples.length > 1
        ? samples.map(s => ({ id: s.id, type: s.type, condition: s.condition, collectedAt: s.collectedAt, tubeType: s.tubeType, volume: s.volume, notes: s.notes, tests: s.tests }))
        : undefined

      // Step 1: Convert token → order (creates the order document)
      const converted: any = await labApi.convertTokenToSample(tokenId, {})

      // Step 2: Resolve the created order ID
      const resolvedOrderId: string = String(
        converted?.order?._id ||
        converted?.orderId ||
        converted?._id ||
        ''
      )

      if (!resolvedOrderId) {
        throw new Error('Could not resolve order ID after conversion')
      }

      // Step 3: Write sample details onto the order track
      await labApi.updateOrderTrack(resolvedOrderId, {
        status: 'sample_collected',
        sampleTime: firstSample.collectedAt,
        sampleType: firstSample.type,
        sampleCondition: firstSample.condition,
        sampleTubeType: firstSample.tubeType,
        sampleVolume: firstSample.volume,
        sampleNotes: firstSample.notes,
        sampleTests: firstSample.tests,
        sampleId: firstSample.id,
        multipleSamples: multipleSamplesPayload,
      })

      onConvert()
      onClose()
    } catch (error) {
      console.error('Failed to save samples:', error)
      alert('Failed to save samples: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSaving(false)
    }
  }

  const toggleTest = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  if (!open) return null

  const activeSample = samples.find(s => s.id === activeSampleId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-violet-100 p-2">
              <TestTube className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sample Collection</h3>
              <p className="text-sm text-slate-600">Token: {tokenNo} · Patient: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Sample List */}
          <div className="w-64 border-r border-slate-200 bg-slate-50/50 p-4 overflow-y-auto">
            <div className="mb-3 text-xs font-bold uppercase text-slate-500">Collected Samples ({samples.length})</div>
            {samples.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No samples added yet
              </div>
            ) : (
              <div className="space-y-2">
                {samples.map((sample, idx) => {
                  const typeInfo = sampleTypes.find(st => st.value === sample.type)
                  const Icon = typeInfo?.icon || TestTube
                  const isActive = activeSampleId === sample.id
                  return (
                    <button
                      key={sample.id}
                      onClick={() => setActiveSampleId(sample.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        isActive 
                          ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-200' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1.5 ${typeInfo?.bgColor}`}>
                          <Icon className={`h-3.5 w-3.5 ${typeInfo?.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            #{idx + 1} {typeInfo?.label}
                          </div>
                          <div className={`text-xs ${sample.condition === 'ok' || sample.condition === 'clear' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sampleConditions.find(c => c.value === sample.condition)?.label}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            
            {/* Add Sample Button */}
            <button
              onClick={() => {
                setActiveSampleId(null)
                setSelectedType('blood')
                setSelectedCondition('ok')
              }}
              className="mt-4 w-full rounded-lg border-2 border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Add Another Sample
            </button>
          </div>

          {/* Right Panel - Sample Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSample ? (
              // View/Edit active sample
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-800">Sample Details</h4>
                  <button
                    onClick={() => removeSample(activeSample.id)}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Remove Sample
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      {(() => {
                        const typeInfo = sampleTypes.find(st => st.value === activeSample.type)
                        const Icon = typeInfo?.icon || TestTube
                        return <><Icon className={`h-5 w-5 ${typeInfo?.color}`} /> <span className="font-semibold">{typeInfo?.label}</span></>
                      })()}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Condition</label>
                    <div className="mt-1 font-semibold text-slate-800">
                      {sampleConditions.find(c => c.value === activeSample.condition)?.label}
                    </div>
                  </div>
                </div>
                
                {activeSample.tubeType && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Container/Tube</label>
                    <div className="mt-1 font-medium">{activeSample.tubeType}</div>
                  </div>
                )}
                
                {activeSample.volume && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Volume</label>
                    <div className="mt-1 font-medium">{activeSample.volume}</div>
                  </div>
                )}
                
                {activeSample.notes && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Notes</label>
                    <div className="mt-1 text-sm">{activeSample.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              // Add new sample form
              <div className="space-y-6">
                {/* Sample Type Selection */}
                <div>
                  <label className="mb-3 block text-sm font-bold text-slate-700">Sample Type *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {sampleTypes.map((type) => {
                      const Icon = type.icon
                      const isSelected = selectedType === type.value
                      return (
                        <button
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                            isSelected 
                              ? `border-current ${type.bgColor} ${type.color} ring-2 ring-offset-1 ring-${type.color.split('-')[1]}-200` 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          } ${isSelected ? type.color : 'text-slate-600'}`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-semibold text-center leading-tight">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sample Condition */}
                <div>
                  <label className="mb-3 block text-sm font-bold text-slate-700">Sample Condition *</label>
                  <div className="space-y-2">
                    {sampleConditions.map((condition) => {
                      const isSelected = selectedCondition === condition.value
                      return (
                        <button
                          key={condition.value}
                          onClick={() => setSelectedCondition(condition.value)}
                          className={`w-full flex items-center justify-between rounded-lg border p-3 transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                            <span className={`font-semibold ${condition.color}`}>{condition.label}</span>
                          </div>
                          <span className="text-xs text-slate-500">{condition.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tube Type & Volume */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Container/Tube Type</label>
                    <select
                      value={tubeType}
                      onChange={(e) => setTubeType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">Select container...</option>
                      <option value="EDTA Purple">EDTA (Purple Top)</option>
                      <option value="Plain Red">Plain (Red Top)</option>
                      <option value="SST Gold">SST (Gold Top)</option>
                      <option value="Citrate Blue">Citrate (Blue Top)</option>
                      <option value="Heparin Green">Heparin (Green Top)</option>
                      <option value="Fluoride Grey">Fluoride (Grey Top)</option>
                      <option value="Urine Container">Urine Container</option>
                      <option value="Stool Container">Stool Container</option>
                      <option value="CSF Tube">CSF Tube</option>
                      <option value="Culture Bottle">Culture Bottle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Volume Collected</label>
                    <input
                      type="text"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="e.g., 3 mL, 10 mL"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>

                {/* Tests Selection */}
                <div>
                  <label className="mb-3 block text-sm font-bold text-slate-700">Tests for this Sample</label>
                  <div className="rounded-lg border border-slate-200 p-3 space-y-2 max-h-40 overflow-y-auto">
                    {tests.map((test) => (
                      <label key={test.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedTests.length === 0 || selectedTests.includes(test.id)}
                          onChange={() => toggleTest(test.id)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm">{test.name}</span>
                      </label>
                    ))}
                    {tests.length === 0 && <div className="text-sm text-slate-400">No tests available</div>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Leave all unchecked to assign all tests to this sample
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or observations..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                </div>

                {/* Add to List Button */}
                <button
                  onClick={addSample}
                  className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Add Sample to Collection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div className="text-sm text-slate-600">
            {samples.length > 0 && (
              <span className="font-medium">
                {samples.length} sample{samples.length !== 1 ? 's' : ''} ready to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || samples.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save {samples.length} Sample{samples.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
