import { useState } from "react";
import { Target, AlertTriangle, Calendar, Bell } from "lucide-react";
import TodaysActionsCard from "./TodaysActionsCard";
import MyRosterCard from "./MyRosterCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import ActivityFeed from "./ActivityFeed";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import AthletePipelinePanel from "./AthletePipelinePanel";
import DirectorActionsCard from "./DirectorActionsCard";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function CoachView({ data, userName }) {
  const [pipelineAthleteId, setPipelineAthleteId] = useState(null);
  const firstName = userName?.split(" ")[0] || "Coach";
  const summary = data.todays_summary || {};

  const kpis = [
    {
      value: summary.athleteCount || 0,
      label: "MY ATHLETES",
      subtitle: "Assigned to you",
      color: "#30C5BE",
      icon: Target,
      iconBg: "#363D59",
    },
    {
      value: summary.needingAction || 0,
      label: "NEED ACTION",
      subtitle: "Require follow-up",
      color: summary.needingAction > 0 ? "#FFC649" : "#30C5BE",
      icon: AlertTriangle,
      iconBg: summary.needingAction > 0 ? "#4A3C36" : "#363D59",
    },
    {
      value: summary.upcomingEvents || 0,
      label: "EVENTS THIS WEEK",
      subtitle: "Coming up",
      color: "#7F92FF",
      icon: Calendar,
      iconBg: "#363D59",
    },
    {
      value: summary.alertCount || 0,
      label: "ALERTS",
      subtitle: "Priority items",
      color: summary.alertCount > 0 ? "#FFC649" : "#30C5BE",
      icon: Bell,
      iconBg: summary.alertCount > 0 ? "#4A3C36" : "#363D59",
    },
  ];

  return (
    <div className="space-y-6" data-testid="coach-mission-control">
      {/* Coach Onboarding (dismissible) */}
      <OnboardingChecklist />

      {/* ── Hero Card ── */}
      <section
        className="relative rounded-[10px] overflow-hidden"
        style={{ backgroundColor: "#1E213A", padding: "32px" }}
        data-testid="coach-hero"
      >
        {/* Date badge */}
        <div className="absolute" style={{ top: 24, right: 28 }}>
          <span
            className="inline-block font-medium"
            style={{
              backgroundColor: "#363D59",
              color: "#E5E5E5",
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 6,
            }}
          >
            {getDateLabel()}
          </span>
        </div>

        {/* Greeting */}
        <h2 style={{ fontSize: 28, fontWeight: 600, color: "#FFFFFF", marginBottom: 2 }}>
          {getGreeting()},{" "}
          <span style={{ color: "#30C5BE" }}>{firstName}</span>
        </h2>
        <p style={{ fontSize: 16, color: "#8A92A3", marginBottom: 0 }}>
          Here's what's happening with your athletes today
        </p>

        {/* Separator */}
        <div style={{ borderTop: "1px solid #363D59", margin: "20px 0 24px 0" }} />

        {/* KPIs */}
        <div className="flex flex-wrap sm:flex-nowrap">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="flex flex-1 min-w-0" style={{ paddingRight: idx < kpis.length - 1 ? 24 : 0, marginRight: idx < kpis.length - 1 ? 24 : 0, borderRight: idx < kpis.length - 1 ? "1px solid #363D59" : "none" }}>
                <div className="flex items-start justify-between w-full">
                  <div>
                    <p style={{ fontSize: 36, fontWeight: 700, color: kpi.color, lineHeight: 1, marginBottom: 8 }}>
                      {kpi.value}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#8A92A3", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                      {kpi.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 400, color: "#8A92A3" }}>
                      {kpi.subtitle}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: kpi.iconBg,
                      marginTop: 4,
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: kpi.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Director Actions (assigned to this coach) ── */}
      <DirectorActionsCard role="club_coach" />

      {/* ── Today's Actions (AI) ── */}
      <TodaysActionsCard summary={summary} />

      {/* ── My Roster ── */}
      <MyRosterCard athletes={data.myRoster || []} onViewPipeline={setPipelineAthleteId} />

      {/* ── Events + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UpcomingEventsCard events={data.upcomingEvents || []} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed items={data.recentActivity || []} title="Recent Activity" />
        </div>
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
