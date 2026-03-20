import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem("capymatch_token") || localStorage.getItem("token");
}

export default function RecapTeaser() {
  const navigate = useNavigate();
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/athlete/momentum-recap`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setRecap(await res.json());
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !recap || !recap.recap_hero) return null;

  const heated = recap.momentum?.heated_up?.length || 0;
  const cooling = recap.momentum?.cooling_off?.length || 0;
  const topPriority = recap.priorities?.find((p) => p.rank === "top");

  return (
    <div
      data-testid="recap-teaser"
      onClick={() => navigate("/recap")}
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: 14, padding: "14px 16px", marginBottom: 16,
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{
        position: "absolute", top: -30, right: -30, width: 80, height: 80,
        borderRadius: "50%", background: "rgba(99,102,241,0.08)",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Sparkles size={12} color="#818cf8" />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Momentum Recap
        </span>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginLeft: "auto" }}>
          {recap.period_label}
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.4, marginBottom: 8 }}>
        {recap.recap_hero}
      </div>

      {topPriority && (
        <div style={{
          fontSize: 11, color: "#f97316", fontWeight: 600, marginBottom: 6,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
          {topPriority.action}
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", gap: 12 }}>
          {heated > 0 && <span style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>{heated} heated</span>}
          {cooling > 0 && <span style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600 }}>{cooling} cooling</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: "#818cf8", fontWeight: 600 }}>
          View Recap <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
}
