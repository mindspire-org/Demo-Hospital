import { useState } from 'react'
import { Download, ChevronDown, ChevronUp, Table2, PieChart, Building2 } from 'lucide-react'

const fmtRs = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtNum = (n: number) => Number(n || 0).toLocaleString()

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

function SortTable({ headers, rows, footers, maxHeight }: any) {
  return (
    <div className={`overflow-auto rounded-xl border border-slate-100 ${maxHeight ? 'max-h-' + maxHeight : ''}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr>{headers.map((h: string, i: number) => <th key={i} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row: any[], ri: number) => (
            <tr key={ri} className={`border-b border-slate-50 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-100/50 transition-colors`}>
              {row.map((cell: any, ci: number) => <td key={ci} className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{cell}</td>)}
            </tr>
          ))}
        </tbody>
        {footers && (
          <tfoot className="sticky bottom-0 bg-slate-100 font-bold">
            <tr>{footers.map((f: any, i: number) => <td key={i} className="px-4 py-3 text-slate-900 dark:text-white">{f}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function ExpandableSection({ title, subtitle, icon, data, columns, children, totalCount, totalRevenue }: {
  title: string; subtitle?: string; icon: any; data: any[]; columns: string[]
  children?: React.ReactNode; totalCount?: number; totalRevenue?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? data : data.slice(0, 10)
  return (
    <Section title={title} subtitle={subtitle} icon={icon} actions={data.length > 10 ? (
      <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        {expanded ? <><ChevronUp className="h-3 w-3" /> Collapse</> : <><ChevronDown className="h-3 w-3" /> Show All ({data.length})</>}
      </button>
    ) : undefined}>
      {children}
      <SortTable headers={columns} rows={rows} maxHeight="80" footers={totalCount !== undefined ? [
        'Total', fmtNum(totalCount), totalRevenue !== undefined ? fmtRs(totalRevenue) : '',
      ] : undefined} />
    </Section>
  )
}

export default function LabReportsTables({ summary }: { summary: any }) {
  const testWise = summary.testWise || []
  const categoryWise = summary.categoryWise || []
  const collectionCenters = summary.collectionCenters || []

  const testTotalCount = testWise.reduce((s: number, t: any) => s + (t.count || 0), 0)
  const testTotalRevenue = testWise.reduce((s: number, t: any) => s + (t.revenue || 0), 0)
  const catTotalCount = categoryWise.reduce((s: number, c: any) => s + (c.count || 0), 0)
  const catTotalRevenue = categoryWise.reduce((s: number, c: any) => s + (c.revenue || 0), 0)

  const handleCsv = (filename: string, data: any[], headers: string[], rowsFn: (item: any) => any[]) => {
    const csv = [headers.join(','), ...data.map(rowsFn).map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Test-wise Table */}
      {testWise.length > 0 && (
        <ExpandableSection title="Test-wise Performance" subtitle="Revenue and volume by test" icon={Table2} data={testWise} columns={['Test Name', 'Count', 'Revenue']} totalCount={testTotalCount} totalRevenue={testTotalRevenue}>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => handleCsv(`test-wise-report.csv`, testWise, ['Test Name', 'Count', 'Revenue'], (t: any) => [t.testName, t.count, t.revenue])} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
          <SortTable headers={['Test Name', 'Count', 'Revenue']} rows={testWise.map((t: any) => [t.testName, <span className="font-bold text-slate-900">{fmtNum(t.count)}</span>, fmtRs(t.revenue)])} maxHeight="80" footers={['Total', fmtNum(testTotalCount), fmtRs(testTotalRevenue)]} />
        </ExpandableSection>
      )}

      {/* Category-wise Table */}
      {categoryWise.length > 0 && (
        <ExpandableSection title="Category-wise Revenue" subtitle="Revenue by test category" icon={PieChart} data={categoryWise} columns={['Category', 'Count', 'Revenue']} totalCount={catTotalCount} totalRevenue={catTotalRevenue}>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => handleCsv(`category-wise-report.csv`, categoryWise, ['Category', 'Count', 'Revenue'], (c: any) => [c.category, c.count, c.revenue])} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
          <SortTable headers={['Category', 'Count', 'Revenue']} rows={categoryWise.map((c: any) => [c.category, <span className="font-bold text-slate-900">{fmtNum(c.count)}</span>, fmtRs(c.revenue)])} maxHeight="80" footers={['Total', fmtNum(catTotalCount), fmtRs(catTotalRevenue)]} />
        </ExpandableSection>
      )}

      {/* Collection Centers */}
      {collectionCenters.length > 0 && (
        <ExpandableSection title="Collection Centers" subtitle="Performance by center" icon={Building2} data={collectionCenters} columns={['Center', 'Tokens', 'Revenue', 'Commission']}>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => handleCsv(`collection-centers-report.csv`, collectionCenters, ['Center', 'Tokens', 'Revenue', 'Commission'], (c: any) => [c.name, c.tokens, c.revenue, c.commission])} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
          <SortTable headers={['Center', 'Tokens', 'Revenue', 'Commission']} rows={collectionCenters.map((c: any) => [c.name, <span className="font-bold text-slate-900">{fmtNum(c.tokens)}</span>, fmtRs(c.revenue), fmtRs(c.commission)])} maxHeight="80" />
        </ExpandableSection>
      )}
    </div>
  )
}
