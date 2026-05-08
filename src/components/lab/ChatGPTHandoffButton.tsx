import { useState } from 'react'

type Row = { test: string; value?: string; unit?: string; normal?: string; flag?: string }

type Props = {
  testName?: string
  patient?: { fullName?: string; age?: string; gender?: string; mrn?: string }
  rows?: Row[]
  interpretation?: string
  promptPreamble?: string
  className?: string
}

/**
 * Builds a structured Markdown summary of the lab result and:
 *   1. Copies it to clipboard
 *   2. Tries to open https://chatgpt.com/?q=<urlencoded> in a new tab
 *      (falls back to the plain ChatGPT homepage when prompt is too long)
 */
export default function ChatGPTHandoffButton({
  testName,
  patient,
  rows,
  interpretation,
  promptPreamble,
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)

  function buildPrompt() {
    const lines: string[] = []
    lines.push(promptPreamble || 'Please review the following lab result and provide an interpretation in clinical language.')
    lines.push('')
    lines.push(`**Test:** ${testName || ''}`)
    if (patient) {
      lines.push(`**Patient:** ${patient.fullName || ''}${patient.age ? ` · Age ${patient.age}` : ''}${patient.gender ? ` · ${patient.gender}` : ''}${patient.mrn ? ` · MRN ${patient.mrn}` : ''}`)
    }
    lines.push('')
    lines.push('| Parameter | Value | Unit | Reference | Flag |')
    lines.push('|---|---|---|---|---|')
    for (const r of rows || []) {
      if (!r.value && !r.test) continue
      lines.push(`| ${r.test} | ${r.value || ''} | ${r.unit || ''} | ${r.normal || ''} | ${r.flag || ''} |`)
    }
    if (interpretation) {
      lines.push('')
      lines.push('**Auto-interpretation (system-generated):**')
      lines.push(interpretation)
    }
    return lines.join('\n')
  }

  async function handle() {
    const prompt = buildPrompt()
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch {}
    // ChatGPT search-style URL works for short prompts; otherwise rely on clipboard paste.
    const useShortcut = prompt.length < 1500
    const url = useShortcut
      ? `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
      : 'https://chatgpt.com/'
    try { window.open(url, '_blank', 'noopener') } catch {}
  }

  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 ${className}`}
      title="Copy result to clipboard and open ChatGPT"
    >
      <span aria-hidden>🤖</span>
      <span>{copied ? 'Copied — opening ChatGPT…' : 'Send to ChatGPT'}</span>
    </button>
  )
}
