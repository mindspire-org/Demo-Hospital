import ModuleCard from '../components/ModuleCard'
import { Stethoscope, FlaskConical, Pill, FileText, Users, Microscope, Building2, Droplets, Sparkles, HeartPulse } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSystemConfig } from '../contexts/SystemConfigContext'
import './home.css'

const ALL_MODULES = [
  { id: 'hospital', to: '/hospital/login', title: 'Hospital', description: 'Appointments, admissions, billing, and EMR.', icon: <Stethoscope className="size-7 text-sky-600" />, tone: 'sky' as const },
  { id: 'lab', to: '/lab/login', title: 'Lab', description: 'Lab orders, tests, and results management.', icon: <FlaskConical className="size-7 text-emerald-600" />, tone: 'emerald' as const },
  { id: 'diagnostic', to: '/diagnostic/login', title: 'Diagnostics', description: 'Diagnostic tokens, tests, tracking, and reports.', icon: <Microscope className="size-7 text-teal-600" />, tone: 'teal' as const },
  { id: 'pharmacy', to: '/pharmacy/login', title: 'Pharmacy', description: 'Prescriptions, inventory, and POS.', icon: <Pill className="size-7 text-violet-600" />, tone: 'violet' as const },
  { id: 'indoorPharmacy', to: '/indoor-pharmacy/login', title: 'Indoor Pharmacy', description: 'Inpatient dispensing, ward orders, and integration.', icon: <Building2 className="size-7 text-cyan-600" />, tone: 'cyan' as const },
  { id: 'finance', to: '/finance/login', title: 'Finance', description: 'Financial management and accounting.', icon: <FileText className="size-7 text-amber-600" />, tone: 'amber' as const },
  { id: 'reception', to: '/reception/login', title: 'Reception', description: 'Front-desk, patient registration, and triage.', icon: <Users className="size-7 text-slate-600" />, tone: 'slate' as const },
  { id: 'dialysis', to: '/dialysis/login', title: 'Dialysis', description: 'Dialysis therapy, schedules, and treatment cart.', icon: <Droplets className="size-7 text-indigo-600" />, tone: 'indigo' as const },
  { id: 'aesthetic', to: '/aesthetic/login', title: 'Aesthetic', description: 'Aesthetic treatments, appointments, and inventory.', icon: <Sparkles className="size-7 text-fuchsia-600" />, tone: 'fuchsia' as const },
  { id: 'nurse', to: '/hospital/nurse/login', title: 'Nurse', description: 'Nurse station, ward management, and patient care.', icon: <HeartPulse className="size-7 text-rose-600" />, tone: 'rose' as const },
]

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { getModuleEnabled } = useSystemConfig()

  useEffect(() => {
    const html = document.documentElement
    const hadDark = (() => {
      try { return html.classList.contains('dark') } catch { return false }
    })()
    const forceRemove = () => {
      try {
        if (html.classList.contains('dark')) html.classList.remove('dark')
      } catch { }
    }
    forceRemove()

    let obs: MutationObserver | null = null
    try {
      obs = new MutationObserver(() => forceRemove())
      obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    } catch { }

    return () => {
      try {
        if (obs) obs.disconnect()
        if (hadDark) html.classList.add('dark')
      } catch { }
    }
  }, [])

  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const midX = rect.width / 2
    const midY = rect.height / 2
    const rotX = ((midY - y) / midY) * 6
    const rotY = ((x - midX) / midX) * 6
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
  }
  const onHeroLeave = () => {
    const el = heroRef.current
    if (el) el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }

  const visibleModules = ALL_MODULES.filter(m => getModuleEnabled(m.id))

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <div className="home-grid" />
      <div className="home-spotlight" />
      <div className="home-orb" style={{ left: '-160px', top: '-120px' }} />
      <div className="home-orb secondary" style={{ right: '-140px', bottom: '-160px' }} />

      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-12 text-center home-hero">
        <div ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={onHeroLeave} className="home-hero-tilt mx-auto">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"
            style={{
              transform: 'translateZ(60px)',
              backgroundImage: 'linear-gradient(90deg, #0f2d5c 0%, #3b82f6 50%, #0f2d5c 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Complete Hospital Management System
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400" style={{ transform: 'translateZ(24px)' }}>Select a module to start</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {visibleModules.map((m, i) => (
            <div key={m.title} className="home-card-appear" style={{ animationDelay: `${i * 90}ms` }}>
              <ModuleCard to={m.to} title={m.title} description={m.description} icon={m.icon} tone={m.tone} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

