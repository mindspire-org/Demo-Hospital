import { useState } from 'react'
import type { CSSProperties } from 'react'

// ──────────────────────────────────────────────────────────────────────────────
// Interactive FDI dental chart for the doctor prescription page. Click a tooth to
// assign a condition; each condition is colour-coded and an optional per-tooth
// note can be added. Geometry ported from the public site ToothChart.
// ──────────────────────────────────────────────────────────────────────────────

export type ToothCondition =
  | 'Sound' | 'Decay' | 'Filling' | 'Crown' | 'Root Canal' | 'Extracted'
  | 'Missing' | 'Implant' | 'Fracture' | 'Abscess' | 'Calculus' | 'Mobility' | 'Other'

export const TOOTH_CONDITIONS: ToothCondition[] = [
  'Sound', 'Decay', 'Filling', 'Crown', 'Root Canal', 'Extracted',
  'Missing', 'Implant', 'Fracture', 'Abscess', 'Calculus', 'Mobility', 'Other',
]

// Fill colour per condition (used for both the chart and the legend).
export const CONDITION_COLORS: Record<ToothCondition, string> = {
  'Sound':      '#dcfce7', // green-100
  'Decay':      '#fde68a', // amber-300
  'Filling':    '#bfdbfe', // blue-200
  'Crown':      '#fef08a', // yellow-200
  'Root Canal': '#ddd6fe', // violet-200
  'Extracted':  '#fecaca', // red-200
  'Missing':    '#e5e7eb', // gray-200
  'Implant':    '#99f6e4', // teal-200
  'Fracture':   '#fdba74', // orange-300
  'Abscess':    '#fbcfe8', // pink-200
  'Calculus':   '#d6c3a5', // brown-ish
  'Mobility':   '#c7d2fe', // indigo-200
  'Other':      '#e2e8f0', // slate-200
}

export type DentalToothEntry = { toothId: number; condition: string; notes?: string }
export type DentalChartValue = { teeth: DentalToothEntry[]; generalNotes?: string }

type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar'
type Jaw = 'upper' | 'lower'
type Side = 'right' | 'left'

type Tooth = { id: number; x: number; y: number; w: number; h: number; rotate: number; type: ToothType }

const COLORS = {
  page: '#ffffff',
  chartBg: '#f8fafc',
  stroke: '#111111',
  guide: '#cbd5e1',
  label: '#111111',
  softLabel: '#94a3b8',
  border: '#e5e7eb',
}

const teeth: Tooth[] = [
  // Upper right 11–18
  { id: 11, x: 470, y: 112, w: 60, h: 84, rotate: 0, type: 'incisor' },
  { id: 12, x: 424, y: 122, w: 55, h: 80, rotate: -18, type: 'incisor' },
  { id: 13, x: 382, y: 150, w: 54, h: 74, rotate: -28, type: 'canine' },
  { id: 14, x: 338, y: 198, w: 58, h: 72, rotate: -28, type: 'premolar' },
  { id: 15, x: 294, y: 258, w: 66, h: 76, rotate: -18, type: 'premolar' },
  { id: 16, x: 258, y: 334, w: 72, h: 80, rotate: -8, type: 'molar' },
  { id: 17, x: 236, y: 425, w: 74, h: 84, rotate: 0, type: 'molar' },
  { id: 18, x: 238, y: 514, w: 74, h: 84, rotate: -6, type: 'molar' },
  // Upper left 21–28
  { id: 21, x: 530, y: 112, w: 60, h: 84, rotate: 0, type: 'incisor' },
  { id: 22, x: 576, y: 122, w: 55, h: 80, rotate: 18, type: 'incisor' },
  { id: 23, x: 618, y: 150, w: 54, h: 74, rotate: 28, type: 'canine' },
  { id: 24, x: 662, y: 198, w: 58, h: 72, rotate: 28, type: 'premolar' },
  { id: 25, x: 706, y: 258, w: 66, h: 76, rotate: 18, type: 'premolar' },
  { id: 26, x: 742, y: 334, w: 72, h: 80, rotate: 8, type: 'molar' },
  { id: 27, x: 764, y: 425, w: 74, h: 84, rotate: 0, type: 'molar' },
  { id: 28, x: 762, y: 514, w: 74, h: 84, rotate: 6, type: 'molar' },
  // Lower right 48–41
  { id: 48, x: 238, y: 660, w: 74, h: 84, rotate: 0, type: 'molar' },
  { id: 47, x: 236, y: 744, w: 74, h: 84, rotate: -4, type: 'molar' },
  { id: 46, x: 252, y: 824, w: 72, h: 80, rotate: -12, type: 'molar' },
  { id: 45, x: 290, y: 898, w: 66, h: 76, rotate: -28, type: 'premolar' },
  { id: 44, x: 336, y: 958, w: 58, h: 72, rotate: -38, type: 'premolar' },
  { id: 43, x: 393, y: 1005, w: 52, h: 74, rotate: -30, type: 'canine' },
  { id: 42, x: 439, y: 1039, w: 42, h: 62, rotate: 162, type: 'incisor' },
  { id: 41, x: 481, y: 1055, w: 38, h: 60, rotate: 175, type: 'incisor' },
  // Lower left 31–38
  { id: 31, x: 519, y: 1055, w: 38, h: 60, rotate: 185, type: 'incisor' },
  { id: 32, x: 561, y: 1039, w: 42, h: 62, rotate: 198, type: 'incisor' },
  { id: 33, x: 607, y: 1005, w: 52, h: 74, rotate: 30, type: 'canine' },
  { id: 34, x: 664, y: 958, w: 58, h: 72, rotate: 38, type: 'premolar' },
  { id: 35, x: 710, y: 898, w: 66, h: 76, rotate: 28, type: 'premolar' },
  { id: 36, x: 748, y: 824, w: 72, h: 80, rotate: 12, type: 'molar' },
  { id: 37, x: 764, y: 744, w: 74, h: 84, rotate: 4, type: 'molar' },
  { id: 38, x: 762, y: 660, w: 74, h: 84, rotate: 0, type: 'molar' },
]

