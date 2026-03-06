import { Search, Bell, LayoutDashboard, Users, Calendar, Megaphone, BarChart3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Header({ selectedGradYear, setSelectedGradYear, stats }) {
  const modes = [
    { id: "mission-control", label: "Mission Control", icon: LayoutDashboard, active: true },
    { id: "support-pods", label: "Support Pods", icon: Users, active: false },
    { id: "events", label: "Events", icon: Calendar, active: false },
    { id: "advocacy", label: "Advocacy", icon: Megaphone, active: false },
    { id: "program", label: "Program", icon: BarChart3, active: false },
  ];

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
                return (
                  <button
                    key={mode.id}
                    data-testid={`mode-${mode.id}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border-b-2 ${
                      mode.active
                        ? "text-white border-white"
                        : "text-white/40 border-transparent hover:text-white/70"
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

            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="user-profile-button">
              <Avatar className="w-7 h-7">
                <AvatarImage src="https://images.unsplash.com/photo-1724984430472-2b79b1c0dd13?w=100" />
                <AvatarFallback className="text-[10px]">CM</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-white/70 hidden sm:inline">Coach M</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
