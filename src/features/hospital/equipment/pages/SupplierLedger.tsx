import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentApi } from '../equipment.api';
import { 
  ArrowLeft, DollarSign, Tag, 
  PlusCircle, AlertCircle,
  History, CheckCircle2, Wallet,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Toast, { type ToastState } from '../../../../components/ui/Toast';

export default function SupplierLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [paymentData, setPayment] = useState({
    amount: '',
    paymentMethod: 'Cash',
    referenceNo: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  // Client-side pagination for transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadLedger = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await equipmentApi.getFullLedger(id);
      setData(res);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLedger(); }, [id]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await equipmentApi.addPayment(id, paymentData);
      setToast({ type: 'success', message: 'Payment recorded successfully' });
      setShowPaymentForm(false);
      setPayment({
        amount: '',
        paymentMethod: 'Cash',
        referenceNo: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      loadLedger();
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || 'Payment failed' });
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading full ledger...</div>;
  if (!data) return <div className="p-8 text-center text-rose-500">Supplier not found.</div>;

  const { supplier, stats, items } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/hospital/equipment/suppliers')}
            className="rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{supplier.name} - Ledger</h1>
            <p className="text-sm text-slate-500">{supplier.company || 'Individual Supplier'}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowPaymentForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle size={18} /> Record Payment
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Business" value={stats.totalBusiness} icon={Wallet} color="text-slate-600" bg="bg-slate-50" />
        <StatCard title="Total Paid" value={stats.totalPaid} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Outstanding" value={stats.outstanding} icon={AlertCircle} color="text-rose-600" bg="bg-rose-50" />
        <StatCard title="Purchases" value={stats.totalPurchases} icon={Tag} color="text-sky-600" bg="bg-sky-50" />
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-slate-400" />
            Transaction History
          </h2>
          <span className="text-xs font-medium text-slate-500">{items.length} Entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-sm font-extrabold uppercase tracking-wider text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No transactions recorded yet.</td></tr>
              ) : (
                items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{item.category}</span>
                        {item.equipmentId && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Tag size={12} /> {item.equipmentId.name}
                          </span>
                        )}
                        {item.notes && <span className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">{item.notes}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      ₨{item.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">
                      ₨{item.paidAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        item.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                      ₨{(item.totalAmount - item.paidAmount)?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Record Payment</h2>
              <button onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <ArrowLeft size={20} className="rotate-180" />
              </button>
            </div>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Amount (₨) *</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number" 
                    required 
                    value={paymentData.amount} 
                    onChange={e => setPayment({...paymentData, amount: e.target.value})}
                    placeholder="Enter amount to pay"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Total Outstanding: ₨{stats.outstanding.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Date</label>
                  <input 
                    type="date" 
                    value={paymentData.date} 
                    onChange={e => setPayment({...paymentData, date: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Method</label>
                  <select 
                    value={paymentData.paymentMethod} 
                    onChange={e => setPayment({...paymentData, paymentMethod: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference / Check No.</label>
                <input 
                  type="text" 
                  value={paymentData.referenceNo} 
                  onChange={e => setPayment({...paymentData, referenceNo: e.target.value})}
                  placeholder="Optional reference number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</label>
                <textarea 
                  value={paymentData.notes} 
                  onChange={e => setPayment({...paymentData, notes: e.target.value})}
                  placeholder="Optional payment notes..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 h-20 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 rounded-lg px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client-side Pagination for Transactions */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">{items.length > 0 ? Math.min(items.length, (currentPage - 1) * itemsPerPage + 1) : 0}-{Math.min(items.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-700">{items.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-sky-500"
            >
              {[10, 20, 50, 100].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
              <option value={999999}>All</option>
            </select>
          </div>
        </div>

        {items.length > itemsPerPage && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-2 font-bold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
              {currentPage} / {Math.ceil(items.length / itemsPerPage)}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(items.length / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(items.length / itemsPerPage)}
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

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl ${bg} p-3 ${color}`}>
          <Icon size={24} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
          <div className="text-xl font-black text-slate-800">₨{value?.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
