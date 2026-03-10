import { X, Trophy, GraduationCap, Heart, MapPin, Gauge, TrendingUp, AlertTriangle, Check, Plus, Loader2, ArrowRight } from "lucide-react";

const CATEGORIES = [
  { key: "athletic",    label: "Athletic Fit",    weight: "30%", icon: Trophy,         color: "#10b981" },
  { key: "academic",    label: "Academic Fit",    weight: "25%", icon: GraduationCap,  color: "#3b82f6" },
  { key: "preference",  label: "Preference Fit",  weight: "20%", icon: Heart,          color: "#a855f7" },
  { key: "geographic",  label: "Geographic Fit",  weight: "15%", icon: MapPin,         color: "#f59e0b" },
  { key: "opportunity", label: "Opportunity Fit", weight: "10%", icon: Gauge,          color: "#06b6d4" },
];

const FIT_COLORS = {
  "Excellent Fit": "#10b981",
  "Strong Fit":    "#059669",
  "Good Fit":      "#3b82f6",
  "Moderate Fit":  "#d97706",
  "Possible Fit":  "#f59e0b",
  "Stretch":       "#ef4444",
};

function ScoreBar({ score, color, maxScore }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, backgroundColor: color, opacity: score === maxScore ? 1 : 0.6 }} />
    </div>
  );
}

export default function CompareDrawer({ schools, open, onClose, onAddToPipeline, adding, onNavigate }) {
  if (!schools || schools.length < 2) return null;

  const bestScores = {};
  CATEGORIES.forEach(cat => {
    bestScores[cat.key] = Math.max(...schools.map(s => (s.breakdown || {})[cat.key] || 0));
  });

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-[299]" onClick={onClose} />}
      <div
        className="fixed top-0 right-0 h-full z-[300] transition-transform duration-300 ease-out overflow-y-auto"
        style={{
          width: schools.length === 3 ? "min(780px, 95vw)" : "min(560px, 95vw)",
          backgroundColor: "var(--cm-surface)",
          borderLeft: "1px solid var(--cm-border)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.25)" : "none",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        data-testid="compare-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: "var(--cm-text-3)" }}>
            Compare Schools
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="compare-drawer-close">
            <X className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── School Headers (side-by-side) ── */}
          <div className={`grid gap-3 mb-6`} style={{ gridTemplateColumns: `repeat(${schools.length}, 1fr)` }}>
            {schools.map((s, i) => {
              const scoreColor = s.match_score >= 80 ? "#10b981" : s.match_score >= 60 ? "#f59e0b" : "var(--cm-text-3)";
              const fitColor = FIT_COLORS[s.fit_label] || "var(--cm-text-3)";
              return (
                <div key={s.university_name} className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
                  data-testid={`compare-school-${i}`}>
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-12 h-12 rounded-xl mx-auto mb-2 object-contain" style={{ backgroundColor: "var(--cm-surface)" }} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface)" }}>
                      <GraduationCap className="w-6 h-6" style={{ color: "var(--cm-text-4)" }} />
                    </div>
                  )}
                  <h3 className="text-[12px] font-bold leading-tight mb-1" style={{ color: "var(--cm-text)" }}>
                    {s.university_name}
                  </h3>
                  <p className="text-[9px] mb-2" style={{ color: "var(--cm-text-3)" }}>
                    {s.division}{s.conference ? ` \u00B7 ${s.conference}` : ""}
                  </p>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-1.5"
                    style={{ background: `${scoreColor}12`, border: `2px solid ${scoreColor}40` }}>
                    <span className="text-xl font-extrabold" style={{ color: scoreColor }}>{s.match_score}</span>
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: fitColor }}>{s.fit_label}</span>
                </div>
              );
            })}
          </div>

          {/* ── Score Breakdown Comparison ── */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-[1px] uppercase mb-4" style={{ color: "var(--cm-text-3)" }}>
              Score Breakdown
            </h3>
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `${cat.color}12` }}>
                        <Icon className="w-2.5 h-2.5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-[10px] font-semibold flex-1" style={{ color: "var(--cm-text-2)" }}>{cat.label}</span>
                      <span className="text-[8px]" style={{ color: "var(--cm-text-4)" }}>{cat.weight}</span>
                    </div>
                    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${schools.length}, 1fr)` }}>
                      {schools.map((s, i) => {
                        const score = (s.breakdown || {})[cat.key] || 0;
                        const isBest = score === bestScores[cat.key] && score > 0;
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <ScoreBar score={score} color={cat.color} maxScore={bestScores[cat.key]} />
                            <span className="text-[10px] font-bold w-6 text-right" style={{ color: isBest ? cat.color : "var(--cm-text-3)" }}>
                              {score}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Strengths ── */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-[1px] uppercase mb-3 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
              <TrendingUp className="w-3 h-3" style={{ color: "#10b981" }} /> Strengths
            </h3>
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${schools.length}, 1fr)` }}>
              {schools.map((s, i) => (
                <div key={i} className="space-y-1.5">
                  {(s.strengths || []).slice(0, 3).map((str, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#10b981" }} />
                      <span className="text-[10px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>{str}</span>
                    </div>
                  ))}
                  {(!s.strengths || s.strengths.length === 0) && (
                    <span className="text-[10px] italic" style={{ color: "var(--cm-text-4)" }}>No strengths data</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Improvements ── */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-[1px] uppercase mb-3 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
              <AlertTriangle className="w-3 h-3" style={{ color: "#f59e0b" }} /> Areas to Improve
            </h3>
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${schools.length}, 1fr)` }}>
              {schools.map((s, i) => (
                <div key={i} className="space-y-1.5">
                  {(s.improvements || []).slice(0, 3).map((imp, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
                      <span className="text-[10px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>{imp}</span>
                    </div>
                  ))}
                  {(!s.improvements || s.improvements.length === 0) && (
                    <span className="text-[10px] italic" style={{ color: "var(--cm-text-4)" }}>No improvements needed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${schools.length}, 1fr)` }}>
            {schools.map((s, i) => (
              <div key={i} className="space-y-2">
                {s.in_pipeline ? (
                  <div className="py-2 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1"
                    style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10b981" }}>
                    <Check className="w-3 h-3" /> In Pipeline
                  </div>
                ) : (
                  <button onClick={() => onAddToPipeline && onAddToPipeline(s.university_name)}
                    disabled={adding && adding[s.university_name]}
                    className="w-full py-2 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-all"
                    style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)", color: "#fff" }}
                    data-testid={`compare-add-${i}`}>
                    {adding && adding[s.university_name] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add to Pipeline
                  </button>
                )}
                <button onClick={() => { onClose(); onNavigate && onNavigate(s); }}
                  className="w-full py-2 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1"
                  style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}
                  data-testid={`compare-details-${i}`}>
                  Details <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
