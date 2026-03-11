import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Target, AlertTriangle, Calendar, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import TodaysPrioritiesCard from "./TodaysPrioritiesCard";
import MyRosterCard from "./MyRosterCard";
import UpcomingEventsCard from "./UpcomingEventsCard";
import ActivityFeed from "./ActivityFeed";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import AthletePipelinePanel from "./AthletePipelinePanel";
import DirectorActionsCard from "./DirectorActionsCard";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function timeSince(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Live change detection ───────────────────────
function useLiveIndicators(data, directorRequestCount) {
  const prevRef = useRef(null);
  const isFirstLoad = useRef(true);
  const [pulseKeys, setPulseKeys] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [, forceRender] = useState(0);

  // Tick every 15s to update "Xs ago" label
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Skip first load — no comparisons on initial data
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevRef.current = { data, directorRequestCount };
      return;
    }

    const prev = prevRef.current;
    if (!prev || !data) { prevRef.current = { data, directorRequestCount }; return; }

    const prevSummary = prev.data?.todays_summary || {};
    const currSummary = data.todays_summary || {};
    const changed = new Set();

    // Detect KPI changes
    if (currSummary.needingAction !== prevSummary.needingAction) changed.add("NEED ACTION");
    if (currSummary.upcomingEvents !== prevSummary.upcomingEvents) changed.add("EVENTS THIS WEEK");
    if (currSummary.athleteCount !== prevSummary.athleteCount) changed.add("MY ATHLETES");
    if (directorRequestCount !== prev.directorRequestCount) changed.add("DIRECTOR REQUESTS");

    // Quiet toasts for high-priority changes only
    if (directorRequestCount > prev.directorRequestCount) {
      const diff = directorRequestCount - prev.directorRequestCount;
      toast.info(`${diff} new director request${diff > 1 ? "s" : ""}`, {
        description: "Tap to review",
        duration: 4000,
      });
    }

    const prevCritical = (prev.data?.priorities || []).filter(p => p.urgency === "critical").length;
    const currCritical = (data.priorities || []).filter(p => p.urgency === "critical").length;
    if (currCritical > prevCritical) {
      toast.info(`${currCritical - prevCritical} new critical issue${currCritical - prevCritical > 1 ? "s" : ""}`, {
        description: "Athlete needs immediate attention",
        duration: 4000,
      });
    }

    // Detect major momentum drops
    const prevRoster = prev.data?.myRoster || [];
    const currRoster = data.myRoster || [];
    for (const curr of currRoster) {
      const old = prevRoster.find(a => a.id === curr.id);
      if (old && old.momentum_score - curr.momentum_score >= 15 && curr.momentum_trend === "declining") {
        toast.info(`${curr.name.split(" ")[0]}'s momentum dropped significantly`, {
          description: `Score: ${old.momentum_score} → ${curr.momentum_score}`,
          duration: 5000,
        });
        break; // Only one toast per poll
      }
    }

    if (changed.size > 0) {
      setPulseKeys(changed);
      setLastUpdated(Date.now());
      setTimeout(() => setPulseKeys(new Set()), 3000);
    }

    prevRef.current = { data, directorRequestCount };
  }, [data, directorRequestCount]);

  return { pulseKeys, lastUpdated, timeSinceLabel: timeSince(lastUpdated) };
}

export default function CoachView({ data, userName }) {
  const [pipelineAthleteId, setPipelineAthleteId] = useState(null);
  const [directorRequestCount, setDirectorRequestCount] = useState(0);
  const navigate = useNavigate();
  const firstName = userName?.split(" ")[0] || "Coach";
  const summary = data.todays_summary || {};
  const summaryLines = data.summary_lines || [];
  const priorities = data.priorities || [];

  // Fetch director actions count (also polled)
  const fetchDirectorCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/director/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const actions = res.data.actions || [];
      const openCount = actions.filter(a => a.status === "open" || a.status === "acknowledged").length;
      setDirectorRequestCount(openCount);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { fetchDirectorCount(); }, [fetchDirectorCount]);

  // Poll director count in sync with main data
  useEffect(() => {
    const t = setInterval(fetchDirectorCount, 45_000);
    return () => clearInterval(t);
  }, [fetchDirectorCount]);

  // Live change detection
  const { pulseKeys, timeSinceLabel } = useLiveIndicators(data, directorRequestCount);

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
      value: directorRequestCount,
      label: "DIRECTOR REQUESTS",
      subtitle: directorRequestCount > 0 ? "Need your attention" : "All clear",
      color: directorRequestCount > 0 ? "#FFC649" : "#30C5BE",
      icon: MessageCircle,
      iconBg: directorRequestCount > 0 ? "#4A3C36" : "#363D59",
    },
  ];

  const scrollToPriorities = () => {
    const el = document.querySelector('[data-testid="todays-priorities-card"]');
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        {/* Top-right: date + live indicator */}
        <div className="absolute flex items-center gap-3" style={{ top: 24, right: 28 }}>
          <span
            className="flex items-center gap-1.5"
            style={{ fontSize: 11, color: "#5a6278" }}
            data-testid="live-updated-label"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Updated {timeSinceLabel}
          </span>
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

        {/* KPIs with live pulse */}
        <div className="flex flex-wrap sm:flex-nowrap">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const isPulsing = pulseKeys.has(kpi.label);
            return (
              <div key={kpi.label} className="flex flex-1 min-w-0" style={{ paddingRight: idx < kpis.length - 1 ? 24 : 0, marginRight: idx < kpis.length - 1 ? 24 : 0, borderRight: idx < kpis.length - 1 ? "1px solid #363D59" : "none" }}>
                <div className="flex items-start justify-between w-full">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        style={{
                          fontSize: 36, fontWeight: 700, color: kpi.color, lineHeight: 1, marginBottom: 8,
                          transition: "transform 0.3s ease",
                          transform: isPulsing ? "scale(1.08)" : "scale(1)",
                        }}
                        data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {kpi.value}
                      </p>
                      {isPulsing && (
                        <span
                          className="w-2 h-2 rounded-full animate-ping"
                          style={{ backgroundColor: kpi.color, marginBottom: 8 }}
                          data-testid={`kpi-pulse-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                      )}
                    </div>
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

      {/* ── Quick Summary Card ── */}
      {summaryLines.length > 0 && (
        <section
          className="rounded-xl border p-5"
          style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
          data-testid="coach-summary-card"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              {summaryLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: line.includes("momentum") || line.includes("blocker")
                        ? "#ef4444"
                        : line.includes("event") || line.includes("prep")
                        ? "#8b5cf6"
                        : line.includes("on track")
                        ? "#10b981"
                        : "#f59e0b",
                    }}
                  />
                  <span className="text-sm" style={{ color: "var(--cm-text-2)" }}>{line}</span>
                </div>
              ))}
            </div>
            {priorities.length > 0 && (
              <button
                onClick={scrollToPriorities}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: "#1E213A", color: "#30C5BE" }}
                data-testid="review-priorities-btn"
              >
                Review Priorities
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Today's Priorities (main work queue) ── */}
      <TodaysPrioritiesCard priorities={priorities} />

      {/* ── Director Actions (assigned to this coach) ── */}
      <DirectorActionsCard role="club_coach" />

      {/* ── My Roster ── */}
      <MyRosterCard athletes={data.myRoster || []} onViewPipeline={setPipelineAthleteId} />

      {/* ── Events + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UpcomingEventsCard events={data.upcomingEvents || []} roster={data.myRoster || []} />
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
