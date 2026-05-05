import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { BottomNav } from '../../components/BottomNav'

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

export default function CoachMessagesPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { conversations, fetchConversations } = useChatStore()

  useEffect(() => {
    if (profile) fetchConversations(profile.id)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const showReal = conversations.length > 0

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/coach')}>← Back</button>
          <span className="hbar-ttl">Messages</span>
          <span />
        </div>
        <div className="content">
          <div className="card">
            <div className="card-ttl">Conversations</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {showReal ? conversations.map(c => (
                <div key={c.partner_id} className="list-item" style={{ cursor:'pointer' }} onClick={() => navigate('/coach/chat/' + c.partner_id)}>
                  <div className="row-between" style={{ marginBottom:4 }}>
                    <div className="row">
                      <div className="avatar av-md">{(c.partner_username ?? 'U').slice(0,2).toUpperCase()}</div>
                      <div className="fs13 fw6">{c.partner_username}</div>
                    </div>
                    <span className="t-m fs10">{fmtTime(c.last_sent_at)}</span>
                  </div>
                  <div className="t-m fs11" style={{ paddingLeft:46 }}>{c.last_message}</div>
                  <div style={{ paddingLeft:46, marginTop:5 }}><span className="t-c fs11">Reply →</span></div>
                </div>
              )) : [
                { init:'XM', name:'Xiao Ming', time:'14:32', preview:'"Coach, I feel great today!"' },
                { init:'XH', name:'Xiao Hong', time:'13:15', preview:'"Knee feels slightly off during squats?"' },
                { init:'XG', name:'Xiao Gang', time:'Yesterday', preview:'"Can you plan a leg day for tomorrow?"' },
              ].map(c => (
                <div key={c.init} className="list-item" style={{ cursor:'pointer' }} onClick={() => navigate('/coach/chat/'+c.init)}>
                  <div className="row-between" style={{ marginBottom:4 }}>
                    <div className="row"><div className="avatar av-md">{c.init}</div><div className="fs13 fw6">{c.name}</div></div>
                    <span className="t-m fs10">{c.time}</span>
                  </div>
                  <div className="t-m fs11" style={{ paddingLeft:46 }}>{c.preview}</div>
                  <div style={{ paddingLeft:46, marginTop:5 }}><span className="t-c fs11">Reply →</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </>
  )
}
