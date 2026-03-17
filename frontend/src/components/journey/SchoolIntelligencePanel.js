import { useState } from "react";
import {
  Target, Shield, Mail, CalendarPlus, ExternalLink,
  ChevronDown, ChevronUp, Check, AlertTriangle, Send,
} from "lucide-react";

/* ── Fit label styles ── */
const FIT_STYLES = {
  "Strong Fit":      { bg: "rgba(22,163,74,0.12)", color: "#16a34a", border: "rgba(22,163,74,0.2)" },
  "Possible Fit":    { bg: "rgba(13,148,136,0.12)", color: "#0d9488", border: "rgba(13,148,136,0.2)" },
  "Stretch":         { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.2)" },
  "Less Likely Fit": { bg: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "rgba(239,68,68,0.15)" },
  "Not Enough Data": { bg: "var(--cm-surface-2)",    color: "var(--cm-text-3)", border: "var(--cm-border)" },
};

/* sub_score key → display meta */
const SUB_SCORE_META = {
  division:     { label: "Division Fit",    color: "#0d9488" },
  region:       { label: "Geographic Fit",  color: "#6366f1" },
  priorities:   { label: "Preference Fit",  color: "#8b5cf6" },
  academics:    { label: "Academic Fit",    color: "#2563eb" },
  measurables:  { label: "Athletic Fit",    color: "#d97706" },
};

/* ── Derive engagement state (merged from opportunity/timing + coach signals) ── */
function deriveEngagementState({ signals, engagement }) {
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const hasReply = signals?.has_coach_reply;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  const hasCoachSignals = hasReply || clicks > 0 || opens > 0;

  if (hasReply || clicks > 0) {
    return {
      state: "active",
      color: "#22c55e",
      dotColor: "bg-emerald-400",
      label: "Active engagement",
      description: hasReply
        ? "Coach replied to your message"
        : "Coach engaged with your content",
    };
  }

  if (opens > 0) {
    return {
      state: "active",
      color: "#3b82f6",
      dotColor: "bg-blue-400",
      label: "Active engagement",
      description: opens > 2
        ? `Message viewed ${opens} times — coach is paying attention`
        : "Coach opened your last message",
    };
  }

  if (daysSince != null && daysSince > 14 && outreach > 0) {
    return {
      state: "stale",
      color: "#ef4444",
      dotColor: "bg-red-400",
      label: "No recent activity",
      description: `${daysSince} days since last activity — follow up recommended`,
    };
  }

  if (outreach > 0 && !hasCoachSignals) {
    return {
      state: "waiting",
      color: "#f59e0b",
      dotColor: "bg-amber-400",
      label: "No activity yet",
      description: "Outreach sent, waiting for coach response",
    };
  }

  return {
    state: "none",
    color: "#f59e0b",
    dotColor: "bg-amber-400",
    label: "No activity yet",
    description: "Start outreach to generate coach interest",
  };
}

/* ── Derive recommended strategy (unchanged logic) ── */
function deriveStrategy({ matchScore, signals, engagement, coachWatch }) {
  const score = matchScore?.match_score || 0;
  const hasReply = signals?.has_coach_reply;
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  let label, labelColor, labelBg, explanation, nextAction;

  if (hasReply && score >= 60) {
    label = "High Priority";
    labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    explanation = "Active coach engagement combined with strong fit makes this a top-priority school.";
    nextAction = "Follow up within 24 hours while interest is high.";
  } else if (hasReply) {
    label = "High Priority";
    labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    explanation = "Coach engagement is present despite moderate fit. Relationship momentum matters.";
    nextAction = "Respond promptly and reference specific program details to deepen the connection.";
  } else if (clicks > 0 || (opens > 2 && score >= 60)) {
    label = "Continue Pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Engagement signals are positive. The coach is paying attention.";
    nextAction = "Send a follow-up with updated highlights within 5\u20137 days.";
  } else if (score >= 70 && outreach > 0 && daysSince != null && daysSince <= 7) {
    label = "Continue Pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Strong fit and recent outreach. Give coaches time to respond.";
    nextAction = "Wait 5\u20137 days, then follow up with a different angle or new content.";
  } else if (score >= 60 && (daysSince == null || daysSince <= 14)) {
    label = "Continue Pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Good fit profile. Engagement has room to grow.";
    nextAction = "Increase outreach frequency and personalize each message.";
  } else if (daysSince != null && daysSince > 14 && score < 50) {
    label = "Reconsider";
    labelColor = "#ef4444"; labelBg = "rgba(239,68,68,0.08)";
    explanation = "Low fit combined with extended inactivity. Resources may be better spent elsewhere.";
    nextAction = "Focus energy on higher-fit schools and revisit if circumstances change.";
  } else if (daysSince != null && daysSince > 14) {
    label = "Reconsider";
    labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    explanation = "Extended period without activity. The relationship needs attention.";
    nextAction = "Send a re-engagement message with a specific ask or update.";
  } else if (score < 40) {
    label = "Reconsider";
    labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    explanation = "Limited match signals. Worth exploring but not a primary target.";
    nextAction = "Research the program further before investing more outreach.";
  } else {
    label = "Continue Pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Early stage with potential. Build the relationship consistently.";
    nextAction = "Send your first outreach or continue with consistent follow-ups.";
  }

  if (coachWatch?.recommendation) {
    nextAction = coachWatch.recommendation;
  }

  return { label, labelColor, labelBg, explanation, nextAction };
}

