import {
  Target, TrendingUp, AlertTriangle, Shield, Clock, Eye,
  Mail, CalendarPlus, ExternalLink, ArrowUpRight,
  MessageCircle, Activity,
} from "lucide-react";

/* ── Fit label styles ── */
const FIT_STYLES = {
  "Strong Fit":      { bg: "rgba(22,163,74,0.12)", color: "#16a34a", border: "rgba(22,163,74,0.2)" },
  "Possible Fit":    { bg: "rgba(13,148,136,0.12)", color: "#0d9488", border: "rgba(13,148,136,0.2)" },
  "Stretch":         { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.2)" },
  "Less Likely Fit": { bg: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "rgba(239,68,68,0.15)" },
  "Not Enough Data": { bg: "var(--cm-surface-2)",    color: "var(--cm-text-3)", border: "var(--cm-border)" },
};

const CONF_MAP = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  estimated: "Estimated",
};

/* sub_score key → display meta */
const SUB_SCORE_META = {
  division:     { label: "Division Fit",    color: "#0d9488" },
  region:       { label: "Geographic Fit",  color: "#6366f1" },
  priorities:   { label: "Preference Fit",  color: "#8b5cf6" },
  academics:    { label: "Academic Fit",    color: "#2563eb" },
  measurables:  { label: "Athletic Fit",    color: "#d97706" },
};

/* ── Derive opportunity & timing ── */
function deriveOpportunityTiming({ matchScore, signals, engagement, coachWatch }) {
  const score = matchScore?.match_score || 0;
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const hasReply = signals?.has_coach_reply;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  // Opportunity level
  let opportunityLevel, opportunityColor;
  if (hasReply || clicks > 0) {
    opportunityLevel = "High";
    opportunityColor = "#22c55e";
  } else if (opens > 0 && score >= 60) {
    opportunityLevel = "Medium";
    opportunityColor = "#f59e0b";
  } else if (score >= 70) {
    opportunityLevel = "Medium";
    opportunityColor = "#f59e0b";
  } else {
    opportunityLevel = "Low";
    opportunityColor = "#94a3b8";
  }

  // Timing window
  let timingWindow, timingColor;
  if (hasReply && daysSince != null && daysSince <= 3) {
    timingWindow = "Active";
    timingColor = "#22c55e";
  } else if (daysSince != null && daysSince <= 7 && outreach > 0) {
    timingWindow = "Good";
    timingColor = "#3b82f6";
  } else if (daysSince != null && daysSince > 14) {
    timingWindow = "Weak";
    timingColor = "#ef4444";
  } else {
    timingWindow = "Good";
    timingColor = "#3b82f6";
  }

  // Signals (2-4 bullets)
  const bullets = [];
  if (hasReply) {
    bullets.push("Coach replied — direct engagement confirmed");
  } else if (outreach > 0 && opens === 0) {
    bullets.push("No direct coach reply yet");
  }
  if (clicks > 0) {
    bullets.push("Coach engaged with your content link");
  } else if (opens > 2) {
    bullets.push("Message viewed multiple times — passive interest detected");
  } else if (opens > 0) {
    bullets.push("Coach opened your last message");
  }
  if (daysSince != null && daysSince > 7 && outreach > 0) {
    bullets.push(`${daysSince} days since last activity — may need re-engagement`);
  }
  if (score >= 75 && !hasReply) {
    bullets.push("Strong fit profile — worth continued pursuit");
  }
  if (bullets.length === 0) {
    bullets.push("No engagement signals yet — start outreach to generate data");
  }

  return { opportunityLevel, opportunityColor, timingWindow, timingColor, bullets: bullets.slice(0, 4) };
}

