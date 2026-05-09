import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function SetupProfilePage() {
  const [username, setUsername] = useState('')
  const [role, setRole]         = useState<'trainee' | 'coach' | ''>('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { session, fetchProfile } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!role) { setError('Please choose your role'); return }
    if (!session) { navigate('/login', { replace: true }); return }

    setLoading(true)

    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      username: username.trim(),
      role,
    })

    if (err) {
      setError(err.code === '23505' ? 'Username already taken — try another' : err.message)
      setLoading(false)
      return
    }

    await fetchProfile(session.user.id)
    navigate(role === 'coach' ? '/coach' : '/map', { replace: true })
    setLoading(false)
  }

  return (
    <>
      <div className="amb amb-1" />
      <div className="amb amb-2" />
      <div className="amb amb-3" />

      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <div className="content no-pad-bot" style={{ justifyContent: 'center', gap: 18, paddingTop: 40 }}>

          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div className="login-logo-icon" style={{ margin: '0 auto 12px' }}>💪</div>
            <div className="login-logo-name">Set up your profile</div>
            <div className="login-logo-sub">Just two quick things</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <div className="label-sm" style={{ marginBottom: 6 }}>Username</div>
              <label className="w-input">
                <span>👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  maxLength={20}
                  autoCorrect="off"
                  autoCapitalize="none"
                  pattern="[a-zA-Z0-9_]+"
                  title="Letters, numbers, and underscores only"
                  placeholder="your_handle"
                />
              </label>
              <div className="label-sm" style={{ marginTop: 5 }}>Letters, numbers, underscores only</div>
            </div>

            <div>
              <div className="label-sm" style={{ marginBottom: 8 }}>I am a…</div>
              <div className="btn-row">
                {(['trainee', 'coach'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '20px 0',
                      borderRadius: 14,
                      border: `2px solid ${role === r ? 'var(--brand)' : 'var(--bd2)'}`,
                      background: role === r ? 'var(--brand-t)' : 'transparent',
                      color: role === r ? 'var(--tx)' : 'var(--mu)',
                      transition: 'all .15s',
                      minHeight: 0, minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{r === 'trainee' ? '🏃' : '💼'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{r}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="err-msg">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !role}
              style={{ opacity: (loading || !role) ? 0.4 : 1 }}
            >
              {loading ? 'Saving…' : 'Get Started'}
            </button>
          </form>

        </div>
      </div>
    </>
  )
}
