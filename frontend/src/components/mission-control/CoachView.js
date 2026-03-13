import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Target, AlertTriangle, Calendar, MessageCircle, Focus } from "lucide-react";
import { toast } from "sonner";
import RosterSection from "./RosterSection";
import UpcomingEventsCard from "./UpcomingEventsCard";
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

  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
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

    if (currSummary.needingAction !== prevSummary.needingAction) changed.add("NEED ATTENTION");
    if (currSummary.upcomingEvents !== prevSummary.upcomingEvents) changed.add("EVENTS THIS WEEK");
    if (currSummary.athleteCount !== prevSummary.athleteCount) changed.add("MY ATHLETES");
    if (directorRequestCount !== prev.directorRequestCount) changed.add("DIRECTOR REQUESTS");

    if (prev.directorRequestCount > 0 && directorRequestCount > prev.directorRequestCount) {
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

    const prevRoster = prev.data?.myRoster || [];
    const currRoster = data.myRoster || [];
    for (const curr of currRoster) {
      const old = prevRoster.find(a => a.id === curr.id);
      if (old && old.momentum_score - curr.momentum_score >= 15 && curr.momentum_trend === "declining") {
        toast.info(`${curr.name.split(" ")[0]}'s momentum dropped significantly`, {
          description: `Score: ${old.momentum_score} \u2192 ${curr.momentum_score}`,
          duration: 5000,
        });
        break;
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
  const [focusMode, setFocusMode] = useState(false);
  const navigate = useNavigate();
  const firstName = userName?.split(" ")[0] || "Coach";
  const summary = data.todays_summary || {};
  const priorities = data.priorities || [];

  const fetchDirectorCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/director/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const actions = res.data.actions || [];
      const openCount = actions.filter(a => a.status === "open" || a.status === "acknowledged").length;
      setDirectorRequestCount(openCount);
    } catch {}
  }, []);

  useEffect(() => { fetchDirectorCount(); }, [fetchDirectorCount]);
  useEffect(() => {
    const t = setInterval(fetchDirectorCount, 45_000);
    return () => clearInterval(t);
  }, [fetchDirectorCount]);

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
      label: "NEED ATTENTION",
      subtitle: "Athletes need attention",
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

  return (
    <div className="space-y-5" data-testid="coach-mission-control">
      <OnboardingChecklist />

      {/* ── Hero Card ── */}
      <section
        className="relative rounded-[10px] overflow-hidden"
        style={{ backgroundColor: "#1E213A", padding: "20px 24px" }}
        data-testid="coach-hero"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xl sm:text-[26px] font-semibold text-white leading-tight">
              {getGreeting()},{" "}
              <span style={{ color: "#30C5BE" }}>{firstName}</span>
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#8A92A3" }}>
              Here's what's happening with your athletes today
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="flex items-center gap-1.5"
              style={{ fontSize: 11, color: "#5a6278" }}
              data-testid="live-updated-label"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Updated {timeSinceLabel}
            </span>
            <span
              className="hidden sm:inline-block font-medium"
              style={{
                backgroundColor: "#363D59",
                color: "#E5E5E5",
                fontSize: 13,
                padding: "6px 14px",
                borderRadius: 6,
              }}
            >
              {getDateLabel()}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #363D59", margin: "0 0 16px 0" }} />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const isPulsing = pulseKeys.has(kpi.label);
            return (
              <div
                key={kpi.label}
                className="sm:flex-1 sm:min-w-0"
                style={{
                  paddingRight: idx < kpis.length - 1 ? "clamp(8px, 2vw, 20px)" : 0,
                  paddingLeft: idx > 0 ? "clamp(8px, 2vw, 20px)" : 0,
                  borderRight: idx < kpis.length - 1 ? "1px solid #363D59" : "none",
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <div className="flex items-start justify-between w-full">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className="text-2xl sm:text-3xl font-bold leading-none mb-1.5"
                        style={{
                          color: kpi.color,
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
                          style={{ backgroundColor: kpi.color, marginBottom: 6 }}
                          data-testid={`kpi-pulse-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#8A92A3" }}>
                      {kpi.label}
                    </p>
                    <p className="text-[11px] hidden sm:block" style={{ color: "#8A92A3" }}>
                      {kpi.subtitle}
                    </p>
                  </div>
                  <div
                    className="hidden sm:flex items-center justify-center shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: kpi.iconBg,
                      marginTop: 2,
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, color: kpi.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Focus Mode Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setFocusMode(!focusMode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            backgroundColor: focusMode ? "rgba(13,148,136,0.12)" : "transparent",
            color: focusMode ? "#0d9488" : "var(--cm-text-3)",
            border: focusMode ? "1px solid rgba(13,148,136,0.25)" : "1px solid var(--cm-border)",
          }}
          data-testid="focus-mode-toggle"
        >
          <Focus className="w-3.5 h-3.5" />
          {focusMode ? "Focus Mode On" : "Focus Mode"}
        </button>
      </div>

      {/* ── Athletes Requiring Attention + On Track + Event Prep ── */}
      <RosterSection athletes={data.myRoster || []} eventPrep={priorities.filter(p => p.urgency === "event_prep")} />

      {/* ── Upcoming Events (hidden in focus mode) ── */}
      {!focusMode && (
        <UpcomingEventsCard events={data.upcomingEvents || []} roster={data.myRoster || []} />
      )}

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