/* ── Derive coach signals ── */
function deriveCoachSignals({ engagement, signals, coachWatch }) {
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const hasReply = signals?.has_coach_reply;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  const items = [];
  if (hasReply) {
    items.push({ icon: MessageCircle, color: "#22c55e", text: "Coach replied to your message" });
  }
  if (clicks > 0) {
    items.push({ icon: ArrowUpRight, color: "#22c55e", text: "Coach clicked a link in your outreach" });
  }
  if (opens > 2 && items.length < 3) {
    items.push({ icon: Eye, color: "#3b82f6", text: `Your message was opened ${opens} times` });
  } else if (opens > 0 && items.length < 3) {
    items.push({ icon: Eye, color: "#3b82f6", text: "Coach opened your last message" });
  }
  if (outreach > 0 && opens === 0 && !hasReply && items.length < 3) {
    items.push({ icon: Activity, color: "#f59e0b", text: "No reply after recent outreach" });
  }
  if (daysSince != null && daysSince > 7 && items.length < 3) {
    items.push({ icon: Clock, color: "#94a3b8", text: `${daysSince} days inactive — engagement is passive` });
  }
  if (items.length === 0) {
    items.push({ icon: Activity, color: "#64748b", text: "No signals yet — send your first outreach" });
  }
  return items.slice(0, 3);
}

/* ── Derive recommended strategy ── */
function deriveStrategy({ matchScore, signals, engagement, coachWatch }) {
  const score = matchScore?.match_score || 0;
  const hasReply = signals?.has_coach_reply;
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  let label, labelColor, labelBg, explanation, nextAction;

  if (hasReply && score >= 60) {
    label = "Prioritize now";
    labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    explanation = "Active coach engagement combined with strong fit makes this a top-priority school.";
    nextAction = "Follow up within 24 hours while interest is high.";
  } else if (hasReply) {
    label = "Prioritize now";
    labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    explanation = "Coach engagement is present despite moderate fit. Relationship momentum matters.";
    nextAction = "Respond promptly and reference specific program details to deepen the connection.";
  } else if (clicks > 0 || (opens > 2 && score >= 60)) {
    label = "Continue pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Engagement signals are positive. The coach is paying attention.";
    nextAction = "Send a follow-up with updated highlights within 5-7 days.";
  } else if (score >= 70 && outreach > 0 && daysSince != null && daysSince <= 7) {
    label = "Continue pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Strong fit and recent outreach. Give coaches time to respond.";
    nextAction = "Wait 5-7 days, then follow up with a different angle or new content.";
  } else if (score >= 60 && (daysSince == null || daysSince <= 14)) {
    label = "Continue pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Good fit profile. Engagement has room to grow.";
    nextAction = "Increase outreach frequency and personalize each message.";
  } else if (daysSince != null && daysSince > 14 && score < 50) {
    label = "Deprioritize";
    labelColor = "#ef4444"; labelBg = "rgba(239,68,68,0.08)";
    explanation = "Low fit combined with extended inactivity. Resources may be better spent elsewhere.";
    nextAction = "Focus energy on higher-fit schools and revisit if circumstances change.";
  } else if (daysSince != null && daysSince > 14) {
    label = "Monitor";
    labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    explanation = "Extended period without activity. The relationship needs attention.";
    nextAction = "Send a re-engagement message with a specific ask or update.";
  } else if (score < 40) {
    label = "Monitor";
    labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    explanation = "Limited match signals. Worth exploring but not a primary target.";
    nextAction = "Research the program further before investing more outreach.";
  } else {
    label = "Continue pursuing";
    labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    explanation = "Early stage with potential. Build the relationship consistently.";
    nextAction = "Send your first outreach or continue with consistent follow-ups.";
  }

  // Override with coachWatch if available
  if (coachWatch?.recommendation) {
    nextAction = coachWatch.recommendation;
  }

  return { label, labelColor, labelBg, explanation, nextAction };
}

