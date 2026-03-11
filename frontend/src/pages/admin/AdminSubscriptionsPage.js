import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, CreditCard, DollarSign, Users, TrendingUp,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Clock, Zap, Sparkles, Crown, Check
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PLAN_BADGE = {
  basic: { bg: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: Zap },
  pro: { bg: "bg-teal-600/15 text-teal-500 border-teal-500/20", icon: Sparkles },
  premium: { bg: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: Crown },
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
      data-testid={`sub-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: "var(--cm-text)" }}>{value}</p>
          <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{label}</p>
        </div>
      </div>
      {sub && <p className="text-[10px] mt-2 pl-[52px]" style={{ color: "var(--cm-text-3)" }}>{sub}</p>}
    </div>
  );
}

function InlinePlanChanger({ userId, currentPlan, onChanged }) {
  const [plan, setPlan] = useState(currentPlan);
  const [saving, setSaving] = useState(false);
  const changed = plan !== currentPlan;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/subscriptions/${userId}`, { plan, reason: "Bulk admin change" });
      toast.success("Plan updated");
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={plan} onValueChange={setPlan}>
        <SelectTrigger
          className="w-28 h-8 text-xs"
          style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
          data-testid={`inline-plan-select-${userId}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="basic">Basic</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="premium">Premium</SelectItem>
        </SelectContent>
      </Select>
      {changed && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-3 text-xs"
          style={{ background: "#0d9488", color: "white" }}
          data-testid={`inline-plan-save-${userId}`}
        >
          {saving ? "..." : <Check className="w-3.5 h-3.5" />}
        </Button>
      )}
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (planFilter !== "all") params.plan = planFilter;
      const [subRes, logRes] = await Promise.all([
        axios.get(`${API}/admin/subscriptions`, { params }),
        axios.get(`${API}/admin/subscription-logs`, { params: { limit: 10 } }),
      ]);
      setData(subRes.data);
      setLogs(logRes.data.logs || []);
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = data?.stats || { plan_counts: { basic: 0, pro: 0, premium: 0 }, mrr: 0, total_users: 0 };
  const totalPages = Math.ceil((data?.total || 0) / 50);

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-5" data-testid="admin-subscriptions-page">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`$${stats.mrr}`}
          sub={`${stats.plan_counts.pro} Pro + ${stats.plan_counts.premium} Premium`}
          color="bg-teal-700/15 text-teal-500"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.total_users}
          color="bg-blue-600/15 text-blue-400"
        />
        <StatCard
          icon={CreditCard}
          label="Paid Users"
          value={(stats.plan_counts.pro || 0) + (stats.plan_counts.premium || 0)}
          sub={`${stats.total_users > 0 ? Math.round((((stats.plan_counts.pro || 0) + (stats.plan_counts.premium || 0)) / stats.total_users) * 100) : 0}% conversion`}
          color="bg-teal-600/15 text-teal-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Free Users"
          value={stats.plan_counts.basic || 0}
          sub="Upgrade potential"
          color="bg-zinc-600/15 text-zinc-400"
        />
      </div>

      {/* Plan Distribution */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center gap-4">
          {["basic", "pro", "premium"].map((p) => {
            const count = stats.plan_counts[p] || 0;
            const pct = stats.total_users > 0 ? Math.round((count / stats.total_users) * 100) : 0;
            const badge = PLAN_BADGE[p];
            const Icon = badge.icon;
            return (
              <div key={p} className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${badge.bg.split(" ")[1]}`} />
                    <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-border)" }}>
                  <div
                    className={`h-full rounded-full transition-all ${p === "basic" ? "bg-zinc-500" : p === "pro" ? "bg-teal-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Users Table */}
        <div className="xl:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cm-text-4)" }} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search users..."
                className="pl-9 text-sm"
                style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
                data-testid="sub-search"
              />
            </div>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32 text-xs" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }} data-testid="sub-plan-filter">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="sub-users-table">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--cm-border)" }}>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--cm-text-3)" }}>Schools</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>AI Used</th>
                    <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                  ) : (data?.users || []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-xs" style={{ color: "var(--cm-text-3)" }}>No users found</td></tr>
                  ) : (
                    (data?.users || []).map((u) => {
                      const schoolPct = u.school_limit === -1 ? 0 : u.school_limit > 0 ? Math.min(100, Math.round((u.school_count / u.school_limit) * 100)) : 0;
                      const overLimit = u.school_limit !== -1 && u.school_count > u.school_limit;

                      return (
                        <tr
                          key={u.user_id}
                          className="border-b transition-colors hover:opacity-80"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}
                          data-testid={`sub-row-${u.user_id}`}
                        >
                          <td className="px-4 py-3">
                            <div
                              className="flex items-center gap-2.5 cursor-pointer"
                              onClick={() => navigate(`/admin/users/${u.user_id}`)}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.15)", color: "#0d9488" }}>
                                {(u.athlete_name || u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate hover:text-teal-500 transition-colors" style={{ color: "var(--cm-text)" }}>{u.athlete_name || u.name}</p>
                                <p className="text-[10px] truncate" style={{ color: "var(--cm-text-3)" }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <InlinePlanChanger userId={u.user_id} currentPlan={u.plan} onChanged={fetchData} />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${overLimit ? "text-red-400" : ""}`} style={overLimit ? {} : { color: "var(--cm-text)" }}>
                                {u.school_count}/{u.school_limit === -1 ? "\u221e" : u.school_limit}
                              </span>
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-border)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${u.school_limit === -1 ? 15 : Math.min(100, schoolPct)}%`,
                                    backgroundColor: overLimit ? "#ef4444" : schoolPct > 80 ? "#f59e0b" : "#0d9488",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs" style={{ color: "var(--cm-text)" }}>
                              {u.ai_used}/{u.ai_limit === -1 ? "\u221e" : u.ai_limit === 0 ? "0" : u.ai_limit}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{formatDate(u.created_at)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
                <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{data?.total || 0} users</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
                  </button>
                  <span className="text-xs px-2" style={{ color: "var(--cm-text)" }}>{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
            <Clock className="w-4 h-4 text-teal-500" /> Recent Changes
          </h3>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="sub-audit-log">
            {logs.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--cm-text-3)" }} />
                <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>No subscription changes yet</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--cm-text-4)" }}>Changes will appear here when plans are modified</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--cm-border)" }}>
                {logs.map((log) => {
                  const isUpgrade = ["basic", "pro"].indexOf(log.old_plan) < ["basic", "pro"].indexOf(log.new_plan) ||
                    (log.old_plan === "basic" && log.new_plan !== "basic") ||
                    (log.old_plan === "pro" && log.new_plan === "premium");

                  return (
                    <div key={log.log_id} className="px-4 py-3" data-testid={`sub-log-${log.log_id}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isUpgrade ? "bg-teal-600/15" : "bg-amber-500/15"}`}>
                          {isUpgrade ? <ArrowUpRight className="w-3.5 h-3.5 text-teal-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--cm-text)" }}>
                            {log.user_name || log.user_email}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                            <span className={PLAN_BADGE[log.old_plan]?.bg.split(" ")[1] || "text-zinc-400"}>{log.old_plan}</span>
                            {" -> "}
                            <span className={PLAN_BADGE[log.new_plan]?.bg.split(" ")[1] || "text-zinc-400"}>{log.new_plan}</span>
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-4)" }}>
                            {formatTime(log.created_at)} {log.reason ? ` | ${log.reason}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