const getJaw = (id: number): Jaw => (id < 30 ? 'upper' : 'lower')
const getSide = (id: number): Side => {
  const quadrant = Math.floor(id / 10)
  return quadrant === 1 || quadrant === 4 ? 'right' : 'left'
}

function getLabelPosition(tooth: Tooth) {
  const jaw = getJaw(tooth.id)
  const side = getSide(tooth.id)
  const dir = side === 'right' ? -1 : 1
  let dx = 0
  let dy = 0
  if (jaw === 'upper') {
    if (tooth.id === 11 || tooth.id === 21) { dx = tooth.id === 11 ? -8 : 8; dy = -58 }
    else if (tooth.type === 'incisor') { dx = 22 * dir; dy = -42 }
    else if (tooth.type === 'canine') { dx = 28 * dir; dy = -16 }
    else if (tooth.type === 'premolar') { dx = 34 * dir; dy = 0 }
    else { dx = 38 * dir; dy = 12 }
  } else {
    if (tooth.id === 41 || tooth.id === 31) { dx = tooth.id === 41 ? -6 : 6; dy = 58 }
    else if (tooth.type === 'incisor') { dx = 15 * dir; dy = 56 }
    else if (tooth.type === 'canine') { dx = 22 * dir; dy = 52 }
    else if (tooth.type === 'premolar') { dx = 30 * dir; dy = 34 }
    else { dx = 36 * dir; dy = 12 }
  }
  return { x: tooth.x + dx, y: tooth.y + dy, anchor: dx === 0 ? 'middle' : side === 'right' ? 'end' : 'start' } as const
}