/* ── Data-quality label (replaces "confidence") ── */
function dataQualityLabel(confidence, hasCoachSignals) {
  if (confidence === "high") return null; // Good data — no label needed
  if (confidence === "medium") return { color: "#f59e0b", text: "Limited data available" };
  const reason = hasCoachSignals ? "Limited profile data" : "No coach engagement yet";
  return { color: "#f59e0b", text: `Needs more data (${reason})` };
}

/* ── Score Bar ── */
function ScoreBar({ score, max, color }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Decision-First Layout
   ══════════════════════════════════════════════════════════════ */
export default function SchoolIntelligencePanel({
  matchScore, signals, engagement, coaches, coachWatch, timeline,
  program, onEmail, onFollowUp, onNavigateToSchool,
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const ms = matchScore || {};
  const fitLabel = ms.measurables_fit?.label || "Not Enough Data";
  const fitStyle = FIT_STYLES[fitLabel] || FIT_STYLES["Not Enough Data"];
  const scoreColor = ms.match_score >= 80 ? "#10b981" : ms.match_score >= 60 ? "#f59e0b" : "var(--cm-text-3)";
  const subScores = ms.sub_scores || {};
  const matchReasons = ms.match_reasons || [];
  const riskBadges = ms.risk_badges || [];

  const engState = deriveEngagementState({ signals, engagement });
  const strategy = deriveStrategy({ matchScore: ms, signals, engagement, coachWatch });
  const hasCoachSignals = engState.state === "active";
  const dqLabel = dataQualityLabel(ms.confidence, hasCoachSignals);

  // Derive improvements from risk_badges + confidence guidance
  const improvements = [];
  if (ms.confidence_guidance) improvements.push(ms.confidence_guidance);
  riskBadges.forEach(b => { if (b.label && improvements.length < 3) improvements.push(b.label); });

  // Dynamic CTA labels
  const primaryCta = hasCoachSignals
    ? { label: "Follow Up", icon: CalendarPlus, action: onFollowUp }
    : { label: "Send First Email", icon: Send, action: onEmail };
  const secondaryCta = hasCoachSignals
    ? { label: "Email Coach", icon: Mail, action: onEmail }
    : { label: "Generate Follow-up", icon: CalendarPlus, action: onFollowUp };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="school-intelligence-panel" id="school-intelligence">
      <div style={{ height: 3, background: `linear-gradient(90deg, ${strategy.labelColor}, ${strategy.labelColor}33)` }} />

      <div className="p-5 sm:p-6 space-y-5">

        {/* ═══ 1. RECOMMENDED STRATEGY (PRIMARY — TOP) ═══ */}
        <div data-testid="si-recommended-strategy">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5" style={{ color: strategy.labelColor }} />
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
              style={{ color: strategy.labelColor, backgroundColor: strategy.labelBg, border: `1px solid ${strategy.labelColor}30` }}
              data-testid="si-strategy-label">
              {strategy.label}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed mb-1" style={{ color: "var(--cm-text-2)" }} data-testid="si-strategy-explanation">
            {strategy.explanation}
          </p>
          <p className="text-[12px] font-semibold leading-relaxed" style={{ color: "var(--cm-text)" }} data-testid="si-strategy-action">
            {strategy.nextAction}
          </p>

          {/* Dynamic CTAs — always visible without scrolling */}
          <div className="flex flex-wrap gap-2 mt-4" data-testid="si-actions">
            {primaryCta.action && (
              <button onClick={primaryCta.action}
                className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ backgroundColor: "#0d9488", color: "#fff" }}
                data-testid="si-primary-cta">
                <primaryCta.icon className="w-3.5 h-3.5" /> {primaryCta.label}
              </button>
            )}
            {secondaryCta.action && (
              <button onClick={secondaryCta.action}
                className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ color: "var(--cm-text-2)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
                data-testid="si-secondary-cta">
                <secondaryCta.icon className="w-3.5 h-3.5" /> {secondaryCta.label}
              </button>
            )}
            {onNavigateToSchool && (
              <button onClick={onNavigateToSchool}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[10px] font-semibold transition-colors"
                style={{ color: "var(--cm-text-3)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
                data-testid="si-view-details-btn">
                <ExternalLink className="w-3 h-3" /> School Details
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "var(--cm-border)" }} />

        {/* ═══ 2. ENGAGEMENT STATUS (merged opportunity + signals) ═══ */}
        <div data-testid="si-engagement-status">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${engState.dotColor}`} />
            <span className="text-[11px] font-bold" style={{ color: engState.color }} data-testid="si-engagement-label">
              {engState.label}
            </span>
          </div>
          <p className="text-[11px] leading-snug mt-1 ml-[18px]" style={{ color: "var(--cm-text-2)" }} data-testid="si-engagement-description">
            {engState.description}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "var(--cm-border)" }} />

        {/* ═══ 3. FIT SUMMARY (score + inline strengths/gaps) ═══ */}
        <div data-testid="si-fit-summary">
          <div className="flex items-center gap-3 mb-3">
            {/* Score */}
            {ms.match_score != null && ms.match_score > 0 && (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}08)`, border: `2px solid ${scoreColor}40` }}>
                <span className="text-lg font-extrabold" style={{ color: scoreColor }} data-testid="si-match-score">{ms.match_score}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {fitLabel !== "Not Enough Data" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ backgroundColor: fitStyle.bg, color: fitStyle.color, border: `1px solid ${fitStyle.border}` }}
                    data-testid="si-fit-label">
                    {fitLabel}
                  </span>
                )}
                {dqLabel && (
                  <span className="text-[9px] font-semibold" style={{ color: dqLabel.color }} data-testid="si-data-quality">
                    {dqLabel.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inline strengths + gaps */}
          <div className="grid grid-cols-1 gap-1.5">
            {matchReasons.slice(0, 3).map((r, i) => (
              <div key={`s-${i}`} className="flex items-center gap-2">
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#10b981" }} />
                <span className="text-[10.5px]" style={{ color: "var(--cm-text-2)" }}>{r}</span>
              </div>
            ))}
            {improvements.slice(0, 3).map((imp, i) => (
              <div key={`g-${i}`} className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#f59e0b" }} />
                <span className="text-[10.5px]" style={{ color: "var(--cm-text-2)" }}>{imp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 4. COLLAPSIBLE: FULL SCORE BREAKDOWN ═══ */}
        {Object.keys(subScores).length > 0 && (
          <div data-testid="si-breakdown">
            <button
              onClick={() => setBreakdownOpen(v => !v)}
              className="flex items-center gap-2 w-full text-left py-1 transition-colors"
              data-testid="si-breakdown-toggle"
            >
              <span className="text-[10px] font-semibold" style={{ color: "var(--cm-text-3)" }}>
                {breakdownOpen ? "Hide Full Breakdown" : "View Full Breakdown"}
              </span>
              {breakdownOpen
                ? <ChevronUp className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
                : <ChevronDown className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
              }
            </button>

            {breakdownOpen && (
              <div className="space-y-2.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--cm-border)" }}>
                {Object.entries(subScores).map(([key, ss]) => {
                  const meta = SUB_SCORE_META[key] || { label: key, color: "#94a3b8" };
                  return (
                    <div key={key} className="flex items-center gap-3" data-testid={`si-breakdown-${key}`}>
                      <span className="text-[10px] font-semibold w-24 flex-shrink-0" style={{ color: "var(--cm-text-2)" }}>{meta.label}</span>
                      <ScoreBar score={ss.score || 0} max={ss.max || 100} color={meta.color} />
                      <span className="text-[10px] font-bold w-10 text-right flex-shrink-0" style={{ color: meta.color }}>
                        {ss.score || 0}/{ss.max || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
