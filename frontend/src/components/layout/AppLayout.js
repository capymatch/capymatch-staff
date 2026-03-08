import { useState } from "react";
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, Megaphone, BarChart3, Users, UserPlus, User, Shield } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const ROUTE_META = {
  "/mission-control": { title: "Dashboard", icon: LayoutDashboard },
  "/events": { title: "Events", icon: Calendar },
  "/advocacy": { title: "Advocacy", icon: Megaphone },
  "/program": { title: "Program Intelligence", icon: BarChart3 },
  "/roster": { title: "Roster", icon: Users },
  "/invites": { title: "Invite Coaches", icon: UserPlus },
  "/profile": { title: "Profile", icon: User },
  "/support-pods": { title: "Support Pod", icon: Shield },
  "/admin": { title: "Admin", icon: BarChart3 },
};

function getRouteMeta(pathname) {
  for (const [prefix, meta] of Object.entries(ROUTE_META)) {
    if (pathname.startsWith(prefix)) return meta;
  }
  return { title: "CapyMatch", icon: LayoutDashboard };
}

export default function AppLayout({ children, title, icon }) {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[220px] flex flex-col min-h-screen">
        <TopBar
          title={title || routeMeta.title}
          icon={icon || routeMeta.icon}
          onMenuToggle={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 max-w-[1200px]">
          {children}
        </main>
      </div>
    </div>
  );
}
