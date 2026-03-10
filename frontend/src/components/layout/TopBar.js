import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, User, Menu, Settings } from "lucide-react";
import { useAuth } from "@/AuthContext";
import { useTheme } from "@/ThemeContext";
import NotificationBell from "../NotificationBell";

export default function TopBar({ title, icon: Icon, onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => { logout(); navigate("/login"); };
  const isAthlete = user?.role === "athlete" || user?.role === "parent";

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 border-b"
      style={{ backgroundColor: "var(--cm-topbar)", borderColor: "var(--cm-border)" }}
      data-testid="topbar">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }} data-testid="mobile-menu-toggle">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" style={{ color: "var(--cm-accent)" }} />}
          <h1 className="text-[15px] font-bold" style={{ color: "var(--cm-text)" }} data-testid="topbar-title">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="theme-toggle-btn"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
            data-testid="user-menu-trigger">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a8a80] to-[#25a99e] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl py-1 z-50 border"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", boxShadow: "var(--cm-shadow-md)" }}
              data-testid="user-menu-dropdown">
              {isAthlete && (
                <>
                  <button onClick={() => { setMenuOpen(false); navigate("/athlete-profile"); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-athlete-profile-link">
                    <User className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Profile
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate("/athlete-settings"); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-athlete-settings-link">
                    <Settings className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Settings
                  </button>
                  <div className="my-0.5" style={{ borderTop: "1px solid var(--cm-border)" }} />
                </>
              )}
              {!isAthlete && (
                <>
                  <button onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-profile-link">
                    <User className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Profile
                  </button>
                  <div className="my-0.5" style={{ borderTop: "1px solid var(--cm-border)" }} />
                </>
              )}
              <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                style={{ color: "var(--cm-text-2)" }}
                data-testid="menu-logout-link">
                <LogOut className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
