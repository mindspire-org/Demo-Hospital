import { X, FileText, Files } from 'lucide-react'

type CombineReportsDialogProps = {
  isOpen: boolean
  onClose: () => void
  onCombine: () => void
  onSeparate: () => void
  testCount: number
  barcode: string
  tests: Array<{ name: string; token: string }>
}

export default function CombineReportsDialog({
  isOpen,
  onClose,
  onCombine,
  onSeparate,
  testCount,
  barcode,
  tests
}: CombineReportsDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Multiple Tests Found</h3>
              <p className="text-sm text-slate-600">Choose report generation option</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="mb-4 rounded-lg bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                {testCount} Tests
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-mono text-xs text-slate-600">{barcode}</span>
            </div>
            <div className="space-y-2">
              {tests.map((test, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{test.name}</div>
                    <div className="text-xs text-slate-500">Token: {test.token}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 text-sm text-slate-600">
            These tests share the same barcode. How would you like to generate the report?
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={() => {
              onSeparate()
              onClose()
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Separate Report
            <span className="text-xs text-slate-500">(Only this test)</span>
          </button>
          <button
            onClick={() => {
              onCombine()
              onClose()
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            <Files className="h-4 w-4" />
            Combined Report
            <span className="text-xs text-violet-200">(All tests together)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
