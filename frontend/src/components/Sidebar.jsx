import { NavLink } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'

export default function Sidebar({ items }) {
  const { logout } = useAuth()

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} className="sidebar-logout">
        Logout
      </button>
    </aside>
  )
}
