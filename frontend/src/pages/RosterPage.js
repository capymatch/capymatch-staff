import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import {
  AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, UserPlus, FileText, TrendingUp, TrendingDown, Minus,
  Search, LayoutGrid, UserCircle, GraduationCap,
  ArrowRightLeft, Sparkles, Bell, CheckSquare, Square, X,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Warning label shortener ── */

const WARNING_MAP = [
  { match: /gone dark|inactive|no activity/i, tag: "Inactive" },
  { match: /missing|transcript|document|blocks/i, tag: "Missing Docs" },
  { match: /no one owns|unassigned|ownership/i, tag: "No Owner" },
  { match: /follow.?up overdue/i, tag: "Follow-Up" },
  { match: /momentum|declining/i, tag: "Momentum Drop" },
  { match: /early warning/i, tag: "At Risk" },
  { match: /no prep|readiness/i, tag: "Unprepped" },
  { match: /engagement/i, tag: "Disengaged" },
];

function shortenWarning(text) {
  if (!text) return "";
  for (const rule of WARNING_MAP) {
    if (rule.match.test(text)) return rule.tag;
  }
  const parts = text.split(" \u2014 ");
  return parts.length > 1 ? parts[parts.length - 1] : text.slice(0, 24);
}

/* ── Reassign Modal ── */

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
      toast.success(`${athlete.name} reassigned to ${res.data.to_coach}`);
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

/* ── Mini Pipeline ── */

const PIPELINE = [
  { key: "prospect", label: "Prospect" },
  { key: "contacted", label: "Contacted" },
  { key: "responded", label: "Responded" },
  { key: "talking", label: "Talking" },
  { key: "visit", label: "Visit" },
  { key: "offer", label: "Offer" },
  { key: "committed", label: "Committed" },
];

const STAGE_COLOR = {
  prospect: "bg-slate-300",
  contacted: "bg-blue-500",
  responded: "bg-cyan-500",
  talking: "bg-violet-500",
  visit: "bg-amber-500",
  offer: "bg-orange-500",
  committed: "bg-emerald-500",
};

function MiniPipeline({ stage }) {
  const activeIdx = PIPELINE.findIndex((p) => p.key === stage);
  return (
    <div className="flex items-center gap-0.5" data-testid="mini-pipeline">
      {PIPELINE.map((p, idx) => {
        const isActive = idx === activeIdx;
        const isPast = idx < activeIdx;
        const color = isActive ? STAGE_COLOR[p.key] : isPast ? "bg-slate-300" : "bg-slate-100";
        return (
          <div key={p.key} className="relative group/pip">
            <div className={`h-1.5 rounded-full transition-all ${isActive ? "w-5" : "w-2.5"} ${color}`} />
            {isActive && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 whitespace-nowrap">
                {p.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Momentum label ── */

const MOM_CFG = {
  strong: { text: "Strong", cls: "text-emerald-700", dotCls: "bg-emerald-500", icon: TrendingUp },
  stable: { text: "Stable", cls: "text-amber-600", dotCls: "bg-amber-400", icon: Minus },
  declining: { text: "Declining", cls: "text-red-600", dotCls: "bg-red-500", icon: TrendingDown },
};

function MomentumLabel({ label }) {
  const c = MOM_CFG[label] || MOM_CFG.stable;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${c.cls}`} data-testid="momentum-label">
      <Icon className="w-3 h-3" />{c.text}
    </span>
  );
}

/* ── Athlete Row (new layout) ── */

function AthleteRow({ athlete, onReassign, navigate, selected, onToggle }) {
  const hasRisk = athlete.risk_alerts && athlete.risk_alerts.length > 0;
  const rowBorder = hasRisk
    ? athlete.risk_level === "critical" ? "border-l-2 border-l-red-400" : "border-l-2 border-l-amber-400"
    : "border-l-2 border-l-transparent";

  return (
    <div className={`group ${rowBorder} transition-colors hover:bg-slate-50/70`} data-testid={`roster-athlete-${athlete.id}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button onClick={(e) => { e.stopPropagation(); onToggle(athlete.id); }}
          className="mt-1 shrink-0 text-slate-300 hover:text-slate-500 transition-colors" data-testid={`select-${athlete.id}`}>
          {selected ? <CheckSquare className="w-4 h-4 text-slate-700" /> : <Square className="w-4 h-4" />}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-slate-500">
            {athlete.name?.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name */}
          <p className="text-sm font-semibold text-gray-900 leading-snug">{athlete.name}</p>

          {/* Line 2: Position • Grad Year */}
          <p className="text-[11px] text-slate-400 mt-0.5">
            {athlete.position || "No position"} <span className="mx-1">&middot;</span> {athlete.grad_year || "—"}
          </p>

          {/* Line 3: Momentum | Pipeline */}
          <div className="flex items-center gap-3 mt-1.5">
            <MomentumLabel label={athlete.momentum_label} />
            <span className="text-slate-200">|</span>
            <MiniPipeline stage={athlete.recruiting_stage} />
          </div>

          {/* Line 4: Coach • Last Activity */}
          <p className="text-[11px] text-slate-400 mt-1">
            {athlete.coach_name || "Unassigned"} <span className="mx-1">&middot;</span> Last activity{" "}
            {athlete.days_since_activity == null ? "none" :
              athlete.days_since_activity === 0 ? "today" : `${athlete.days_since_activity}d ago`}
          </p>

          {/* Warnings below */}
          {hasRisk && (
            <div className="flex items-center gap-1.5 mt-1.5" data-testid="inline-warnings">
              {athlete.risk_alerts.slice(0, 3).map((alert, i) => {
                const isRed = alert.badge_color === "red";
                return (
                  <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isRed ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"}`}>
                    <AlertTriangle className="w-2.5 h-2.5" />{shortenWarning(alert.why)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}

/* ── Group Card ── */

function GroupCard({ title, subtitle, count, athletes, coaches, onReload, navigate, icon: Icon, accentClass, selectedIds, onToggle, defaultExpanded = true }) {
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
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {athletes.map((a) => (
            <AthleteRow key={a.id} athlete={a} onReassign={setReassignTarget} navigate={navigate}
              selected={selectedIds.has(a.id)} onToggle={onToggle} />
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

/* ── Bulk Action Bar ── */

function BulkActionBar({ count, onClear, onAssign, onReminder, onNote }) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-30 bg-slate-900 text-white rounded-xl px-5 py-3 mb-4 flex items-center justify-between shadow-lg" data-testid="bulk-action-bar">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{count} selected</span>
        <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAssign} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" data-testid="bulk-assign">
          <UserPlus className="w-3 h-3" />Assign Coach
        </button>
        <button onClick={onReminder} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" data-testid="bulk-reminder">
          <Bell className="w-3 h-3" />Send Reminder
        </button>
        <button onClick={onNote} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" data-testid="bulk-note">
          <FileText className="w-3 h-3" />Add Note
        </button>
      </div>
    </div>
  );
}

/* ── AI Roster Insights ── */

function RosterInsights({ athletes }) {
  const insights = useMemo(() => {
    if (!athletes || athletes.length === 0) return [];
    const items = [];
    const strongInterest = athletes.filter((a) => a.recruiting_stage === "offer" || a.recruiting_stage === "visit").length;
    if (strongInterest > 0) items.push({ text: `${strongInterest} athlete${strongInterest > 1 ? "s" : ""} have strong recruiting interest`, type: "positive" });
    const declining = athletes.filter((a) => a.momentum_label === "declining").length;
    if (declining > 0) items.push({ text: `${declining} athlete${declining > 1 ? "s" : ""} risk losing recruiting momentum`, type: "warning" });
    const missingDocs = athletes.filter((a) => (a.risk_alerts || []).some((r) => /missing|transcript|document|blocks/i.test(r.why))).length;
    if (missingDocs > 0) items.push({ text: `${missingDocs} athlete${missingDocs > 1 ? "s" : ""} missing required documents`, type: "danger" });
    const noOwner = athletes.filter((a) => a.unassigned || (a.risk_alerts || []).some((r) => /no one owns|ownership/i.test(r.why))).length;
    if (noOwner > 0) items.push({ text: `${noOwner} athlete${noOwner > 1 ? "s" : ""} without coach ownership`, type: "warning" });
    const inactive = athletes.filter((a) => (a.days_since_activity || 0) > 14).length;
    if (inactive > 0) items.push({ text: `${inactive} athlete${inactive > 1 ? "s" : ""} inactive for 2+ weeks`, type: "danger" });
    return items.slice(0, 4);
  }, [athletes]);

  if (insights.length === 0) return null;
  const colorMap = { positive: "text-emerald-600", warning: "text-amber-600", danger: "text-red-500" };
  const dotMap = { positive: "bg-emerald-500", warning: "bg-amber-400", danger: "bg-red-500" };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-6" data-testid="roster-insights">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roster Insights</span>
      </div>
      <ul className="space-y-1.5">
        {insights.map((item, i) => (
          <li key={i} className={`flex items-center gap-2 text-[13px] ${colorMap[item.type] || "text-slate-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotMap[item.type] || "bg-slate-400"}`} />
            {item.text}
          </li>
        ))}
      </ul>
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
  const [selectedIds, setSelectedIds] = useState(new Set());

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

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filterAthletes = (athletes) => {
    if (!search) return athletes;
    const q = search.toLowerCase();
    return athletes.filter((a) =>
      a.name?.toLowerCase().includes(q) || a.position?.toLowerCase().includes(q) || a.team?.toLowerCase().includes(q)
    );
  };

  const renderGroups = (groups, iconKey, accentClass) => (
    <div className="space-y-3">
      {groups.map((g) => {
        const filtered = filterAthletes(g.athletes);
        if (search && filtered.length === 0) return null;
        return (
          <GroupCard key={g.key} title={g.title} subtitle={g.subtitle}
            count={filtered.length} athletes={filtered} coaches={coaches}
            onReload={fetchRoster} navigate={navigate}
            icon={iconKey} accentClass={accentClass}
            selectedIds={selectedIds} onToggle={toggleSelect} />
        );
      })}
    </div>
  );

  const teamGroups = useMemo(() => {
    if (!data) return [];
    return (data.teamGroups || []).map((tg) => {
      const coachNames = [...new Set(tg.athletes.map((a) => a.coach_name).filter(Boolean))];
      return { key: tg.team, title: tg.team, subtitle: coachNames.join(", "), athletes: tg.athletes };
    });
  }, [data]);

  const coachGroups = useMemo(() => {
    if (!data) return [];
    return (data.groups || []).map((g) => ({
      key: g.coach_id || "unassigned", title: g.coach_name, subtitle: g.coach_email, athletes: g.athletes,
    }));
  }, [data]);

  const ageGroups = useMemo(() => {
    if (!data) return [];
    return (data.ageGroups || []).map((ag) => ({
      key: ag.label, title: ag.label, subtitle: null, athletes: ag.athletes,
    }));
  }, [data]);

  const handleBulkAction = (action) => {
    toast.info(`${action} for ${selectedIds.size} athlete(s) — coming soon`);
    setSelectedIds(new Set());
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
          {/* Bulk Action Bar */}
          <BulkActionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}
            onAssign={() => handleBulkAction("Assign Coach")}
            onReminder={() => handleBulkAction("Send Reminder")}
            onNote={() => handleBulkAction("Add Note")} />

          {/* AI Roster Insights */}
          <RosterInsights athletes={data?.athletes} />

          {/* View Content */}
          {view === "team" && renderGroups(teamGroups, LayoutGrid, "bg-slate-100")}
          {view === "coach" && renderGroups(coachGroups, UserCircle, "bg-slate-100")}
          {view === "age" && renderGroups(ageGroups, GraduationCap, "bg-violet-50")}
        </>
      )}
    </div>
  );
}

export default RosterPage;
