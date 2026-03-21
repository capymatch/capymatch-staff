import React from "react";
import { ChevronRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

export default function CommittedBanner({ programs, navigate }) {
  if (programs.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }} data-testid="committed-banner">
      {programs.map(p => (
        <div key={p.program_id} onClick={() => navigate(`/pipeline/${p.program_id}`)} style={{
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
          borderRadius: 22, padding: "20px 26px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 18, marginBottom: 10,
          boxShadow: "0 18px 40px rgba(245,158,11,0.22)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }} data-testid={`committed-card-${p.program_id}`}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UniversityLogo domain={p.domain} name={p.university_name} size={34} className="rounded-[10px]" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ds-eyebrow" style={{ color: "rgba(255,255,255,0.7)", marginBottom: 4, fontSize: 10 }}>Committed</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{p.university_name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {p.division && <span style={{ fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,0.2)", color: "#fff", letterSpacing: "0.04em" }}>{p.division}</span>}
            <ChevronRight style={{ width: 20, height: 20, color: "rgba(255,255,255,0.6)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
