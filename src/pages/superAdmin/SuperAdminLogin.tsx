import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../features/superAdmin'
import { Settings, Shield } from 'lucide-react'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [setupRequired, setSetupRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [masterKey, setMasterKey] = useState('')

  // Setup fields
  const [clientName, setClientName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [maxUsers, setMaxUsers] = useState('0')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminFullName, setAdminFullName] = useState('')

  useEffect(() => {
    // Check if already logged in
    try {
      const token = localStorage.getItem('super_admin.token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (Date.now() < payload.exp * 1000) {
          navigate('/super-admin')
          return
        }
      }
    } catch {}

    // Check if setup is required
    fetch('/health')
      .then(r => r.json())
      .then(d => setSetupRequired(d.setupRequired || false))
      .catch(() => setSetupRequired(false))
  }, [navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await superAdminApi.login({
        username,
        password,
        masterKey: masterKey || undefined,
      })
      if (res.token) {
        localStorage.setItem('super_admin.token', res.token)
        navigate('/super-admin')
      } else {
        setError('Login failed')
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await superAdminApi.setup({
        masterKey,
        clientName,
        contactPerson,
        contactPhone,
        contactEmail,
        hospitalName,
        address,
        city,
        country,
        maxUsers: parseInt(maxUsers, 10),
        adminUsername,
        adminPassword,
        adminFullName,
      })
      alert('Setup complete! Please log in with your new credentials.')
      setMode('login')
    } catch (err: any) {
      setError(err?.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Super Admin</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Developer License Management</p>
            </div>
          </div>

          {setupRequired && mode === 'login' && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              First-time setup required. <button className="underline font-medium" onClick={() => setMode('setup')}>Start setup</button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Or Master Key (emergency)</label>
                <input
                  type="password"
                  value={masterKey}
                  onChange={e => setMasterKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter master key"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
              {setupRequired && (
                <button type="button" onClick={() => setMode('setup')} className="w-full text-sm text-sky-600 dark:text-sky-400 hover:underline">
                  First time setup
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Master Key</div>
              <input
                type="password"
                value={masterKey}
                onChange={e => setMasterKey(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Enter master key"
              />

              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Client Details</div>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Client Name" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required placeholder="Contact Person" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required placeholder="Contact Phone" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Contact Email" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={hospitalName} onChange={e => setHospitalName(e.target.value)} required placeholder="Hospital Name" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="number" value={maxUsers} onChange={e => setMaxUsers(e.target.value)} placeholder="Max Users" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />

              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">First Admin Account</div>
              <input type="text" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} required placeholder="Admin Username" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required placeholder="Admin Password" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
              <input type="text" value={adminFullName} onChange={e => setAdminFullName(e.target.value)} placeholder="Full Name" className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />

              <button type="submit" disabled={loading} className="w-full rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50">
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-slate-500 dark:text-slate-400 hover:underline">
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
