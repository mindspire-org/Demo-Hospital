import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Eye, EyeOff, Loader2 } from 'lucide-react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_NurseLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  useEffect(() => {
    // Check if already logged in as nurse
    const session = localStorage.getItem('hospital.session')
    if (session) {
      try {
        const user = JSON.parse(session)
        if (user.role?.toLowerCase() === 'nurse') {
          navigate('/hospital/nurse/dashboard')
        }
      } catch {}
    }
  }, [navigate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res: any = await hospitalApi.login({
        username: form.username,
        password: form.password
      })
      
      if (res?.token && res?.user) {
        // Check if user is a nurse
        if (res.user.role?.toLowerCase() !== 'nurse' && res.user.role?.toLowerCase() !== 'admin') {
          setError('Access denied. Nurse or Admin credentials required.')
          setLoading(false)
          return
        }
        
        localStorage.setItem('hospital.session', JSON.stringify(res.user))
        localStorage.setItem('hospital.token', res.token)
        
        navigate('/hospital/nurse/dashboard')
      } else {
        setError('Invalid response from server')
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-100 mb-4">
            <HeartPulse className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nurse Portal</h1>
          <p className="text-slate-500 mt-1">Health Spire</p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign In</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Nurses can manage tasks, record vitals, and track performance.</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <a 
              href="/hospital/login" 
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              Go to Hospital Login
            </a>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Health Spire. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
