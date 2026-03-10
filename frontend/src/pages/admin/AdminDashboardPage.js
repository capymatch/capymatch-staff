import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Users, GraduationCap, Activity, DollarSign, TrendingUp,
  Database, UserCheck, Loader2, RefreshCw
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatCard({ icon: Icon, label, value, sublabel, color }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: "var(--cm-text-3)" }}>{label}</span>
      </div>
      <div className="text-2xl font-extrabold" style={{ color: "var(--cm-text)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sublabel && <div className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-4)" }}>{sublabel}</div>}
    </div>
  );
}

function PlanBar({ plan, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold w-16 capitalize" style={{ color: "var(--cm-text-2)" }}>{plan}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold w-10 text-right" style={{ color: "var(--cm-text-2)" }}>{count}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/admin/dashboard/stats`, { headers });
      setStats(res.data);
    } catch {
      toast.error("Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  if (!stats) return null;

  const totalAthletes = stats.users.total_athletes;
  const plans = stats.subscriptions.plan_counts;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="admin-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>Admin Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>Platform health overview</p>
        </div>
        <button onClick={() => { setLoading(true); fetchStats(); }} className="p-2 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Athletes" value={totalAthletes} color="#0d9488" />
        <StatCard icon={UserCheck} label="Active This Week" value={stats.users.active_this_week} color="#3b82f6" />
        <StatCard icon={DollarSign} label="MRR" value={`$${stats.subscriptions.mrr}`} color="#10b981" />
        <StatCard icon={Database} label="Knowledge Base" value={stats.knowledge_base.total_schools} sublabel="schools" color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscription Breakdown */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--cm-text)" }}>Subscription Breakdown</h3>
          <div className="space-y-3">
            <PlanBar plan="Basic" count={plans.basic} total={totalAthletes} color="var(--cm-text-3)" />
            <PlanBar plan="Pro" count={plans.pro} total={totalAthletes} color="#3b82f6" />
            <PlanBar plan="Premium" count={plans.premium} total={totalAthletes} color="#8b5cf6" />
          </div>
        </div>

        {/* KB Health */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--cm-text)" }}>Knowledge Base Health</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Coach Emails</span>
              <span className="text-[11px] font-bold" style={{ color: "#10b981" }}>
                {stats.knowledge_base.has_coach_email} / {stats.knowledge_base.total_schools}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Scorecard Data</span>
              <span className="text-[11px] font-bold" style={{ color: "#3b82f6" }}>
                {stats.knowledge_base.has_scorecard} / {stats.knowledge_base.total_schools}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Logos</span>
              <span className="text-[11px] font-bold" style={{ color: "#8b5cf6" }}>
                {stats.knowledge_base.has_logo} / {stats.knowledge_base.total_schools}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="rounded-xl border p-5 lg:col-span-2" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--cm-text)" }}>Platform Activity</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>{stats.activity.total_programs_on_boards.toLocaleString()}</div>
              <div className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Schools on Boards</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>{stats.activity.total_interactions.toLocaleString()}</div>
              <div className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Total Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>{stats.activity.total_events.toLocaleString()}</div>
              <div className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Events</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
