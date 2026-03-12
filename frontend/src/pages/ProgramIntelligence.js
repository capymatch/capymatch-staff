import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, Users, Calendar, Megaphone, ExternalLink,
  TrendingDown, TrendingUp, Minus, Clock, UserX, ChevronRight, User,
  BarChart3,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Shared Styles ───────────────────────────────────────────────────────────

const card = "rounded-xl border overflow-hidden";
const cardStyle = { backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" };
const sectionLabel = "text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5";
const subText = { color: "var(--cm-text-3)" };
const primaryText = { color: "var(--cm-text)" };
const secondaryText = { color: "var(--cm-text-2)" };

// ─── Trends ──────────────────────────────────────────────────────────────────

const TREND_STYLE = {
  improving: { color: "#10b981", bg: "rgba(16,185,129,0.06)", icon: TrendingUp, arrow: "+" },
  declining: { color: "#ef4444", bg: "rgba(239,68,68,0.06)", icon: TrendingDown, arrow: "" },
  stable: { color: "#6b7280", bg: "rgba(107,114,128,0.06)", icon: Minus, arrow: "" },
  baseline: { color: "#3b82f6", bg: "rgba(59,130,246,0.06)", icon: Minus, arrow: "" },
  current: { color: "#3b82f6", bg: "rgba(59,130,246,0.06)", icon: User, arrow: "" },
};

function TrendCard({ trend }) {
  const style = TREND_STYLE[trend.direction] || TREND_STYLE.stable;
  const Icon = style.icon;
  return (
    <div className="flex-1 min-w-[160px] rounded-xl p-3.5 border" style={{ backgroundColor: style.bg, borderColor: "var(--cm-border)" }} data-testid={`trend-${trend.key}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={subText}>{trend.label}</span>
        <Icon className="w-3.5 h-3.5" style={{ color: style.color }} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-xl font-bold" style={primaryText}>{trend.current}</span>
        <span className="text-xs" style={subText}>{trend.suffix}</span>
        {trend.delta !== 0 && (
          <span className="text-xs font-semibold" style={{ color: style.color }}>
            {style.arrow}{trend.delta > 0 ? "+" : ""}{trend.delta}
          </span>
        )}
      </div>
      <p className="text-[11px] leading-snug" style={subText}>{trend.interpretation}</p>
    </div>
  );
}

function ProgramTrends({ trends, viewMode }) {
  if (!trends || trends.length === 0) return null;
  const isCoach = viewMode === "club_coach";
  return (
    <section className="mb-2" data-testid="section-trends">
      <h2 className={sectionLabel} style={subText}>
        {isCoach ? <User className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
        {isCoach ? "My Stats" : "Key Metrics"}
      </h2>
      <div className="flex flex-wrap gap-3 mt-3">{trends.map(t => <TrendCard key={t.key} trend={t} />)}</div>
    </section>
  );
}

// ─── Program Health ──────────────────────────────────────────────────────────

function ProgramHealth({ data }) {
  const { pod_health, open_issues, intervention_total, highest_risk_cluster } = data;
  const total = pod_health.healthy + pod_health.needs_attention + pod_health.at_risk;
  const hPct = total > 0 ? (pod_health.healthy / total) * 100 : 0;
  const nPct = total > 0 ? (pod_health.needs_attention / total) * 100 : 0;
  const rPct = total > 0 ? (pod_health.at_risk / total) * 100 : 0;

  return (
    <section className={`${card} p-5`} style={cardStyle} data-testid="section-program-health">
      <h2 className={`${sectionLabel} mb-4`} style={subText}><Shield className="w-3.5 h-3.5" /> Program Health</h2>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><strong style={primaryText}>{pod_health.healthy}</strong> <span className="text-xs" style={subText}>Healthy</span></span>
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><strong style={primaryText}>{pod_health.needs_attention}</strong> <span className="text-xs" style={subText}>Needs Attention</span></span>
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><strong style={primaryText}>{pod_health.at_risk}</strong> <span className="text-xs" style={subText}>At Risk</span></span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden flex mb-4" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="health-bar">
        <div className="bg-emerald-500 transition-all" style={{ width: `${hPct}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${nPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${rPct}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-3" style={subText}>
        <span><strong style={secondaryText}>{open_issues.blockers}</strong> Blockers</span>
        <span><strong style={secondaryText}>{open_issues.momentum_drops}</strong> Momentum Drops</span>
        <span><strong style={secondaryText}>{open_issues.event_follow_ups}</strong> Event Follow-ups</span>
        <span><strong style={secondaryText}>{open_issues.engagement_drops}</strong> Engagement Drops</span>
        <span style={{ color: "var(--cm-border)" }}>&middot;</span>
        <span>{intervention_total} total interventions</span>
      </div>
      {highest_risk_cluster && (
        <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="risk-callout">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "#d97706" }}>
            <strong>Attention:</strong> {highest_risk_cluster.value} grad year — {highest_risk_cluster.reason}
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Readiness by Grad Year ──────────────────────────────────────────────────

function ReadinessMatrix({ data, navigate }) {
  const { by_grad_year, stalled_athletes } = data;
  return (
    <section className={`${card} p-5`} style={cardStyle} data-testid="section-readiness">
      <h2 className={`${sectionLabel} mb-4`} style={subText}><Users className="w-3.5 h-3.5" /> Pipeline Health by Grad Year</h2>
      <div className="space-y-3 mb-5">
        {by_grad_year.map(gy => (
          <div key={gy.grad_year} className="rounded-lg p-3" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid={`readiness-${gy.grad_year}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div><span className="text-sm font-semibold" style={primaryText}>{gy.grad_year}</span>{gy.team && <span className="text-xs ml-2" style={subText}>{gy.team}</span>}</div>
              <span className="text-xs" style={subText}>{gy.on_track_pct}% on track</span>
            </div>
            <div className="flex items-center gap-3 text-xs mb-2" style={subText}>
              <span>{gy.total_athletes} athletes</span>
              <span>{gy.actively_recruiting} actively recruiting</span>
              {gy.exploring > 0 && <span>{gy.exploring} exploring</span>}
              {gy.blockers > 0 && <span className="text-red-500 font-medium">{gy.blockers} blockers</span>}
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface)" }}>
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${gy.on_track_pct}%` }} />
            </div>
            {gy.attention_note && (
              <p className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {gy.attention_note}</p>
            )}
          </div>
        ))}
      </div>
      {stalled_athletes.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Stalled Athletes</h3>
          <div className="space-y-1">
            {stalled_athletes.map(a => (
              <div key={a.id} className="flex items-start justify-between py-2" style={{ borderBottom: "1px solid var(--cm-border)" }} data-testid={`stalled-${a.id}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={primaryText}>{a.name}</span>
                    <span className="text-xs" style={subText}>{a.grad_year}</span>
                  </div>
                  <p className="text-[11px]" style={subText}>
                    {a.stage.replace(/_/g, " ")} for {a.days_in_stage} days
                    {a.has_blockers ? ` · Blockers: ${a.blockers.join(", ").replace(/_/g, " ")}` : " · No blockers identified"}
                  </p>
                </div>
                <button onClick={() => navigate(`/support-pods/${a.id}`)} className="text-[10px] flex items-center gap-0.5 shrink-0" style={{ color: "#0d9488" }}>
                  Open Pod <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Event Effectiveness ─────────────────────────────────────────────────────

function EventEffectiveness({ data, navigate }) {
  const { past_events, upcoming_events } = data;
  return (
    <section className={`${card} p-5`} style={cardStyle} data-testid="section-event-effectiveness">
      <h2 className={`${sectionLabel} mb-4`} style={subText}><Calendar className="w-3.5 h-3.5" /> Event Effectiveness</h2>
      {past_events.length > 0 ? (
        <div className="space-y-2 mb-4">
          {past_events.map(e => (
            <div key={e.id} className="rounded-lg p-3 cursor-pointer hover:bg-white/3 transition-colors" style={{ backgroundColor: "var(--cm-surface-2)" }}
              onClick={() => navigate(`/events/${e.id}/summary`)} data-testid={`event-eff-${e.id}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={primaryText}>{e.name}</span>
                <span className="text-[10px]" style={subText}>{e.location}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={subText}>
                <span>{e.notes_captured} notes</span>
                {e.hot_interactions > 0 && <span className="text-red-500 font-medium">{e.hot_interactions} Hot</span>}
                {e.warm_interactions > 0 && <span className="text-amber-500">{e.warm_interactions} Warm</span>}
                <span style={{ color: "var(--cm-border)" }}>&middot;</span>
                <span>{e.follow_up_completion_pct}% follow-up</span>
                <span>{e.routed_to_pods} routed</span>
                <span>{e.recommendations_created} recs</span>
              </div>
              {e.attention_note && (
                <p className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {e.attention_note}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs mb-4" style={subText}>No past events with captured data</p>
      )}
      {upcoming_events.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={subText}>Upcoming</h3>
          <div className="flex flex-wrap gap-2">
            {upcoming_events.map(e => {
              const prepColor = e.prep_status === "ready" ? "#10b981" : e.prep_status === "in_progress" ? "#f59e0b" : "#ef4444";
              return (
                <div key={e.id} className="text-xs flex items-center gap-1" style={subText}>
                  <span className="font-medium" style={secondaryText}>{e.name}</span>
                  <span>({e.days_away}d)</span>
                  <span className="font-medium" style={{ color: prepColor }}>{e.prep_status.replace(/_/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Advocacy Outcomes ───────────────────────────────────────────────────────

function AdvocacyOutcomes({ data, navigate }) {
  const { pipeline, response_rate, aging_recommendations, school_activity } = data;
  const WARMTH = { hot: "#ef4444", warm: "#f59e0b", cold: "#6b7280" };

  return (
    <section className={`${card} p-5`} style={cardStyle} data-testid="section-advocacy-outcomes">
      <h2 className={`${sectionLabel} mb-4`} style={subText}><Megaphone className="w-3.5 h-3.5" /> Advocacy & Response Rates</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3" style={subText}>
        <span><strong style={secondaryText}>{pipeline.total}</strong> Total</span>
        <span style={{ color: "var(--cm-border)" }}>&middot;</span>
        <span>{pipeline.draft} Draft</span>
        <span>{pipeline.sent} Sent</span>
        <span>{pipeline.awaiting_reply} Awaiting</span>
        <span style={{ color: "#10b981" }} className="font-medium">{pipeline.warm_response} Warm</span>
        <span>{pipeline.closed} Closed</span>
      </div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <span className="text-xs" style={subText}>Coach response rate</span>
        <span className="text-lg font-bold" style={primaryText}>{Math.round(response_rate * 100)}%</span>
        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface)" }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.round(response_rate * 100)}%`, backgroundColor: response_rate >= 0.3 ? "#10b981" : response_rate >= 0.15 ? "#f59e0b" : "#ef4444" }} />
        </div>
      </div>
      {aging_recommendations.length > 0 && (
        <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="aging-recs">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">Aging Recommendations</p>
          {aging_recommendations.map(r => (
            <div key={r.id} className="flex items-center justify-between py-1">
              <div className="text-xs" style={{ color: "#d97706" }}>
                <span className="font-medium">{r.athlete_name}</span> &rarr; {r.school_name}
                <span className="ml-2" style={subText}>{r.days_since_sent}d, {r.follow_up_count > 0 ? `${r.follow_up_count} follow-up` : "no follow-up"}</span>
              </div>
              <button onClick={() => navigate(`/advocacy/${r.id}`)} className="text-[10px] flex items-center gap-0.5" style={{ color: "#d97706" }}>
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {school_activity.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={subText}>School Response Activity</h3>
          <div className="space-y-1.5">
            {school_activity.map(s => (
              <div key={s.school_id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={secondaryText}>{s.school_name}</span>
                  <span className="capitalize font-medium" style={{ color: WARMTH[s.warmth] || "#6b7280" }}>{s.warmth}</span>
                </div>
                <span style={subText}>{s.warm_responses} warm / {s.recs_sent} sent</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Support Load ────────────────────────────────────────────────────────────

function SupportLoad({ data }) {
  const { by_owner, unassigned_actions, imbalance_detected, imbalance_note } = data;
  const maxActions = Math.max(...by_owner.map(o => o.open_actions), 1);

  return (
    <section className={`${card} p-5`} style={cardStyle} data-testid="section-support-load">
      <h2 className={`${sectionLabel} mb-4`} style={subText}><UserX className="w-3.5 h-3.5" /> Support Load</h2>
      <div className="space-y-3 mb-4">
        {by_owner.map(o => (
          <div key={o.owner} data-testid={`owner-${o.owner.replace(/\s/g, "-")}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={secondaryText}>{o.owner}</span>
                {o.is_overloaded && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Overloaded</span>}
              </div>
              <div className="text-xs" style={subText}>
                <strong style={secondaryText}>{o.open_actions}</strong> open
                {o.overdue > 0 && <span className="text-red-500 ml-1">&middot; {o.overdue} urgent</span>}
                <span className="ml-1">&middot; {o.athletes_assigned} athletes</span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
              <div className={`h-1.5 rounded-full transition-all ${o.is_overloaded ? "bg-red-400" : o.owner === "Unassigned" ? "bg-zinc-500" : "bg-slate-400"}`}
                style={{ width: `${(o.open_actions / maxActions) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {unassigned_actions > 0 && (
        <div className="rounded-lg p-3 mb-3 flex items-start gap-2" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="unassigned-callout">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "#d97706" }}><strong>{unassigned_actions} actions</strong> have no owner — these need assignment</p>
        </div>
      )}
      {imbalance_detected && imbalance_note && (
        <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }} data-testid="imbalance-callout">
          <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: "#ef4444" }}>{imbalance_note}</p>
        </div>
      )}
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function ProgramIntelligence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);

  const isDirector = user?.role === "director";

  useEffect(() => {
    if (isDirector) {
      axios.get(`${API}/program/coaches`).then(r => setCoaches(r.data)).catch(() => {});
    }
  }, [isDirector]);

  useEffect(() => {
    setLoading(true);
    const url = selectedCoach
      ? `${API}/program/intelligence?coach_id=${encodeURIComponent(selectedCoach)}`
      : `${API}/program/intelligence`;
    axios.get(url)
      .then(res => setData(res.data))
      .catch(() => toast.error("Failed to load Program Insights"))
      .finally(() => setLoading(false));
  }, [selectedCoach]);

  const isCoachView = data?.view_mode === "club_coach";

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#0d9488" }} />
      </div>
    );
  }

  return (
    <div data-testid="program-intelligence-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2" style={primaryText} data-testid="program-title">
            <BarChart3 className="w-5 h-5" style={{ color: "#0d9488" }} />
            {isCoachView ? "My Insights" : "Program Insights"}
          </h1>
          <p className="text-xs mt-0.5" style={subText}>
            {isCoachView
              ? `${data.athlete_count} athletes · ${data.recommendation_count} recommendations`
              : `Recruiting performance & program health · ${data.athlete_count} athletes · ${data.event_count} events`}
          </p>
        </div>

        {isDirector && coaches.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg p-0.5 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="view-switcher">
            <button onClick={() => setSelectedCoach(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!selectedCoach ? "text-white" : ""}`}
              style={{ backgroundColor: !selectedCoach ? "#1E213A" : "transparent", color: selectedCoach ? "var(--cm-text-3)" : undefined }}
              data-testid="view-program">Program</button>
            {coaches.map(c => (
              <button key={c.id} onClick={() => setSelectedCoach(c.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${selectedCoach === c.id ? "text-white" : ""}`}
                style={{ backgroundColor: selectedCoach === c.id ? "#1E213A" : "transparent", color: selectedCoach !== c.id ? "var(--cm-text-3)" : undefined }}
                data-testid={`view-coach-${c.id.replace(/\s+/g, "-").toLowerCase()}`}>
                {c.name.replace("Coach ", "")}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "#0d9488" }} />
        </div>
      ) : (
        <div className="space-y-5">
          <ProgramTrends trends={data.trends} viewMode={data.view_mode} />
          <ProgramHealth data={data.program_health} />
          <ReadinessMatrix data={data.readiness} navigate={navigate} />
          <AdvocacyOutcomes data={data.advocacy_outcomes} navigate={navigate} />
          <EventEffectiveness data={data.event_effectiveness} navigate={navigate} />
          <SupportLoad data={data.support_load} />
        </div>
      )}
    </div>
  );
}

export default ProgramIntelligence;
