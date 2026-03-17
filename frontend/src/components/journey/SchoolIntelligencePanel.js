import { useState } from "react";
import {
  Shield, Mail, CalendarPlus, ExternalLink,
  ChevronDown, ChevronUp, Check, AlertTriangle, Send,
  MessageSquare,
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

/* ── Classify engagement state ── */
function classifyEngagement({ signals, engagement }) {
  const opens = engagement?.total_opens || 0;
  const clicks = engagement?.total_clicks || 0;
  const hasReply = signals?.has_coach_reply;
  const daysSince = signals?.days_since_activity;
  const outreach = signals?.outreach_count || 0;

  if (hasReply)   return { level: "replied", hasSignals: true, opens, clicks, hasReply, daysSince, outreach };
  if (clicks > 0) return { level: "clicked", hasSignals: true, opens, clicks, hasReply, daysSince, outreach };
  if (opens > 0)  return { level: "opened",  hasSignals: true, opens, clicks, hasReply, daysSince, outreach };
  if (daysSince != null && daysSince > 14 && outreach > 0) return { level: "stale", hasSignals: false, opens, clicks, hasReply, daysSince, outreach };
  if (outreach > 0) return { level: "waiting", hasSignals: false, opens, clicks, hasReply, daysSince, outreach };
  return { level: "none", hasSignals: false, opens, clicks, hasReply, daysSince, outreach };
}

/* ── Fit descriptor ── */
function fitDescriptor(score) {
  if (score >= 75) return "strong-fit";
  if (score >= 55) return "moderate-fit";
  if (score > 0) return "low-fit";
  return "unknown";
}

/* ── Build unified top narrative (SINGLE source of truth) ── */
function buildNarrative({ matchScore, eng, coachWatch }) {
  const score = matchScore?.match_score || 0;
  const fit = fitDescriptor(score);

  let label, labelColor, labelBg, body, timing, action;

  // ── REPLIED ──
  if (eng.level === "replied" && (fit === "strong-fit" || fit === "moderate-fit")) {
    label = "High Priority"; labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    body = "The coach replied and the fit is strong. This is one of your best opportunities right now.";
    timing = "Now — while the conversation is active";
    action = "Reply within 24 hours. Reference something specific about their program.";
  } else if (eng.level === "replied") {
    label = "High Priority"; labelColor = "#22c55e"; labelBg = "rgba(34,197,94,0.1)";
    body = "The coach replied. Even with a modest fit score, coach interest is what matters most.";
    timing = "Now — momentum is on your side";
    action = "Respond promptly and ask a thoughtful question about the program.";
  }

  // ── CLICKED ──
  else if (eng.level === "clicked") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "The coach clicked a link in your message. They\u2019re interested enough to look deeper.";
    timing = "This week";
    action = "Send a follow-up within a few days with updated highlights or video.";
  }

  // ── OPENED (passive interest) ──
  else if (eng.level === "opened" && eng.opens > 2) {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = `Your message was opened ${eng.opens} times. The coach keeps coming back to it.`;
    timing = "This week";
    action = "Follow up now with something new \u2014 a highlight clip or a specific question.";
  } else if (eng.level === "opened") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "The coach opened your message. That\u2019s a positive signal.";
    timing = "Within 5\u20137 days";
    action = "Give it a few days, then follow up with a personalized message.";
  }

  // ── STALE (outreach sent, no engagement, 14+ days) ──
  else if (eng.level === "stale" && fit === "strong-fit") {
    label = "Continue Pursuing"; labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    body = `It\u2019s been ${eng.daysSince} days with no response, but the fit is strong. Don\u2019t give up yet.`;
    timing = "Now — re-engage before interest fades";
    action = "Send a fresh message with a different angle \u2014 new results, a highlight reel, or a campus visit request.";
  } else if (eng.level === "stale" && fit === "low-fit") {
    label = "Reconsider"; labelColor = "#ef4444"; labelBg = "rgba(239,68,68,0.08)";
    body = `No response in ${eng.daysSince} days and the fit is limited. Your energy may be better spent elsewhere.`;
    timing = "Not urgent";
    action = "Shift focus to stronger-fit schools. You can always circle back later.";
  } else if (eng.level === "stale") {
    label = "Reconsider"; labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    body = `No response in ${eng.daysSince} days. The relationship needs attention.`;
    timing = "Soon — before the window closes";
    action = "Try a re-engagement message with something specific \u2014 an updated stat, a question, or a visit request.";
  }

  // ── WAITING (outreach sent recently, no signals yet) ──
  else if (eng.level === "waiting" && fit === "strong-fit") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "You\u2019ve reached out and the fit is strong. Coaches are busy \u2014 give it time.";
    timing = "Wait 5\u20137 days before following up";
    action = "If no response in a week, follow up with new content or a specific question.";
  } else if (eng.level === "waiting") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "Outreach sent, but no response yet. That\u2019s normal early on.";
    timing = "Wait 5\u20137 days";
    action = "Plan a follow-up with something specific about this program.";
  }

  // ── NONE (no outreach, no signals) — most common starting state ──
  else if (fit === "strong-fit") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "No coach engagement yet. This is a strong-fit school, but interest has not been activated.";
    timing = "Now";
    action = "Send your first message and personalize it with something specific about this program.";
  } else if (fit === "moderate-fit") {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "No coach engagement yet. The fit is moderate \u2014 worth exploring with a personalized intro.";
    timing = "When ready";
    action = "Send a short, specific intro email. Mention what you like about their program.";
  } else if (fit === "low-fit") {
    label = "Reconsider"; labelColor = "#f59e0b"; labelBg = "rgba(245,158,11,0.1)";
    body = "No engagement and limited fit signals. This school may not be the best use of your time right now.";
    timing = "Not urgent";
    action = "Focus on higher-fit schools first. Come back to this one if your priorities change.";
  } else {
    label = "Continue Pursuing"; labelColor = "#3b82f6"; labelBg = "rgba(59,130,246,0.1)";
    body = "No engagement yet. Reach out to learn more and start the conversation.";
    timing = "When ready";
    action = "Send your first message to get things started.";
  }

  // Override action with coachWatch if available
  if (coachWatch?.recommendation) {
    action = coachWatch.recommendation;
  }

  return { label, labelColor, labelBg, body, timing, action };
}

