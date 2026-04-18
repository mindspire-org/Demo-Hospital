import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentApi } from '../equipment.api';
import EquipmentStatusBadge from '../components/EquipmentStatusBadge';
import EquipmentForm from '../components/EquipmentForm';
import MaintenanceForm from '../components/MaintenanceForm';
import { 
  ArrowLeft, Calendar, DollarSign, ShieldCheck, 
  History, MapPin, User, Building2, Package, Tag,
  FileText, Plus
} from 'lucide-react';
import Toast, { type ToastState } from '../../../../components/ui/Toast';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // For now we use list with ID filter since we don't have a specific getById yet
      const res = await equipmentApi.listEquipment({ limit: 1 });
      // In a real scenario, we'd have a specific getById endpoint
      const equipment = res.items?.find((x: any) => x._id === id || x.id === id);
      setItem(equipment);
      
      // Load maintenance history
      const maintRes = await equipmentApi.listMaintenance({ equipmentId: id });
      setMaintenance(maintRes.items || []);
    } catch (error) {
      console.error('Failed to load equipment details:', error);
      setToast({ type: 'error', message: 'Failed to load equipment details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading equipment details...</div>;
  if (!item) return <div className="p-12 text-center text-slate-500">Equipment not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Assets
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowEditForm(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit Asset
          </button>
          <button 
            onClick={() => setShowMaintForm(true)}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700"
          >
            Log Maintenance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{item.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1"><Tag size={14} /> {item.code || 'NO-CODE'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Package size={14} /> {item.category || 'General'}</span>
                </div>
              </div>
              <EquipmentStatusBadge status={item.status} />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
              <InfoBlock icon={<Building2 size={16} />} label="Make/Brand" value={item.make || '-'} />
              <InfoBlock icon={<FileText size={16} />} label="Model" value={item.model || '-'} />
              <InfoBlock icon={<Tag size={16} />} label="Serial No" value={item.serialNo || '-'} />
              <InfoBlock icon={<MapPin size={16} />} label="Department" value={item.locationDepartmentId?.name || 'Central'} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-slate-400" /> Maintenance History
              </h2>
              <button 
                onClick={() => setShowMaintForm(true)}
                className="text-sm font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> New Record
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {maintenance.length > 0 ? maintenance.map((m: any, i: number) => (
                <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-700 capitalize">{m.type || 'PPM'}</div>
                    <div className="text-sm text-slate-500">{new Date(m.performedDate || m.date).toLocaleDateString()}</div>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{m.notes || 'No description provided.'}</p>
                  <div className="mt-2 flex gap-4 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1"><User size={12} /> {m.performedBy || 'System'}</span>
                    {(m.totalCost > 0 || m.cost > 0) && <span className="flex items-center gap-1 text-emerald-600"><DollarSign size={12} /> ₨{(m.totalCost || m.cost).toLocaleString()}</span>}
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-400 italic text-sm">
                  No maintenance records found for this asset.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800 flex items-center gap-2">
              <DollarSign size={18} className="text-rose-500" /> Procurement Details
            </h3>
            <div className="space-y-4">
              <SideInfoBlock label="Purchase Date" value={item.purchaseDate || '-'} />
              <SideInfoBlock label="Purchase Cost" value={item.purchaseCost ? `₨${item.purchaseCost.toLocaleString()}` : (item.cost ? `₨${item.cost.toLocaleString()}` : '-')} />
              <SideInfoBlock label="Supplier" value={item.supplierId?.name || item.vendorId?.name || 'Unknown'} />
              <SideInfoBlock label="Condition" value={item.condition || 'New'} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" /> Compliance Status
            </h3>
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next PPM Due</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">{item.nextPpmDue || 'Not Set'}</span>
                  {item.nextPpmDue && <Calendar size={16} className="text-slate-400" />}
                </div>
              </div>
              {item.requiresCalibration && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Calibration</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{item.nextCalibDue || 'Not Set'}</span>
                    <Calendar size={16} className="text-slate-400" />
                  </div>
                </div>
              )}
              <SideInfoBlock label="Criticality" value={
                <span className={`capitalize font-bold ${item.criticality === 'critical' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {item.criticality}
                </span>
              } />
            </div>
          </div>
        </div>
      </div>
      {showEditForm && (
        <EquipmentForm 
          initialData={item} 
          onSave={() => { setShowEditForm(false); loadData(); setToast({ type: 'success', message: 'Asset updated successfully' }); }} 
          onCancel={() => setShowEditForm(false)} 
        />
      )}

      {showMaintForm && (
        <MaintenanceForm 
          equipment={item} 
          onSave={() => { setShowMaintForm(false); loadData(); setToast({ type: 'success', message: 'Maintenance record logged' }); }} 
          onCancel={() => setShowMaintForm(false)} 
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function InfoBlock({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-tight">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-slate-700">{value}</div>
    </div>
  );
}

function SideInfoBlock({ label, value }: any) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}
