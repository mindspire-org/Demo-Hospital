import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Layers, Activity, TrendingUp } from 'lucide-react'

const fmtRs = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtNum = (n: number) => Number(n || 0).toLocaleString()
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function Section({ title, subtitle, icon: Icon, children, actions }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-800"><Icon className="h-5 w-5" /></div>}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export default function LabReportsCharts({ summary }: { summary: any }) {
  const dailyData = (summary.dailyRevenue || []).map((d: any) => ({ date: d.date.slice(5), value: d.value }))
  const comparisonData = (summary.comparison || []).map((c: any) => ({ name: c.label, value: c.value }))
  const statusData = [
    { name: 'Pending Results', value: summary.pendingResults || 0 },
    { name: 'Pending Approval', value: summary.pendingApproval || 0 },
    { name: 'Completed', value: summary.completedTests || 0 },
  ].filter(d => d.value > 0)
  const profit = (summary.totalRevenue || 0) - (summary.totalExpenses || 0) - (summary.totalPurchasesAmount || 0)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Daily Revenue */}
      <Section title="Daily Revenue Trend" subtitle="Revenue over selected period" icon={BarChart3} actions={<div className="text-right"><span className="text-[10px] font-bold uppercase text-slate-400">Total</span><div className="text-base font-black text-indigo-600">{fmtRs(summary.totalRevenue || 0)}</div></div>}>
        <div className="h-56">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `Rs ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtRs(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">No revenue data</div>}
        </div>
      </Section>

      {/* Test Status Donut */}
      <Section title="Test Status" subtitle="Distribution by status" icon={Layers}>
        <div className="h-56">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusData.map((_e: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [fmtNum(Number(v)), n]} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">No status data</div>}
        </div>
      </Section>

      {/* Financial Comparison */}
      <Section title="Financial Overview" subtitle="Revenue vs Expenses vs Purchases" icon={Activity} actions={<div className="rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800"><span className="text-[10px] font-bold uppercase text-slate-400 block">Net</span><span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtRs(profit)}</span></div>}>
        <div className="h-56">
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `Rs ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtRs(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>{comparisonData.map((_e: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">No comparison data</div>}
        </div>
      </Section>

      {/* Collection Efficiency */}
      <Section title="Collection Efficiency" subtitle="Received vs Receivable" icon={TrendingUp}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: 'Received', value: summary.totalReceived || 0 }, { name: 'Receivable', value: (summary.totalRevenue || 0) - (summary.totalReceived || 0) }]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `Rs ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmtRs(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}><Cell fill="#10b981" /><Cell fill="#f59e0b" /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  )
}
