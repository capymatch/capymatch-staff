import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Moon, LogOut, User, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/AuthContext";

export default function TopBar({ title, icon: Icon, onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "CM";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className="h-14 sm:h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6"
      data-testid="topbar"
    >
      {/* Left: Hamburger + title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors lg:hidden"
          data-testid="mobile-menu-toggle"
        >
          <Menu className="w-5 h-5 text-slate-500" />
        </button>
        {Icon && <Icon className="w-5 h-5 text-slate-400 hidden sm:block" />}
        <h1 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight">{title || "Dashboard"}</h1>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
          data-testid="notifications-button"
        >
          <Bell className="w-[18px] h-[18px] text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors hidden sm:block" data-testid="theme-toggle">
          <Moon className="w-[18px] h-[18px] text-slate-400" />
        </button>

        <div className="relative" data-testid="user-profile-area">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="user-menu-trigger"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-[11px] bg-slate-800 text-white font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline" data-testid="user-display-name">
              {user?.name?.split(" ")[0] || "User"}
            </span>
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
              data-testid="user-menu-dropdown"
            >
              <button
                onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
                data-testid="menu-profile-link"
              >
                <User className="w-4 h-4 text-slate-400" />
                Profile
              </button>
              <div className="border-t border-gray-50 my-0.5" />
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
                data-testid="menu-logout-link"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
