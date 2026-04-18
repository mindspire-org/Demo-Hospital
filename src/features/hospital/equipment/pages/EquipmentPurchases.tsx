import { useState, useEffect } from 'react';
import { equipmentApi } from '../equipment.api';
import { ShoppingCart, Calendar, Tag, User, Hash, DollarSign, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EquipmentPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  const loadPurchases = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await equipmentApi.listPurchases({ page: pageNum, limit });
      setPurchases(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / limit));
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPurchases(); }, [page, limit]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Purchase History...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 text-nowrap">Purchase History</h1>
          <p className="text-sm text-slate-500">Track all equipment procurement records</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
            <ShoppingCart size={18} />
            <span className="font-bold">{total}</span>
            <span className="text-sm font-medium">Total Records</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="px-6 py-4 text-base font-extrabold uppercase tracking-wider text-slate-700">Asset Info</th>
                <th className="px-6 py-4 text-base font-extrabold uppercase tracking-wider text-slate-700">Supplier</th>
                <th className="px-6 py-4 text-base font-extrabold uppercase tracking-wider text-slate-700">Invoice Details</th>
                <th className="px-6 py-4 text-base font-extrabold uppercase tracking-wider text-slate-700">Cost & Payment</th>
                <th className="px-6 py-4 text-base font-extrabold uppercase tracking-wider text-slate-700 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No purchase records found
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{p.equipmentId?.name || 'N/A'}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Hash size={12} /> {p.equipmentId?.code || 'No Code'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User size={14} className="text-slate-400" />
                        <span className="font-medium">{p.supplierId?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Tag size={14} className="text-slate-400" />
                          <span className="font-mono text-slate-600">{p.invoiceNo}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={12} />
                          {p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-slate-800 font-bold">
                          <DollarSign size={14} />
                          {p.grandTotal?.toLocaleString()}
                        </div>
                        <div className="text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                            p.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {p.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        to={`/hospital/equipment/${p.equipmentId?._id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex transition-colors"
                        title="View Asset"
                      >
                        <ExternalLink size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{purchases.length}</span> of <span className="font-bold text-slate-700">{total}</span> records
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
    </div>
  );
}