function toothPath(type: ToothType, w: number, h: number) {
  const hw = w / 2
  const hh = h / 2
  if (type === 'incisor') {
    return `M ${-hw * 0.78} ${-hh * 0.8} C ${-hw * 0.5} ${-hh}, ${hw * 0.5} ${-hh}, ${hw * 0.78} ${-hh * 0.8} C ${hw * 0.94} ${-hh * 0.22}, ${hw * 0.6} ${hh * 0.78}, 0 ${hh} C ${-hw * 0.6} ${hh * 0.78}, ${-hw * 0.94} ${-hh * 0.22}, ${-hw * 0.78} ${-hh * 0.8} Z`
  }
  if (type === 'canine') {
    return `M 0 ${-hh * 0.92} C ${hw * 0.28} ${-hh * 0.94}, ${hw * 0.66} ${-hh * 0.74}, ${hw * 0.82} ${-hh * 0.34} C ${hw * 0.98} ${hh * 0.08}, ${hw * 0.66} ${hh * 0.78}, 0 ${hh} C ${-hw * 0.66} ${hh * 0.78}, ${-hw * 0.98} ${hh * 0.08}, ${-hw * 0.82} ${-hh * 0.34} C ${-hw * 0.66} ${-hh * 0.74}, ${-hw * 0.28} ${-hh * 0.94}, 0 ${-hh * 0.92} Z`
  }
  if (type === 'premolar') {
    return `M ${-hw * 0.76} ${-hh * 0.84} C ${-hw * 0.22} ${-hh * 1.02}, ${hw * 0.68} ${-hh * 0.82}, ${hw * 0.9} ${-hh * 0.22} C ${hw} ${hh * 0.32}, ${hw * 0.56} ${hh * 0.98}, ${-hw * 0.06} ${hh} C ${-hw * 0.74} ${hh * 0.98}, ${-hw} ${hh * 0.3}, ${-hw * 0.94} ${-hh * 0.2} C ${-hw * 0.9} ${-hh * 0.54}, ${-hw * 0.86} ${-hh * 0.76}, ${-hw * 0.76} ${-hh * 0.84} Z`
  }
  return `M ${-hw * 0.72} ${-hh * 0.92} C ${-hw * 0.26} ${-hh * 1.04}, ${hw * 0.58} ${-hh * 1.02}, ${hw * 0.9} ${-hh * 0.58} C ${hw * 1.04} ${-hh * 0.1}, ${hw} ${hh * 0.64}, ${hw * 0.54} ${hh * 0.88} C ${hw * 0.06} ${hh * 1.04}, ${-hw * 0.72} ${hh}, ${-hw * 0.94} ${hh * 0.48} C ${-hw * 1.06} ${hh * 0.04}, ${-hw * 1.02} ${-hh * 0.56}, ${-hw * 0.72} ${-hh * 0.92} Z`
}

