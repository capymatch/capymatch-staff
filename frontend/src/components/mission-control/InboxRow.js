import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { DOT_COLOR, getNudge, getPrimaryHeadline, getShortExplanation, getSchoolNames, getContextualCta } from "./inbox-utils";
import { TrajectoryHint } from "./TrajectoryHint";
import { ComposeModal } from "./ComposeModal";

export function InboxRow({ item }) {
  const navigate = useNavigate();
  const [showCompose, setShowCompose] = useState(false);
  const dot = DOT_COLOR[item.priority] || "#94a3b8";
  const nudge = getNudge(item);
  const canCompose = nudge && nudge.actionType !== "assign_coach" && nudge.template;
  const intervention = item.interventionType || "nudge";

  const headline = getPrimaryHeadline(item);
  const explanation = getShortExplanation(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);
  const isBlocker = intervention === "blocker";
  const isEscalate = intervention === "escalate";
  const showSuggestedAction = intervention !== "monitor";

  function handleSuggestedClick(e) {
    e.stopPropagation();
    if (intervention === "review") {
      navigate(item.cta.url);
      return;
    }
    if (canCompose) {
      setShowCompose(true);
    } else if (nudge) {
      navigate(nudge.url);
    }
  }

  return (
    <div className="inbox-row-wrap" data-testid={`inbox-row-${item.id}`}>
      <div className="inbox-row">
        <div className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
          {item.photoUrl ? (
            <img
              src={item.photoUrl}
              alt={item.athleteName}
              className="w-7 h-7 rounded-full object-cover"
              data-testid={`inbox-photo-${item.id}`}
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "rgba(255,255,255,0.06)", color: "#8b8d98" }}
              data-testid={`inbox-avatar-${item.id}`}
            >
              {(item.athleteName || "?").charAt(0)}
            </div>
          )}
          <span
            className="absolute"
            style={{ width: 8, height: 8, borderRadius: "50%", background: dot, bottom: -1, right: -1, border: "2px solid #fff" }}
          />
        </div>
        <div className="inbox-text">
          {/* Name */}
          <p className="inbox-title">{item.athleteName}</p>
          {/* Headline + trend */}
          <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
            <p className="inbox-subtitle" style={{ margin: 0, fontWeight: 600 }}>{headline}</p>
            {item.trajectory && item.trajectory !== "stable" && (
              <TrajectoryHint trajectory={item.trajectory} />
            )}
          </div>
          {/* Short explanation */}
          <p className="text-[10px]" style={{ color: "#8b8d98", margin: "2px 0 0", lineHeight: 1.3 }}>
            {explanation}
          </p>
          {/* School names inline */}
          {schoolNames.length > 1 && (
            <p className="text-[10px]" style={{ color: "#6b7280", margin: "3px 0 0" }}>
              {schoolNames.slice(0, 3).join(" · ")}
            </p>
          )}
          {showSuggestedAction && nudge && (
            <span
              className={`inbox-action-link${isBlocker ? " inbox-action-blocker" : ""}${isEscalate ? " inbox-action-escalate" : ""}`}
              onClick={handleSuggestedClick}
              data-testid={`suggested-action-${item.id}`}
            >
              {isBlocker && <AlertTriangle className="w-3 h-3" />}
              {ctaLabel} <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
        <span
          className="inbox-cta"
          onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
          data-testid={`open-pod-${item.id}`}
        >
          Open Pod <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {showCompose && nudge && (
        <ComposeModal
          nudge={nudge}
          item={item}
          onClose={() => setShowCompose(false)}
          onSent={() => setShowCompose(false)}
        />
      )}
    </div>
  );
}

export function GroupLabel({ label }) {
  return (
    <div className="px-5 pt-4 pb-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#94a3b8" }}>
        {label}
      </span>
    </div>
  );
}
