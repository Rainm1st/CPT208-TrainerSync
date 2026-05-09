import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'

const ALL_MENTEES = [
  { init:'XM', name:'Xiao Ming', status:'Training',  statusClass:'t-g', detail:'Bench Press · 3/5 · 142bpm', active:true  },
  { init:'XH', name:'Xiao Hong', status:'High HR',   statusClass:'t-r', detail:'Squat · High HR 162bpm',      active:true  },
  { init:'XG', name:'Xiao Gang', status:'Offline',   statusClass:'t-m', detail:'',                            active:false },
]

export default function MenteesPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All (12)')

  const active = ALL_MENTEES.filter(m => m.active)

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/coach')}>← Back</button>
          <span className="hbar-ttl">Mentees</span>
          <span className="hbar-icon">🔍</span>
        </div>

        <div className="content">
          <div className="chips">
            {['All (12)','Active (3)','Offline (9)'].map(f => (
              <button key={f} className={`chip${filter===f?' on':''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          <div className="card">
            <div className="card-ttl">Active Now</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {active.map(m => (
                <div key={m.init} className="list-item" style={{ cursor:'pointer' }} onClick={() => navigate('/mentee/'+m.init)}>
                  <div className="row-between" style={{ marginBottom:6 }}>
                    <div className="row">
                      <div className="avatar av-md">{m.init}</div>
                      <div>
                        <div className="fs13 fw6">{m.name}</div>
                        <div className={`fs11 ${m.statusClass}`}>{m.detail}</div>
                      </div>
                    </div>
                  </div>
                  <div className="int-btns">
                    <div className="int-btn" onClick={e => { e.stopPropagation(); navigate('/coach/chat/'+m.init) }}>💬</div>
                    <div className="int-btn" onClick={e => e.stopPropagation()}>💪</div>
                    <span className="t-c fs11" style={{ marginLeft:'auto' }}>View →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-ttl">All Mentees</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {ALL_MENTEES.map(m => (
                <div key={m.init} className="list-item" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }} onClick={() => navigate('/mentee/'+m.init)}>
                  <div className="row">
                    <div className="avatar av-md">{m.init}</div>
                    <div className="fs13 fw6">{m.name} <span className={`fs11 ${m.statusClass}`}>{m.status}</span></div>
                  </div>
                  <span className="t-c fs11">View →</span>
                </div>
              ))}
              <div className="t-m fs11" style={{ textAlign:'center', marginTop:4 }}>... more mentees ...</div>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  )
}
