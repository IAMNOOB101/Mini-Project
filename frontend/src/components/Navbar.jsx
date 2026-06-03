import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

const AUTH_PAGES = ["/login", "/signup"];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const isAuthPage = AUTH_PAGES.includes(location.pathname);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (_) {}

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to={user && !isAuthPage ? "/user-home" : "/"} className="navbar-brand">
        <span className="brand-icon">🎯</span>
        <span className="brand-text">InterviewAI</span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.3rem 0.6rem",
            cursor: "pointer",
            fontSize: "1.2rem",
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (theme === "dark") {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 0 10px rgba(6, 182, 212, 0.2)";
            } else {
              e.currentTarget.style.background = "var(--surface-2)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "transparent";
          }}
          title="Switch Theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <div className={`nav-links ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}>
          {/* On auth pages: never show logout / user greeting */}
          {!isAuthPage && !user && (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-link nav-link-cta">Get Started</Link>
            </>
          )}

          {/* User Profile Section - Merged */}
          {!isAuthPage && user && (
            <div className="nav-user">
              <button
                onClick={() => navigate("/profile")}
                className="user-profile-btn"
                title="Click to view profile"
              >
                <div className="user-avatar">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
                <div className="user-info">
                  <span className="user-name">Hi, {user.firstName}! 👋</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </button>
              <button className="btn-logout" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;