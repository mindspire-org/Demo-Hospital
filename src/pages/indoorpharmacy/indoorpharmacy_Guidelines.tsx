import {
  Keyboard,
  CreditCard,
  Search,
  ShoppingCart,
  ArrowRight,
  Zap,
  Shield,
  BookOpen,
  Lightbulb,
  MousePointerClick,
  ScanBarcode,
  Package,
  ChevronRight,
} from 'lucide-react'

/* ─── styled key badge ─── */
function K({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-slate-300 bg-slate-100 px-2 font-mono text-xs font-bold text-slate-700 shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </kbd>
  )
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-xs text-slate-400">+</span>}
          <K>{k}</K>
        </span>
      ))}
    </div>
  )
}

/* ─── data ─── */
type Shortcut = { label: string; keys: string[]; desc: string }
type ShortcutSection = { title: string; icon: React.ElementType; color: string; shortcuts: Shortcut[] }

const SECTIONS: ShortcutSection[] = [
  {
    title: 'Global Navigation',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    shortcuts: [
      { label: 'Open POS', keys: ['Ctrl', 'N'], desc: 'Jump to Point of Sale from anywhere' },
      { label: 'Open Reports', keys: ['Shift', 'R'], desc: 'Open the Reports page' },
      { label: 'Open Inventory', keys: ['Shift', 'I'], desc: 'Open the Inventory page' },
      { label: 'Focus POS Search', keys: ['Ctrl', 'D'], desc: 'Put cursor in the POS search bar' },
      { label: 'Focus Inventory Search', keys: ['Shift', 'F'], desc: 'Put cursor in the Inventory search bar' },
    ],
  },
  {
    title: 'POS — Searching & Scanning',
    icon: Search,
    color: 'from-emerald-500 to-teal-600',
    shortcuts: [
      { label: 'Type to search', keys: ['A–Z'], desc: 'Start typing in the search bar to find medicines' },
      { label: 'Scan barcode', keys: ['Barcode'], desc: 'Just scan — the system auto-detects barcodes' },
      { label: 'Browse suggestions', keys: ['↑', '↓'], desc: 'Move through the dropdown suggestion list' },
      { label: 'Add from suggestion', keys: ['Enter'], desc: 'Add the highlighted medicine to cart & jump to qty' },
      { label: 'Close suggestions', keys: ['Esc'], desc: 'Close the search dropdown' },
    ],
  },
  {
    title: 'POS — Cart & Quantities',
    icon: ShoppingCart,
    color: 'from-amber-500 to-orange-600',
    shortcuts: [
      { label: 'Confirm quantity', keys: ['Enter'], desc: 'After editing qty, press Enter to return to search' },
      { label: 'Increase quantity', keys: ['+'], desc: 'Add 1 to the last cart item' },
      { label: 'Decrease quantity', keys: ['−'], desc: 'Remove 1 from the last cart item' },
      { label: 'Remove item', keys: ['Del'], desc: 'Remove the focused item from the cart' },
      { label: 'Navigate cart rows', keys: ['↑', '↓'], desc: 'Move focus between cart items' },
      { label: 'Adjust qty in field', keys: ['↑', '↓'], desc: 'While in qty input: ↑ adds 1, ↓ removes 1' },
    ],
  },
  {
    title: 'POS — Payment & Billing',
    icon: CreditCard,
    color: 'from-rose-500 to-pink-600',
    shortcuts: [
      { label: 'Open payment', keys: ['Shift', 'Enter'], desc: 'Open the payment dialog instantly' },
      { label: 'Quick pay shortcut', keys: ['Ctrl', 'P'], desc: 'Trigger payment from anywhere in POS' },
    ],
  },
]

const WORKFLOWS = [
  {
    title: 'Quick Sale',
    icon: Zap,
    steps: [
      { action: 'Search', detail: 'Type medicine name or scan barcode', key: 'Search bar' },
      { action: 'Add', detail: 'Press Enter to add to cart', key: 'Enter' },
      { action: 'Set Qty', detail: 'Type quantity, then press Enter', key: 'Enter' },
      { action: 'Repeat', detail: 'Search & add more items as needed', key: 'Search → Enter' },
      { action: 'Pay', detail: 'Press Shift+Enter to open payment', key: 'Shift + Enter' },
    ],
  },
  {
    title: 'Barcode Scanning',
    icon: ScanBarcode,
    steps: [
      { action: 'Scan', detail: 'Scan any barcode — auto-detected', key: 'Scanner' },
      { action: 'Auto-add', detail: 'Matched item is added to cart automatically', key: 'Auto' },
      { action: 'Set Qty', detail: 'Cursor jumps to qty — type & Enter', key: 'Enter' },
      { action: 'Continue', detail: 'Search bar re-focuses for next scan', key: 'Auto' },
    ],
  },
]

const TIPS = [
  { icon: Shield, title: 'Auto-Hold on Leave', desc: 'If you navigate away from POS with items in the cart, the bill is automatically held. Restore it later from "Held Bills".' },
  { icon: Package, title: 'Hide Medicines for Full Cart', desc: 'Click "Hide Medicines" to expand the cart to full page — great for reviewing large bills.' },
  { icon: Lightbulb, title: 'Bill Discount', desc: 'Apply a bill-wide discount percentage or flat Rs amount in the Bill Summary section.' },
  { icon: MousePointerClick, title: 'Click ✕ to Remove', desc: 'Each cart row has a ✕ button in the top-right corner for quick removal.' },
]

export default function Pharmacy_Guidelines() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-2xl md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Keyboard className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Keyboard Shortcuts & User Guide</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 md:text-base">
              Master these shortcuts to run the pharmacy POS at full speed. Search, scan, sell — all from the keyboard.
            </p>
          </div>
        </div>
      </div>

      {/* ── Keyboard Shortcuts by Category ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map(section => {
          const Icon = section.icon
          return (
            <div key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {/* Section header */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${section.color} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{section.title}</h2>
              </div>
              {/* Shortcuts list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {section.shortcuts.map(s => (
                  <div key={s.label} className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</div>
                    </div>
                    <div className="shrink-0">
                      <KeyCombo keys={s.keys} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Workflow Guides ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Workflow Guides</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {WORKFLOWS.map(wf => {
            const Icon = wf.icon
            return (
              <div key={wf.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{wf.title}</h3>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    {wf.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.action}</span>
                          <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">— {step.detail}</span>
                        </div>
                        <K>{step.key}</K>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tips & Features ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tips & Features</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIPS.map(tip => {
            const Icon = tip.icon
            return (
              <div key={tip.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{tip.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tip.desc}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick Reference Card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <ChevronRight className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Quick Reference — POS Flow</h2>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 p-5">
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Search</span>
            <K>Search</K>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 dark:bg-emerald-900/20">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Add</span>
            <K>Enter</K>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 dark:bg-amber-900/20">
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Set Qty</span>
            <K>Enter</K>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 dark:bg-purple-900/20">
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Repeat</span>
            <K>Search</K>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 dark:bg-rose-900/20">
            <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Pay</span>
            <KeyCombo keys={['Shift', 'Enter']} />
          </div>
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-600">
        Shortcuts work when no text input is focused (except where noted). Mouse always works too! 💊
      </p>
    </div>
  )
}
