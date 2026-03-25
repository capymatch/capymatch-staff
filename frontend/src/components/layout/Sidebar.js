import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  LayoutDashboard, Calendar, Megaphone, BarChart3, Users,
  ChevronRight, Kanban, GraduationCap, Mail, Video, Play,
  Shield, Plug, Database, CreditCard, MessageSquare, Building2,
  PanelLeftClose, PanelLeftOpen,
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
  { id: "club-billing", label: "Club Billing", icon: CreditCard, path: "/club-billing" },
  { id: "admin-integrations", label: "Integrations", icon: Plug, path: "/admin/integrations" },
];

const ADMIN_NAV = [
  { id: "admin-dashboard", label: "Admin", icon: Shield, path: "/admin/dashboard" },
  { id: "admin-users", label: "Users", icon: Users, path: "/admin/users" },
  { id: "admin-organizations", label: "Organizations", icon: Building2, path: "/admin/organizations" },
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
  { id: "spotlight", label: "Social Spotlight", icon: Play, path: "/spotlight" },
];

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
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
    // Re-fetch immediately when a message thread is opened
    const onRead = () => setTimeout(fetchUnread, 500);
    window.addEventListener("messages-read", onRead);
    return () => { clearInterval(interval); window.removeEventListener("messages-read", onRead); };
  }, [user]);

  let navItems = isAthlete ? ATHLETE_NAV : [...STAFF_NAV, ...(isDirector ? DIRECTOR_EXTRA : [])];
  if (isDirector) navItems = navItems.filter(n => n.id !== "spotlight");

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const w = collapsed ? "w-16" : "w-[220px]";

  return (
    <aside
      className={`fixed top-0 left-0 h-full ${w} z-[60] flex flex-col transition-all duration-300 border-r
        lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      style={{
        backgroundColor: "var(--cm-sidebar)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 pt-5 pb-4 ${collapsed ? "px-3 justify-center" : "px-5"}`} data-testid="sidebar-logo">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shrink-0"
          style={{ background: "linear-gradient(135deg, #ff6a3d, #ff8a5c)" }}>
          <span className="text-white font-extrabold text-sm tracking-tight">C</span>
        </div>
        {!collapsed && (
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "#f0f0f2" }}>
            CapyMatch
          </span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-5 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md"
            style={{ backgroundColor: "rgba(255,106,61,0.12)", color: "#ff6a3d" }}>
            {user?.role === "director" ? "Director" : user?.role === "club_coach" ? "Coach" : "Athlete"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); onClose?.(); }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${collapsed ? "px-0 justify-center" : "px-3"}`}
                style={{
                  backgroundColor: active ? "var(--cm-sidebar-active)" : "transparent",
                  color: active ? "var(--cm-sidebar-active-text)" : "#8b8d98",
                }}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" style={{ color: active ? "var(--cm-sidebar-active-text)" : "#5c5e6a" }} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && item.id === "messages" && unreadMessages > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ background: "#ff6a3d" }} data-testid="messages-badge">
                    {unreadMessages}
                  </span>
                )}
                {!collapsed && active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="mt-4 mb-2 px-3">
                <span className="text-[9px] font-bold uppercase tracking-[1.5px]" style={{ color: "#5c5e6a" }}>Admin</span>
              </div>
            )}
            {collapsed && <div className="mt-3 mb-1 mx-auto w-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />}
            <div className="space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); onClose?.(); }}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${collapsed ? "px-0 justify-center" : "px-3"}`}
                    style={{
                      backgroundColor: active ? "var(--cm-sidebar-active)" : "transparent",
                      color: active ? "var(--cm-sidebar-active-text)" : "#8b8d98",
                    }}
                    data-testid={`nav-${item.id}`}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" style={{ color: active ? "var(--cm-sidebar-active-text)" : "#5c5e6a" }} />
                    {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!collapsed && active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/5"
          style={{ color: "#5c5e6a" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-testid="sidebar-collapse-btn"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span className="text-[11px] font-medium">Collapse</span>
            </>
          )}
        </button>

        {/* User info */}
        <div className={`py-3 border-t ${collapsed ? "px-2" : "px-5"}`} style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #ff6a3d, #ff8a5c)" }}>
              {user?.photo_url ? (
                <img src={user.photo_url} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "#f0f0f2" }}>
                  {user?.name || user?.email || "User"}
                </p>
                <p className="text-[10px] truncate" style={{ color: "#5c5e6a" }}>
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
