import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, Heart, Activity, Stethoscope, Pill, Microscope, Scissors, BedDouble, Receipt, Banknote, Siren } from 'lucide-react'

const MODULES = [
  { label: 'Hospital', path: '/hospital/login', icon: Stethoscope, color: 'from-blue-500 to-cyan-600' },
  { label: 'Pharmacy', path: '/pharmacy/login', icon: Pill, color: 'from-emerald-500 to-teal-600' },
  { label: 'Lab', path: '/lab/login', icon: Microscope, color: 'from-purple-500 to-violet-600' },
  { label: 'Aesthetic', path: '/aesthetic/login', icon: Scissors, color: 'from-pink-500 to-rose-600' },
  { label: 'Indoor Pharmacy', path: '/indoor-pharmacy/login', icon: BedDouble, color: 'from-amber-500 to-orange-600' },
  { label: 'Finance', path: '/finance/login', icon: Banknote, color: 'from-indigo-500 to-blue-600' },
  { label: 'Reception', path: '/reception/login', icon: Heart, color: 'from-red-500 to-rose-600' },
  { label: 'Dialysis', path: '/dialysis/login', icon: Activity, color: 'from-cyan-500 to-sky-600' },
  { label: 'Diagnostic', path: '/diagnostic/login', icon: Siren, color: 'from-orange-500 to-amber-600' },
  { label: 'Doctor', path: '/hospital/login', icon: Receipt, color: 'from-slate-500 to-gray-600' },
]

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <span className="bg-linear-to-br from-slate-200 via-slate-100 to-slate-200 bg-clip-text text-[10rem] font-black leading-none text-transparent dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 md:text-[14rem]">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-linear-to-br from-rose-500 to-pink-600 p-4 shadow-2xl shadow-rose-500/30 md:p-6">
              <Search className="h-8 w-8 text-white md:h-12 md:w-12" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-slate-500 dark:text-slate-400">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:shadow-xl hover:shadow-blue-500/30"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>

        {/* Quick Navigation */}
        <div className="mt-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Quick Navigation
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {MODULES.map(m => {
              const Icon = m.icon
              return (
                <Link
                  key={m.path}
                  to={m.path}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${m.color} opacity-0 transition group-hover:opacity-100`} />
                  <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br ${m.color} text-white shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">{m.label}</div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Fun message */}
        <p className="mt-10 text-xs text-slate-400 dark:text-slate-600">
          Lost? Even the best navigators take a wrong turn sometimes. 🏥
        </p>
      </div>
    </div>
  )
}
