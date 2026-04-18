import { useState, useEffect } from 'react';
import { equipmentApi } from '../equipment.api';
import { Package, Wrench, AlertTriangle, DollarSign, Calendar, ShoppingCart } from 'lucide-react';

export default function EquipmentDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [kpiRes, supplierStats] = await Promise.all([
          equipmentApi.equipmentKpis(),
          equipmentApi.getStats()
        ]);
        setStats({ kpi: kpiRes, suppliers: supplierStats });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;

  const cards = [
    { title: 'Total Equipment', value: stats?.kpi?.total || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Working', value: stats?.kpi?.working || 0, icon: Wrench, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Maintenance', value: stats?.kpi?.underMaintenance || 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Total Purchases', value: stats?.kpi?.totalPurchases || 0, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Purchase Value', value: `₨${(stats?.kpi?.totalPurchaseValue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Due Maintenance', value: stats?.kpi?.ppm?.due || 0, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Equipment Overview</h1>
        <div className="text-sm text-slate-500">Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-hover hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${card.bg} p-2 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{card.title}</div>
                <div className="text-lg font-bold text-slate-800">{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Compliance Metrics</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm font-medium">
                <span className="text-slate-600">PPM Compliance</span>
                <span className="text-emerald-600">{(stats?.kpi?.ppm?.compliance * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${stats?.kpi?.ppm?.compliance * 100 || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm font-medium">
                <span className="text-slate-600">Calibration Compliance</span>
                <span className="text-sky-600">{(stats?.kpi?.calibration?.compliance * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full bg-sky-500 transition-all duration-500" 
                  style={{ width: `${stats?.kpi?.calibration?.compliance * 100 || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Reliability Index</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">MTBF</div>
              <div className="text-xl font-bold text-slate-800">{stats?.kpi?.breakdowns?.mtbfDays?.toFixed(1) || '-'} days</div>
              <div className="mt-1 text-xs text-slate-400 text-nowrap">Mean Time Between Failures</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Downtime Index</div>
              <div className="text-xl font-bold text-slate-800">{(stats?.kpi?.breakdowns?.downtimePercent || 0).toFixed(2)}%</div>
              <div className="mt-1 text-xs text-slate-400">System non-availability</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
