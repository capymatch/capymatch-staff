import { Users, BarChart3, Calendar, UserX, Target, MessageCircle, Mail, Clock } from "lucide-react";
import AIProgramBrief from "./AIProgramBrief";
import NeedsAttentionCard from "./NeedsAttentionCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
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

export default function DirectorView({ data, userName }) {
  const firstName = userName?.split(" ")[0] || "Director";
  const ps = data.programStatus || {};

  const kpis = [
    {
      value: ps.totalAthletes || 0,
      label: "ATHLETES",
      subtitle: `${ps.needingAttention || 0} need attention`,
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
      subtitle: ps.unassignedCount > 0 ? "Need coach assignment" : "All athletes assigned",
      color: ps.unassignedCount > 0 ? "#FFC649" : "#30C5BE",
      icon: Clock,
      iconBg: ps.unassignedCount > 0 ? "#4A3C36" : "#363D59",
    },
  ];

  return (
    <div className="space-y-6" data-testid="director-mission-control">
      {/* ── Hero Card ── */}
      <section
        className="relative rounded-[10px] overflow-hidden"
        style={{ backgroundColor: "#1E213A", padding: "32px" }}
        data-testid="director-hero"
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
          Here's your program overview for today
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

      {/* ── AI Program Brief ── */}
      <AIProgramBrief programStatus={ps} />

      {/* ── Needs Attention ── */}
      <NeedsAttentionCard items={data.needsAttention || []} />

      {/* ── Events + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UpcomingEventsCard events={data.upcomingEvents || []} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed items={data.programActivity || []} title="Program Activity" />
        </div>
      </div>
    </div>
  );
}
