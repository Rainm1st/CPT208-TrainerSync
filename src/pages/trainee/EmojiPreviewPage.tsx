import { useNavigate, useLocation } from 'react-router-dom'

export default function EmojiPreviewPage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { emoji?: string; from?: string } }
  const emoji = state?.emoji ?? '🔥'
  const from  = state?.from  ?? 'Xiao Ming'

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
          <span className="hbar-ttl">Preview</span>
          <span />
        </div>
        <div className="content">
          <div className="annot amber fs11">Long-press triggered: {emoji} — full-screen emoji burst for 3s</div>
          <div className="card" style={{ background:'var(--s0)' }}>
            <div className="card-ttl">Simulated — recipient's screen (full overlay)</div>
            <div style={{ background:'var(--bg)', borderRadius:10, padding:18, textAlign:'center' }}>
              <div style={{ fontSize:30, lineHeight:1.9, letterSpacing:6 }}>{emoji}{emoji}{emoji}{emoji}{emoji}</div>
              <div style={{ fontSize:30, lineHeight:1.9 }}>{emoji}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{emoji}</div>
              <div className="fs13 t-a fw7" style={{ padding:'6px 0' }}>from {from}</div>
              <div style={{ fontSize:30, lineHeight:1.9 }}>{emoji}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{emoji}</div>
              <div style={{ fontSize:30, lineHeight:1.9, letterSpacing:6 }}>{emoji}{emoji}{emoji}{emoji}{emoji}</div>
            </div>
            <div className="t-m fs10" style={{ textAlign:'center', marginTop:8 }}>Auto-dismisses after 3s</div>
          </div>
          <div className="btn-row">
            <button className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-danger" onClick={() => navigate(-2)}>Send {emoji}</button>
          </div>
        </div>
      </div>
    </>
  )
}
