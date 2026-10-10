import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import logo from "../assets/logo.png";
import NotificationBell from "./NotificationBell";
import LogoutButton from "./LogoutButton";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStaff = user && (user.role === "admin" || user.role === "technician");

  const handleAccountClick = () => {
    if (!user) {
      navigate("/login");
    } else if (user.role === "customer") {
      navigate("/dashboard");
    } else {
      navigate("/admin");
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-links">
          <Link to="/" className="navbar-link">
            Home
          </Link>
          <Link to="/book-repair" className="navbar-link">
            Book Repair
          </Link>
        </div>

        <Link to="/" className="navbar-brand">
          <img
            src={logo}
            alt="Tapalla's Electronic Repair"
            className="navbar-logo"
          />
          <span className="navbar-brand-text">
            Tapalla&apos;s Electronic Repair
          </span>
        </Link>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-greeting">
                Hi, {user.full_name.split(" ")[0]}
              </span>

              {isStaff && <NotificationBell />}

              <button
                onClick={handleAccountClick}
                className="btn btn-secondary btn-sm"
              >
                {user.role === "customer" ? "Dashboard" : "Admin Panel"}
              </button>

              <LogoutButton
                className="link-btn small"
                style={{ color: "var(--color-gray-500)" }}
              >
                Logout
              </LogoutButton>
            </>
          ) : (
            <button
              onClick={handleAccountClick}
              className="btn btn-secondary btn-sm"
            >
              Customer Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
