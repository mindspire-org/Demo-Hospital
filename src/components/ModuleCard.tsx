import type { ReactNode } from 'react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function ModuleCard({
  to,
  title,
  description,
  icon,
  tone = 'sky',
}: {
  to: string
  title: string
  description: string
  icon: ReactNode
  tone?: 'sky' | 'emerald' | 'violet' | 'amber' | 'teal' | 'slate' | 'indigo' | 'rose' | 'cyan' | 'fuchsia' | 'blue' | 'lime' | 'orange'
}) {
  const toneMap: Record<string, string> = {
    sky: 'bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800/50',
    emerald: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50',
    violet: 'bg-violet-50 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800/50',
    amber: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50',
    teal: 'bg-teal-50 border-teal-100 dark:bg-teal-900/20 dark:border-teal-800/50',
    slate: 'bg-slate-50 border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/50',
    indigo: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50',
    rose: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50',
    cyan: 'bg-cyan-50 border-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800/50',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-100 dark:bg-fuchsia-900/20 dark:border-fuchsia-800/50',
    blue: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50',
    lime: 'bg-lime-50 border-lime-100 dark:bg-lime-900/20 dark:border-lime-800/50',
    orange: 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/50',
  }

  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    const glow = glowRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rotX = ((midY - y) / midY) * 8
    const rotY = ((x - midX) / midX) * 8
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
    if (glow) {
      glow.style.background = `radial-gradient(400px circle at ${x}px ${y}px, rgba(255,255,255,0.18), transparent 40%)`
    }
  }

  const onMouseLeave = () => {
    const el = cardRef.current
    const glow = glowRef.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    if (glow) glow.style.background = 'radial-gradient(400px circle at 50% 50%, rgba(255,255,255,0.12), transparent 40%)'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card home-featured-card relative transform-gpu transition-transform duration-300 will-change-transform dark:bg-slate-900 dark:border-slate-700 hover:shadow-md dark:hover:shadow-none"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div ref={glowRef} className="pointer-events-none absolute inset-0 rounded-2xl dark:opacity-60" style={{ background: 'radial-gradient(420px circle at 50% 50%, rgba(14,165,233,0.20), transparent 45%)' }} />
      <div className="flex items-start gap-4">
        <div className={`shrink-0 rounded-2xl p-3 border shadow-sm ${toneMap[tone]}`} style={{ transform: 'translateZ(24px)' }}>
          {icon}
        </div>
        <div className="flex-1" style={{ transform: 'translateZ(16px)' }}>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {description}
          </p>
          <div className="mt-4">
            <Link to={to} className="btn text-sm transition-transform duration-200 hover:translate-x-0.5 dark:ring-1 dark:ring-white/10">
              Open →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
