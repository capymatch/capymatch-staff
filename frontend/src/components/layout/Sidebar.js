import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  BarChart3,
  Users,
  Sparkles,
  ChevronRight,
  Kanban,
  GraduationCap,
  Mail,
  User,
  Settings,
  Video,
} from "lucide-react";
import { useAuth } from "@/AuthContext";

const STAFF_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/mission-control" },
  { id: "events", label: "Events", icon: Calendar, path: "/events" },
  { id: "advocacy", label: "Advocacy", icon: Megaphone, path: "/advocacy" },
  { id: "program", label: "Program", icon: BarChart3, path: "/program" },
];

const DIRECTOR_EXTRA = [
  { id: "roster", label: "Roster", icon: Users, path: "/roster" },
];

const ATHLETE_NAV = [
  { id: "board", label: "Dashboard", icon: LayoutDashboard, path: "/board" },
  { id: "pipeline", label: "Pipeline", icon: Kanban, path: "/pipeline" },
  { id: "schools", label: "Schools", icon: GraduationCap, path: "/schools" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
  { id: "inbox", label: "Inbox", icon: Mail, path: "/inbox" },
  { id: "highlights", label: "Highlights", icon: Video, path: "/highlights" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
];

function getNavItems(role) {
  if (role === "director") return [...STAFF_NAV, ...DIRECTOR_EXTRA];
  if (role === "coach") return STAFF_NAV;
  return ATHLETE_NAV; // athlete + parent
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);

  const role = user?.role || "coach";
  const isStaff = role === "director" || role === "coach";
  const navItems = getNavItems(role);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-gray-100 flex flex-col z-50 transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <span className="text-white font-bold text-sm tracking-tight">CM</span>
        </div>
        <span className="text-base font-bold text-slate-800 tracking-tight">CapyMatch</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:bg-gray-50 hover:text-slate-700"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? "text-emerald-600" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}

        {/* AI Features — staff only */}
        {isStaff && (
          <button
            data-testid="nav-ai-features"
            onClick={() => setAiOpen(!aiOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-gray-50 hover:text-slate-700 transition-all"
          >
            <Sparkles className="w-[18px] h-[18px] text-slate-400" />
            AI Features
            <ChevronRight className={`w-3.5 h-3.5 ml-auto text-slate-300 transition-transform ${aiOpen ? "rotate-90" : ""}`} />
          </button>
        )}
      </nav>

      {/* Role badge */}
      <div className="px-5 pb-4">
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{role}</p>
          <p className="text-xs text-gray-600 truncate">{user?.name || user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
