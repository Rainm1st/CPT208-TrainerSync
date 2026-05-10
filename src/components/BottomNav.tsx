import { NavLink } from 'react-router-dom'

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

const links = [
  { to: '/map',      label: 'Home',     Icon: IcoHome    },
  { to: '/exercise', label: 'Exercise', Icon: IcoExercise },
  { to: '/buddies',  label: 'Buddies',  Icon: IcoPeople  },
  { to: '/profile',  label: 'Profile',  Icon: IcoPerson  },
]

export function BottomNav() {
  return (
    <nav className="bnav bnav-4">
      {links.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            ['bnav-item', isActive ? 'active' : ''].filter(Boolean).join(' ')
          }
        >
          <Icon />
          <span className="nav-lbl">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
