import AIProgramBrief from "./AIProgramBrief";
import ProgramStatusRow from "./ProgramStatusRow";
import NeedsAttentionCard from "./NeedsAttentionCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import ActivityFeed from "./ActivityFeed";

export default function DirectorView({ data }) {
  return (
    <div className="space-y-8" data-testid="director-mission-control">
      {/* === ABOVE THE FOLD (3 modules) === */}

      {/* 1. AI Program Brief — hero */}
      <AIProgramBrief programStatus={data.programStatus} />

      {/* 2. Program Status — compact KPI row */}
      <ProgramStatusRow status={data.programStatus} />

      {/* 3. Needs Attention — max 5 critical items */}
      <NeedsAttentionCard items={data.needsAttention || []} />

      {/* === BELOW THE FOLD === */}

      {/* 4 + 5. Events + Activity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
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
