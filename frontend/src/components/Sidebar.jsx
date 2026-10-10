import { NavLink } from "react-router-dom";
import LogoutButton from "./LogoutButton";

export default function Sidebar({ items }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <LogoutButton className="sidebar-logout">Logout</LogoutButton>
    </aside>
  );
}
