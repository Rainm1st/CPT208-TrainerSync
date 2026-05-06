import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BottomNav } from '../../components/BottomNav'

export default function CoachSettingsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  const initial  = (profile?.username ?? 'C').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hbar">
          <span className="hbar-ttl">Settings</span>
        </div>

        <div className="content">

          {/* Profile card */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ gap: 13 }}>
              <div className="avatar av-lg av-coach">{initial}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{profile?.username ?? 'Coach'}</div>
                <div className="fs11 t-c" style={{ marginTop: 2 }}>Certified Coach ✅</div>
                <div className="fs10 t-m" style={{ marginTop: 3 }}>{profile?.bio ?? 'No bio set'}</div>
              </div>
            </div>
          </div>

          {/* Account section */}
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="card-ttl">Account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              <div className="list-item" style={{ padding: '11px 0', cursor: 'default' }}>
                <div className="row-between">
                  <span className="fs12 t-m">Username</span>
                  <span className="fs12 fw6">{profile?.username ?? '—'}</span>
                </div>
              </div>

              <div className="list-item" style={{ padding: '11px 0', cursor: 'default' }}>
                <div className="row-between">
                  <span className="fs12 t-m">Role</span>
                  <span className="fs12 fw6" style={{ color: 'var(--brand)' }}>Coach</span>
                </div>
              </div>

            </div>
          </div>

          {/* Navigation shortcuts */}
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="card-ttl">Quick Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              <div
                className="list-item"
                style={{ padding: '11px 0', cursor: 'pointer' }}
                onClick={() => navigate('/mentees')}
              >
                <div className="row-between">
                  <span className="fs12">My Mentees</span>
                  <span className="fs12 t-m">→</span>
                </div>
              </div>

              <div
                className="list-item"
                style={{ padding: '11px 0', cursor: 'pointer' }}
                onClick={() => navigate('/coach/messages')}
              >
                <div className="row-between">
                  <span className="fs12">Messages</span>
                  <span className="fs12 t-m">→</span>
                </div>
              </div>

            </div>
          </div>

          {/* Sign out */}
          <div className="card" style={{ padding: '10px 14px' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '11px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--z-red)',
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              Sign Out
            </button>
          </div>

        </div>

        <BottomNav />
      </div>
    </>
  )
}
