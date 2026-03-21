import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Minus, Snowflake, Target, Eye, ChevronRight, Sparkles } from "lucide-react";
import { trackEvent } from "../../lib/analytics";

const API = process.env.REACT_APP_BACKEND_URL;
const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

function getToken() {
  return localStorage.getItem("capymatch_token") || localStorage.getItem("token");
}

const CATEGORY_CONFIG = {
  heated_up: { label: "Heated Up", icon: Flame, color: "#f97316", accent: "#f97316", bg: "rgba(249,115,22,0.04)", border: "rgba(249,115,22,0.10)", dot: "#f97316" },
  holding_steady: { label: "Holding Steady", icon: Minus, color: "#64748b", accent: "#94a3b8", bg: "rgba(107,114,128,0.03)", border: "rgba(107,114,128,0.08)", dot: "#94a3b8" },
  cooling_off: { label: "Cooling Off", icon: Snowflake, color: "#3b82f6", accent: "#3b82f6", bg: "rgba(59,130,246,0.04)", border: "rgba(59,130,246,0.10)", dot: "#60a5fa" },
};

const RANK_CONFIG = {
  top: { label: "Needs your attention now", icon: Target, color: "#dc2626", bg: "rgba(220,38,38,0.04)", border: "rgba(220,38,38,0.10)", accent: "rgba(239,68,68,0.55)" },
  secondary: { label: "Secondary", icon: ChevronRight, color: "#d97706", bg: "rgba(217,119,6,0.04)", border: "rgba(217,119,6,0.10)", accent: "#f59e0b" },
  watch: { label: "Watch", icon: Eye, color: "#64748b", bg: "rgba(107,114,128,0.03)", border: "rgba(107,114,128,0.06)", accent: "#94a3b8" },
};

