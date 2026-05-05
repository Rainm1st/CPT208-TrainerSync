import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function IcoHome() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IcoExercise() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/><circle cx="3.5" cy="6.5" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="17.5" r="1"/></svg>
}
function IcoPeople() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IcoPerson() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
}
function IcoMessage() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function IcoSettings() {
  return <svg className="nav-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
}

const traineeLinks = [
  { to: '/map',      label: 'Home',     Icon: IcoHome    },
  { to: '/exercise', label: 'Exercise', Icon: IcoExercise },
  { to: '/buddies',  label: 'Buddies',  Icon: IcoPeople  },
  { to: '/profile',  label: 'Profile',  Icon: IcoPerson  },
]

const coachLinks = [
  { to: '/coach',          label: 'Home',     Icon: IcoHome     },
  { to: '/mentees',        label: 'Mentees',  Icon: IcoPeople   },
  { to: '/coach/messages', label: 'Messages', Icon: IcoMessage  },
  { to: '/coach/settings', label: 'Settings', Icon: IcoSettings },
]

export function BottomNav() {
  const { profile } = useAuthStore()
  const isCoach = profile?.role === 'coach'
  const links = isCoach ? coachLinks : traineeLinks

  return (
    <nav className="bnav bnav-4">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            ['bnav-item', isActive ? 'active' : '', isCoach ? 'coach' : ''].filter(Boolean).join(' ')
          }
        >
          <Icon />
          <span className="nav-lbl">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
