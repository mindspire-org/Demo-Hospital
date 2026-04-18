import { useState, useEffect } from 'react';
import { equipmentApi } from '../equipment.api';
import { Save, X } from 'lucide-react';

interface EquipmentFormProps {
  initialData?: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function EquipmentForm({ initialData, onSave, onCancel }: EquipmentFormProps) {
  const [formData, setForm] = useState<any>({
    name: '', code: '', category: '', make: '', model: '', serialNo: '',
    status: 'Working', criticality: 'medium', condition: 'New',
    purchaseDate: '', cost: '', supplierId: '',
    locationDepartmentId: '', custodian: '', installDate: '',
    manufacturingCompany: '', warrantyEnd: '', amcProviderId: '',
    requiresCalibration: false, calibFrequencyMonths: 12, ppmFrequencyMonths: 6,
    ...initialData
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [depRes, supRes] = await Promise.all([
          equipmentApi.listDepartments(),
          equipmentApi.list() // supplier list
        ]);
        setDepartments(depRes.items || depRes.departments || depRes || []);
        setSuppliers(supRes.items || []);
      } catch (error) {
        console.error('Error loading form dependencies:', error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData?._id || initialData?.id) {
        await equipmentApi.updateEquipment(initialData._id || initialData.id, formData);
      } else {
        await equipmentApi.createEquipment(formData);
      }
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Edit Asset' : 'Register Equipment Asset'}
          </h2>
          <button onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {/* Basic Info Section */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Asset Name *" value={formData.name} onChange={(v: string) => setForm({...formData, name: v})} required />
                <FormInput label="Asset Code" value={formData.code} onChange={(v: string) => setForm({...formData, code: v})} />
                <FormInput label="Category" value={formData.category} onChange={(v: string) => setForm({...formData, category: v})} />
                <FormSelect label="Department" value={formData.locationDepartmentId} onChange={(v: string) => setForm({...formData, locationDepartmentId: v})} 
                  options={departments.map(d => ({ label: d.name, value: d.id || d._id }))} />
                <FormInput label="Make (Brand)" value={formData.make} onChange={(v: string) => setForm({...formData, make: v})} />
                <FormInput label="Model" value={formData.model} onChange={(v: string) => setForm({...formData, model: v})} />
                <FormInput label="Serial Number" value={formData.serialNo} onChange={(v: string) => setForm({...formData, serialNo: v})} />
                <FormSelect label="Condition" value={formData.condition} onChange={(v: string) => setForm({...formData, condition: v})} 
                  options={[{label:'New', value:'New'}, {label:'Used', value:'Used'}, {label:'Refurbished', value:'Refurbished'}]} />
                <FormSelect label="Status" value={formData.status} onChange={(v: string) => setForm({...formData, status: v})} 
                  options={[{label:'Working', value:'Working'}, {label:'Under Maintenance', value:'UnderMaintenance'}, {label:'Spare', value:'Spare'}]} />
              </div>
            </div>

            {/* Purchase & Warranty Section */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Purchase & Warranty</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Supplier" value={formData.supplierId} onChange={(v: string) => setForm({...formData, supplierId: v})} 
                  options={suppliers.map(s => ({ label: s.name, value: s._id }))} />
                <FormInput label="Purchase Cost (₨)" type="number" value={formData.cost} onChange={(v: string) => setForm({...formData, cost: v})} />
                <FormInput label="Purchase Date" type="date" value={formData.purchaseDate} onChange={(v: string) => setForm({...formData, purchaseDate: v})} />
                <FormInput label="Install Date" type="date" value={formData.installDate} onChange={(v: string) => setForm({...formData, installDate: v})} />
                <FormInput label="Manufacturing Co." value={formData.manufacturingCompany} onChange={(v: string) => setForm({...formData, manufacturingCompany: v})} />
                <FormInput label="Warranty End Date" type="date" value={formData.warrantyEnd} onChange={(v: string) => setForm({...formData, warrantyEnd: v})} />
              </div>
            </div>

            {/* Maintenance Settings Section */}
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Maintenance Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="PPM Cycle (Months)" type="number" value={formData.ppmFrequencyMonths} onChange={(v: string) => setForm({...formData, ppmFrequencyMonths: v})} />
                <FormInput label="Next PPM Due" type="date" value={formData.nextPpmDue} onChange={(v: string) => setForm({...formData, nextPpmDue: v})} />
                
                <div className="col-span-2">
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={formData.requiresCalibration} onChange={(e: any) => setForm({...formData, requiresCalibration: e.target.checked})} />
                    Requires Calibration
                  </label>
                </div>

                {formData.requiresCalibration && (
                  <>
                    <FormInput label="Calibration Cycle (Months)" type="number" value={formData.calibFrequencyMonths} onChange={(v: string) => setForm({...formData, calibFrequencyMonths: v})} />
                    <FormInput label="Next Calibration Due" type="date" value={formData.nextCalibDue} onChange={(v: string) => setForm({...formData, nextCalibDue: v})} />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2 font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700">
              <Save size={18} /> Save Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', required = false }: any) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <input type={type} required={required} value={value || ''} onChange={e => onChange(e.target.value)} 
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-focus focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} 
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-focus focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
        <option value="">Select Option</option>
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
