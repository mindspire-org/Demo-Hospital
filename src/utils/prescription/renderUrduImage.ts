let urduFontLoaded = false
let urduFontLoadPromise: Promise<boolean> | null = null

async function injectFontFace(): Promise<boolean> {
  if (urduFontLoaded) return true
  if (urduFontLoadPromise) return urduFontLoadPromise

  urduFontLoadPromise = (async () => {
    // Try multiple font sources
    const candidates = [
      { family: 'AlQalamTajNastaleeq', url: '/AlQalam Taj Nastaleeq Regular.ttf' },
      { family: 'AlQalamTajNastaleeq', url: './AlQalam Taj Nastaleeq Regular.ttf' },
      { family: 'AlQalamTajNastaleeq', url: 'AlQalam Taj Nastaleeq Regular.ttf' },
    ]

    for (const { family, url } of candidates) {
      try {
        // Remove existing @font-face if any
        const existing = document.getElementById('urdu-font-face')
        if (existing) existing.remove()

        const style = document.createElement('style')
        style.id = 'urdu-font-face'
        style.textContent = `
          @font-face {
            font-family: '${family}';
            src: url('${url}') format('truetype');
            font-display: swap;
          }
        `
        document.head.appendChild(style)

        // Force load via FontFace API if available
        if ('FontFace' in window) {
          try {
            const ff = new FontFace(family, `url(${url})`)
            await ff.load()
            ;(document as any).fonts.add(ff)
          } catch {}
        }

        // Wait for font to be ready
        await document.fonts.load(`16px '${family}'`)

        // Verify with canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        ctx.font = `20px '${family}'`
        const m = ctx.measureText('ا')
        if (m.width > 0) {
          urduFontLoaded = true
          console.log('[UrduImage] Font loaded:', family, 'from', url)
          return true
        }
      } catch (e: any) {
        console.warn('[UrduImage] Failed to load font from', url, e?.message || e)
      }
    }

    // Fallback: try system Urdu fonts
    const fallbacks = ['Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', 'Nafees Nastaleeq']
    for (const family of fallbacks) {
      try {
        await document.fonts.load(`16px '${family}'`)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        ctx.font = `20px '${family}'`
        const m = ctx.measureText('ا')
        if (m.width > 0) {
          // Inject alias so templates can reference it uniformly
          const style = document.createElement('style')
          style.id = 'urdu-font-face'
          style.textContent = `@font-face { font-family: 'AlQalamTajNastaleeq'; src: local('${family}'); }`
          document.head.appendChild(style)
          await document.fonts.load(`16px 'AlQalamTajNastaleeq'`)
          urduFontLoaded = true
          console.log('[UrduImage] Using system fallback font:', family)
          return true
        }
      } catch {}
    }

    console.error('[UrduImage] Could not load any Urdu font')
    return false
  })()

  return urduFontLoadPromise
}

function parsePdfColor(doc: any): string {
  try {
    const c = doc.getTextColor()
    if (!c) return '#000000'
    const parts = String(c).trim().split(/\s+/)
    if (parts.length >= 2 && parts[parts.length - 1] === 'g') {
      const v = Math.round(parseFloat(parts[0]) * 255)
      return `rgb(${v},${v},${v})`
    }
    if (parts.length >= 4 && parts[parts.length - 1] === 'rg') {
      const r = Math.round(parseFloat(parts[0]) * 255)
      const g = Math.round(parseFloat(parts[1]) * 255)
      const b = Math.round(parseFloat(parts[2]) * 255)
      return `rgb(${r},${g},${b})`
    }
    if (parts.length >= 5 && parts[parts.length - 1] === 'k') {
      const k = parseFloat(parts[3])
      const r = Math.round((1 - parseFloat(parts[0])) * (1 - k) * 255)
      const g = Math.round((1 - parseFloat(parts[1])) * (1 - k) * 255)
      const b2 = Math.round((1 - parseFloat(parts[2])) * (1 - k) * 255)
      return `rgb(${r},${g},${b2})`
    }
  } catch {}
  return '#000000'
}

const imageCache = new Map<string, { dataUrl: string; width: number; height: number }>()

function cacheKey(text: string, fontSize: number, color: string): string {
  return `${text}::${fontSize}::${color}`
}

const PX_PER_MM = 96 / 25.4 // ~3.7795 px per mm at 96 DPI

