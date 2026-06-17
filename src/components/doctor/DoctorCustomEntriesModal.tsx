import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type Category = {
  key: string
  label: string
}

const CATEGORIES: Category[] = [
  { key: 'primaryComplaint', label: 'Primary Complaint' },
  { key: 'history', label: 'Risk Factors / Medical History' },
  { key: 'primaryComplaintHistory', label: 'History of Primary Complaint' },
  { key: 'familyHistory', label: 'Family History' },
  { key: 'allergyHistory', label: 'Allergy History' },
  { key: 'treatmentHistory', label: 'Treatment History' },
  { key: 'examFindings', label: 'Examination Findings' },
  { key: 'diagnosis', label: 'Diagnosis / Disease' },
  { key: 'advice', label: 'Advice/Referral' },
]

type Props = {
  isOpen: boolean
  onClose: () => void
  doctorId: string
  onSelectEntry: (entryText: string) => void
  initialCategory?: string
}

export default function DoctorCustomEntriesModal({
  isOpen,
  onClose,
  doctorId,
  onSelectEntry,
  initialCategory = 'primaryComplaint',
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [entries, setEntries] = useState<any[]>([])
  const [newEntryText, setNewEntryText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory)
      loadEntries()
    }
  }, [isOpen, initialCategory, doctorId])

  useEffect(() => {
    if (isOpen) {
      loadEntries()
    }
  }, [selectedCategory])

  async function loadEntries() {
    if (!doctorId) return
    setLoading(true)
    try {
      const res = await hospitalApi.getDoctorCustomEntriesByCategory(doctorId, selectedCategory)
      setEntries(res?.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newEntryText.trim() || !doctorId) return
    try {
      await hospitalApi.createDoctorCustomEntry({
        doctorId,
        category: selectedCategory,
        entryText: newEntryText.trim(),
      })
      setNewEntryText('')
      loadEntries()
    } catch (err: any) {
      alert(err?.message || 'Failed to add entry')
    }
  }

  async function handleUpdate(id: string) {
    if (!editingText.trim()) return
    try {
      await hospitalApi.updateDoctorCustomEntry(id, { entryText: editingText.trim() })
      setEditingId(null)
      setEditingText('')
      loadEntries()
    } catch (err: any) {
      alert(err?.message || 'Failed to update entry')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return
    try {
      await hospitalApi.deleteDoctorCustomEntry(id)
      loadEntries()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete entry')
    }
  }

  function handleSelect(entryText: string) {
    onSelectEntry(entryText)
    onClose()
  }

  if (!isOpen) return null

  const categoryLabel = CATEGORIES.find(c => c.key === selectedCategory)?.label || selectedCategory

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Manage Custom Entries</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 p-4 border-b bg-gray-50">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add new entry for {categoryLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newEntryText}
                onChange={e => setNewEntryText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Type entry and press Enter"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No custom entries for {categoryLabel}. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any) => (
                <div
                  key={entry._id}
                  className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border"
                >
                  {editingId === entry._id ? (
                    <>
                      <input
                        type="text"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(entry._id)}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(entry._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditingText('')
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelect(entry.entryText)}
                        className="flex-1 text-left text-sm hover:text-blue-600"
                        title="Click to use this entry"
                      >
                        {entry.entryText}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(entry._id)
                          setEditingText(entry.entryText)
                        }}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            💡 Tip: Click on an entry to use it in the prescription field.
          </p>
        </div>
      </div>
    </div>
  )
}
