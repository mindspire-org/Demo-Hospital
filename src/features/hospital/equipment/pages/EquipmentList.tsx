import { useState, useEffect } from 'react';
import { equipmentApi } from '../equipment.api';
import EquipmentStatusBadge from '../components/EquipmentStatusBadge';
import EquipmentForm from '../components/EquipmentForm';
import MaintenanceForm from '../components/MaintenanceForm';
import Toast, { type ToastState } from '../../../../components/ui/Toast';
import { Search, Plus, Filter, Trash2, Pencil, Eye, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EquipmentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const load = async (pageNum = page) => {
    setLoading(true);
    try {
      const res = await equipmentApi.listEquipment({ q: search || undefined, page: pageNum, limit });
      setItems(res.items || res || []);
      setTotal(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / limit));
    } catch (error) {
      console.error('Load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    setPage(1);
    load(1); 
  }, [search]);

  useEffect(() => { load(page); }, [page, limit]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await equipmentApi.deleteEquipment(deleteConfirm._id || deleteConfirm.id);
      setToast({ type: 'success', message: 'Asset deleted successfully' });
      setDeleteConfirm(null);
      load();
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || 'Failed to delete asset' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipment Assets</h1>
          <p className="text-sm text-slate-500">Track lifecycle, location and compliance for all hospital equipment</p>
        </div>
        <button 
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-bold text-white shadow-lg shadow-sky-100 hover:bg-sky-700"
        >
          <Plus size={18} /> Register Asset
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-1 items-center gap-2 px-2 text-slate-400">
          <Search size={20} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, brand, serial or department..." 
            className="w-full bg-transparent py-2 text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-sm font-extrabold uppercase tracking-wider text-slate-700 border-b-2 border-slate-300">
            <tr>
              <th className="px-6 py-4 text-base">Asset Details</th>
              <th className="px-6 py-4 text-base">Category / Dept</th>
              <th className="px-6 py-4 text-base">Status</th>
              <th className="px-6 py-4 text-center text-base">Maintenance</th>
              <th className="px-6 py-4 text-right text-base">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-500">Loading assets...</td></tr>
            ) : items.map((it) => (
              <tr key={it._id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{it.name}</div>
                  <div className="mt-0.5 flex gap-2 text-xs text-slate-400">
                    <span className="font-medium text-sky-600">{it.code || 'NO-CODE'}</span>
                    <span>•</span>
                    <span>{it.make || 'Generic'} {it.model}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-700">{it.category || 'Uncategorized'}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-tight font-semibold mt-1">
                    {it.locationDepartmentId?.name || 'Central Store'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <EquipmentStatusBadge status={it.status} />
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="inline-flex flex-col items-center gap-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Next PPM</div>
                      <div className={`text-xs font-medium ${it.nextPpmDue ? 'text-slate-600' : 'text-slate-300'}`}>
                        {it.nextPpmDue || 'Not Scheduled'}
                      </div>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton icon={<Eye size={14} />} onClick={() => navigate(`/hospital/equipment/${it._id || it.id}`)} variant="view" tooltip="View Details" />
                    <ActionButton icon={<Wrench size={14} />} onClick={() => { setSelectedItem(it); setShowMaintForm(true); }} variant="maintenance" tooltip="Log Maintenance" />
                    <ActionButton icon={<Pencil size={14} />} onClick={() => { setEditItem(it); setShowForm(true); }} variant="edit" tooltip="Edit" />
                    <ActionButton icon={<Trash2 size={14} />} onClick={() => setDeleteConfirm(it)} variant="danger" tooltip="Delete" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <EquipmentForm 
          initialData={editItem} 
          onSave={() => { setShowForm(false); load(); setToast({ type: 'success', message: editItem ? 'Asset updated' : 'Asset registered' }); }} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      {showMaintForm && (
        <MaintenanceForm 
          equipment={selectedItem} 
          onSave={() => { setShowMaintForm(false); load(); setToast({ type: 'success', message: 'Maintenance record logged' }); }} 
          onCancel={() => setShowMaintForm(false)} 
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{items.length}</span> of <span className="font-bold text-slate-700">{total}</span> assets
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select 
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-sky-500"
            >
              {[10, 20, 50, 100].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
              <option value={999999}>All</option>
            </select>
          </div>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-2 font-bold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
              {page} / {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800">Delete Asset?</h2>
            <p className="mt-2 text-slate-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action will remove all maintenance records as well.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-6 py-2 font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function ActionButton({ icon, onClick, variant = 'primary', tooltip }: any) {
  const styles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-blue-200',
    view: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-emerald-200',
    maintenance: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-amber-200',
    edit: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-500 shadow-sky-200',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-rose-200'
  };
  
  const style = styles[variant as keyof typeof styles] || styles.primary;
    
  return (
    <button 
      onClick={onClick}
      title={tooltip}
      className={`rounded-lg border p-2 transition-all shadow-md ${style}`}
    >
      {icon}
    </button>
  );
}