/* ── Generate 1-line summary ── */
function generateSummary({ matchScore, signals, engagement }) {
  const score = matchScore?.match_score || 0;
  const fitLabel = matchScore?.measurables_fit?.label || "";
  const hasReply = signals?.has_coach_reply;
  const opens = engagement?.total_opens || 0;
  const daysSince = signals?.days_since_activity;

  const fitPart = score >= 75 ? "Strong academic and athletic fit"
    : score >= 55 ? "Moderate fit across key dimensions"
    : score > 0 ? "Limited match signals on paper"
    : "Fit data not yet available";

  let engagementPart;
  if (hasReply) engagementPart = "with active coach engagement.";
  else if (opens > 2) engagementPart = "with growing coach interest.";
  else if (opens > 0) engagementPart = "with early coach attention.";
  else if (daysSince != null && daysSince > 14) engagementPart = "but coach engagement has gone quiet.";
  else engagementPart = "but limited coach engagement so far.";

  return `${fitPart}, ${engagementPart}`;
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
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function SchoolIntelligencePanel({
  matchScore, signals, engagement, coaches, coachWatch, timeline,
  program, onEmail, onFollowUp, onNavigateToSchool,
}) {
  const ms = matchScore || {};
  const fitLabel = ms.measurables_fit?.label || "Not Enough Data";
  const fitStyle = FIT_STYLES[fitLabel] || FIT_STYLES["Not Enough Data"];
  const conf = CONF_MAP[ms.confidence] || "";
  const scoreColor = ms.match_score >= 80 ? "#10b981" : ms.match_score >= 60 ? "#f59e0b" : "var(--cm-text-3)";
  const subScores = ms.sub_scores || {};
  const matchReasons = ms.match_reasons || [];
  const riskBadges = ms.risk_badges || [];

  const summary = generateSummary({ matchScore: ms, signals, engagement });
  const opp = deriveOpportunityTiming({ matchScore: ms, signals, engagement, coachWatch });
  const coachSignals = deriveCoachSignals({ engagement, signals, coachWatch });
  const strategy = deriveStrategy({ matchScore: ms, signals, engagement, coachWatch });

  // Derive improvements from risk_badges + confidence guidance
  const improvements = [];
  if (ms.confidence_guidance) improvements.push(ms.confidence_guidance);
  riskBadges.forEach(b => {
    if (b.label && improvements.length < 4) improvements.push(b.label);
  });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="school-intelligence-panel" id="school-intelligence">
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}33)` }} />

      <div className="p-5 sm:p-6 space-y-6">

        {/* ═══ SECTION A — HEADER ═══ */}
        <div data-testid="si-header">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[10px] font-extrabold uppercase tracking-[1.5px]" style={{ color: "var(--cm-text-3)" }}>School Intelligence</span>
          </div>

          <div className="flex items-start gap-4">
            {/* Score circle */}
            {ms.match_score != null && ms.match_score > 0 && (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}08)`, border: `2px solid ${scoreColor}40` }}>
                <span className="text-xl font-extrabold" style={{ color: scoreColor }} data-testid="si-match-score">{ms.match_score}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {fitLabel !== "Not Enough Data" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{ backgroundColor: fitStyle.bg, color: fitStyle.color, border: `1px solid ${fitStyle.border}` }}
                    data-testid="si-fit-label">
                    {fitLabel}
                  </span>
                )}
                {conf && (
                  <span className="text-[9px] font-semibold italic" style={{ color: "var(--cm-text-3)" }} data-testid="si-confidence">{conf}</span>
                )}
              </div>
              {/* 1-line summary */}
              <p className="text-[11px] leading-snug" style={{ color: "var(--cm-text-2)" }} data-testid="si-summary">
                {summary}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ SECTION B — SCORE BREAKDOWN ═══ */}
        {Object.keys(subScores).length > 0 && (
          <div data-testid="si-breakdown">
            <h3 className="text-[10px] font-bold uppercase tracking-[1px] mb-3" style={{ color: "var(--cm-text-3)" }}>
              Score Breakdown
            </h3>
            <div className="space-y-2.5">
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
          </div>
        )}

        {/* ═══ SECTION C — STRENGTHS & RISKS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strengths */}
          {matchReasons.length > 0 && (
            <div data-testid="si-strengths">
              <h3 className="text-[10px] font-bold uppercase tracking-[1px] mb-2 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
                <TrendingUp className="w-3 h-3" style={{ color: "#10b981" }} />
                Strengths
              </h3>
              <div className="space-y-1.5">
                {matchReasons.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#10b981" }} />
                    <span className="text-[11px] leading-snug" style={{ color: "var(--cm-text-2)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks / Gaps */}
          {improvements.length > 0 && (
            <div data-testid="si-risks">
              <h3 className="text-[10px] font-bold uppercase tracking-[1px] mb-2 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
                <AlertTriangle className="w-3 h-3" style={{ color: "#f59e0b" }} />
                Risks / Gaps
              </h3>
              <div className="space-y-1.5">
                {improvements.slice(0, 4).map((imp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
                    <span className="text-[11px] leading-snug" style={{ color: "var(--cm-text-2)" }}>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ SECTION D — OPPORTUNITY & TIMING (NEW) ═══ */}
        <div data-testid="si-opportunity-timing">
          <h3 className="text-[10px] font-bold uppercase tracking-[1px] mb-3" style={{ color: "var(--cm-text-3)" }}>
            Opportunity & Timing
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase" style={{ color: "var(--cm-text-3)" }}>Opportunity</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ color: opp.opportunityColor, backgroundColor: `${opp.opportunityColor}12`, border: `1px solid ${opp.opportunityColor}22` }}
                data-testid="si-opportunity-level">
                {opp.opportunityLevel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase" style={{ color: "var(--cm-text-3)" }}>Timing</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ color: opp.timingColor, backgroundColor: `${opp.timingColor}12`, border: `1px solid ${opp.timingColor}22` }}
                data-testid="si-timing-window">
                {opp.timingWindow}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {opp.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full mt-[6px] flex-shrink-0" style={{ backgroundColor: "var(--cm-text-3)" }} />
                <span className="text-[10.5px] leading-snug" style={{ color: "var(--cm-text-2)" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SECTION E — COACH SIGNALS (NEW) ═══ */}
        <div data-testid="si-coach-signals">
          <h3 className="text-[10px] font-bold uppercase tracking-[1px] mb-3" style={{ color: "var(--cm-text-3)" }}>
            Coach Signals
          </h3>
          <div className="space-y-2">
            {coachSignals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sig.color}12` }}>
                  <sig.icon className="w-2.5 h-2.5" style={{ color: sig.color }} />
                </div>
                <span className="text-[10.5px] font-medium" style={{ color: "var(--cm-text-2)" }}>{sig.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SECTION F — RECOMMENDED STRATEGY (NEW, HIGHEST PRIORITY) ═══ */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${strategy.labelColor}25` }} data-testid="si-recommended-strategy">
          <div style={{ height: 2, background: `linear-gradient(90deg, ${strategy.labelColor}, ${strategy.labelColor}33)` }} />
          <div className="px-4 py-3" style={{ backgroundColor: `${strategy.labelColor}06` }}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5" style={{ color: strategy.labelColor }} />
              <span className="text-[10px] font-extrabold uppercase tracking-[1px]" style={{ color: "var(--cm-text-3)" }}>Recommended Strategy</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
                style={{ color: strategy.labelColor, backgroundColor: strategy.labelBg, border: `1px solid ${strategy.labelColor}30` }}
                data-testid="si-strategy-label">
                {strategy.label}
              </span>
            </div>
            <p className="text-[11px] leading-snug mb-2" style={{ color: "var(--cm-text-2)" }} data-testid="si-strategy-explanation">
              {strategy.explanation}
            </p>
            <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--cm-text)" }} data-testid="si-strategy-action">
              {strategy.nextAction}
            </p>
          </div>
        </div>

        {/* ═══ SECTION G — ACTIONS ═══ */}
        <div className="flex flex-wrap gap-2" data-testid="si-actions">
          {onEmail && (
            <button onClick={onEmail}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-semibold transition-colors"
              style={{ backgroundColor: "#0d9488", color: "#fff" }}
              data-testid="si-email-coach-btn">
              <Mail className="w-3 h-3" /> Email Coach
            </button>
          )}
          {onFollowUp && (
            <button onClick={onFollowUp}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-semibold transition-colors"
              style={{ color: "var(--cm-text-2)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
              data-testid="si-followup-btn">
              <CalendarPlus className="w-3 h-3" /> Generate Follow-up
            </button>
          )}
          {onNavigateToSchool && (
            <button onClick={onNavigateToSchool}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-semibold transition-colors"
              style={{ color: "var(--cm-text-2)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
              data-testid="si-view-details-btn">
              <ExternalLink className="w-3 h-3" /> View School Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
