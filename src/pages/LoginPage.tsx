import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { fetchProfile }        = useAuthStore()
  const navigate                = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    await fetchProfile(data.user.id)
    const { profile } = useAuthStore.getState()
    navigate(profile ? (profile.role === 'coach' ? '/coach' : '/map') : '/setup', { replace: true })
    setLoading(false)
  }

  return (
    <>
      <div className="amb amb-1" />
      <div className="amb amb-2" />
      <div className="amb amb-3" />

      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <div className="content no-pad-bot" style={{ justifyContent: 'center', gap: 18, paddingTop: 30 }}>

          <div className="login-logo-wrap" style={{ paddingBottom: 4 }}>
            <div className="login-logo-icon">💪</div>
            <div className="login-logo-name">TrainerSync</div>
            <div className="login-logo-sub">Go Trainers · CPT208</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <label className="w-input">
              <span>📱</span>
              <input
                type="email"
                placeholder="Phone / Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
              />
            </label>
            <label className="w-input">
              <span>🔒</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error && <p className="err-msg">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="divider-or">or</div>

          <div className="btn-row">
            <button className="btn-ghost" type="button"> Apple ID</button>
            <button className="btn-ghost" type="button">G Google</button>
          </div>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', fontSize: 12 }}>
            <Link to="/register" className="t-b">Register →</Link>
            <span className="t-m">Forgot password?</span>
          </div>

        </div>
      </div>
    </>
  )
}
