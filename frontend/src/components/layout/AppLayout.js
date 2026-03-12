import { useState } from "react";
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Megaphone, BarChart3, Users, UserPlus, User, Shield, Sparkles, Kanban, GraduationCap, Mail, Video, CreditCard, Settings, Receipt } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useAuth } from "@/AuthContext";
import AIAssistantDrawer from "../AIAssistantDrawer";

const ROUTE_META = {
  "/mission-control": { title: "Mission Control", icon: LayoutDashboard },
  "/events": { title: "Events", icon: Calendar },
  "/advocacy": { title: "Advocacy", icon: Megaphone },
  "/program": { title: "Program", icon: BarChart3 },
  "/roster": { title: "Roster", icon: Users },
  "/profile": { title: "Profile", icon: User },
  "/invite": { title: "Invite", icon: UserPlus },
  "/admin": { title: "Admin", icon: Shield },
  "/admin/dashboard": { title: "Admin Dashboard", icon: Shield },
  "/admin/integrations": { title: "Integrations", icon: Shield },
  "/admin/universities": { title: "Universities", icon: GraduationCap },
  "/board": { title: "Dashboard", icon: LayoutDashboard },
  "/pipeline": { title: "My Schools", icon: Kanban },
  "/schools": { title: "Find Schools", icon: GraduationCap },
  "/calendar": { title: "Calendar", icon: Calendar },
  "/inbox": { title: "Inbox", icon: Mail },
  "/highlights": { title: "Highlights", icon: Video },
  "/analytics": { title: "Analytics", icon: BarChart3 },
  "/athlete-profile": { title: "Profile", icon: User },
  "/account": { title: "Account", icon: CreditCard },
  "/billing": { title: "Billing", icon: Receipt },
  "/athlete-settings": { title: "Settings", icon: Settings },
};

function getRouteMeta(pathname) {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;
  for (const [path, meta] of Object.entries(ROUTE_META)) {
    if (pathname.startsWith(path)) return meta;
  }
  return { title: "CapyMatch", icon: LayoutDashboard };
}

export default function AppLayout({ children, title, icon }) {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { user } = useAuth();
  const isAthlete = user?.role === "athlete" || user?.role === "parent";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--cm-bg)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ backgroundColor: "var(--cm-overlay)" }} onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[220px] flex flex-col min-h-screen">
        <TopBar
          title={title || routeMeta.title}
          icon={icon || routeMeta.icon}
          onMenuToggle={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 max-w-[1200px] overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* AI Assistant FAB for athletes */}
      {isAthlete && (
        <button onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg z-[80] flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: "linear-gradient(135deg, #1a8a80, #6366f1)" }}
          data-testid="ai-fab">
          <Sparkles className="w-5 h-5 text-white" />
        </button>
      )}
      {isAthlete && <AIAssistantDrawer isOpen={aiOpen} onClose={() => setAiOpen(false)} />}
    </div>
  );
}
