import { useState, useEffect } from "react";
import axios from "axios";
import {
  X, Loader2, TrendingUp, TrendingDown, Minus, School,
  MessageCircle, Clock, AlertTriangle, ChevronDown, ChevronRight,
  Mail, Phone, Send, FileText, MapPin, Trophy, Users, Zap,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOMENTUM_ICON = { rising: TrendingUp, declining: TrendingDown, stable: Minus };
const MOMENTUM_COLOR = { strong: "#10b981", steady: "#8A92A3", declining: "#ef4444" };
const MOMENTUM_LABEL = { strong: "Strong", steady: "Steady", declining: "Declining" };

const STAGE_COLOR = {
  added: "#64748b",
  outreach: "#3b82f6",
  in_conversation: "#0d9488",
  campus_visit: "#8b5cf6",
  offer: "#f59e0b",
  committed: "#10b981",
};

const PULSE_DOT = { hot: "bg-emerald-500", warm: "bg-amber-400", cold: "bg-slate-500" };

const RISK_LABEL = {
  overdue_followup: "Overdue",
  no_response: "No Reply",
  stale: "Stale",
};

const ACTIVITY_ICON = {
  "Email Sent": Mail,
  "Email Received": Mail,
  "Phone Call": Phone,
  "Campus Visit": MapPin,
  "Profile Sent": Send,
  "Note": FileText,
};

function StatCard({ value, label, color, warning }) {
  return (
    <div className="flex-1 min-w-0 p-3 rounded-xl text-center" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <p className="text-lg font-bold" style={{ color: warning ? "#ef4444" : color || "var(--cm-text)" }}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--cm-text-3)" }}>{label}</p>
    </div>
  );
}

function StageBar({ distribution }) {
  const total = distribution.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="flex rounded-lg overflow-hidden h-2.5 w-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      {distribution.filter(d => d.count > 0).map(d => (
        <div key={d.stage} title={`${d.label}: ${d.count}`}
          style={{ width: `${(d.count / total) * 100}%`, backgroundColor: STAGE_COLOR[d.stage] || "#64748b", minWidth: d.count > 0 ? "8px" : 0 }}
          className="transition-all" />
      ))}
    </div>
  );
}

