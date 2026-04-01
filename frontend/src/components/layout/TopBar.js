import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, User, Menu, Settings, CreditCard, ChevronDown, Receipt, Shield, Users, GraduationCap, Megaphone } from "lucide-react";
import { useAuth } from "@/AuthContext";
import { useTheme } from "@/ThemeContext";
import NotificationBell from "../NotificationBell";

const ROLE_CONFIG = {
  platform_admin: { label: "Admin", icon: Shield, color: "#8b5cf6", home: "/admin/dashboard" },
  director: { label: "Director", icon: Megaphone, color: "#f59e0b", home: "/mission-control" },
  coach: { label: "Coach", icon: Users, color: "#0d9488", home: "/mission-control" },
  club_coach: { label: "Coach", icon: Users, color: "#0d9488", home: "/mission-control" },
  athlete: { label: "Athlete", icon: GraduationCap, color: "#3b82f6", home: "/board" },
  parent: { label: "Parent", icon: User, color: "#6366f1", home: "/board" },
};

export default function TopBar({ title, icon: Icon, onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout, effectiveRole, switchRole } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const roleRef = useRef(null);

  const handleLogout = () => { logout(); navigate("/login"); };
  const currentRole = effectiveRole || user?.role;
  const isAthlete = currentRole === "athlete" || currentRole === "parent";
  const hasMultipleRoles = user?.roles && user.roles.length > 1;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const firstName = (user?.name || user?.email || "User").split(" ")[0];
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6"
      style={{ backgroundColor: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}
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
        {/* Role Switcher */}
        {hasMultipleRoles && (
          <div className="relative" ref={roleRef}>
            <button onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: `${ROLE_CONFIG[currentRole]?.color || "#6b7280"}15`,
                color: ROLE_CONFIG[currentRole]?.color || "#6b7280",
                border: `1px solid ${ROLE_CONFIG[currentRole]?.color || "#6b7280"}25`,
              }}
              data-testid="role-switcher-trigger">
              {(() => { const RIcon = ROLE_CONFIG[currentRole]?.icon || User; return <RIcon className="w-3.5 h-3.5" />; })()}
              {ROLE_CONFIG[currentRole]?.label || currentRole}
              <ChevronDown className="w-3 h-3" />
            </button>
            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl py-1.5 z-50 border overflow-hidden"
                style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}
                data-testid="role-switcher-dropdown">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-4)" }}>Switch View</p>
                {user.roles.map((r) => {
                  const cfg = ROLE_CONFIG[r] || { label: r, icon: User, color: "#6b7280", home: "/board" };
                  const RoleIcon = cfg.icon;
                  const isActive = r === currentRole;
                  return (
                    <button key={r}
                      onClick={() => {
                        switchRole(r);
                        setRoleMenuOpen(false);
                        navigate(cfg.home);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{ color: isActive ? cfg.color : "var(--cm-text-2)", fontWeight: isActive ? 600 : 400 }}
                      data-testid={`role-switch-${r}`}>
                      <RoleIcon className="w-4 h-4" style={{ color: cfg.color }} />
                      {cfg.label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="theme-toggle-btn"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            data-testid="user-menu-trigger">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a8a80] to-[#25a99e] flex items-center justify-center shadow-sm overflow-hidden">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={firstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{initial}</span>
              )}
            </div>
            <span className="text-sm font-medium hidden sm:inline" style={{ color: "var(--cm-text)" }}>{firstName}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl py-1 z-50 border overflow-hidden"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}
              data-testid="user-menu-dropdown">

              {/* User card */}
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8a80] to-[#25a99e] flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                  {user?.photo_url ? (
                    <img src={user.photo_url} alt={user?.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">{initial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--cm-text)" }}>{user?.name || "User"}</p>
                  <p className="text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{user?.email || ""}</p>
                </div>
              </div>

              {/* Menu items */}
              {isAthlete ? (
                <>
                  <button onClick={() => { setMenuOpen(false); navigate("/athlete-profile"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-athlete-profile-link">
                    <User className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Athlete Profile
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate("/athlete-settings"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-athlete-settings-link">
                    <Settings className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Settings
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate("/account"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-account-link">
                    <CreditCard className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Account
                  </button>
                  <button onClick={() => { setMenuOpen(false); navigate("/billing"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--cm-text-2)" }}
                    data-testid="menu-billing-link">
                    <Receipt className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Billing
                  </button>
                </>
              ) : (
                <button onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                  style={{ color: "var(--cm-text-2)" }}
                  data-testid="menu-profile-link">
                  <User className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> Profile
                </button>
              )}

              <div className="my-0.5" style={{ borderTop: "1px solid var(--cm-border)" }} />

              <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#1a8a80" }}
                data-testid="menu-logout-link">
                <LogOut className="w-4 h-4" style={{ color: "#1a8a80" }} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
