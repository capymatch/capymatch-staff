import { useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, LayoutDashboard, Calendar, Megaphone, BarChart3, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/AuthContext";

function Header({ selectedGradYear, setSelectedGradYear, stats }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const modes = [
    { id: "mission-control", label: "Mission Control", icon: LayoutDashboard, path: "/mission-control" },
    { id: "events", label: "Events", icon: Calendar, path: "/events" },
    { id: "advocacy", label: "Advocacy", icon: Megaphone, path: "/advocacy" },
    { id: "program", label: "Program", icon: BarChart3, path: "/program" },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "CM";

  const roleLabel = user?.role === "director" ? "Director" : "Coach";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white" data-testid="header">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Modes */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/10 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">CM</span>
              </div>
              <span className="font-semibold text-sm tracking-tight hidden sm:inline opacity-80">CapyMatch</span>
            </div>

            <nav className="hidden lg:flex items-center" data-testid="mode-navigation">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isActive = mode.path && location.pathname.startsWith(mode.path);
                return (
                  <button
                    key={mode.id}
                    data-testid={`mode-${mode.id}`}
                    onClick={() => mode.path && navigate(mode.path)}
                    disabled={!mode.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border-b-2 ${
                      isActive
                        ? "text-white border-white"
                        : mode.path
                          ? "text-white/40 border-transparent hover:text-white/70 cursor-pointer"
                          : "text-white/20 border-transparent cursor-default"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Center: Live status strip */}
          <div className="hidden md:flex items-center gap-4 text-[11px] text-white/50 font-medium tracking-wide uppercase">
            {stats && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  {stats.alertCount || 0} alerts
                </span>
                <span className="text-white/20">|</span>
                <span>{stats.athleteCount || 0} athletes monitoring</span>
                <span className="text-white/20">|</span>
                <span>{stats.eventCount || 0} events ahead</span>
              </>
            )}
          </div>

          {/* Right: Search, Filter, Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center relative">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5" />
              <input
                type="text"
                placeholder="Search athletes..."
                data-testid="global-search"
                className="pl-8 pr-3 py-1.5 bg-white/10 border border-white/10 rounded-md text-xs text-white placeholder-white/30 focus:outline-none focus:bg-white/15 focus:border-white/20 transition-all w-48"
              />
            </div>

            <Select value={selectedGradYear} onValueChange={setSelectedGradYear}>
              <SelectTrigger className="w-24 h-8 text-xs bg-white/10 border-white/10 text-white [&>svg]:text-white/50" data-testid="grad-year-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>

            <button className="relative p-1.5 rounded-md hover:bg-white/10 transition-colors" data-testid="notifications-button">
              <Bell className="w-4 h-4 text-white/60" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
            </button>

            {/* User profile + role badge */}
            <div className="flex items-center gap-2" data-testid="user-profile-area">
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px] bg-white/20 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium text-white/80 leading-tight" data-testid="user-display-name">{user?.name || "User"}</span>
                  <span className="text-[9px] text-white/40 leading-tight uppercase tracking-wider" data-testid="user-role-badge">{roleLabel}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors ml-1"
                title="Sign out"
                data-testid="logout-button"
              >
                <LogOut className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
