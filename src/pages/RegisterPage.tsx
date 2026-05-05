import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [notice, setNotice]     = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })

    if (err) { setError(err.message); setLoading(false); return }

    if (data.session) {
      navigate('/setup', { replace: true })
    } else {
      setNotice('Account created! Check your email for a confirmation link, then log in.')
    }

    setLoading(false)
  }

  return (
    <>
      <div className="amb amb-1" />
      <div className="amb amb-2" />
      <div className="amb amb-3" />

      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hbar">
          <Link to="/login" className="hbar-back">← Back</Link>
          <span className="hbar-ttl">Register</span>
          <span />
        </div>

        <div className="content">
          {notice ? (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)',
              borderRadius: 12, padding: 16, textAlign: 'center', fontSize: 13, color: '#86efac'
            }}>
              {notice}
              <div style={{ marginTop: 12 }}>
                <Link to="/login" className="t-b">Go to login →</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <label className="w-input">
                <span>📱</span>
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
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>
              <label className="w-input">
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>

              {error && <p className="err-msg">{error}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ marginTop: 6, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
