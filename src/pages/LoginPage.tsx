import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { fetchProfile }        = useAuthStore()
  const navigate                = useNavigate()
  const { theme, toggle }       = useTheme()

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

        {/* Top bar: theme toggle + wordmark */}
        <div className="login-topbar">
          <button
            className="theme-toggle-btn"
            onClick={toggle}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className="login-topbar-brand">
            <span className="brand-primary">Trainer</span><span className="brand-lime">Sync</span>
          </div>
        </div>

        <div className="content no-pad-bot" style={{ justifyContent: 'center', gap: 16, paddingTop: 24 }}>

          {/* Hero logo */}
          <div className="login-logo-wrap" style={{ paddingBottom: 4 }}>
            <div className="login-logo-icon">
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em'
              }}>TS</span>
            </div>
            <div className="login-logo-name">
              <span className="brand-primary">Trainer</span><span className="brand-lime">Sync</span>
            </div>
            {/* hint text — smaller */}
            <div className="login-logo-sub" style={{ fontSize: 10 }}>Go Trainers · CPT208</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <label className="w-input">
              <span>✉</span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
              />
            </label>
            <label className="w-input">
              <span style={{ fontSize: 13 }}>🔑</span>
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

            {/* functional button — larger */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 4, opacity: loading ? 0.6 : 1, fontSize: 16, padding: '14px 16px' }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="divider-or">or</div>

          <div className="btn-row">
            <button className="btn-ghost" type="button"> Apple ID</button>
            <button className="btn-ghost" type="button">G Google</button>
          </div>

          {/* functional link bigger, hint link smaller */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
            <Link
              to="/register"
              className="t-b"
              style={{ fontSize: 15, fontWeight: 700 }}
            >
              Register →
            </Link>
            <span className="t-m" style={{ fontSize: 11 }}>Forgot password?</span>
          </div>

        </div>
      </div>
    </>
  )
}
