import { useState, useEffect } from 'react';
import { equipmentApi } from '../equipment.api';
import { Save, X, Wrench } from 'lucide-react';

interface MaintenanceFormProps {
  equipment: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function MaintenanceForm({ equipment, onSave, onCancel }: MaintenanceFormProps) {
  const [formData, setForm] = useState<any>({
    equipmentId: equipment?._id || equipment?.id,
    type: 'PPM',
    scheduledDate: new Date().toISOString().split('T')[0],
    performedDate: new Date().toISOString().split('T')[0],
    performedBy: '',
    vendorId: equipment?.supplierId || '',
    status: 'Completed',
    totalCost: 0,
    paymentStatus: 'Pending',
    description: '',
    notes: '',
    partsUsed: []
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    equipmentApi.list().then(res => setSuppliers(res.items || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await equipmentApi.createMaintenance(formData);
      onSave();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save maintenance record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench size={20} className="text-sky-600" /> Log Maintenance
          </h2>
          <button onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg bg-sky-50 p-3 text-sky-800 text-sm font-medium">
            Recording maintenance for: <span className="font-bold">{equipment?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Maintenance Type</label>
              <select 
                value={formData.type} 
                onChange={e => setForm({...formData, type: e.target.value})}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="PPM">Planned Preventive Maintenance (PPM)</option>
                <option value="Calibration">Calibration</option>
                <option value="Repair">Breakdown Repair</option>
                <option value="Installation">Installation</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Performed Date</label>
              <input 
                type="date" 
                required 
                value={formData.performedDate} 
                onChange={e => setForm({...formData, performedDate: e.target.value})}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Service Provider</label>
              <select 
                value={formData.vendorId} 
                onChange={e => setForm({...formData, vendorId: e.target.value})}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">In-house / Internal</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Cost (₨)</label>
              <input 
                type="number" 
                value={formData.totalCost} 
                onChange={e => setForm({...formData, totalCost: Number(e.target.value)})}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Payment Status</label>
              <select 
                value={formData.paymentStatus} 
                onChange={e => setForm({...formData, paymentStatus: e.target.value})}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="Pending">Pending / Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Technical Description / Notes *</label>
              <textarea 
                rows={3}
                required
                value={formData.description} 
                onChange={e => setForm({...formData, description: e.target.value})}
                placeholder="Describe work done, parts replaced, or calibration results..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2 font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700">
              <Save size={18} /> Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
