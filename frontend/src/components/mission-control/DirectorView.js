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
        style={{ backgroundColor: "#1E213A" }}
        data-testid="director-hero"
      >
        <div className="px-4 py-5 sm:px-7 sm:py-6">
          <div className="absolute" style={{ top: 20, right: 20 }}>
            <span
              className="inline-block font-medium text-xs sm:text-[13px]"
              style={{ backgroundColor: "#363D59", color: "#E5E5E5", padding: "6px 12px", borderRadius: 6 }}
            >
              {getDateLabel()}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl" style={{ fontWeight: 600, color: "#FFFFFF", marginBottom: 2 }}>
            {getGreeting()},{" "}
            <span style={{ color: "#30C5BE" }}>{firstName}</span>
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: "#8A92A3", marginBottom: 0 }}>
            Here's your program overview for today
          </p>

          <div style={{ borderTop: "1px solid #363D59", margin: "14px 0 16px 0" }} />

        {/* KPI Row — grid on mobile, flex on desktop */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:gap-0">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="flex flex-1 min-w-0 lg:pr-5 lg:mr-5" style={{ borderRight: idx < kpis.length - 1 ? undefined : "none" }}>
                <div className="flex items-start justify-between w-full" style={idx < kpis.length - 1 ? {} : {}}>
                  <div>
                    <p className="text-2xl sm:text-3xl" style={{
                      fontSize: undefined,
                      fontWeight: 700,
                      color: kpi.color,
                      lineHeight: 1,
                      marginBottom: 6,
                    }}>
                      {kpi.value}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {kpi.emphasized && <AlertTriangle style={{ width: 11, height: 11, color: kpi.color }} />}
                      <p className="text-[10px] sm:text-[11px]" style={{ fontWeight: 700, color: kpi.emphasized ? kpi.color : "#8A92A3", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 0 }}>
                        {kpi.label}
                      </p>
                    </div>
                    {kpi.trend !== undefined && kpi.trend !== 0 && (
                      <p data-testid="need-attention-trend" className="text-[10px] sm:text-[11px]" style={{ fontWeight: 500, color: kpi.trend > 0 ? "#FF6B6B" : "#30C5BE", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                        {kpi.trend > 0 ? "\u2191" : "\u2193"} {kpi.trend > 0 ? "+" : ""}{kpi.trend} this week
                      </p>
                    )}
                    {kpi.trend !== undefined && kpi.trend === 0 && (
                      <p className="text-[10px] sm:text-[11px]" style={{ fontWeight: 500, color: "#8A92A3", marginTop: 3 }}>
                        No change this week
                      </p>
                    )}
                    {kpi.trend === undefined && (
                      <p className="text-[11px] sm:text-[13px] hidden sm:block" style={{ fontWeight: 400, color: "#8A92A3", marginTop: 3 }}>{kpi.subtitle}</p>
                    )}
                  </div>
                  <div className="items-center justify-center shrink-0 hidden sm:flex" style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: kpi.iconBg, marginTop: 2 }}>
                    <Icon style={{ width: 16, height: 16, color: kpi.color }} />
                  </div>
                </div>
                {/* Desktop-only vertical divider */}
                {idx < kpis.length - 1 && <div className="hidden lg:block w-px bg-[#363D59] ml-5 self-stretch" />}
              </div>
            );
          })}
        </div>

        {/* Program Momentum Indicator */}
        <div style={{ borderTop: "1px solid #363D59", marginTop: 14, paddingTop: 10 }} data-testid="program-momentum">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[10px]" style={{ fontWeight: 700, color: "#8A92A3", letterSpacing: 1.2, textTransform: "uppercase" }}>
              Program Momentum
            </span>
            <div className="flex items-center gap-1.5">
              <MomIcon style={{ width: 13, height: 13, color: momConfig.color }} />
              <span className="text-xs" style={{ fontWeight: 600, color: momConfig.color }}>
                {momConfig.label}
              </span>
            </div>
            {momentum.engagementDelta !== 0 && (
              <span className="text-[11px] hidden sm:inline" style={{ color: "#8A92A3" }}>
                Recruiting engagement {momentum.engagementDelta > 0 ? "+" : ""}{momentum.engagementDelta}% this week
              </span>
            )}
          </div>
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
