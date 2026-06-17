import { useEffect, useMemo, useRef, useState } from 'react'

export default function SuggestField({
  value,
  onChange,
  suggestions,
  placeholder,
  rows = 2,
  className = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-sky-500 transition-all',
  mode = 'default',
  as = 'textarea',
  onBlurValue,
  renderSuggestion,
}: {
  value: string | undefined | null
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  rows?: number
  className?: string
  mode?: 'default' | 'lab-tests' | 'multi'
  as?: 'textarea' | 'input'
  onBlurValue?: (v: string) => void
  renderSuggestion?: (s: string, active: boolean) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const isMulti = mode === 'lab-tests' || mode === 'multi'

  const safeValue = value ?? ''

  const query = useMemo(() => {
    if (isMulti) {
      const idx = Math.max(safeValue.lastIndexOf(','), safeValue.lastIndexOf('\n'))
      return safeValue.slice(idx + 1).trim()
    }
    return safeValue.trim()
  }, [safeValue, isMulti])

  const list = useMemo(() => {
    const uniq = Array.from(new Set((suggestions || []).map(s => (s || '').trim()).filter(Boolean)))
    if (!query) return uniq.slice(0, 2000)
    const q = query.toLowerCase()
    return uniq.filter(s => s.toLowerCase().includes(q)).slice(0, 2000)
  }, [suggestions, query])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.children[active] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [active, open])

  const choose = (s: string) => {
    if (isMulti) {
      const idxComma = safeValue.lastIndexOf(',')
      const idxNL = safeValue.lastIndexOf('\n')
      const idx = Math.max(idxComma, idxNL)
      const sep = idx === idxComma ? ',' : (idx === idxNL ? '\n' : '')
      let prefix = idx >= 0 ? safeValue.slice(0, idx + 1) : ''
      
      if (idx >= 0) {
        if (sep === ',') {
          prefix = prefix.replace(/\s*$/, '')
          if (!prefix.endsWith(',')) prefix += ','
          prefix += ' '
        }
      } else if (safeValue.trim().length > 0 && !safeValue.trim().endsWith(',') && !safeValue.trim().endsWith('\n')) {
        // If there's already text but no separator, and we are choosing from dropdown, 
        // it means we are likely replacing the current word or appending.
        // But if we are in multi mode, we usually want to append if the current word doesn't match perfectly.
        // Actually, the 'query' logic already handles finding the last word.
        // If idx is -1, it means we are at the first word.
      }
      
      let newValue = (prefix || '') + s
      if (isMulti) {
        newValue += ', '
      }
      onChange(newValue)
    } else {
      onChange(s)
    }
    setOpen(false)
    setActive(0)
    setTimeout(() => (inputRef.current as any)?.focus?.(), 0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => Math.min((list.length || 1) - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(0, a - 1))
    } else if ((e.key === 'Enter' || e.key === 'Tab') && open && list[active]) {
      e.preventDefault()
      choose(list[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      {as === 'textarea' ? (
        <textarea
          ref={inputRef as any}
          rows={rows}
          value={safeValue}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={(e)=> onBlurValue?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          ref={inputRef as any}
          value={safeValue}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={(e)=> onBlurValue?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className}
        />
      )}
      {open && list.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/5" ref={listRef}>
          {list.map((s, i) => (
            <div
              key={`${s}-${i}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => choose(s)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-slate-100 dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {renderSuggestion ? renderSuggestion(s, i === active) : s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
