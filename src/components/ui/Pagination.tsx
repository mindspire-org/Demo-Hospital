interface Props {
  page: number
  pages: number
  total: number
  limit?: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

export default function Pagination({ page, pages, total, limit = 20, onPageChange, onLimitChange }: Props) {
  const startRow = (page - 1) * limit + 1
  const endRow = Math.min(page * limit, total)

  const getPageNumbers = () => {
    const nums: (number | string)[] = []
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) nums.push(i)
    } else {
      nums.push(1)
      if (page > 3) nums.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i)
      if (page < pages - 2) nums.push('...')
      nums.push(pages)
    }
    return nums
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-slate-500">
          Showing {startRow}-{endRow} of {total}
        </span>
        {onLimitChange && (
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        )}
      </div>
      {pages > 1 && (
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          {getPageNumbers().map((p, i) => (
            typeof p === 'number' ? (
              <button
                key={i}
                onClick={() => onPageChange(p)}
                className={`rounded px-2.5 py-1 ${p === page ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {p}
              </button>
            ) : (
              <span key={i} className="px-2 py-1 text-slate-400">{p}</span>
            )
          ))}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
