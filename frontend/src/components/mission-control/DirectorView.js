import { Users, BarChart3, Calendar, UserX, Target, MessageCircle, Mail, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AIProgramBrief from "./AIProgramBrief";
import NeedsAttentionCard from "./NeedsAttentionCard";
import CoachHealthCard from "./CoachHealthCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import RecruitingSignalsCard from "./RecruitingSignalsCard";
import ActivityFeed from "./ActivityFeed";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const MOMENTUM_CONFIG = {
  improving: { label: "Improving", icon: TrendingUp, color: "#30C5BE", textColor: "text-emerald-400" },
  stable: { label: "Stable", icon: Minus, color: "#8A92A3", textColor: "text-slate-400" },
  declining: { label: "Declining", icon: TrendingDown, color: "#FF6B6B", textColor: "text-red-400" },
};

export default function DirectorView({ data, userName }) {
  const firstName = userName?.split(" ")[0] || "Director";
  const ps = data.programStatus || {};
  const trend = data.trendData || {};
  const momentum = trend.momentum || { state: "stable", engagementDelta: 0 };
  const needDelta = trend.needAttentionDelta || 0;
  const momConfig = MOMENTUM_CONFIG[momentum.state] || MOMENTUM_CONFIG.stable;
  const MomIcon = momConfig.icon;

  const kpis = [
    {
      value: ps.totalAthletes || 0,
      label: "ATHLETES",
      subtitle: "In program",
      color: "#30C5BE",
      icon: Target,
      iconBg: "#363D59",
    },
    {
      value: ps.activeCoaches || 0,
      label: "COACHES",
      subtitle: "Active in program",
      color: "#7F92FF",
      icon: MessageCircle,
      iconBg: "#363D59",
    },
    {
      value: ps.needingAttention || 0,
      label: "NEED ATTENTION",
      subtitle: "Require intervention",
      color: "#FF6B6B",
      icon: AlertTriangle,
      iconBg: "#4A2C2C",
      emphasized: ps.needingAttention > 0,
      trend: needDelta,
    },
    {
      value: ps.upcomingEvents || 0,
      label: "EVENTS AHEAD",
      subtitle: "Next 14 days",
      color: "#30C5BE",
      icon: Mail,
      iconBg: "#363D59",
    },
    {
      value: ps.unassignedCount || 0,
      label: "UNASSIGNED",
      subtitle: ps.unassignedCount > 0 ? "Need coach assignment" : "All assigned",
      color: ps.unassignedCount > 0 ? "#FFC649" : "#30C5BE",
      icon: Clock,
      iconBg: ps.unassignedCount > 0 ? "#4A3C36" : "#363D59",
    },
  ];

  return (
    <div className="space-y-8" data-testid="director-mission-control">
      {/* 1. PROGRAM OVERVIEW */}
      <section
        className="relative rounded-[10px] overflow-hidden"
        style={{ backgroundColor: "#1E213A", padding: "32px" }}
        data-testid="director-hero"
      >
        <div className="absolute" style={{ top: 24, right: 28 }}>
          <span
            className="inline-block font-medium"
            style={{ backgroundColor: "#363D59", color: "#E5E5E5", fontSize: 14, padding: "8px 16px", borderRadius: 6 }}
          >
            {getDateLabel()}
          </span>
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 600, color: "#FFFFFF", marginBottom: 2 }}>
          {getGreeting()},{" "}
          <span style={{ color: "#30C5BE" }}>{firstName}</span>
        </h2>
        <p style={{ fontSize: 16, color: "#8A92A3", marginBottom: 0 }}>
          Here's your program overview for today
        </p>

        <div style={{ borderTop: "1px solid #363D59", margin: "20px 0 24px 0" }} />

        {/* KPI Row */}
        <div className="flex flex-wrap sm:flex-nowrap">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="flex flex-1 min-w-0" style={{ paddingRight: idx < kpis.length - 1 ? 24 : 0, marginRight: idx < kpis.length - 1 ? 24 : 0, borderRight: idx < kpis.length - 1 ? "1px solid #363D59" : "none" }}>
                <div className="flex items-start justify-between w-full">
                  <div>
                    <p style={{
                      fontSize: kpi.emphasized ? 42 : 36,
                      fontWeight: 700,
                      color: kpi.color,
                      lineHeight: 1,
                      marginBottom: 8,
                    }}>
                      {kpi.value}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {kpi.emphasized && <AlertTriangle style={{ width: 12, height: 12, color: kpi.color }} />}
                      <p style={{ fontSize: 12, fontWeight: 700, color: kpi.emphasized ? kpi.color : "#8A92A3", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 0 }}>
                        {kpi.label}
                      </p>
                    </div>
                    {/* Trend indicator for Need Attention */}
                    {kpi.trend !== undefined && kpi.trend !== 0 && (
                      <p data-testid="need-attention-trend" style={{ fontSize: 12, fontWeight: 500, color: kpi.trend > 0 ? "#FF6B6B" : "#30C5BE", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        {kpi.trend > 0 ? "\u2191" : "\u2193"} {kpi.trend > 0 ? "+" : ""}{kpi.trend} this week
                      </p>
                    )}
                    {kpi.trend !== undefined && kpi.trend === 0 && (
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#8A92A3", marginTop: 4 }}>
                        No change this week
                      </p>
                    )}
                    {kpi.trend === undefined && (
                      <p style={{ fontSize: 14, fontWeight: 400, color: "#8A92A3", marginTop: 4 }}>{kpi.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: kpi.iconBg, marginTop: 4 }}>
                    <Icon style={{ width: 18, height: 18, color: kpi.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Program Momentum Indicator */}
        <div style={{ borderTop: "1px solid #363D59", marginTop: 24, paddingTop: 16 }} data-testid="program-momentum">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8A92A3", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Program Momentum
            </span>
            <div className="flex items-center gap-1.5">
              <MomIcon style={{ width: 14, height: 14, color: momConfig.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: momConfig.color }}>
                {momConfig.label}
              </span>
            </div>
            {momentum.engagementDelta !== 0 && (
              <span style={{ fontSize: 12, color: "#8A92A3" }}>
                Recruiting engagement {momentum.engagementDelta > 0 ? "+" : ""}{momentum.engagementDelta}% this week
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. AI PROGRAM BRIEF */}
      <AIProgramBrief />

      {/* 3. RECRUITING SIGNALS */}
      <RecruitingSignalsCard signals={data.recruitingSignals} />

      {/* 4. NEEDS ATTENTION */}
      <NeedsAttentionCard items={data.needsAttention || []} />

      {/* 5. COACH HEALTH */}
      <CoachHealthCard coaches={data.coachHealth || []} />

      {/* 6. UPCOMING EVENTS */}
      <UpcomingEventsCard events={data.upcomingEvents || []} />

      {/* 7. PROGRAM ACTIVITY */}
      <ActivityFeed items={data.programActivity || []} title="Program Activity" />
    </div>
  );
}
