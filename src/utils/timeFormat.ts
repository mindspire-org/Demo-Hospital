export function getTimeFormat(): '12h' | '24h' {
  try {
    const stored = localStorage.getItem('hospital.timeFormat')
    if (stored === '24h') return '24h'
  } catch {}
  return '12h'
}

// ── Internal helpers ───────────────────────────────────────────────────────

function fmt12Internal(hhmm: string): string {
  try{
    if (!hhmm) return ''
    const s = String(hhmm).trim()
    if (/[ap]m/i.test(s)){
      const mm = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i)
      if (mm){
        const h = Math.max(1, Math.min(12, parseInt(mm[1], 10) || 12))
        return `${String(h).padStart(2,'0')}:${mm[2]} ${mm[3].toUpperCase()}`
      }
      return s.replace(/(am|pm)/i, (m)=>m.toUpperCase())
    }
    const parts = s.split(':')
    if (parts.length < 2) return s
    const h = parseInt(parts[0], 10)
    const m = parts[1].slice(0, 2)
    if (isNaN(h)) return s
    const am = h < 12
    const h12 = (h % 12) || 12
    return `${String(h12).padStart(2,'0')}:${m} ${am ? 'AM' : 'PM'}`
  } catch {
    return hhmm
  }
}

function fmt24Internal(hhmm: string): string {
  try{
    if (!hhmm) return ''
    const s = String(hhmm).trim()
    if (/[ap]m/i.test(s)){
      const mm = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i)
      if (mm){
        let h = parseInt(mm[1], 10) || 12
        const isPm = mm[3].toLowerCase() === 'pm'
        if (h === 12 && !isPm) h = 0
        else if (h !== 12 && isPm) h += 12
        return `${String(h).padStart(2,'0')}:${mm[2]}`
      }
    }
    const parts = s.split(':')
    if (parts.length < 2) return s
    const h = parseInt(parts[0], 10)
    const m = parts[1].slice(0, 2)
    if (isNaN(h)) return s
    return `${String(h).padStart(2,'0')}:${m}`
  } catch {
    return hhmm
  }
}

function fmtDateTime12Internal(d: any): string {
  try{
    let x = d instanceof Date ? d : new Date(d)
    if (!x || isNaN(x.getTime())) return ''

    const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000
    const pakTime = new Date(x.getTime() + PAKISTAN_OFFSET_MS)

    const dd = String(pakTime.getUTCDate()).padStart(2, '0')
    const mm = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = String(pakTime.getUTCFullYear())
    const hh = pakTime.getUTCHours()
    const mins = String(pakTime.getUTCMinutes()).padStart(2, '0')

    const am = hh < 12
    const h12 = (hh % 12) || 12
    const hhStr = String(h12).padStart(2, '0')

    return `${dd}/${mm}/${yyyy}, ${hhStr}:${mins} ${am ? 'AM' : 'PM'}`
  } catch {
    return ''
  }
}

function fmtDateTime24Internal(d: any): string {
  try{
    let x = d instanceof Date ? d : new Date(d)
    if (!x || isNaN(x.getTime())) return ''

    const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000
    const pakTime = new Date(x.getTime() + PAKISTAN_OFFSET_MS)

    const dd = String(pakTime.getUTCDate()).padStart(2, '0')
    const mm = String(pakTime.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = String(pakTime.getUTCFullYear())
    const hh = String(pakTime.getUTCHours()).padStart(2, '0')
    const mins = String(pakTime.getUTCMinutes()).padStart(2, '0')

    return `${dd}/${mm}/${yyyy}, ${hh}:${mins}`
  } catch {
    return ''
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export function fmt12(hhmm: string): string {
  return getTimeFormat() === '24h' ? fmt24Internal(hhmm) : fmt12Internal(hhmm)
}

export function fmtDate(d: any): string {
  try{
    const x = d instanceof Date ? d : new Date(d)
    if (!x || isNaN(x.getTime())) return ''
    const dd = String(x.getDate()).padStart(2, '0')
    const mm = String(x.getMonth() + 1).padStart(2, '0')
    const yyyy = String(x.getFullYear())
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return ''
  }
}

export function fmtDateTime12(d: any): string {
  return getTimeFormat() === '24h' ? fmtDateTime24Internal(d) : fmtDateTime12Internal(d)
}
