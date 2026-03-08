import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import {
  Users, UserMinus, ArrowRightLeft, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, UserPlus, FileText, Zap, TrendingUp, TrendingDown, Minus,
  Search, LayoutGrid, UserCircle, GraduationCap,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Modals ── */

function ReassignModal({ athlete, coaches, currentCoachId, onClose, onConfirm }) {
  const [selectedCoach, setSelectedCoach] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const availableCoaches = coaches.filter((c) => c.id !== currentCoachId);

  const handleSubmit = async () => {
    if (!selectedCoach) { toast.error("Select a coach"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/athletes/${athlete.id}/reassign`, {
        new_coach_id: selectedCoach, reason: reason || null,
      });
      const w = res.data.open_actions_warning || [];
      if (w.length > 0) toast.warning(`Reassigned — ${w.length} open action(s) still with previous coach`, { duration: 6000 });
      else toast.success(`${athlete.name} reassigned to ${res.data.to_coach}`);
      onConfirm(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reassign");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} data-testid="reassign-modal">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Reassign {athlete.name}</h3>
        <p className="text-xs text-gray-500 mb-4">Select the new coach below.</p>
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">New Coach</label>
        <select value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white mb-3" data-testid="reassign-coach-select">
          <option value="">Select coach...</option>
          {availableCoaches.map((c) => <option key={c.id} value={c.id}>{c.name}{c.team ? ` · ${c.team}` : ""}</option>)}
        </select>
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reason (optional)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. balancing workload"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 mb-4" data-testid="reassign-reason-input" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700" data-testid="reassign-cancel-btn">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !selectedCoach}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50" data-testid="reassign-confirm-btn">
            <ArrowRightLeft className="w-3 h-3" />{submitting ? "Reassigning..." : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Momentum badge ── */

function MomentumBadge({ label, score }) {
  if (!label) return null;
  const cfg = {
    strong: { text: "Strong", cls: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200", icon: TrendingUp },
    stable: { text: "Stable", cls: "text-slate-600 bg-slate-50 ring-1 ring-slate-200", icon: Minus },
    declining: { text: "Declining", cls: "text-red-600 bg-red-50 ring-1 ring-red-200", icon: TrendingDown },
  };
  const c = cfg[label] || cfg.stable;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.cls}`} data-testid="momentum-badge">
      <Icon className="w-3 h-3" />{c.text}
    </span>
  );
}

/* ── Activity label ── */

function ActivityLabel({ days }) {
  if (days == null) return <span className="text-slate-400">No activity</span>;
  if (days === 0) return <span className="text-emerald-600 font-medium">Active today</span>;
  if (days <= 3) return <span className="text-slate-500">{days}d ago</span>;
  if (days <= 7) return <span className="text-amber-500">{days}d ago</span>;
  return <span className="text-red-500 font-medium">{days}d ago</span>;
}

/* ── Stage badge (7-stage pipeline) ── */

const STAGE_ORDER = ["prospect", "contacted", "responded", "talking", "visit", "offer", "committed"];

function StageBadge({ stage }) {
  if (!stage) return null;
  const map = {
    prospect: { label: "Prospect", cls: "text-slate-500 bg-slate-50", dot: "bg-slate-400" },
    contacted: { label: "Contacted", cls: "text-blue-600 bg-blue-50", dot: "bg-blue-500" },
    responded: { label: "Responded", cls: "text-cyan-600 bg-cyan-50", dot: "bg-cyan-500" },
    talking: { label: "Talking", cls: "text-violet-600 bg-violet-50", dot: "bg-violet-500" },
    visit: { label: "Visit", cls: "text-amber-600 bg-amber-50", dot: "bg-amber-500" },
    offer: { label: "Offer", cls: "text-orange-600 bg-orange-50", dot: "bg-orange-500" },
    committed: { label: "Committed", cls: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  };
  const cfg = map[stage] || { label: stage, cls: "text-slate-500 bg-slate-50", dot: "bg-slate-400" };
  const idx = STAGE_ORDER.indexOf(stage);
  const progress = idx >= 0 ? ((idx + 1) / STAGE_ORDER.length) * 100 : 0;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`} data-testid="stage-badge">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {/* Mini progress bar */}
      <span className="w-8 h-1 rounded-full bg-slate-200 overflow-hidden ml-0.5">
        <span className={`block h-full rounded-full ${cfg.dot}`} style={{ width: `${progress}%` }} />
      </span>
    </span>
  );
}

/* ── Inline risk alert ── */

function RiskAlert({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  const primary = alerts[0];
  const parts = (primary.why || "").split(" \u2014 ");
  const shortLabel = parts.length > 1 ? parts[parts.length - 1] : primary.why;
  const isRed = primary.badge_color === "red";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isRed ? "text-red-600 bg-red-50 ring-1 ring-red-200" : "text-amber-600 bg-amber-50 ring-1 ring-amber-200"}`} data-testid="risk-alert">
      <AlertTriangle className="w-3 h-3" />
      {shortLabel}
      {alerts.length > 1 && <span className="text-[9px] opacity-70">+{alerts.length - 1}</span>}
    </span>
  );
}

/* ── Athlete Row ── */

function AthleteRow({ athlete, onReassign, navigate }) {
  const hasRisk = athlete.risk_alerts && athlete.risk_alerts.length > 0;
  const rowBg = hasRisk
    ? athlete.risk_level === "critical" ? "bg-red-50/30 hover:bg-red-50/50" : "bg-amber-50/20 hover:bg-amber-50/40"
    : "hover:bg-slate-50/60";

  return (
    <div className={`group flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 transition-colors ${rowBg}`} data-testid={`roster-athlete-${athlete.id}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-slate-500">
            {athlete.name?.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{athlete.name}</span>
            <MomentumBadge label={athlete.momentum_label} score={athlete.momentum_score} />
            <StageBadge stage={athlete.recruiting_stage} />
            <RiskAlert alerts={athlete.risk_alerts} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
            {athlete.position && <span>{athlete.position}</span>}
            {athlete.grad_year && <span>'{String(athlete.grad_year).slice(-2)}</span>}
            {athlete.coach_name && <span>{athlete.coach_name}</span>}
            <ActivityLabel days={athlete.days_since_activity} />
          </div>
        </div>
      </div>
      {/* Quick actions — visible on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/support-pods/${athlete.id}`); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors" data-testid={`open-profile-${athlete.id}`}>
          <ExternalLink className="w-3 h-3" />Open
        </button>
        <button onClick={(e) => { e.stopPropagation(); onReassign(athlete); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors" data-testid={`reassign-btn-${athlete.id}`}>
          <UserPlus className="w-3 h-3" />Assign
        </button>
        <button onClick={(e) => { e.stopPropagation(); navigate(`/support-pods/${athlete.id}`); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors" data-testid={`notes-btn-${athlete.id}`}>
          <FileText className="w-3 h-3" />Notes
        </button>
      </div>
    </div>
  );
}

/* ── Group Card (used by all 3 views) ── */

function GroupCard({ title, subtitle, count, athletes, coaches, onReload, navigate, icon: Icon, accentClass, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [reassignTarget, setReassignTarget] = useState(null);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm" data-testid={`group-card-${title.replace(/\s/g, "-").toLowerCase()}`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClass || "bg-slate-100"}`}>
              <Icon className="w-3.5 h-3.5 text-slate-600" />
            </div>
          )}
          <div className="text-left">
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            {subtitle && <span className="text-xs text-slate-400 ml-2">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {count} athlete{count !== 1 ? "s" : ""}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && athletes.length > 0 && (
        <div className="border-t border-gray-100">
          {athletes.map((a) => (
            <AthleteRow key={a.id} athlete={a} onReassign={setReassignTarget} navigate={navigate} />
          ))}
        </div>
      )}
      {expanded && athletes.length === 0 && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400 text-center">No athletes</p>
        </div>
      )}
      {reassignTarget && (
        <ReassignModal athlete={reassignTarget} coaches={coaches} currentCoachId={reassignTarget.coach_id}
          onClose={() => setReassignTarget(null)} onConfirm={() => { setReassignTarget(null); onReload(); }} />
      )}
    </div>
  );
}

/* ── Needs Attention Banner ── */

function NeedsAttentionBanner({ items, navigate }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, 3);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden mb-6" data-testid="roster-needs-attention">
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Needs Attention</span>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{items.length}</span>
        </div>
        {items.length > 3 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-amber-600 hover:text-amber-800">
            {expanded ? "Show less" : `Show all ${items.length}`}
          </button>
        )}
      </div>
      <div className="divide-y divide-amber-100">
        {shown.map((item) => {
          const primaryAlert = item.alerts?.[0];
          const why = primaryAlert?.why || "";
          return (
            <div key={item.athlete_id} className="flex items-center justify-between px-5 py-2.5 hover:bg-amber-100/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/support-pods/${item.athlete_id}`)} data-testid={`attention-${item.athlete_id}`}>
              <div className="min-w-0">
                <span className="text-sm font-medium text-amber-900">{item.athlete_name}</span>
                <span className="text-xs text-amber-600 ml-2">{why}</span>
              </div>
              <span className={`shrink-0 w-2 h-2 rounded-full ${item.risk_level === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── View Tabs ── */

const VIEWS = [
  { key: "team", label: "Team View", icon: LayoutGrid },
  { key: "coach", label: "Coach View", icon: UserCircle },
  { key: "age", label: "Age Group", icon: GraduationCap },
];

function ViewSwitcher({ active, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5" data-testid="view-switcher">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const isActive = active === v.key;
        return (
          <button key={v.key} onClick={() => onChange(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            data-testid={`view-tab-${v.key}`}>
            <Icon className="w-3.5 h-3.5" />{v.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Search ── */

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search athletes..."
        className="w-56 pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-slate-300 focus:outline-none" data-testid="roster-search" />
    </div>
  );
}

/* ── Main Page ── */

function RosterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [view, setView] = useState("team");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.role !== "director") navigate("/mission-control");
  }, [user, navigate]);

  const fetchRoster = useCallback(async () => {
    try {
      const [rosterRes, coachesRes] = await Promise.all([
        axios.get(`${API}/roster`),
        axios.get(`${API}/roster/coaches`),
      ]);
      setData(rosterRes.data);
      setCoaches(coachesRes.data);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  const filterAthletes = (athletes) => {
    if (!search) return athletes;
    const q = search.toLowerCase();
    return athletes.filter((a) =>
      a.name?.toLowerCase().includes(q) || a.position?.toLowerCase().includes(q) || a.team?.toLowerCase().includes(q)
    );
  };

  const renderTeamView = () => {
    const teams = data.teamGroups || [];
    return (
      <div className="space-y-3">
        {teams.map((tg) => {
          const filtered = filterAthletes(tg.athletes);
          if (search && filtered.length === 0) return null;
          const coachNames = [...new Set(filtered.map((a) => a.coach_name).filter(Boolean))];
          return (
            <GroupCard key={tg.team} title={tg.team} subtitle={coachNames.length > 0 ? coachNames.join(", ") : undefined}
              count={filtered.length} athletes={filtered} coaches={coaches} onReload={fetchRoster} navigate={navigate}
              icon={LayoutGrid} accentClass="bg-slate-100" />
          );
        })}
      </div>
    );
  };

  const renderCoachView = () => {
    const groups = data.groups || [];
    return (
      <div className="space-y-3">
        {groups.map((g) => {
          const filtered = filterAthletes(g.athletes);
          if (search && filtered.length === 0) return null;
          const isUnassigned = g.coach_id === null;
          return (
            <GroupCard key={g.coach_id || "unassigned"} title={g.coach_name}
              subtitle={g.coach_email} count={filtered.length} athletes={filtered}
              coaches={coaches} onReload={fetchRoster} navigate={navigate}
              icon={isUnassigned ? AlertTriangle : UserCircle}
              accentClass={isUnassigned ? "bg-amber-50" : "bg-slate-100"} />
          );
        })}
      </div>
    );
  };

  const renderAgeView = () => {
    const groups = data.ageGroups || [];
    return (
      <div className="space-y-3">
        {groups.map((ag) => {
          const filtered = filterAthletes(ag.athletes);
          if (search && filtered.length === 0) return null;
          return (
            <GroupCard key={ag.label} title={ag.label} count={filtered.length}
              athletes={filtered} coaches={coaches} onReload={fetchRoster} navigate={navigate}
              icon={GraduationCap} accentClass="bg-violet-50" />
          );
        })}
      </div>
    );
  };

  return (
    <div data-testid="roster-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="roster-title">Roster</h1>
          {data?.summary && (
            <p className="text-xs text-slate-400 mt-0.5">
              {data.summary.total_athletes} athletes · {data.summary.teams} teams · {data.summary.coach_count} coaches
              {data.summary.unassigned > 0 && <span className="text-amber-600 ml-1">· {data.summary.unassigned} unassigned</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} />
          <ViewSwitcher active={view} onChange={setView} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : (
        <>
          {/* Needs Attention Banner */}
          <NeedsAttentionBanner items={data?.needsAttention} navigate={navigate} />

          {/* View Content */}
          {view === "team" && renderTeamView()}
          {view === "coach" && renderCoachView()}
          {view === "age" && renderAgeView()}
        </>
      )}
    </div>
  );
}

export default RosterPage;