const textCommon: CSSProperties = {
  userSelect: 'none',
  pointerEvents: 'none',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

type Props = {
  value: DentalChartValue
  onChange?: (next: DentalChartValue) => void
  readOnly?: boolean
}

export default function DentalChart({ value, onChange, readOnly = false }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const teethList = value?.teeth || []
  const byId: Record<number, DentalToothEntry> = {}
  for (const t of teethList) byId[t.toothId] = t

  const emit = (nextTeeth: DentalToothEntry[], generalNotes?: string) => {
    onChange?.({ teeth: nextTeeth, generalNotes: generalNotes ?? value?.generalNotes ?? '' })
  }

  const setCondition = (id: number, condition: ToothCondition) => {
    const existing = byId[id]
    const next = teethList.filter(t => t.toothId !== id)
    next.push({ toothId: id, condition, notes: existing?.notes || '' })
    next.sort((a, b) => a.toothId - b.toothId)
    emit(next)
  }

  const setToothNotes = (id: number, notes: string) => {
    const existing = byId[id]
    const next = teethList.filter(t => t.toothId !== id)
    next.push({ toothId: id, condition: existing?.condition || 'Other', notes })
    next.sort((a, b) => a.toothId - b.toothId)
    emit(next)
  }

  const clearTooth = (id: number) => {
    emit(teethList.filter(t => t.toothId !== id))
    setActive(null)
  }

  const getFill = (id: number) => {
    const cond = byId[id]?.condition as ToothCondition | undefined
    if (active === id) return '#bfdbfe'
    if (cond && CONDITION_COLORS[cond]) return CONDITION_COLORS[cond]
    if (hovered === id) return '#eef2f7'
    return COLORS.chartBg
  }

  const usedConditions = Array.from(new Set(teethList.map(t => t.condition))) as ToothCondition[]

  return (
    <div className="w-full">
      <div
        className="w-full select-none"
        style={{
          maxWidth: 560,
          margin: '0 auto',
          background: COLORS.page,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 18,
          padding: 10,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox="0 0 1000 1145"
          width="100%"
          height="min(72vh, 760px)"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: 'auto', maxWidth: '100%', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="FDI dental tooth chart"
        >
          <rect width="1000" height="1145" rx="16" fill={COLORS.chartBg} onClick={() => !readOnly && setActive(null)} />
          <line x1="500" y1="18" x2="500" y2="1127" stroke={COLORS.guide} strokeWidth="1.8" strokeDasharray="9 8" />
          <line x1="18" y1="587" x2="982" y2="587" stroke={COLORS.guide} strokeWidth="1.8" strokeDasharray="9 8" />
          <text x="500" y="245" textAnchor="middle" fontSize="21" fontWeight="700" fill={COLORS.softLabel} letterSpacing="0.08em" style={textCommon}>UPPER JAW</text>
          <text x="500" y="885" textAnchor="middle" fontSize="21" fontWeight="700" fill={COLORS.softLabel} letterSpacing="0.08em" style={textCommon}>LOWER JAW</text>
          <text x="54" y="572" textAnchor="middle" fontSize="19" fontWeight="700" fill={COLORS.softLabel} letterSpacing="0.1em" transform="rotate(-90 54 572)" style={textCommon}>RIGHT</text>
          <text x="946" y="572" textAnchor="middle" fontSize="19" fontWeight="700" fill={COLORS.softLabel} letterSpacing="0.1em" transform="rotate(90 946 572)" style={textCommon}>LEFT</text>

          {teeth.map((tooth) => {
            const label = getLabelPosition(tooth)
            const cond = byId[tooth.id]?.condition as ToothCondition | undefined
            const isActive = active === tooth.id
            const isMissing = cond === 'Missing' || cond === 'Extracted'
            const hw = tooth.w / 2
            const hh = tooth.h / 2
            return (
              <g key={tooth.id}>
                <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="26" fontWeight="800" fill={isActive ? '#2563eb' : COLORS.label} style={textCommon}>{tooth.id}</text>
                <g
                  transform={`translate(${tooth.x} ${tooth.y}) rotate(${tooth.rotate})`}
                  style={{ cursor: readOnly ? 'default' : 'pointer' }}
                  onClick={(e) => { if (readOnly) return; e.stopPropagation(); setActive((cur) => (cur === tooth.id ? null : tooth.id)) }}
                  onMouseEnter={() => !readOnly && setHovered(tooth.id)}
                  onMouseLeave={() => !readOnly && setHovered((h) => (h === tooth.id ? null : h))}
                >
                  <path
                    d={toothPath(tooth.type, tooth.w, tooth.h)}
                    fill={getFill(tooth.id)}
                    stroke={isActive ? '#2563eb' : COLORS.stroke}
                    strokeWidth={isActive ? 3.2 : 2.35}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isMissing ? '8 7' : undefined}
                    opacity={isMissing ? 0.6 : 1}
                  />
                  {isMissing && (
                    <path
                      d={`M ${-hw * 0.55} ${-hh * 0.55} L ${hw * 0.55} ${hh * 0.55} M ${hw * 0.55} ${-hh * 0.55} L ${-hw * 0.55} ${hh * 0.55}`}
                      stroke="#b04030"
                      strokeWidth="2.8"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              </g>
            )
          })}
        </svg>

        {!readOnly && active !== null && (
          <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3" style={{ maxWidth: 520 }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">Tooth {active}</span>
              {byId[active] && (
                <button type="button" onClick={() => clearTooth(active)} className="cursor-pointer border-none bg-transparent text-[11px] font-medium text-red-600 hover:text-red-700">Clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOOTH_CONDITIONS.map((c) => {
                const on = byId[active!]?.condition === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(active!, c)}
                    className={`rounded-md border px-2.5 py-1 text-[11px] transition ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900'}`}
                  >
                    <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: CONDITION_COLORS[c], border: '1px solid rgba(0,0,0,0.15)' }} />
                    {c}
                  </button>
                )
              })}
            </div>
            <input
              type="text"
              value={byId[active!]?.notes || ''}
              onChange={(e) => setToothNotes(active!, e.target.value)}
              placeholder="Note for this tooth (optional)..."
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </div>
        )}

        {!readOnly && (
          <p className="mt-3 text-center text-xs text-slate-400">Click a tooth to record its condition. {teethList.length || 'No'} {teethList.length === 1 ? 'tooth' : 'teeth'} marked.</p>
        )}
      </div>

      {/* Legend */}
      {usedConditions.length > 0 && (
        <div className="mx-auto mt-3 flex max-w-[560px] flex-wrap gap-2">
          {usedConditions.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CONDITION_COLORS[c as ToothCondition] || '#e2e8f0', border: '1px solid rgba(0,0,0,0.15)' }} />
              {c}
            </span>
          ))}
        </div>
      )}

      {/* General dental notes */}
      {!readOnly && (
        <div className="mx-auto mt-4 max-w-[560px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">General Dental Notes</label>
          <textarea
            rows={3}
            value={value?.generalNotes || ''}
            onChange={(e) => emit(teethList, e.target.value)}
            placeholder="Overall dental findings, treatment plan, oral hygiene advice..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
      )}
    </div>
  )
}
