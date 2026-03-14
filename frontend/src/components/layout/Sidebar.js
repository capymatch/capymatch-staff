import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  LayoutDashboard, Calendar, Megaphone, BarChart3, Users,
  ChevronRight, Kanban, GraduationCap, Mail, Video,
  Shield, Plug, Database, CreditCard, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/AuthContext";

const STAFF_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/mission-control" },
  { id: "events", label: "Events", icon: Calendar, path: "/events" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages" },
  { id: "advocacy", label: "Advocacy", icon: Megaphone, path: "/advocacy" },
  { id: "program", label: "Program Insights", icon: BarChart3, path: "/program" },
];

const DIRECTOR_EXTRA = [
  { id: "roster", label: "Roster", icon: Users, path: "/roster" },
];

const ADMIN_NAV = [
  { id: "admin-dashboard", label: "Admin", icon: Shield, path: "/admin/dashboard" },
  { id: "admin-users", label: "Users", icon: Users, path: "/admin/users" },
  { id: "admin-subscriptions", label: "Subscriptions", icon: CreditCard, path: "/admin/subscriptions" },
  { id: "admin-integrations", label: "Integrations", icon: Plug, path: "/admin/integrations" },
  { id: "admin-universities", label: "Universities", icon: Database, path: "/admin/universities" },
];

const ATHLETE_NAV = [
  { id: "board", label: "Dashboard", icon: LayoutDashboard, path: "/board" },
  { id: "pipeline", label: "My Schools", icon: Kanban, path: "/pipeline" },
  { id: "schools", label: "Find Schools", icon: GraduationCap, path: "/schools" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
  { id: "inbox", label: "Inbox", icon: Mail, path: "/inbox" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages" },
  { id: "highlights", label: "Highlights", icon: Video, path: "/highlights" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAthlete = user?.role === "athlete" || user?.role === "parent";
  const isDirector = user?.role === "director";
  const isAdmin = user?.role === "platform_admin";
  const isStaff = isDirector || user?.role === "club_coach" || isAdmin;

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/support-messages/unread-count`);
        setUnreadMessages(res.data.unread_count || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user]);

  let navItems = isAthlete ? ATHLETE_NAV : [...STAFF_NAV, ...(isDirector ? DIRECTOR_EXTRA : [])];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-[220px] z-50 flex flex-col transition-transform duration-300 border-r
        lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      style={{
        backgroundColor: "var(--cm-sidebar)",
        borderColor: "var(--cm-border)",
      }}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4" data-testid="sidebar-logo">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a8a80] to-[#25a99e] flex items-center justify-center shadow-md">
          <span className="text-white font-extrabold text-sm tracking-tight">C</span>
        </div>
        <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--cm-text)" }}>
          CapyMatch
        </span>
      </div>

      {/* Role badge */}
      <div className="px-5 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md"
          style={{ backgroundColor: "var(--cm-accent-light)", color: "var(--cm-accent)" }}>
          {user?.role === "director" ? "Director" : user?.role === "club_coach" ? "Coach" : "Athlete"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); onClose?.(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group"
                style={{
                  backgroundColor: active ? "var(--cm-sidebar-active)" : "transparent",
                  color: active ? "var(--cm-sidebar-active-text)" : "var(--cm-text-2)",
                }}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-[18px] h-[18px]" style={{ color: active ? "var(--cm-sidebar-active-text)" : "var(--cm-text-3)" }} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "messages" && unreadMessages > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500 text-white leading-none" data-testid="messages-badge">
                    {unreadMessages}
                  </span>
                )}
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-3">
              <span className="text-[9px] font-bold uppercase tracking-[1.5px]" style={{ color: "var(--cm-text-4)" }}>Admin</span>
            </div>
            <div className="space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); onClose?.(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group"
                    style={{
                      backgroundColor: active ? "var(--cm-sidebar-active)" : "transparent",
                      color: active ? "var(--cm-sidebar-active-text)" : "var(--cm-text-2)",
                    }}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" style={{ color: active ? "var(--cm-sidebar-active-text)" : "var(--cm-text-3)" }} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--cm-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a8a80] to-[#25a99e] flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: "var(--cm-text)" }}>
              {user?.name || user?.email || "User"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--cm-text-3)" }}>
              {user?.email || ""}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
