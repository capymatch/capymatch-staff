import TodaysActionsCard from "./TodaysActionsCard";
import MyRosterCard from "./MyRosterCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import ActivityFeed from "./ActivityFeed";
import OnboardingChecklist from "@/components/OnboardingChecklist";

export default function CoachView({ data }) {
  return (
    <div className="space-y-8" data-testid="coach-mission-control">
      {/* Coach Onboarding Checklist (dismissible) */}
      <OnboardingChecklist />

      {/* === ABOVE THE FOLD (3 modules) === */}

      {/* 1. Today's Actions — hero */}
      <TodaysActionsCard summary={data.todays_summary} />

      {/* 2. My Roster — assigned athletes */}
      <MyRosterCard athletes={data.myRoster || []} />

      {/* 3. Upcoming Events */}
      <UpcomingEventsCard events={data.upcomingEvents || []} />

      {/* === BELOW THE FOLD === */}

      {/* 4. Recent Activity */}
      <ActivityFeed items={data.recentActivity || []} title="Recent Activity" />
    </div>
  );
}
