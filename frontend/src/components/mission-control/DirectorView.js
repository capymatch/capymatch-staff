import { useState } from "react";
import { ChevronRight, Target, MessageCircle, AlertTriangle, Mail, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AIProgramBrief from "./AIProgramBrief";
import CoachHealthCard from "./CoachHealthCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import RecruitingSignalsCard from "./RecruitingSignalsCard";
import ActivityFeed from "./ActivityFeed";
import AthletePipelinePanel from "./AthletePipelinePanel";
import DirectorInbox from "./DirectorInbox";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const MOM_CFG = {
  improving: { label: "Improving", icon: TrendingUp, color: "#30C5BE" },
  stable: { label: "Stable", icon: Minus, color: "#8A92A3" },
  declining: { label: "Declining", icon: TrendingDown, color: "#FF6B6B" },
};

/* ── Collapsible wrapper for secondary sections ── */
function CollapsibleSection({ title, children, defaultOpen = false, testId }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 cursor-pointer group"
        style={{ background: "none", border: "none", fontFamily: "inherit" }}
        data-testid={`${testId}-toggle`}
      >
        <span className="text-[13px] font-semibold" style={{ color: "#CBD5E1" }}>{title}</span>
        <ChevronRight
          className="w-4 h-4 transition-transform duration-150"
          style={{ color: "#64748B", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

/* ── Outbox strip ── */
function OutboxStrip({ summary }) {
  const [expanded, setExpanded] = useState(false);
  if (!summary) return null;
  const { awaiting_response, critical_pending, in_progress, resolved_this_week } = summary;
  if (!awaiting_response && !critical_pending && !in_progress && !resolved_this_week) return null;

  const parts = [];
  if (awaiting_response > 0) parts.push(`${awaiting_response} awaiting response`);
  if (critical_pending > 0) parts.push(`${critical_pending} critical pending`);
  if (in_progress > 0) parts.push(`${in_progress} in progress`);
  if (resolved_this_week > 0) parts.push(`${resolved_this_week} resolved this week`);

  // Insight text
  let insight = "";
  let insightColor = "#64748B";
  if (critical_pending > 0) {
    insight = `${critical_pending} critical escalation${critical_pending > 1 ? "s" : ""} unacknowledged by coach`;
    insightColor = "#ef4444";
  } else if (awaiting_response > 0) {
    insight = `${awaiting_response} request${awaiting_response > 1 ? "s" : ""} awaiting coach response`;
    insightColor = "#f59e0b";
  } else if (in_progress > 0) {
    insight = `All outbound actions acknowledged — ${in_progress} in progress`;
  } else if (resolved_this_week > 0) {
    insight = "Coaches are responsive — all recent actions resolved";
  }

  return (
    <div data-testid="outbox-strip">
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        onClick={() => setExpanded(!expanded)}
      >
        <p className="text-[12px] font-medium" style={{ color: "#64748B" }}>
          <span className="font-semibold" style={{ color: "#475569" }}>Outbox</span>
          <span className="mx-1.5" style={{ color: "#cbd5e1" }}>—</span>
          {parts.join(" · ")}
        </p>
        <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: "#0d9488" }}>
          {expanded ? "Hide" : "View details"}
          <ChevronRight className="w-3 h-3 transition-transform duration-150" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }} />
        </span>
      </div>
      {expanded && insight && (
        <div className="mt-1.5 px-4 py-2 rounded-lg" style={{ background: "#fefce8", border: "1px solid #fef08a" }}>
          <p className="text-[11.5px] font-medium" style={{ color: insightColor }}>{insight}</p>
        </div>
      )}
    </div>
  );
}

