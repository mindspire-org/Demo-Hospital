import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, Compass } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%">
          <defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="white"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-rose-500/10 blur-[100px]" />

      {/* Floating orbs */}
      <div className="absolute top-[15%] left-[10%] w-3 h-3 rounded-full bg-indigo-400/30 animate-pulse" />
      <div className="absolute top-[25%] right-[15%] w-2 h-2 rounded-full bg-rose-400/30 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[20%] left-[20%] w-2.5 h-2.5 rounded-full bg-emerald-400/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-[30%] right-[10%] w-4 h-4 rounded-full bg-amber-400/20 animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        {/* 404 with glitch effect */}
        <div className="relative mb-6">
          <h1 className="text-[140px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white to-slate-500 select-none">
            404
          </h1>
          <div className="absolute inset-0 text-[140px] font-black leading-none tracking-tighter text-indigo-500/20 -translate-x-1 translate-y-1 select-none">
            404
          </div>
        </div>

        {/* Icon */}
        <div className="mb-6 relative">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <span className="text-[10px] font-bold text-rose-400">?</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-sm">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Search hint */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 mb-8 w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm text-slate-500">Try checking the URL or navigate back</span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-slate-600 text-xs">Health Spire &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
