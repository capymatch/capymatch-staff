import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Target, AlertTriangle, Calendar, MessageCircle, Focus } from "lucide-react";
import { toast } from "sonner";
import RosterSection from "./RosterSection";
import UpcomingEventsCard from "./UpcomingEventsCard";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import AthletePipelinePanel from "./AthletePipelinePanel";
import CoachInbox from "./CoachInbox";
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
        toast.info(`${curr.name.split(" ")[0]}'s activity has declined — review needed`, {
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
  const [inboxAthleteIds, setInboxAthleteIds] = useState([]);
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

  // Fetch coach-inbox athlete IDs to exclude from "All Clear"
  const fetchInboxIds = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/coach-inbox`, { headers: { Authorization: `Bearer ${token}` } });
      const ids = (res.data.items || []).map(i => i.athleteId).filter(Boolean);
      setInboxAthleteIds(ids);
    } catch {}
  }, []);

  useEffect(() => { fetchDirectorCount(); fetchInboxIds(); }, [fetchDirectorCount, fetchInboxIds]);
  useEffect(() => {
    const t = setInterval(fetchDirectorCount, 45_000);
    return () => clearInterval(t);
  }, [fetchDirectorCount]);

  const { pulseKeys, timeSinceLabel } = useLiveIndicators(data, directorRequestCount);

  const kpis = [
    { value: summary.athleteCount || 0, label: "MY ATHLETES", icon: Target },
    { value: summary.needingAction || 0, label: "NEED ATTENTION", icon: AlertTriangle },
    { value: summary.upcomingEvents || 0, label: "EVENTS THIS WEEK", icon: Calendar },
    { value: directorRequestCount, label: "DIRECTOR REQUESTS", icon: MessageCircle },
  ];

  return (
    <div className="space-y-5" data-testid="coach-mission-control">
      <OnboardingChecklist />

      {/* ── Hero Card ── */}
      <section
        className="relative rounded-xl overflow-hidden"
        style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.06)" }}
        data-testid="coach-hero"
      >
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] sm:text-[20px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.01em" }}>
                {getGreeting()}, <span style={{ color: "#f0f0f2" }}>{firstName}</span>
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "#5c5e6a" }}>
                Here's what's happening with your athletes today
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="flex items-center gap-1.5"
                style={{ fontSize: 11, color: "#3d3f4a" }}
                data-testid="live-updated-label"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Updated {timeSinceLabel}
              </span>
              <span
                className="hidden sm:inline-block text-[10px] font-semibold px-2.5 py-1 rounded-md"
                style={{ background: "rgba(255,255,255,0.06)", color: "#8b8d98", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {getDateLabel()}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              const isPulsing = pulseKeys.has(kpi.label);
              const isAlert = kpi.label === "NEED ATTENTION" && kpi.value > 0;
              const isRequest = kpi.label === "DIRECTOR REQUESTS" && kpi.value > 0;
              const valueColor = isAlert ? "#ef4444" : isRequest ? "#f59e0b" : "#f0f0f2";
              const labelColor = isAlert ? "#ef4444" : isRequest ? "#f59e0b" : "#5c5e6a";
              return (
                <div
                  key={kpi.label}
                  className="flex flex-col items-center text-center py-2"
                  style={idx < kpis.length - 1 ? { borderRight: "1px solid rgba(255,255,255,0.04)" } : {}}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[22px] sm:text-[26px] font-bold tabular-nums"
                      style={{
                        color: valueColor,
                        lineHeight: 1,
                        transition: "transform 0.3s ease",
                        transform: isPulsing ? "scale(1.08)" : "scale(1)",
                      }}
                      data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {kpi.value}
                    </span>
                    {isPulsing && (
                      <span
                        className="w-2 h-2 rounded-full animate-ping"
                        style={{ backgroundColor: valueColor, marginBottom: 6 }}
                        data-testid={`kpi-pulse-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] mt-1.5 block" style={{ color: labelColor }}>
                    {kpi.label}
                  </span>
                </div>
              );
            })}
          </div>
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

      {/* ── Risk Engine v3 Coach Inbox ── */}
      <CoachInbox />

      {/* ── Athletes Requiring Attention + On Track + Event Prep ── */}
      <RosterSection athletes={data.myRoster || []} eventPrep={priorities.filter(p => p.urgency === "event_prep")} excludeIds={inboxAthleteIds} />

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
