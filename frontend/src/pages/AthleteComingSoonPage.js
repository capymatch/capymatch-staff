import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Kanban,
  GraduationCap,
  Calendar,
  Mail,
  User,
  BarChart3,
  Settings,
  Clock,
} from "lucide-react";

const PAGE_META = {
  "/board": { title: "Dashboard", subtitle: "Your recruiting command center", icon: LayoutDashboard },
  "/pipeline": { title: "Pipeline", subtitle: "Track your target schools and recruiting progress", icon: Kanban },
  "/schools": { title: "Schools", subtitle: "Research and explore college programs", icon: GraduationCap },
  "/calendar": { title: "Calendar", subtitle: "Upcoming events, visits, and deadlines", icon: Calendar },
  "/inbox": { title: "Inbox", subtitle: "Messages and email communication", icon: Mail },
  "/athlete-profile": { title: "Profile", subtitle: "Manage your recruiting profile", icon: User },
  "/analytics": { title: "Analytics", subtitle: "Profile views and engagement insights", icon: BarChart3 },
  "/athlete-settings": { title: "Settings", subtitle: "Account preferences and connections", icon: Settings },
};

export default function AthleteComingSoonPage() {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: "Page", subtitle: "", icon: Clock };
  const Icon = meta.icon;

  return (
    <div className="min-h-[70vh] flex items-center justify-center" data-testid="athlete-coming-soon">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-2" data-testid="coming-soon-title">
          {meta.title}
        </h1>
        <p className="text-sm text-slate-500 mb-6">{meta.subtitle}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Coming in Phase 2
        </div>
      </div>
    </div>
  );
}
