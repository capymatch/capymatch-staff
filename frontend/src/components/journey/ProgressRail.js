import { RAIL_STAGES } from "./constants";

export function ProgressRail({ rail, onStageClick, hideLabels }) {
  if (!rail) return null;
  const stages = rail.stages || {};
  const active = rail.active;
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);
  const lineFillIdx = RAIL_STAGES.findIndex(s => s.key === (rail.line_fill || active));
  const TOTAL = RAIL_STAGES.length;
  const DOT = 14;
  const DOT_ACTIVE = 18;
  const halfStep = 100 / (TOTAL * 2);
  const fillScale = lineFillIdx > 0 ? lineFillIdx / (TOTAL - 1) : 0;

  const fillStops = RAIL_STAGES.slice(0, lineFillIdx + 1).map((s, i) => {
    const pct = TOTAL === 1 ? 50 : (i / (TOTAL - 1)) * 100;
    return `${s.color} ${pct}%`;
  });
  const fillGradient = fillStops.length > 1
    ? `linear-gradient(90deg, ${fillStops.join(", ")})`
    : fillStops.length === 1 ? fillStops[0].split(" ")[0] : "#1a8a80";

  return (
    <div data-testid="progress-rail">
      <style>{`
        @keyframes railPulseRing {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div style={{ position: "relative", height: DOT_ACTIVE + 8, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: `${halfStep}%`, right: `${halfStep}%`, top: "50%", transform: "translateY(-50%)", height: 2, background: "rgba(255,255,255,0.06)", zIndex: 0 }} />
        {fillScale > 0 && (
          <div style={{ position: "absolute", left: `${halfStep}%`, right: `${halfStep}%`, top: "50%", transform: `translateY(-50%) scaleX(${fillScale})`, transformOrigin: "left", height: 2, background: fillGradient, zIndex: 0, transition: "transform 0.5s ease" }} />
        )}
        {RAIL_STAGES.map((s, idx) => {
          const isActive = s.key === active;
          const isPast = activeIdx >= 0 && idx < activeIdx;
          const completed = stages[s.key] || isPast;
          const size = isActive ? DOT_ACTIVE : DOT;
          const stageColor = s.color;
          return (
            <button key={s.key} onClick={() => onStageClick(s.key)}
              data-testid={`rail-stage-${s.key}`}
              style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, position: "relative", zIndex: 1 }}>
              <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                <div style={{
                  width: size, height: size, borderRadius: "50%",
                  border: `2px solid ${completed || isActive ? stageColor : "rgba(255,255,255,0.10)"}`,
                  background: completed || isActive ? stageColor : "#13213a",
                  boxShadow: isActive ? `0 0 12px ${stageColor}66` : completed ? `0 0 8px ${stageColor}26` : "none",
                  transition: "all 0.3s",
                }} />
                {isActive && (
                  <div style={{
                    position: "absolute", top: -4, left: -4, right: -4, bottom: -4,
                    borderRadius: "50%", border: `2px solid ${stageColor}`,
                    animation: "railPulseRing 2s ease-out infinite",
                    pointerEvents: "none",
                  }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!hideLabels && <div style={{ display: "flex", marginTop: 6 }}>
        {RAIL_STAGES.map((s, idx) => {
          const isActive = s.key === active;
          const isPast = activeIdx >= 0 && idx < activeIdx;
          const completed = stages[s.key] || isPast;
          return (
            <div key={s.key} style={{ flex: 1, textAlign: "center" }}>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : completed ? 600 : 500,
                color: isActive ? s.color : completed ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
