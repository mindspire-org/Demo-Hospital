import { forwardRef, useImperativeHandle, useState } from 'react'
import SuggestField from '../SuggestField'

type Props = {
  initialTestsText?: string
  suggestionsTests?: string[]
}

type Data = {
  tests?: string[]
}

type Display = {
  testsText: string
}

export default forwardRef(function PrescriptionDiagnosticOrders({ initialTestsText = '', suggestionsTests = [] }: Props, ref) {
  const [testsText, setTestsText] = useState<string>(initialTestsText)

  useImperativeHandle(ref, () => ({
    getData(): Data {
      const tests = String(testsText||'').split(/\n|,/).map(s=>s.trim()).filter(Boolean)
      return {
        tests: tests.length ? tests : undefined,
      }
    },
    getDisplay(): Display { return { testsText } },
    setDisplay(next: Partial<Display>){ if (next.testsText !== undefined) setTestsText(next.testsText||'') },
  }))

  return (
    <div>
      <div className="mb-1 block text-sm font-semibold text-slate-700">Diagnostic Orders</div>
      <div>
        <label className="mb-1 block text-sm text-slate-700">Diagnostic Tests (comma or one per line)</label>
        <SuggestField rows={3} value={testsText} onChange={v=>setTestsText(v)} suggestions={suggestionsTests} placeholder="Ultrasound Abdomen, Echocardiography, CT Scan" />
      </div>
    </div>
  )
})