export function renderUrduToImage(text: string, fontSizeMm: number, color: string, maxWidthMm?: number): { dataUrl: string; width: number; height: number } | null {
  if (!urduFontLoaded || !/\S/.test(text)) return null

  const scale = 3 // High DPI for crisp text
  const canvas = document.createElement('canvas')
  canvas.setAttribute('dir', 'rtl')
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null

  // Base scaleFactor: make Urdu text smaller so it fits narrow table cells
  const scaleFactor = 0.60
  let fontSizePx = fontSizeMm * PX_PER_MM * scaleFactor

  ctx.font = `${fontSizePx}px 'AlQalamTajNastaleeq'`
  let metrics = ctx.measureText(text)
  let textWidthPx = metrics.width

  // If maxWidth is specified, shrink font until text fits natively (sharper than post-scaling)
  if (maxWidthMm && maxWidthMm > 0) {
    const maxWidthPx = maxWidthMm * PX_PER_MM
    // Binary-search down to a fitting font size (min 6px)
    let lo = 6
    let hi = fontSizePx
    if (textWidthPx > maxWidthPx) {
      for (let iter = 0; iter < 8 && hi - lo > 0.5; iter++) {
        const mid = (lo + hi) / 2
        ctx.font = `${mid}px 'AlQalamTajNastaleeq'`
        const w = ctx.measureText(text).width
        if (w > maxWidthPx) { hi = mid } else { lo = mid }
      }
      fontSizePx = lo
      ctx.font = `${fontSizePx}px 'AlQalamTajNastaleeq'`
      metrics = ctx.measureText(text)
      textWidthPx = metrics.width
    }
  }

  const textHeightPx = fontSizePx * 1.30 // tight single-line height

  // Set canvas size at 3x for high-DPI image
  canvas.width = Math.ceil(textWidthPx * scale) + 8
  canvas.height = Math.ceil(textHeightPx * scale) + 8

  // Draw scaled (font set at logical px size, context scaled for resolution)
  const logicalW = canvas.width / scale
  const logicalH = canvas.height / scale
  ctx.scale(scale, scale)
  ctx.font = `${fontSizePx}px 'AlQalamTajNastaleeq'`
  ctx.fillStyle = color
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.clearRect(0, 0, logicalW, logicalH)
  ctx.fillText(text, logicalW - 2, textHeightPx / 2)

  // Return dimensions in mm so jsPDF addImage interprets them correctly
  const result = {
    dataUrl: canvas.toDataURL('image/png'),
    width: (textWidthPx / PX_PER_MM) + 0.5,
    height: textHeightPx / PX_PER_MM,
  }
  imageCache.set(cacheKey(text + (maxWidthMm ? `|mw${maxWidthMm.toFixed(1)}` : ''), fontSizeMm, color), result)
  return result
}

export async function ensureUrduFontReady(): Promise<boolean> {
  return injectFontFace()
}

export function drawUrduText(doc: any, text: string | string[], x: number, y: number, opts?: any) {
  // Arrays = multi-line text (usually English wrapped lines); canvas can't render multi-line easily
  if (Array.isArray(text)) {
    doc.text(text, x, y, opts)
    return
  }
  if (!urduFontLoaded) {
    // Font not available — strip Urdu chars to avoid helvetica rendering garbage
    const clean = text.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim()
    if (clean) doc.text(clean, x, y, opts)
    return
  }
  if (!/[\u0600-\u06FF]/.test(text)) {
    doc.text(text, x, y, opts)
    return
  }

  const fontSize = doc.getFontSize() || 10
  const color = parsePdfColor(doc)
  const maxWidth = Number(opts?.maxWidth || 0)
  const rendered = renderUrduToImage(text, fontSize, color, maxWidth > 0 ? maxWidth : undefined)
  if (!rendered) {
    doc.text(text, x, y, opts)
    return
  }

  const imgW = rendered.width
  const imgH = rendered.height

  const align = opts?.align
  const drawX = align === 'right' ? x - imgW - 0.5 : align === 'center' ? x - imgW / 2 : x
  // Align so the text baseline sits at the PDF y coordinate
  // Canvas draws text at vertical center; shift so bottom of image ~aligns with y
  const drawY = y - imgH * 0.78

  try {
    doc.addImage(rendered.dataUrl, 'PNG', drawX, drawY, imgW, imgH, undefined, 'FAST')
  } catch {
    doc.text(text, x, y, opts)
  }
}

export function hasUrduChars(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s)
}
