import AIProgramBrief from "./AIProgramBrief";
import ProgramStatusRow from "./ProgramStatusRow";
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

  return (
    <div className="space-y-6" data-testid="director-mission-control">
      {/* ── Hero Section ── */}
      <section className="relative rounded-2xl bg-[#1A232A] overflow-hidden px-8 pt-7 pb-8" data-testid="director-hero">
        {/* Date badge */}
        <div className="absolute top-6 right-7">
          <span className="px-3 py-1.5 rounded-full bg-white/10 text-[12px] text-white/50 font-medium">
            {getDateLabel()}
          </span>
        </div>

        {/* Greeting */}
        <h2 className="text-xl text-white/70 font-normal mb-0.5">
          {getGreeting()}, <span className="text-[#4CAF50] font-bold text-2xl">{firstName}</span>
        </h2>
        <p className="text-sm text-white/40 mb-8">
          Here's your program overview for today
        </p>

        {/* Inline KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <KpiItem
            value={ps.totalAthletes || 0}
            label="ATHLETES"
            subtitle={`${ps.needingAttention || 0} need attention`}
            iconBg="bg-emerald-500/20"
            iconColor="text-emerald-400"
          />
          <KpiItem
            value={ps.activeCoaches || 0}
            label="COACHES"
            subtitle="Active in program"
            iconBg="bg-blue-500/20"
            iconColor="text-blue-400"
          />
          <KpiItem
            value={ps.upcomingEvents || 0}
            label="EVENTS AHEAD"
            subtitle="Next 14 days"
            iconBg="bg-violet-500/20"
            iconColor="text-violet-400"
          />
          <KpiItem
            value={ps.unassignedCount || 0}
            label="UNASSIGNED"
            subtitle={ps.unassignedCount > 0 ? "Need coach assignment" : "All athletes assigned"}
            iconBg="bg-amber-500/20"
            iconColor="text-amber-400"
            alert={ps.unassignedCount > 0}
          />
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

function KpiItem({ value, label, subtitle, iconBg, iconColor, alert }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-3xl font-bold tracking-tight ${alert ? "text-amber-400" : "text-[#4CAF50]"}`}>
          {value}
        </p>
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">{label}</p>
        <p className="text-[11px] text-white/25 mt-0.5">{subtitle}</p>
      </div>
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-1`}>
        <div className={`w-2.5 h-2.5 rounded-full ${iconColor} ${alert ? "animate-pulse" : ""}`}
          style={{ backgroundColor: "currentColor" }}
        />
      </div>
    </div>
  );
}
