import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import { AiBriefing } from "@/components/AiBriefing";
import { AiProgramInsights } from "@/components/AiV2Components";
import {
  Shield, AlertTriangle, Users, Calendar, Megaphone, ExternalLink,
  TrendingDown, TrendingUp, Minus, Clock, UserX, ChevronRight, User,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Trends Section ──────────────────────────────────────────────────────────

const TREND_STYLE = {
  improving: { color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp, arrow: "+" },
  declining: { color: "text-red-600", bg: "bg-red-50", icon: TrendingDown, arrow: "" },
  stable: { color: "text-gray-500", bg: "bg-gray-50", icon: Minus, arrow: "" },
  baseline: { color: "text-blue-500", bg: "bg-blue-50", icon: Minus, arrow: "" },
  current: { color: "text-blue-500", bg: "bg-blue-50", icon: User, arrow: "" },
};

function TrendCard({ trend }) {
  const style = TREND_STYLE[trend.direction] || TREND_STYLE.stable;
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border border-gray-100 rounded-lg p-3.5 flex-1 min-w-[170px]`} data-testid={`trend-${trend.key}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{trend.label}</span>
        <Icon className={`w-3.5 h-3.5 ${style.color}`} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-xl font-bold text-gray-900">{trend.current}</span>
        <span className="text-xs text-gray-400">{trend.suffix}</span>
        {trend.delta !== 0 && (
          <span className={`text-xs font-semibold ${style.color}`}>
            {style.arrow}{trend.delta > 0 ? "+" : ""}{trend.delta}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">{trend.interpretation}</p>
    </div>
  );
}

function ProgramTrends({ trends, viewMode }) {
  if (!trends || trends.length === 0) return null;
  const isCoach = viewMode === "coach";

  return (
    <section className="mb-5" data-testid="section-trends">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        {isCoach ? <User className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
        {isCoach ? "My Stats" : "What's Changing"}
      </h2>
      <div className="flex flex-wrap gap-3">
        {trends.map((t) => (
          <TrendCard key={t.key} trend={t} />
        ))}
      </div>
    </section>
  );
}

// ─── Section 1: Program Health ───────────────────────────────────────────────

function ProgramHealth({ data }) {
  const { pod_health, open_issues, intervention_total, highest_risk_cluster } = data;
  const total = pod_health.healthy + pod_health.needs_attention + pod_health.at_risk;
  const hPct = total > 0 ? (pod_health.healthy / total) * 100 : 0;
  const nPct = total > 0 ? (pod_health.needs_attention / total) * 100 : 0;
  const rPct = total > 0 ? (pod_health.at_risk / total) * 100 : 0;

  return (
    <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="section-program-health">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Program Health
      </h2>

      {/* Pod health distribution */}
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><strong>{pod_health.healthy}</strong> <span className="text-gray-400 text-xs">Healthy</span></span>
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><strong>{pod_health.needs_attention}</strong> <span className="text-gray-400 text-xs">Needs Attention</span></span>
        <span className="flex items-center gap-1.5 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><strong>{pod_health.at_risk}</strong> <span className="text-gray-400 text-xs">At Risk</span></span>
      </div>

      {/* Segmented bar */}
      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-100 mb-4" data-testid="health-bar">
        <div className="bg-emerald-500 transition-all" style={{ width: `${hPct}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${nPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${rPct}%` }} />
      </div>

      {/* Open issues */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
        <span><strong className="text-gray-700">{open_issues.blockers}</strong> Blockers</span>
        <span><strong className="text-gray-700">{open_issues.momentum_drops}</strong> Momentum Drops</span>
        <span><strong className="text-gray-700">{open_issues.event_follow_ups}</strong> Event Follow-ups</span>
        <span><strong className="text-gray-700">{open_issues.engagement_drops}</strong> Engagement Drops</span>
        <span className="text-gray-300">·</span>
        <span>{intervention_total} total interventions</span>
      </div>

      {/* Attention callout */}
      {highest_risk_cluster && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 flex items-start gap-2" data-testid="risk-callout">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Attention:</strong> {highest_risk_cluster.value} grad year — {highest_risk_cluster.reason}
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Section 2: Readiness ────────────────────────────────────────────────────

function ReadinessMatrix({ data, navigate }) {
  const { by_grad_year, stalled_athletes } = data;

  return (
    <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="section-readiness">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Team / Grad Year Readiness
      </h2>

      <div className="space-y-4 mb-5">
        {by_grad_year.map((gy) => (
          <div key={gy.grad_year} className="border border-gray-50 rounded-md p-3" data-testid={`readiness-${gy.grad_year}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-sm font-semibold text-gray-900">{gy.grad_year}</span>
                {gy.team && <span className="text-xs text-gray-400 ml-2">{gy.team}</span>}
              </div>
              <span className="text-xs text-gray-500">{gy.on_track_pct}% on track</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
              <span>{gy.total_athletes} athletes</span>
              <span>{gy.actively_recruiting} actively recruiting</span>
              {gy.exploring > 0 && <span>{gy.exploring} exploring</span>}
              {gy.blockers > 0 && <span className="text-red-600 font-medium">{gy.blockers} blockers</span>}
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${gy.on_track_pct}%` }} />
            </div>
            {gy.attention_note && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {gy.attention_note}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Stalled athletes */}
      {stalled_athletes.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Stalled Athletes</h3>
          <div className="space-y-2">
            {stalled_athletes.map((a) => (
              <div key={a.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0" data-testid={`stalled-${a.id}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{a.name}</span>
                    <span className="text-xs text-gray-400">{a.grad_year}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {a.stage.replace(/_/g, " ")} for {a.days_in_stage} days
                    {a.has_blockers ? ` · Blockers: ${a.blockers.join(", ").replace(/_/g, " ")}` : " · No blockers identified"}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/support-pods/${a.id}`)}
                  className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 shrink-0"
                >
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

// ─── Section 3: Event Effectiveness ──────────────────────────────────────────

function EventEffectiveness({ data, navigate }) {
  const { past_events, upcoming_events } = data;

  return (
    <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="section-event-effectiveness">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" /> Event Effectiveness
      </h2>

      {past_events.length > 0 ? (
        <div className="space-y-3 mb-4">
          {past_events.map((e) => (
            <div
              key={e.id}
              className="border border-gray-50 rounded-md p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => navigate(`/events/${e.id}/summary`)}
              data-testid={`event-eff-${e.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{e.name}</span>
                <span className="text-[10px] text-gray-400">{e.location}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{e.notes_captured} notes</span>
                {e.hot_interactions > 0 && <span className="text-red-600 font-medium">{e.hot_interactions} Hot</span>}
                {e.warm_interactions > 0 && <span className="text-amber-600">{e.warm_interactions} Warm</span>}
                <span className="text-gray-300">·</span>
                <span>{e.follow_up_completion_pct}% follow-up completion</span>
                <span>{e.routed_to_pods} routed to pods</span>
                <span>{e.recommendations_created} recs created</span>
              </div>
              {e.attention_note && (
                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {e.attention_note}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">No past events with captured data</p>
      )}

      {/* Upcoming prep status */}
      {upcoming_events.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">Upcoming</h3>
          <div className="flex flex-wrap gap-2">
            {upcoming_events.map((e) => {
              const prepColor = e.prep_status === "ready" ? "text-emerald-600" : e.prep_status === "in_progress" ? "text-amber-600" : "text-red-600";
              return (
                <div key={e.id} className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-medium text-gray-700">{e.name}</span>
                  <span>({e.days_away}d)</span>
                  <span className={`font-medium ${prepColor}`}>{e.prep_status.replace(/_/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 4: Advocacy Outcomes ────────────────────────────────────────────

function AdvocacyOutcomes({ data, navigate }) {
  const { pipeline, response_rate, aging_recommendations, school_activity } = data;

  const WARMTH_STYLE = { hot: "text-red-500", warm: "text-amber-500", cold: "text-gray-400" };

  return (
    <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="section-advocacy-outcomes">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Megaphone className="w-3.5 h-3.5" /> Advocacy Outcomes
      </h2>

      {/* Pipeline counts */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
        <span><strong className="text-gray-700">{pipeline.total}</strong> Total</span>
        <span className="text-gray-200">·</span>
        <span>{pipeline.draft} Draft</span>
        <span>{pipeline.sent} Sent</span>
        <span>{pipeline.awaiting_reply} Awaiting</span>
        <span className="text-emerald-600 font-medium">{pipeline.warm_response} Warm</span>
        <span>{pipeline.closed} Closed</span>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Response rate: <strong className="text-gray-700">{Math.round(response_rate * 100)}%</strong>
      </p>

      {/* Aging */}
      {aging_recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-4" data-testid="aging-recs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Aging Recommendations</p>
          {aging_recommendations.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1">
              <div className="text-xs text-amber-800">
                <span className="font-medium">{r.athlete_name}</span> → {r.school_name}
                <span className="text-amber-600 ml-2">{r.days_since_sent}d, {r.follow_up_count > 0 ? `${r.follow_up_count} follow-up sent` : "no follow-up"}</span>
              </div>
              <button
                onClick={() => navigate(`/advocacy/${r.id}`)}
                className="text-[10px] text-amber-600 hover:text-amber-800 flex items-center gap-0.5"
              >
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* School activity */}
      {school_activity.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">School Response Activity</h3>
          <div className="space-y-1.5">
            {school_activity.map((s) => (
              <div key={s.school_id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{s.school_name}</span>
                  <span className={`font-medium capitalize ${WARMTH_STYLE[s.warmth] || "text-gray-400"}`}>{s.warmth}</span>
                </div>
                <span className="text-gray-400">
                  {s.warm_responses} warm / {s.recs_sent} sent
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 5: Support Load ─────────────────────────────────────────────────

function SupportLoad({ data }) {
  const { by_owner, unassigned_actions, imbalance_detected, imbalance_note } = data;
  const maxActions = Math.max(...by_owner.map((o) => o.open_actions), 1);

  return (
    <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="section-support-load">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <UserX className="w-3.5 h-3.5" /> Support Load
      </h2>

      <div className="space-y-3 mb-4">
        {by_owner.map((o) => (
          <div key={o.owner} data-testid={`owner-${o.owner.replace(/\s/g, "-")}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{o.owner}</span>
                {o.is_overloaded && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Overloaded</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                <strong className="text-gray-700">{o.open_actions}</strong> open
                {o.overdue > 0 && <span className="text-red-600 ml-1">· {o.overdue} urgent</span>}
                <span className="ml-1">· {o.athletes_assigned} athletes</span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full transition-all ${o.is_overloaded ? "bg-red-400" : o.owner === "Unassigned" ? "bg-gray-300" : "bg-slate-400"}`}
                style={{ width: `${(o.open_actions / maxActions) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {unassigned_actions > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-3 flex items-start gap-2" data-testid="unassigned-callout">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>{unassigned_actions} actions</strong> have no owner — these need assignment
          </p>
        </div>
      )}

      {imbalance_detected && imbalance_note && (
        <div className="bg-red-50 border border-red-100 rounded-md p-3 flex items-start gap-2" data-testid="imbalance-callout">
          <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-800">{imbalance_note}</p>
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
  const [selectedCoach, setSelectedCoach] = useState(null); // null = full program view (directors only)

  const isDirector = user?.role === "director";

  // Load coaches list once (directors only)
  useEffect(() => {
    if (isDirector) {
      axios.get(`${API}/program/coaches`).then((r) => setCoaches(r.data)).catch(() => {});
    }
  }, [isDirector]);

  // Fetch program data when view changes
  useEffect(() => {
    setLoading(true);
    const url = selectedCoach
      ? `${API}/program/intelligence?coach_id=${encodeURIComponent(selectedCoach)}`
      : `${API}/program/intelligence`;
    axios.get(url)
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load Program Intelligence"))
      .finally(() => setLoading(false));
  }, [selectedCoach]);

  const isCoachView = data?.view_mode === "coach";

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  return (
    <div data-testid="program-intelligence-page">
      <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="program-title">
              {isCoachView ? `My View — ${data.coach_id}` : "Program Intelligence"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isCoachView
                ? `${data.athlete_count} athletes · ${data.recommendation_count} recommendations`
                : `Strategic overview · ${data.athlete_count} athletes · ${data.event_count} events · ${data.recommendation_count} recommendations`}
            </p>
          </div>

          {/* Director-only: coach view switcher */}
          {isDirector && coaches.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5" data-testid="view-switcher">
              <button
                onClick={() => setSelectedCoach(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !selectedCoach ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
                }`}
                data-testid="view-program"
              >
                Program View
              </button>
              {coaches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCoach(c.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCoach === c.id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid={`view-coach-${c.id.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {c.name.replace("Coach ", "")}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
          </div>
        ) : (
          <div className="space-y-5">
            <AiBriefing
              endpoint={`${API}/ai/program-narrative`}
              label="Program Intelligence"
              buttonLabel="Generate Program Narrative"
            />
            {isDirector && (
              <AiProgramInsights
                endpoint={`${API}/ai/program-insights`}
                label="Strategic Insights"
              />
            )}
            <ProgramTrends trends={data.trends} viewMode={data.view_mode} />
            <ProgramHealth data={data.program_health} />
            <ReadinessMatrix data={data.readiness} navigate={navigate} />
            <EventEffectiveness data={data.event_effectiveness} navigate={navigate} />
            <AdvocacyOutcomes data={data.advocacy_outcomes} navigate={navigate} />
            <SupportLoad data={data.support_load} />
          </div>
        )}
      </div>
  );
}

export default ProgramIntelligence;
