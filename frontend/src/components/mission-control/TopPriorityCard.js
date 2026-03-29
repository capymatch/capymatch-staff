import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, AlertTriangle } from "lucide-react";
import {
  getNudge,
  getPrimaryHeadline,
  getSecondaryContext,
  getCompressedLine,
  getSchoolNames,
  getContextualCta,
} from "./inbox-utils";
import { TrajectoryHint } from "./TrajectoryHint";
import { ComposeModal } from "./ComposeModal";

export function TopPriorityCard({ item, onActionComplete }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  if (!item || completed) return null;

  const headline = getPrimaryHeadline(item);
  const context = getSecondaryContext(item);
  const compressed = getCompressedLine(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);

  const nudge = getNudge(item);
  const intervention = item.interventionType || "nudge";
  const isCritical = item.severity === "critical";
  const canAutoExecute = nudge && nudge.actionType !== "assign_coach";

  /* ── dark-theme palette ── */
  const cardBg = "#161921";
  const cardBorder = isCritical ? "rgba(220,38,38,0.20)" : "rgba(255,255,255,0.06)";
  const badgeBg     = isCritical ? "rgba(220,38,38,0.10)" : "rgba(245,158,11,0.10)";
  const badgeBorder = isCritical ? "rgba(220,38,38,0.20)" : "rgba(245,158,11,0.20)";
  const labelColor  = isCritical ? "#dc2626" : "#f59e0b";
  const headlineColor = isCritical ? "#f87171" : "#fbbf24";
  const textPrimary   = "#f0f0f2";
  const textSecondary = "#8b8d98";
  const textMuted     = "#5c5e6a";

  const btnAccent = (intervention === "blocker" || intervention === "escalate") ? "#dc2626" : "#ff6a3d";
  const btnGlow   = (intervention === "blocker" || intervention === "escalate") ? "rgba(220,38,38,0.20)" : "rgba(255,106,61,0.20)";

  function handleApprove(e) {
    e.stopPropagation();
    if (!nudge) return;
    if (nudge.actionType === "assign_coach") { navigate("/roster"); return; }
    setShowCompose(true);
  }

  function handleEdit(e) {
    e.stopPropagation();
    if (nudge) navigate(nudge.url);
  }

  function handleSent() {
    setShowCompose(false);
    setCompleted(true);
    onActionComplete?.(item.id);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} data-testid="top-priority-card">
      <div className="px-5 py-4">
        {/* Severity badge */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded"
            style={{ background: badgeBg, color: labelColor, border: `1px solid ${badgeBorder}` }} data-testid="severity-label">
            {isCritical ? "CRITICAL" : "HIGH PRIORITY"}
          </span>
          {item.trajectory && <TrajectoryHint trajectory={item.trajectory} style={{ marginTop: -1 }} />}
        </div>

        {/* Athlete identity */}
        <div className="flex items-center gap-3 mb-3">
          {item.photoUrl ? (
            <img src={item.photoUrl} alt={item.athleteName}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              style={{ border: `2px solid ${labelColor}20` }} data-testid="athlete-photo" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
              style={{ background: `${labelColor}18`, color: labelColor, border: `2px solid ${labelColor}20` }} data-testid="athlete-avatar">
              {(item.athleteName || "?").charAt(0)}
            </div>
          )}
          <p className="text-[14px] font-semibold" style={{ color: textPrimary }}>{item.athleteName}</p>
        </div>

        {/* Headline (dominant — red only for overdue count) */}
        <p className="text-[17px] font-bold" style={{ color: headlineColor, letterSpacing: "-0.01em" }} data-testid="headline-text">
          {headline}
        </p>

        {/* Context: "Across 3 schools" or single school name */}
        {context && (
          <p className="text-[11px] font-medium mt-0.5" style={{ color: textSecondary }}>{context}</p>
        )}

        {/* Compressed line */}
        <p className="text-[11px] mt-1" style={{ color: textMuted }} data-testid="compressed-line">
          {compressed}
        </p>

        {/* School list — neutral gray bullets, never red */}
        {schoolNames.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-0.5" data-testid="school-breakdown">
            {schoolNames.slice(0, 5).map((name, i) => (
              <p key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: textSecondary }}>
                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#64748b" }} />
                {name}
              </p>
            ))}
          </div>
        )}

        {/* Action buttons — full-width solid button */}
        {nudge && (
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2.5">
              {canAutoExecute && (
                <button onClick={handleApprove}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11.5px] font-bold uppercase tracking-[0.03em] cursor-pointer text-white transition-all duration-150"
                  style={{ background: btnAccent, border: "none", fontFamily: "inherit", boxShadow: `0 0 16px ${btnGlow}` }}
                  data-testid="autopilot-approve-btn">
                  {intervention === "blocker" ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {ctaLabel}
                </button>
              )}
              {intervention === "review" && (
                <button onClick={(e) => { e.stopPropagation(); navigate(item.cta?.url || "#"); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[11.5px] font-bold uppercase tracking-[0.03em] cursor-pointer text-white transition-all duration-150"
                  style={{ background: "#ff6a3d", border: "none", fontFamily: "inherit", boxShadow: "0 0 16px rgba(255,106,61,0.25)" }}
                  data-testid="autopilot-review-btn">
                  {ctaLabel} <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button onClick={handleEdit}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors duration-150"
                style={{ background: "transparent", color: textSecondary, border: "1px solid rgba(255,255,255,0.12)", fontFamily: "inherit" }}
                data-testid="autopilot-edit-btn">
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Open Pod link */}
        <span className="inline-flex items-center gap-1 mt-3 text-[11px] font-medium cursor-pointer transition-colors duration-150"
          style={{ color: textMuted }}
          onClick={(e) => { e.stopPropagation(); navigate(item.cta?.url || "#"); }}
          onMouseEnter={(e) => e.currentTarget.style.color = textSecondary}
          onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
          data-testid="top-priority-cta">
          Open Pod <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {showCompose && nudge && (
        <ComposeModal nudge={nudge} item={item} onClose={() => setShowCompose(false)} onSent={handleSent} />
      )}
    </div>
  );
}