/* ── Signal details (only shown when there ARE specific signals) ── */
function buildSignalDetails(eng) {
  const details = [];
  if (eng.hasReply) details.push({ color: "#22c55e", text: "Coach replied to your message" });
  if (eng.clicks > 0) details.push({ color: "#22c55e", text: "Coach clicked a link in your outreach" });
  if (eng.opens > 2 && !eng.hasReply) details.push({ color: "#3b82f6", text: `Message opened ${eng.opens} times` });
  else if (eng.opens > 0 && !eng.hasReply && eng.clicks === 0) details.push({ color: "#3b82f6", text: "Coach opened your last message" });
  return details;
}

/* ── Data-quality label ── */
function dataQualityLabel(confidence, hasSignals) {
  if (confidence === "high") return null;
  if (confidence === "medium") return { color: "var(--cm-text-3)", text: "Limited data available" };
  return hasSignals
    ? { color: "var(--cm-text-3)", text: "Limited profile data" }
    : { color: "var(--cm-text-3)", text: "No coach engagement yet" };
}

/* ── Fit heading ── */
function fitHeading(fitLabel) {
  if (fitLabel === "Strong Fit") return "Why this is a strong fit:";
  if (fitLabel === "Possible Fit") return "Why this could be a fit:";
  if (fitLabel === "Stretch") return "Why this is a stretch:";
  if (fitLabel === "Less Likely Fit") return "What to consider:";
  return "Fit breakdown:";
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

  const eng = classifyEngagement({ signals, engagement });
  const narrative = buildNarrative({ matchScore: ms, eng, coachWatch });
  const signalDetails = buildSignalDetails(eng);
  const dqLabel = dataQualityLabel(ms.confidence, eng.hasSignals);

  const improvements = [];
  riskBadges.forEach(b => { if (b.label && improvements.length < 3) improvements.push(b.label); });

  // Dynamic CTAs based on outreach state
  const hasOutreach = eng.outreach > 0;
  const primaryCta = eng.hasSignals
    ? { label: "Follow Up", icon: CalendarPlus, action: onFollowUp }
    : hasOutreach
      ? { label: "Follow Up", icon: CalendarPlus, action: onFollowUp }
      : { label: "Send First Email", icon: Send, action: onEmail };
  const secondaryCta = hasOutreach
    ? { label: "Generate Follow-up", icon: MessageSquare, action: onFollowUp }
    : { label: "Generate Message", icon: MessageSquare, action: onFollowUp };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="school-intelligence-panel" id="school-intelligence">
      <div style={{ height: 3, background: `linear-gradient(90deg, ${narrative.labelColor}, ${narrative.labelColor}33)` }} />

      <div className="p-5 sm:p-6 space-y-5">

        {/* ═══ 1. DECISION BLOCK (single source of truth) ═══ */}
        <div data-testid="si-recommended-strategy">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5" style={{ color: narrative.labelColor }} />
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md"
              style={{ color: narrative.labelColor, backgroundColor: narrative.labelBg, border: `1px solid ${narrative.labelColor}30` }}
              data-testid="si-strategy-label">
              {narrative.label}
            </span>
          </div>

          <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--cm-text-2)" }} data-testid="si-strategy-explanation">
            {narrative.body}
          </p>

          <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--cm-text-3)" }} data-testid="si-timing">
            Best time to act: <span style={{ color: "var(--cm-text)" }}>{narrative.timing}</span>
          </p>

          <p className="text-[12px] font-semibold leading-relaxed" style={{ color: "var(--cm-text)" }} data-testid="si-strategy-action">
            {narrative.action}
          </p>

          {/* CTAs */}
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

        {/* ═══ 2. ENGAGEMENT SIGNALS (only when there are specific details) ═══ */}
        {signalDetails.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: "var(--cm-border)" }} />
            <div data-testid="si-engagement-status">
              <p className="text-[9px] font-bold uppercase tracking-[1px] mb-2" style={{ color: "var(--cm-text-3)" }}>Coach Signals</p>
              <div className="space-y-1.5">
                {signalDetails.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sig.color }} />
                    <span className="text-[10.5px]" style={{ color: "var(--cm-text-2)" }} data-testid="si-engagement-label">{sig.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ 3. FIT SUMMARY ═══ */}
        <div style={{ height: 1, backgroundColor: "var(--cm-border)" }} />
        <div data-testid="si-fit-summary">
          <div className="flex items-center gap-3 mb-3">
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

          {/* Heading for strengths/gaps */}
          {(matchReasons.length > 0 || improvements.length > 0) && (
            <p className="text-[9px] font-bold uppercase tracking-[1px] mb-2" style={{ color: "var(--cm-text-3)" }} data-testid="si-fit-heading">
              {fitHeading(fitLabel)}
            </p>
          )}

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
