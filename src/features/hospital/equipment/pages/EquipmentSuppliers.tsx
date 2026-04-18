import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { equipmentApi } from '../equipment.api';
import Toast, { type ToastState } from '../../../../components/ui/Toast';
import { Plus, Search, Building2, Phone, ChevronRight, Pencil, Trash2, ChevronLeft } from 'lucide-react';

export default function EquipmentSuppliers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(9);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: '', company: '', phone: '', type: 'ServiceProvider' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const load = async (pageNum = page) => {
    setLoading(true);
    try {
      const res = await equipmentApi.list({ q: search || undefined, page: pageNum, limit });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / limit));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    setPage(1);
    load(1); 
  }, [search]);

  useEffect(() => { load(page); }, [page, limit]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await equipmentApi.update(editingId, form);
        setToast({ type: 'success', message: 'Supplier updated successfully' });
      } else {
        await equipmentApi.create(form);
        setToast({ type: 'success', message: 'Supplier added successfully' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', company: '', phone: '', type: 'ServiceProvider' });
      load();
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Failed to save' });
    }
  };

  const startEdit = (supplier: any) => {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name || '',
      company: supplier.company || '',
      phone: supplier.phone || '',
      type: supplier.type || 'ServiceProvider'
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await equipmentApi.deleteSupplier(deleteConfirm._id);
      setToast({ type: 'success', message: 'Supplier deleted successfully' });
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipment Suppliers</h1>
          <p className="text-sm text-slate-500">Manage vendors, service providers, and ledger</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', company: '', phone: '', type: 'ServiceProvider' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-1 items-center gap-2 px-2 text-slate-400">
          <Search size={20} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search suppliers by name, company, or contact..." 
            className="w-full bg-transparent py-2 text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading suppliers...</div>
        ) : items.map(it => (
          <div key={it._id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-sky-300 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-800">{it.name}</div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 size={14} /> {it.company || 'Private Vendor'}
                </div>
              </div>
              <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${it.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {it.status}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Outstanding</div>
                <div className="text-md font-bold text-rose-600">₨{it.outstanding?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Business</div>
                <div className="text-md font-bold text-slate-700">₨{(it.totalPurchases + it.totalServices).toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} /> {it.phone || 'No phone'}
              </div>
              <button 
                onClick={() => navigate(`/hospital/equipment/suppliers/${it._id}/ledger`)}
                className="flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline"
              >
                View Ledger <ChevronRight size={14} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
              <button 
                onClick={() => startEdit(it)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <Pencil size={14} /> Edit
              </button>
              <button 
                onClick={() => setDeleteConfirm(it)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            No suppliers found matching your search.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company</label>
                <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200">
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="ServiceProvider">Service Provider</option>
                  <option value="AMCProvider">AMC Provider</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="rounded-lg bg-sky-600 px-6 py-2 text-white hover:bg-sky-700 font-bold shadow-lg shadow-sky-200">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800">Delete Supplier?</h2>
            <p className="mt-2 text-slate-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{items.length}</span> of <span className="font-bold text-slate-700">{total}</span> suppliers
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select 
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-sky-500"
            >
              {[9, 18, 45, 90].map(v => (
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
