import { useEffect, useState } from 'react';
import { labApi } from '../../utils/api';
import { Package, Search, Check, X } from 'lucide-react';
import Lab_ConfirmDialog from '../../components/lab/lab_ConfirmDialog.tsx';

export default function Lab_PendingReview() {
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Approve form fields
  const [category, setCategory] = useState('');
  const [unitsPerPack, setUnitsPerPack] = useState(1);
  const [minStock, setMinStock] = useState(0);
  const [salePerUnit, setSalePerUnit] = useState(0);

  useEffect(() => {
    loadItems();
  }, [page, limit, query]);

  const loadItems = async () => {
    try {
      const res: any = await labApi.listPendingInventory({ q: query, status: 'pending', page, limit });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error('Failed to load pending items', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      await labApi.approvePendingInventory(selectedItem._id, {
        category,
        unitsPerPack,
        minStock,
        salePerUnit
      });
      loadItems();
      setApproveOpen(false);
      setSelectedItem(null);
      resetForm();
    } catch (error) {
      console.error('Failed to approve item', error);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    try {
      await labApi.rejectPendingInventory(selectedItem._id);
      loadItems();
      setRejectOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to reject item', error);
    }
  };

  const resetForm = () => {
    setCategory('');
    setUnitsPerPack(1);
    setMinStock(0);
    setSalePerUnit(0);
  };

  const openApproveDialog = (item: any) => {
    setSelectedItem(item);
    setCategory('General');
    setUnitsPerPack(1);
    setMinStock(0);
    setSalePerUnit(0);
    setApproveOpen(true);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-600 p-2 text-white">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Pending Review</h2>
            <p className="text-sm text-slate-500">Review and approve items from received purchase orders</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-amber-600">{total}</div>
          <div className="text-sm text-slate-500">Items Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by item name, supplier, or PO number..."
              className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">PO Number</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.quantity}</td>
                  <td className="px-6 py-4 text-slate-600">{item.unit || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">Rs {item.price || 0}</td>
                  <td className="px-6 py-4 text-slate-600">{item.supplier}</td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-600">{item.purchaseOrderNumber}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.purchaseOrderDate ? new Date(item.purchaseOrderDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openApproveDialog(item)}
                        title="Approve & Add to Inventory"
                        className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedItem(item); setRejectOpen(true); }}
                        title="Reject Item"
                        className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="rounded-full bg-slate-100 p-4">
                        <Package className="h-12 w-12 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-slate-700">No items pending review</p>
                        <p className="text-sm text-slate-500 mt-1">Items from received purchase orders will appear here</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} items
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <div className="text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      {approveOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Approve Item</h3>
              <button
                onClick={() => { setApproveOpen(false); setSelectedItem(null); resetForm(); }}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={selectedItem.name}
                  disabled
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={selectedItem.quantity}
                    disabled
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Price</label>
                  <input
                    type="number"
                    value={selectedItem.price || 0}
                    disabled
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Category *</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Lab Supplies, Reagents, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Units Per Pack</label>
                  <input
                    type="number"
                    value={unitsPerPack}
                    onChange={(e) => setUnitsPerPack(Number(e.target.value))}
                    min="1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    min="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sale Price Per Unit</label>
                <input
                  type="number"
                  value={salePerUnit}
                  onChange={(e) => setSalePerUnit(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => { setApproveOpen(false); setSelectedItem(null); resetForm(); }}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={!category}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-sm disabled:opacity-50"
              >
                Approve & Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Lab_ConfirmDialog
        open={rejectOpen}
        title="Reject Item"
        message={`Are you sure you want to reject "${selectedItem?.name}"? This item will not be added to inventory.`}
        onCancel={() => { setRejectOpen(false); setSelectedItem(null); }}
        onConfirm={handleReject}
      />
    </div>
  );
}
