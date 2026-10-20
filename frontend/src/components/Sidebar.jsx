import { NavLink } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'
import LogoutButton from './LogoutButton'

export default function Sidebar({ items }) {
  const { user } = useAuth()
  const isStaffMenu = items.some((item) => item.to === '/admin')
  const links =
    user?.role === 'admin' && isStaffMenu
      ? [...items, { to: '/admin/audit', label: 'Audit Trail' }]
      : items

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {links.map((item) => (
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
      <LogoutButton className="sidebar-logout">Logout</LogoutButton>
    </aside>
  )
}
