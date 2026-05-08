import ModuleCard from '../components/ModuleCard'
import { Stethoscope, FlaskConical, Pill, FileText, PhoneIncoming, Droplets, Sparkles, Warehouse } from 'lucide-react'
import { useRef } from 'react'
import './home.css'

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)

  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rotX = ((midY - y) / midY) * 5
    const rotY = ((x - midX) / midX) * 5
    el.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
  }

  const onHeroLeave = () => {
    const el = heroRef.current
    if (el) el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)'
  }

  const modules = [
    { to: '/hospital/login', title: 'Hospital', description: 'Appointments, admissions, billing, and EMR.', icon: <Stethoscope className="size-7 text-sky-600" />, tone: 'sky' as const },
    { to: '/lab/login', title: 'Lab', description: 'Lab orders, tests, and results management.', icon: <FlaskConical className="size-7 text-emerald-600" />, tone: 'emerald' as const },
    { to: '/diagnostic/login', title: 'Diagnostics', description: 'Diagnostic tokens, tests, tracking, and reports.', icon: <FlaskConical className="size-7 text-teal-600" />, tone: 'teal' as const },
    { to: '/dialysis/login', title: 'Dialysis', description: 'Dialysis sessions, patients, and machine management.', icon: <Droplets className="size-7 text-cyan-600" />, tone: 'teal' as const },
    { to: '/pharmacy/login', title: 'Pharmacy', description: 'Prescriptions, inventory, and POS.', icon: <Pill className="size-7 text-violet-600" />, tone: 'violet' as const },
    { to: '/indoor-pharmacy/login', title: 'Indoor Pharmacy', description: 'Inpatient pharmacy dispensing and inventory.', icon: <Warehouse className="size-7 text-indigo-600" />, tone: 'indigo' as const },
    { to: '/finance/login', title: 'Finance', description: 'Financial management and accounting.', icon: <FileText className="size-7 text-amber-600" />, tone: 'amber' as const },
    { to: '/reception/login', title: 'Reception', description: 'Front-desk, patient registration, and triage.', icon: <PhoneIncoming className="size-7 text-teal-600" />, tone: 'teal' as const },
    { to: '/aesthetic/login', title: 'Aesthetic', description: 'Aesthetic procedures, patients, and billing.', icon: <Sparkles className="size-7 text-violet-600" />, tone: 'violet' as const },
  ]

  return (
    <div className="min-h-dvh relative overflow-hidden bg-[#07101f]">
      {/* Background layers */}
      <div className="home-grid" />
      <div className="home-radial" />
      <div className="home-orb primary" style={{ top: '-80px', right: '-60px' }} />
      <div className="home-orb secondary" style={{ bottom: '-80px', left: '-80px' }} />

      {/* Hero */}
      <header className="relative z-10 mx-auto max-w-2xl px-6 pt-14 text-center home-hero">
        <div
          ref={heroRef}
          onMouseMove={onHeroMove}
          onMouseLeave={onHeroLeave}
          className="home-hero-tilt mx-auto"
        >
          {/* Status badge */}
          <div className="flex justify-center mb-5">
            <span className="home-badge">
              <span className="home-badge-dot" />
              System Online
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight"
            style={{ transform: 'translateZ(50px)', color: '#f0fdf4', letterSpacing: '-0.02em' }}
          >
            HealthSpire{' '}
            <span className="text-emerald-400">HIMS</span>{' '}
            Management
          </h1>

          <div className="home-title-divider" />

          <p
            className="text-xs font-medium tracking-widest uppercase text-slate-500"
            style={{ transform: 'translateZ(20px)' }}
          >
            Complete Hospital Information Management System
          </p>
        </div>
      </header>

      {/* Module cards */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 home-modules">
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((m, i) => (
            <div key={m.to} className="home-card-appear" style={{ animationDelay: `${i * 90}ms` }}>
              <ModuleCard {...m} />
            </div>
          ))}
        </div>
      </main>

      {/* Stats bar */}
      <div className="relative z-10 home-stats">
        {[
          { value: '9', label: 'Modules' },
          { value: '2,841', label: 'Tests Run' },
          { value: '98.4%', label: 'Accuracy' },
        ].map((s) => (
          <div key={s.label} className="home-stat">
            <div className="home-stat-value">{s.value}</div>
            <div className="home-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}