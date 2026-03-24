import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Target, AlertTriangle, Calendar, MessageCircle, Focus, ChevronRight } from "lucide-react";
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
              <span
                className="flex items-center gap-1.5 mt-1"
                style={{ fontSize: 11, color: "#5c5e6a" }}
                data-testid="live-updated-label"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Updated {timeSinceLabel}
              </span>
            </div>
            <span
              className="hidden sm:inline-block text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", color: "#8b8d98", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {getDateLabel()}
            </span>
          </div>

          {/* KPIs — Asymmetric: Need Attention dominant, others secondary */}
          <div className="mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
            <div className="flex items-stretch gap-5 sm:gap-6">

              {/* ── PRIMARY: Need Attention ── */}
              <div className="flex-shrink-0" data-testid="kpi-primary-block">
                <div className="flex items-center gap-2">
                  {(summary.needingAction || 0) > 0 && (
                    <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444", opacity: 0.7 }} />
                  )}
                  <span
                    className="text-[40px] sm:text-[48px] font-black tabular-nums leading-none"
                    style={{
                      color: (summary.needingAction || 0) > 0 ? "#ef4444" : "#f0f0f2",
                      transition: "transform 0.3s ease",
                      transform: pulseKeys.has("NEED ATTENTION") ? "scale(1.05)" : "scale(1)",
                    }}
                    data-testid="kpi-value-need-attention"
                  >
                    {summary.needingAction || 0}
                  </span>
                  {pulseKeys.has("NEED ATTENTION") && (
                    <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: "#ef4444" }} data-testid="kpi-pulse-need-attention" />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1" style={{ color: (summary.needingAction || 0) > 0 ? "#ef4444" : "#5c5e6a" }}>
                  Need Attention
                </p>
              </div>

              {/* ── SECONDARY: Spaced row, neutral ── */}
              <div className="flex items-center gap-6 sm:gap-10 flex-1 min-w-0 pl-5 sm:pl-6" style={{ borderLeft: "1px solid rgba(255,255,255,0.03)" }} data-testid="kpi-secondary-block">
                {[
                  { value: summary.athleteCount || 0, label: "Athletes", key: "MY ATHLETES" },
                  { value: summary.upcomingEvents || 0, label: "Events", key: "EVENTS THIS WEEK" },
                  { value: directorRequestCount, label: "Requests", key: "DIRECTOR REQUESTS" },
                ].map((m) => {
                  const isPulsing = pulseKeys.has(m.key);
                  return (
                    <div key={m.key} className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-none"
                          style={{
                            color: "#5c5e6a",
                            transition: "transform 0.3s ease",
                            transform: isPulsing ? "scale(1.08)" : "scale(1)",
                          }}
                          data-testid={`kpi-value-${m.key.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {m.value}
                        </span>
                        {isPulsing && (
                          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: "#5c5e6a" }} data-testid={`kpi-pulse-${m.key.toLowerCase().replace(/\s+/g, "-")}`} />
                        )}
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] mt-1" style={{ color: "#3d3f4a" }}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Top Priority action row ── */}
          {priorities.length > 0 && (() => {
            const top = priorities[0];
            return (
              <div
                className="flex items-center justify-between gap-3 mt-4 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                data-testid="hero-top-priority"
              >
                <p className="text-[12px] min-w-0" style={{ color: "#8b8d98" }}>
                  <span style={{ color: "#5c5e6a" }}>Top priority: </span>
                  <span className="font-semibold" style={{ color: "#f0f0f2" }}>{top.athleteName || top.athlete_name}</span>
                  {top.schoolName && <span style={{ color: "#5c5e6a" }}> — {top.schoolName}</span>}
                </p>
                <button
                  onClick={() => navigate(`/support-pods/${top.athleteId || top.athlete_id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
                  style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                  data-testid="hero-top-priority-cta"
                >
                  Review blocker <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            );
          })()}
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