function SchoolRow({ school }) {
  const pulseClass = PULSE_DOT[school.pulse] || "bg-slate-600";
  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group" data-testid={`school-row-${school.program_id}`}>
      {school.logo_url ? (
        <img src={school.logo_url} alt="" className="w-7 h-7 rounded-md object-contain flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }} />
      ) : (
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <School className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${pulseClass} flex-shrink-0`} />
          <span className="text-xs font-semibold truncate" style={{ color: "var(--cm-text)" }}>{school.university_name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {school.division && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{school.division}</span>}
          {school.reply_status && (
            <span className="text-[10px] font-medium" style={{ color: school.reply_status === "Reply Received" || school.reply_status === "Positive" ? "#10b981" : "var(--cm-text-3)" }}>
              {school.reply_status}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {school.risks.map(r => (
          <span key={r} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: r === "overdue_followup" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: r === "overdue_followup" ? "#ef4444" : "#f59e0b" }}>
            {RISK_LABEL[r] || r}
          </span>
        ))}
        {school.next_action && (
          <span className="text-[10px] hidden group-hover:block" style={{ color: "var(--cm-text-3)" }}>{school.next_action}</span>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const Icon = ACTIVITY_ICON[item.type] || FileText;
  const d = item.date ? new Date(item.date) : null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <Icon className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{item.type}</span>
          {item.university_name && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{item.university_name}</span>}
        </div>
        {item.notes && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--cm-text-3)" }}>{item.notes}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        {item.outcome && (
          <span className="text-[10px] font-medium" style={{ color: item.outcome === "Positive" ? "#10b981" : item.outcome === "No Response" ? "#f59e0b" : "var(--cm-text-3)" }}>
            {item.outcome}
          </span>
        )}
        {d && <p className="text-[9px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
      </div>
    </div>
  );
}


export default function AthletePipelinePanel({ athleteId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);

  useEffect(() => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    axios.get(`${API}/roster/athlete/${athleteId}/pipeline`)
      .then(res => {
        setData(res.data);
        // Auto-expand first non-empty stage
        const first = res.data?.schools?.[0];
        if (first) setExpandedStage(first.stage);
      })
      .catch(err => setError(err.response?.data?.detail || "Failed to load pipeline"))
      .finally(() => setLoading(false));
  }, [athleteId]);

  if (!athleteId) return null;

  const MomIcon = data ? (MOMENTUM_ICON[data.header?.momentum_trend] || Minus) : Minus;
  const momColor = MOMENTUM_COLOR[data?.momentum_assessment] || "#8A92A3";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="pipeline-panel-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full overflow-y-auto"
        style={{ backgroundColor: "var(--cm-bg)", borderLeft: "1px solid var(--cm-border)" }}
        data-testid="pipeline-panel">

        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--cm-bg)", borderBottom: "1px solid var(--cm-border)" }}>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Pipeline Summary</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" data-testid="close-pipeline-panel">
            <X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <div className="p-5 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Athlete Header */}
            <div className="flex items-center gap-3" data-testid="pipeline-athlete-header">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                {data.header.photo_url ? (
                  <img src={data.header.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <Users className="w-5 h-5" style={{ color: "var(--cm-text-3)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold truncate" style={{ color: "var(--cm-text)" }}>{data.header.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: "var(--cm-text-3)" }}>
                    {data.header.position} · {data.header.grad_year} · {data.header.team}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${momColor}15` }}>
                <MomIcon className="w-3.5 h-3.5" style={{ color: momColor }} />
                <span className="text-[10px] font-bold" style={{ color: momColor }}>
                  {MOMENTUM_LABEL[data.momentum_assessment] || "Steady"}
                </span>
              </div>
            </div>

            {/* Summary Row */}
            <div className="flex gap-2" data-testid="pipeline-summary-row">
              <StatCard value={data.summary.total_schools} label="Schools" color="#0d9488" />
              <StatCard value={`${data.summary.response_rate}%`} label="Response" color="#3b82f6" />
              <StatCard value={data.summary.active_conversations} label="Talking" color="#8b5cf6" />
              <StatCard value={data.summary.overdue_followups} label="Overdue" warning={data.summary.overdue_followups > 0} />
            </div>

            {/* Stage Distribution Bar */}
            <div data-testid="pipeline-stage-bar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Pipeline Stages</span>
                <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{data.summary.total_schools} schools</span>
              </div>
              <StageBar distribution={data.stage_distribution} />
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {data.stage_distribution.filter(d => d.count > 0).map(d => (
                  <div key={d.stage} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: STAGE_COLOR[d.stage] }} />
                    <span className="text-[9px] font-medium" style={{ color: "var(--cm-text-3)" }}>{d.label} ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schools Grouped by Stage */}
            <div data-testid="pipeline-schools-list">
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>Schools by Stage</span>
              <div className="space-y-1">
                {data.schools.map(group => {
                  const isExpanded = expandedStage === group.stage;
                  return (
                    <div key={group.stage} className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--cm-border)" }}>
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : group.stage)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/3"
                        style={{ backgroundColor: "var(--cm-surface)" }}
                        data-testid={`stage-toggle-${group.stage}`}>
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: STAGE_COLOR[group.stage] }} />
                        <span className="text-xs font-semibold flex-1 text-left" style={{ color: "var(--cm-text)" }}>
                          {group.label}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
                          {group.schools.length}
                        </span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
                          {group.schools.map(s => <SchoolRow key={s.program_id} school={s} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            {data.recent_activity.length > 0 && (
              <div data-testid="pipeline-recent-activity">
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>Recent Activity</span>
                <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
                  {data.recent_activity.slice(0, 5).map((item, i) => (
                    <div key={i}>
                      {i > 0 && <div className="my-0.5" style={{ borderTop: "1px solid var(--cm-border)" }} />}
                      <ActivityItem item={item} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Days since activity warning */}
            {data.header.days_since_activity > 14 && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                data-testid="pipeline-inactivity-warning">
                <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">
                  No activity in {data.header.days_since_activity} days
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
