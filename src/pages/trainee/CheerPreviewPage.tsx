import { useNavigate, useLocation } from 'react-router-dom'

export default function CheerPreviewPage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { msg?: string; from?: string } }
  const msg  = state?.msg  ?? 'Go! 💪'
  const from = state?.from ?? 'Xiao Ming'

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
          <div className="annot amber fs11">Long-press triggered: "{msg}" — recipient sees toast in P3</div>
          <div className="card" style={{ background:'var(--s0)' }}>
            <div className="card-ttl">Simulated — recipient's training screen</div>
            <div className="divider" style={{ marginBottom:10 }} />
            <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid var(--z-green)', borderRadius:10, padding:10, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="fs12">💪 {from}: <span className="t-g">"{msg}"</span></span>
              <span className="t-m fs12">✕</span>
            </div>
            <div className="t-m fs11" style={{ textAlign:'center', marginBottom:10 }}>Toast shown for 5 seconds</div>
            <div className="fs12 t-m" style={{ marginBottom:5 }}>Incline Bench Press</div>
            <div className="row" style={{ gap:8 }}>
              <div style={{ flex:1, height:36, background:'var(--s1)', borderRadius:8, display:'grid', placeItems:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} className="t-g">142 bpm</div>
              <div className="set-dots" style={{ flex:1 }}>
                <div className="sdot done" /><div className="sdot done" />
                <div className="sdot cur" /><div className="sdot" /><div className="sdot" />
              </div>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-primary" onClick={() => navigate(-2)}>Send 💪</button>
          </div>
        </div>
      </div>
    </>
  )
}