function MomentumGroup({ category, items, navigate }) {
  const cfg = CATEGORY_CONFIG[category];
  if (!items || items.length === 0) return null;
  const Icon = cfg.icon;
  return (
    <div data-testid={`momentum-group-${category}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <Icon size={14} color={cfg.color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, letterSpacing: "0.02em" }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>({items.length})</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((m) => (
          <div
            key={m.program_id}
            data-testid={`momentum-item-${m.program_id}`}
            onClick={() => {
              trackEvent("recap_priority_clicked", {
                program_id: m.program_id, school_name: m.school_name,
                category, from: "momentum_shift",
              });
              navigate(`/pipeline/${m.program_id}`);
            }}
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(20,37,68,0.03)",
              borderLeft: `2px solid ${cfg.accent}`,
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              transition: "transform 80ms ease, box-shadow 80ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{m.school_name}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginLeft: "auto" }}>{m.stage_label}</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 400, lineHeight: 1.5, paddingLeft: 14 }}>
              {m.action_guidance || m.what_changed}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityItem({ priority, navigate }) {
  const cfg = RANK_CONFIG[priority.rank] || RANK_CONFIG.secondary;
  const Icon = cfg.icon;
  return (
    <div
      data-testid={`priority-${priority.rank}-${priority.program_id}`}
      onClick={() => {
        trackEvent("recap_priority_clicked", {
          program_id: priority.program_id, school_name: priority.school_name,
          rank: priority.rank, from: "priority_reset",
        });
        navigate(`/pipeline/${priority.program_id}`);
      }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        background: "#fff",
        border: `1px solid ${cfg.border}`,
        borderLeft: `5px solid ${cfg.accent}`,
        borderRadius: 14,
        padding: "20px 20px",
        cursor: "pointer",
        transition: "transform 80ms ease, box-shadow 80ms ease",
        boxShadow: "0 2px 8px rgba(19,33,58,0.04)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(19,33,58,0.04)"; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <Icon size={15} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.35 }}>
          {priority.action}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400, marginTop: 4, lineHeight: 1.4 }}>
          {priority.rank !== "watch" && <span style={{ color: cfg.accent, marginRight: 4 }}>&rarr;</span>}{priority.reason}
        </div>
        {priority.urgency_note && (
          <div data-testid="urgency-note" style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>
            {priority.urgency_note}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const trackedSections = useRef(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/athlete/momentum-recap`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Failed to load recap");
        const result = await res.json();
        setData(result);
        trackEvent("recap_opened", {
          heated: result.momentum?.heated_up?.length || 0,
          steady: result.momentum?.holding_steady?.length || 0,
          cooling: result.momentum?.cooling_off?.length || 0,
          priorities: result.priorities?.length || 0,
          period_label: result.period_label || "",
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#1e293b", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>Analyzing momentum...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: FONT }}>
        <div style={{ textAlign: "center", color: "#dc2626", fontSize: 14, fontWeight: 400 }}>{error}</div>
      </div>
    );
  }

  const { recap_hero, biggest_shift, period_label, momentum, priorities, ai_insights, top_priority_program_id } = data;
  const topPid = top_priority_program_id;
  const heated = (momentum?.heated_up || []).filter(m => m.program_id !== topPid);
  const steady = (momentum?.holding_steady || []).filter(m => m.program_id !== topPid);
  const cooling = (momentum?.cooling_off || []).filter(m => m.program_id !== topPid);
  const insights = ai_insights || [];

  // Track section visibility once via IntersectionObserver
  const sectionRef = (sectionName) => (el) => {
    if (!el || trackedSections.current.has(sectionName)) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !trackedSections.current.has(sectionName)) {
        trackedSections.current.add(sectionName);
        trackEvent("recap_section_viewed", { section: sectionName });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
  };

  return (
    <div data-testid="recap-page" style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(20,37,68,0.05)",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          data-testid="recap-back-btn"
          onClick={() => navigate("/pipeline")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={20} color="#475569" />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>Momentum Recap</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 1 }}>{period_label}</div>
        </div>
      </div>

      <div style={{ padding: "24px 16px 48px", maxWidth: 640, margin: "0 auto" }}>
        {/* Section 1: Summary — Narrative + biggest shift */}
        <div
          ref={sectionRef("hero")}
          data-testid="recap-hero"
          style={{
            background: "linear-gradient(135deg, #0f1c35 0%, #152547 50%, #1a2d5a 100%)",
            borderRadius: 20, padding: "28px 24px", marginBottom: 32,
            position: "relative", overflow: "hidden",
            boxShadow: "0 12px 40px rgba(15, 28, 53, 0.14)",
          }}
        >
          <div style={{
            position: "absolute", top: -30, right: -30, width: 140, height: 140,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(25,195,178,0.08), transparent 65%)",
            pointerEvents: "none",
          }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, position: "relative", zIndex: 1 }}>
            Pipeline Summary
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.92)", lineHeight: 1.5, position: "relative", zIndex: 1 }}>
            {recap_hero}
          </div>
          {biggest_shift && (
            <div data-testid="biggest-shift" style={{
              marginTop: 14, paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.55)",
              lineHeight: 1.4, position: "relative", zIndex: 1,
            }}>
              Biggest shift: {biggest_shift}
            </div>
          )}
          <div data-testid="confidence-signal" style={{
            marginTop: biggest_shift ? 10 : 16, fontSize: 10, fontWeight: 500,
            color: "rgba(255,255,255,0.40)", letterSpacing: "0.04em",
            position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(25,195,178,0.50)" }} />
            Confidence: High
          </div>
        </div>

        {/* Section 2: Priority Reset — STRONGEST visual weight */}
        <div ref={sectionRef("priority_reset")} data-testid="priority-reset-section" style={{ marginBottom: 32, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0f172a", marginBottom: 14 }}>
            Your next moves
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {priorities.map((p, i) => (
              <PriorityItem key={i} priority={p} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Section 3: Momentum Shift — LIGHTER context (excludes top priority) */}
        {(heated.length > 0 || steady.length > 0 || cooling.length > 0) && (
          <div ref={sectionRef("momentum_shift")} data-testid="momentum-shift-section" style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b", letterSpacing: "0.01em", marginBottom: 14 }}>
              Where you're gaining traction
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <MomentumGroup category="heated_up" items={heated} navigate={navigate} />
              <MomentumGroup category="holding_steady" items={steady} navigate={navigate} />
              <MomentumGroup category="cooling_off" items={cooling} navigate={navigate} />
            </div>
          </div>
        )}

        {/* Section 4: AI Insight — SOFTEST, bullet points */}
        {insights.length > 0 && (
          <div ref={sectionRef("ai_summary")} data-testid="ai-summary" style={{
            background: "rgba(248,250,252,0.45)",
            border: "1px solid rgba(20,37,68,0.03)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <Sparkles size={11} color="#b0bec5" />
              <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.01em" }}>What's driving your pipeline right now</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {insights.map((bullet, i) => {
                const isUrgent = bullet.includes("re-engagement") || bullet.includes("inactive");
                return (
                  <div key={i} data-testid={`insight-bullet-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, color: isUrgent ? "#94a3b8" : "#d1d5db", lineHeight: 1.5, flexShrink: 0 }}>&#8226;</span>
                    <span style={{ fontSize: 12, color: isUrgent ? "#475569" : "#94a3b8", fontWeight: isUrgent ? 500 : 400, lineHeight: 1.5 }}>{bullet}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
