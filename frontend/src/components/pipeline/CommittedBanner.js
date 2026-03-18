import React from "react";
import { ChevronRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

export default function CommittedBanner({ programs, navigate }) {
  if (programs.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }} data-testid="committed-banner">
      {programs.map(p => (
        <div key={p.program_id} onClick={() => navigate(`/pipeline/${p.program_id}`)} style={{
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
          borderRadius: 10, padding: "18px 24px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 16, marginBottom: 8,
        }} data-testid={`committed-card-${p.program_id}`}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UniversityLogo domain={p.domain} name={p.university_name} size={32} className="rounded-[8px]" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>Committed</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{p.university_name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {p.division && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.2)", color: "#fff" }}>{p.division}</span>}
            <ChevronRight style={{ width: 18, height: 18, color: "rgba(255,255,255,0.6)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
