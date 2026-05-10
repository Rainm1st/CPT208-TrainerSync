import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function SetupProfilePage() {
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { session, fetchProfile } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!session) { navigate('/login', { replace: true }); return }

    setLoading(true)

    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      username: username.trim(),
      role: 'trainee',
    })

    if (err) {
      setError(err.code === '23505' ? 'Username already taken — try another' : err.message)
      setLoading(false)
      return
    }

    await fetchProfile(session.user.id)
    navigate('/map', { replace: true })
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
            <div className="login-logo-sub">Choose a username to get started</div>
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

            {error && <p className="err-msg">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ opacity: loading ? 0.4 : 1 }}
            >
              {loading ? 'Saving…' : 'Get Started'}
            </button>
          </form>

        </div>
      </div>
    </>
  )
}
