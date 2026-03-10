import { X, Check, Plus, ArrowRight, Loader2, ChevronRight, Lock, TrendingUp, AlertTriangle, GraduationCap, MapPin, Trophy, Heart, Gauge } from "lucide-react";

const CATEGORY_META = {
  athletic:    { label: "Athletic Fit",    weight: "30%", icon: Trophy,         color: "#10b981" },
  academic:    { label: "Academic Fit",    weight: "25%", icon: GraduationCap,  color: "#3b82f6" },
  preference:  { label: "Preference Fit",  weight: "20%", icon: Heart,          color: "#a855f7" },
  geographic:  { label: "Geographic Fit",  weight: "15%", icon: MapPin,         color: "#f59e0b" },
  opportunity: { label: "Opportunity Fit", weight: "10%", icon: Gauge,          color: "#06b6d4" },
};

const FIT_LABEL_STYLES = {
  "Excellent Fit": { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
  "Strong Fit":    { bg: "rgba(16,185,129,0.08)", color: "#059669", border: "rgba(16,185,129,0.2)" },
  "Good Fit":      { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6", border: "rgba(59,130,246,0.2)" },
  "Moderate Fit":  { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.2)" },
  "Possible Fit":  { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "rgba(245,158,11,0.15)" },
  "Stretch":       { bg: "rgba(239,68,68,0.08)",  color: "#ef4444", border: "rgba(239,68,68,0.15)" },
};

const CONF_STYLES = {
  high:   { label: "High confidence", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  medium: { label: "Medium confidence", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  low:    { label: "Low confidence", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
};

function ScoreBar({ score, color }) {
  return (
    <div className="h-2 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function MatchDetailDrawer({ school, open, onClose, onAddToPipeline, adding, onNavigate }) {
  if (!school) return null;

  const fitStyle = FIT_LABEL_STYLES[school.fit_label] || FIT_LABEL_STYLES["Possible Fit"];
  const confStyle = CONF_STYLES[school.confidence] || CONF_STYLES.medium;
  const scoreColor = school.match_score >= 80 ? "#10b981" : school.match_score >= 60 ? "#f59e0b" : "var(--cm-text-3)";
  const breakdown = school.breakdown || {};

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-[299] transition-opacity"
          onClick={onClose}
          data-testid="match-drawer-overlay"
        />
      )}
      <div
        className={`fixed top-0 right-0 w-[420px] max-w-[92vw] h-full z-[300] transition-transform duration-300 ease-out overflow-y-auto`}
        style={{
          backgroundColor: "var(--cm-surface)",
          borderLeft: "1px solid var(--cm-border)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.25)" : "none",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        data-testid="match-detail-drawer"
      >
        {/* ── Close ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: "var(--cm-text-3)" }}>
            Why This School?
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--cm-surface-2)" }}
            data-testid="match-drawer-close"
          >
            <X className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ═══ 1. Header ═══ */}
          <div data-testid="match-drawer-header">
            <div className="flex items-start gap-4 mb-4">
              {school.logo_url ? (
                <img src={school.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }} />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <GraduationCap className="w-6 h-6" style={{ color: "var(--cm-text-3)" }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold leading-tight" style={{ color: "var(--cm-text)" }}>
                  {school.university_name}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                  {school.division}{school.conference ? ` \u00B7 ${school.conference}` : ""}
                  {school.city ? ` \u00B7 ${school.city}` : ""}{school.state ? `, ${school.state}` : ""}
                </p>
              </div>
            </div>

            {/* Score + Labels row */}
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}08)`,
                  border: `2px solid ${scoreColor}40`,
                }}
              >
                <span className="text-xl font-extrabold" style={{ color: scoreColor }}>{school.match_score}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: fitStyle.bg, color: fitStyle.color, border: `1px solid ${fitStyle.border}` }}
                  data-testid="match-drawer-fit-label"
                >
                  {school.fit_label}
                </span>
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: confStyle.bg, color: confStyle.color }}
                  data-testid="match-drawer-confidence"
                >
                  {confStyle.label}
                </span>
              </div>
            </div>
          </div>

          {/* ═══ 2. Score Breakdown ═══ */}
          <div data-testid="match-drawer-breakdown">
            <h3 className="text-[11px] font-bold tracking-[1px] uppercase mb-3" style={{ color: "var(--cm-text-3)" }}>
              Score Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const score = breakdown[key] || 0;
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-center gap-3" data-testid={`breakdown-${key}`}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}12` }}>
                      <Icon className="w-3 h-3" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--cm-text)" }}>
                          {meta.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold" style={{ color: meta.color }}>{score}</span>
                          <span className="text-[9px]" style={{ color: "var(--cm-text-4)" }}>{meta.weight}</span>
                        </div>
                      </div>
                      <ScoreBar score={score} color={meta.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ 3. Why This School Matches ═══ */}
          {school.strengths?.length > 0 && (
            <div data-testid="match-drawer-strengths">
              <h3 className="text-[11px] font-bold tracking-[1px] uppercase mb-3 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
                <TrendingUp className="w-3 h-3" style={{ color: "#10b981" }} />
                Why This School Matches
              </h3>
              <div className="space-y-2">
                {school.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 pl-1">
                    <div className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#10b981" }} />
                    <span className="text-[12px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ 4. What Could Improve ═══ */}
          {school.improvements?.length > 0 && (
            <div data-testid="match-drawer-improvements">
              <h3 className="text-[11px] font-bold tracking-[1px] uppercase mb-3 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
                <AlertTriangle className="w-3 h-3" style={{ color: "#f59e0b" }} />
                What Could Improve This Match
              </h3>
              <div className="space-y-2">
                {school.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2.5 pl-1">
                    <div className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
                    <span className="text-[12px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ AI Summary (Pro/Premium) ═══ */}
          {school.ai_summary && (
            <div
              className="rounded-xl p-4 border"
              style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "rgba(139,92,246,0.15)" }}
              data-testid="match-drawer-ai"
            >
              <div className="text-[10px] font-bold tracking-[1px] uppercase mb-2 flex items-center gap-1" style={{ color: "#8b5cf6" }}>
                AI Insight
              </div>
              <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--cm-text-2)" }}>{school.ai_summary}</p>
              {school.ai_next_step && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
                  <span className="font-semibold" style={{ color: "#0d9488" }}>Next step:</span> {school.ai_next_step}
                </p>
              )}
              {school.ai_verify && (
                <p className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--cm-text-3)" }}>
                  <span className="font-semibold" style={{ color: "#f59e0b" }}>Verify:</span> {school.ai_verify}
                </p>
              )}
            </div>
          )}

          {/* ═══ Actions ═══ */}
          <div className="flex gap-2 pt-1" data-testid="match-drawer-actions">
            {school.in_pipeline ? (
              <div
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center flex items-center justify-center gap-1.5"
                style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <Check className="w-3.5 h-3.5" /> Already in Your Pipeline
              </div>
            ) : (
              <button
                onClick={() => onAddToPipeline && onAddToPipeline(school.university_name)}
                disabled={adding}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-center flex items-center justify-center gap-1.5 transition-all"
                style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)", color: "#fff" }}
                data-testid="match-drawer-add-pipeline"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add to Pipeline
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate(school);
              }}
              className="py-2.5 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all"
              style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)", border: "1px solid var(--cm-border)" }}
              data-testid="match-drawer-view-details"
            >
              Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
