import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSocialStore } from '../../store/socialStore'
import { useTheme } from '../../hooks/useTheme'

export default function FriendsPage() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { profile } = useAuthStore()
  const { friends, requests, fetchFriends, fetchRequests, acceptRequest, declineRequest, sendInteraction } = useSocialStore()

  useEffect(() => {
    if (!profile) return
    fetchFriends(profile.id)
    fetchRequests(profile.id)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept(friendshipId: string) {
    await acceptRequest(friendshipId)
    if (profile) fetchFriends(profile.id)
  }

  async function handleDecline(friendshipId: string) {
    await declineRequest(friendshipId)
  }

  function handleSendInteraction(friendId: string, type: 'cheer' | 'emoji', payload: string) {
    if (profile) sendInteraction(profile.id, friendId, type, payload)
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/buddies')}>← Back</button>
          <span className="hbar-ttl">Friends</span>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <button className="theme-toggle-btn" style={{ width:28, height:28, fontSize:13 }} onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <span className="hbar-icon" style={{ fontSize:16 }}>🔍</span>
          </div>
        </div>
        <div className="content">

          {/* Pending requests */}
          <div className="card">
            <div className="card-ttl">Requests ({requests.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {requests.length === 0 ? (
                <div className="t-m fs11" style={{ textAlign:'center' }}>No pending requests</div>
              ) : requests.map(r => (
                <div key={r.id} className="list-item">
                  <div className="row" style={{ marginBottom:8 }}>
                    <div className="avatar av-md">{(r.requester.username ?? 'U').slice(0,2).toUpperCase()}</div>
                    <div>
                      <div className="fs13 fw6">{r.requester.username}</div>
                      <div className="fs11 t-m">Wants to be your friend</div>
                    </div>
                  </div>
                  <div className="btn-row">
                    <button
                      className="btn-ghost"
                      style={{ background:'var(--green-t)', borderColor:'var(--green)', color:'#86efac', padding:'7px 12px', fontSize:12 }}
                      onClick={() => handleAccept(r.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding:'7px 12px', fontSize:12 }}
                      onClick={() => handleDecline(r.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Friends list */}
          <div className="card">
            <div className="card-ttl">My Friends ({friends.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {friends.length === 0 ? (
                <div className="t-m fs11" style={{ textAlign:'center' }}>No friends yet — find people in the Buddies tab</div>
              ) : friends.map(f => (
                <div key={f.friendship_id} className="list-item">
                  <div className="row-between" style={{ marginBottom:8 }}>
                    <div className="row">
                      <div className="avatar av-md">{(f.username ?? 'U').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="fs13 fw6">{f.username}</div>
                        <div className="fs11 t-g">Friend</div>
                      </div>
                    </div>
                  </div>
                  <div className="int-btns">
                    <div className="int-btn" onClick={() => navigate('/buddy/' + f.id)}>💬</div>
                    <div className="int-btn" onClick={() => handleSendInteraction(f.id, 'emoji', '💪')}>💪</div>
                    <div className="int-btn" onClick={() => handleSendInteraction(f.id, 'emoji', '🔥')}>🔥</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
