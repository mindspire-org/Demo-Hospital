import { useState } from 'react'
import { FileText, Plus, Eye, Printer } from 'lucide-react'
import Dialysis_TreatmentFormDialog from '../../components/dialysis/Dialysis_TreatmentFormDialog'
import Dialysis_InvestigationRecordDialog from '../../components/dialysis/Dialysis_InvestigationRecordDialog'
import Dialysis_HemodialysisPrescriptionDialog from '../../components/dialysis/Dialysis_HemodialysisPrescriptionDialog'
import Dialysis_UrduConsentFormDialog from '../../components/dialysis/Dialysis_UrduConsentFormDialog'
import Dialysis_TreatmentRecordDialog from '../../components/dialysis/Dialysis_TreatmentRecordDialog'
import Dialysis_ComplicationsMonitoringDialog from '../../components/dialysis/Dialysis_ComplicationsMonitoringDialog'
import Dialysis_ProblemListDialog from '../../components/dialysis/Dialysis_ProblemListDialog'
import Dialysis_DoctorNotesDialog from '../../components/dialysis/Dialysis_DoctorNotesDialog'
import Dialysis_BlankFormDialog from '../../components/dialysis/Dialysis_BlankFormDialog'

type FormType = 'unit-file' | 'investigation-record' | 'form-3' | 'form-4' | 'form-5' | 'form-6' | 'form-7' | 'form-8' | 'form-9'

type SavedForm = {
  id: string
  type: FormType
  name: string
  mrn: string
  dateOfFirstVisit: string
  createdAt: string
}

const formTabs = [
  { id: 'unit-file' as FormType, label: 'Unit File' },
  { id: 'investigation-record' as FormType, label: 'Investigation Record' },
  { id: 'form-3' as FormType, label: 'Hemodialysis Prescription' },
  { id: 'form-4' as FormType, label: 'Consent Form (Urdu)' },
  { id: 'form-5' as FormType, label: 'Treatment Record' },
  { id: 'form-6' as FormType, label: 'Complications Monitoring' },
  { id: 'form-7' as FormType, label: 'Problem List' },
  { id: 'form-8' as FormType, label: 'Doctor Notes' },
  { id: 'form-9' as FormType, label: 'Blank Form' },
]

export default function Dialysis_TreatmentForm() {
  const [activeTab, setActiveTab] = useState<FormType>('unit-file')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [savedForms, setSavedForms] = useState<SavedForm[]>([])
  const [selectedForm, setSelectedForm] = useState<any>(null)

  const handleFormSave = (formData: any) => {
    const newForm: SavedForm = {
      id: Date.now().toString(),
      type: activeTab,
      name: formData.name,
      mrn: formData.mrn,
      dateOfFirstVisit: formData.dateOfFirstVisit || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }
    setSavedForms(prev => [newForm, ...prev])
    setDialogOpen(false)
  }

  const handleViewForm = (form: SavedForm) => {
    setSelectedForm(form)
    setDialogOpen(true)
  }

  const filteredForms = savedForms.filter(f => f.type === activeTab)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-full w-full px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dialysis Treatment Forms</h1>
              <p className="text-sm text-slate-600">Patient Unit File Management</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedForm(null)
              setDialogOpen(true)
            }}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:from-teal-700 hover:to-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Add Form
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 border-b border-slate-200">
            {formTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-teal-600 text-teal-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Forms List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {formTabs.find(t => t.id === activeTab)?.label} - Saved Forms
            </h2>
          </div>
          
          {filteredForms.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-medium text-slate-500">No forms saved yet</p>
              <p className="mt-2 text-sm text-slate-400">Click "Add Form" to create your first {formTabs.find(t => t.id === activeTab)?.label.toLowerCase()}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-6 py-3 font-medium">Patient Name</th>
                    <th className="px-6 py-3 font-medium">MR#</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Created At</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{form.name || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{form.mrn || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {form.dateOfFirstVisit ? new Date(form.dateOfFirstVisit).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(form.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewForm(form)}
                            className="flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              alert('Print functionality coming soon')
                            }}
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Dialogs */}
      {activeTab === 'unit-file' && (
        <Dialysis_TreatmentFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'investigation-record' && (
        <Dialysis_InvestigationRecordDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-3' && (
        <Dialysis_HemodialysisPrescriptionDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-4' && (
        <Dialysis_UrduConsentFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-5' && (
        <Dialysis_TreatmentRecordDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-6' && (
        <Dialysis_ComplicationsMonitoringDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-7' && (
        <Dialysis_ProblemListDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-8' && (
        <Dialysis_DoctorNotesDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
      
      {activeTab === 'form-9' && (
        <Dialysis_BlankFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleFormSave}
          initialData={selectedForm}
        />
      )}
    </div>
  )
}