export default function DirectorView({ data, userName }) {
  const [pipelineAthleteId, setPipelineAthleteId] = useState(null);
  const firstName = userName?.split(" ")[0] || "Director";
  const ps = data.programStatus || {};
  const trend = data.trendData || {};
  const momentum = trend.momentum || { state: "stable", engagementDelta: 0 };
  const needDelta = trend.needAttentionDelta || 0;
  const momCfg = MOM_CFG[momentum.state] || MOM_CFG.stable;
  const MomIcon = momCfg.icon;

  const kpis = [
    { value: ps.totalAthletes || 0, label: "Athletes", color: "#30C5BE", icon: Target },
    { value: ps.activeCoaches || 0, label: "Coaches", color: "#7F92FF", icon: MessageCircle },
    { value: ps.needingAttention || 0, label: "Need Attention", color: "#FF6B6B", icon: AlertTriangle, emphasized: ps.needingAttention > 0, trend: needDelta },
    { value: ps.upcomingEvents || 0, label: "Events", color: "#30C5BE", icon: Mail },
    { value: ps.unassignedCount || 0, label: "Unassigned", color: ps.unassignedCount > 0 ? "#FFC649" : "#30C5BE", icon: Clock },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="director-mission-control" style={{ maxWidth: 960 }}>

      {/* ═══ 1. COMPACT CONTEXT STRIP ═══ */}
      <section
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "#1E213A" }}
        data-testid="director-hero"
      >
        <div className="px-4 py-3 sm:px-5 sm:py-3.5">
          {/* Row 1: Greeting + date */}
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] sm:text-[17px] font-semibold text-white leading-tight">
              {getGreeting()}, <span style={{ color: "#30C5BE" }}>{firstName}</span>
            </h2>
            <span className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: "#2D3548", color: "#94a3b8" }}>
              {getDateLabel()}
            </span>
          </div>

          {/* Row 2: KPI metrics — single tight row */}
          <div className="flex items-center gap-4 sm:gap-6 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {kpis.map((kpi, idx) => (
              <div key={kpi.label} className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[18px] sm:text-[20px] font-bold tabular-nums" style={{ color: kpi.color, lineHeight: 1 }}>
                  {kpi.value}
                </span>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: kpi.emphasized ? kpi.color : "#8A92A3", lineHeight: 1.2 }}>
                    {kpi.label}
                  </span>
                  {kpi.trend !== undefined && kpi.trend !== 0 && (
                    <span className="text-[9px] font-medium" style={{ color: kpi.trend > 0 ? "#FF6B6B" : "#30C5BE" }}>
                      {kpi.trend > 0 ? "+" : ""}{kpi.trend} this week
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Row 3: Momentum — subtle bottom line */}
          <div className="flex items-center gap-2 mt-2.5 pt-2" style={{ borderTop: "1px solid #2D3548" }}>
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>Momentum</span>
            <MomIcon className="w-3 h-3" style={{ color: momCfg.color }} />
            <span className="text-[11px] font-semibold" style={{ color: momCfg.color }}>{momCfg.label}</span>
            {momentum.engagementDelta !== 0 && (
              <span className="text-[10px] hidden sm:inline" style={{ color: "#64748B" }}>
                {momentum.engagementDelta > 0 ? "+" : ""}{momentum.engagementDelta}% engagement
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ═══ 2. DIRECTOR INBOX — DOMINANT ═══ */}
      <DirectorInbox />

      {/* ═══ 3. OUTBOX STRIP ═══ */}
      <OutboxStrip summary={data.outbox_summary} />

      {/* ═══ 4. SECONDARY SECTIONS — ALL COLLAPSED ═══ */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
        <CollapsibleSection title="Program Insights" testId="section-program-insights">
          <AIProgramBrief />
        </CollapsibleSection>

        <CollapsibleSection title="Recruiting Signals" testId="section-recruiting-signals">
          <RecruitingSignalsCard signals={data.recruitingSignals} />
        </CollapsibleSection>

        <CollapsibleSection title="Coach Health" testId="section-coach-health">
          <CoachHealthCard coaches={data.coachHealth || []} />
        </CollapsibleSection>

        <CollapsibleSection title="Upcoming Events" testId="section-upcoming-events">
          <UpcomingEventsCard events={data.upcomingEvents || []} />
        </CollapsibleSection>

        <CollapsibleSection title="Activity" testId="section-activity">
          <ActivityFeed items={data.programActivity || []} title="Program Activity" />
        </CollapsibleSection>
      </div>

      {/* Pipeline Panel */}
      {pipelineAthleteId && (
        <AthletePipelinePanel
          athleteId={pipelineAthleteId}
          onClose={() => setPipelineAthleteId(null)}
        />
      )}
    </div>
  );
}
