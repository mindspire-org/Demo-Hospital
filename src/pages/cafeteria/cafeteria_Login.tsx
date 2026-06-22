import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coffee, Loader2, Eye, EyeOff } from 'lucide-react'
import { cafeteriaApi } from '../../features/cafeteria'
import { loginErrorMessage } from '../../utils/authError'

export default function Cafeteria_Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      await cafeteriaApi.login(username, password)
      navigate('/cafeteria')
    } catch (err: any) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <Coffee className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Cafeteria</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="cafeteria-username" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              id="cafeteria-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Enter username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="cafeteria-password" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                id="cafeteria-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-orange-600/30 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coffee className="h-4 w-4" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
