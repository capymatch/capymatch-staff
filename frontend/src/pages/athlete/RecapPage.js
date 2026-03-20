import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Minus, Snowflake, Target, Eye, ChevronRight, Sparkles } from "lucide-react";
import { trackEvent } from "../../lib/analytics";

const API = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem("capymatch_token") || localStorage.getItem("token");
}

const CATEGORY_CONFIG = {
  heated_up: { label: "Heated Up", icon: Flame, color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.12)", dot: "#f97316" },
  holding_steady: { label: "Holding Steady", icon: Minus, color: "#6b7280", bg: "rgba(107,114,128,0.05)", border: "rgba(107,114,128,0.1)", dot: "#9ca3af" },
  cooling_off: { label: "Cooling Off", icon: Snowflake, color: "#3b82f6", bg: "rgba(59,130,246,0.05)", border: "rgba(59,130,246,0.1)", dot: "#60a5fa" },
};

const RANK_CONFIG = {
  top: { label: "Top Priority", icon: Target, color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.14)" },
  secondary: { label: "Secondary", icon: ChevronRight, color: "#d97706", bg: "rgba(217,119,6,0.05)", border: "rgba(217,119,6,0.1)" },
  watch: { label: "Watch", icon: Eye, color: "#6b7280", bg: "rgba(107,114,128,0.04)", border: "rgba(107,114,128,0.08)" },
};

function MomentumGroup({ category, items, navigate }) {
  const cfg = CATEGORY_CONFIG[category];
  if (!items || items.length === 0) return null;
  const Icon = cfg.icon;
  return (
    <div data-testid={`momentum-group-${category}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Icon size={14} color={cfg.color} />
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, letterSpacing: "0.01em" }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginLeft: 2 }}>({items.length})</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
              padding: "12px 14px", cursor: "pointer",
              transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{m.school_name}</span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginLeft: "auto" }}>{m.stage_label}</span>
            </div>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 500, lineHeight: 1.4, paddingLeft: 14 }}>
              {m.what_changed}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, lineHeight: 1.4, paddingLeft: 14, marginTop: 2 }}>
              {m.why_it_matters}
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
        display: "flex", alignItems: "flex-start", gap: 10,
        background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
        padding: "12px 14px", cursor: "pointer",
        transition: "transform 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: cfg.border,
      }}>
        <Icon size={14} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
          {priority.action}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
          {priority.reason}
        </div>
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#1e293b", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Analyzing momentum...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#dc2626", fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  const { recap_hero, period_label, momentum, priorities, ai_summary } = data;
  const heated = momentum?.heated_up || [];
  const steady = momentum?.holding_steady || [];
  const cooling = momentum?.cooling_off || [];

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
    <div data-testid="recap-page" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #f1f5f9",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          data-testid="recap-back-btn"
          onClick={() => navigate("/pipeline")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={20} color="#475569" />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>Momentum Recap</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{period_label}</div>
        </div>
      </div>

      <div style={{ padding: "20px 16px 40px", maxWidth: 640, margin: "0 auto" }}>
        {/* Section 1: Recap Hero */}
        <div
          ref={sectionRef("hero")}
          data-testid="recap-hero"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: 16, padding: "24px 20px", marginBottom: 24,
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", top: -20, right: -20, width: 100, height: 100,
            borderRadius: "50%", background: "rgba(99,102,241,0.08)",
          }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Pipeline Summary
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.4 }}>
            {recap_hero}
          </div>
          <div style={{
            display: "flex", gap: 16, marginTop: 16, paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f97316" }}>{heated.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Heated Up</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#9ca3af" }}>{steady.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Steady</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{cooling.length}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Cooling</div>
            </div>
          </div>
        </div>

        {/* Section 2: Momentum Shift */}
        <div ref={sectionRef("momentum_shift")} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Momentum Shift</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <MomentumGroup category="heated_up" items={heated} navigate={navigate} />
            <MomentumGroup category="holding_steady" items={steady} navigate={navigate} />
            <MomentumGroup category="cooling_off" items={cooling} navigate={navigate} />
          </div>
        </div>

        {/* Section 3: Priority Reset */}
        <div ref={sectionRef("priority_reset")} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Priority Reset</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {priorities.map((p, i) => (
              <PriorityItem key={i} priority={p} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Section 4: AI Summary */}
        {ai_summary && (
          <div ref={sectionRef("ai_summary")} data-testid="ai-summary" style={{
            background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} color="#818cf8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.04em" }}>AI Insight</span>
            </div>
            <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>
              {ai_summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
