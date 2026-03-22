import { Loader2, ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "./constants";
import "../pipeline/pipeline-premium.css";

function buildRail(program) {
  if (!program) return null;
  const stage = program.journey_stage || program.board_group;
  const map = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const active = map[stage] || stage || "added";
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);
  return { active, activeIdx };
}

export function PrimaryHeroCard({ hero, program, matchScore, navigate }) {
  if (!hero) return null;
  const Icon = hero.icon;
  const isCommitted = hero.type === "committed";

  /* ── Committed milestone — special golden treatment ── */
  if (isCommitted) {
    return (
      <div className="mb-4 rounded-2xl overflow-hidden relative text-center py-8 sm:py-10 px-6"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(16,185,129,0.04) 40%, #fff 100%)",
          border: "1px solid rgba(251,191,36,0.25)",
          boxShadow: "0 1px 4px rgba(19,33,58,0.03)",
        }}
        data-testid="primary-hero-card">
        <div className="text-4xl mb-3">&#127942;</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
          style={{ color: hero.accent }}>{hero.kicker}</p>
        <h3 className="text-xl sm:text-2xl font-extrabold mb-2"
          style={{ color: "#0f172a" }}
          data-testid="hero-title">{hero.title}</h3>
        <p className="text-sm" style={{ color: "#64748b" }}>{hero.subtitle}</p>
      </div>
    );
  }

  const rail = buildRail(program);
  const matchPct = matchScore?.match_score;
  const logoUrl = matchScore?.logo_url || program?.logo_url;
  const domain = matchScore?.domain || program?.domain;

  /* ── Standard hero — Pipeline hero design ── */
  return (
    <div className="mb-4 rounded-[18px] sm:rounded-[28px] overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #111b34 0%, #17254a 55%, #1c3568 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 70px rgba(19, 33, 58, 0.10)",
      }}
      data-testid="primary-hero-card">

      {/* Glow orbs */}
      <div className="ds-glow-teal" />
      <div className="ds-glow-purple" />

      {/* Slide content */}
      <div className="relative z-[1] px-4 sm:px-6 py-4 sm:py-5">

        {/* BADGE ROW */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5" data-testid="hero-badge-row">
          <span className="ds-badge" style={{
            background: `${hero.accent}20`,
            color: hero.accent,
          }} data-testid="hero-kicker">
            {hero.kicker}
          </span>
          {hero.pills?.map((pill, i) => (
            <span key={i} className="ds-badge" style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
            }}>
              {pill.label}
            </span>
          ))}
        </div>

        {/* SCHOOL NAME — logo + name + match % */}
        {program && (
          <div className="flex items-center gap-3 mb-1" data-testid="hero-school-row">
            <UniversityLogo
              name={program.university_name}
              logoUrl={logoUrl}
              domain={domain}
              size={28}
              className="rounded-lg flex-shrink-0"
            />
            <h3 className="text-[18px] sm:text-[22px] flex-1 min-w-0" style={{
              fontWeight: 600, color: "#fff", letterSpacing: "-0.04em",
              margin: 0, lineHeight: 1.1, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }} data-testid="hero-school-name">
              {program.university_name || "School"}
            </h3>
            {matchPct != null && (
              <span className="flex-shrink-0" style={{
                fontSize: 13, fontWeight: 700,
                color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "rgba(255,255,255,0.4)",
              }}>{matchPct}%</span>
            )}
          </div>
        )}

        {/* PRIMARY ACTION */}
        <div data-testid="hero-advice-box">
          <div style={{
            fontSize: 16, fontWeight: 500, letterSpacing: "-0.02em",
            color: "#fff", lineHeight: 1.3, margin: "6px 0 6px",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }} data-testid="hero-title">
            {hero.title}
          </div>
          {/* Context / subtitle */}
          <div style={{
            color: "rgba(255,255,255,0.50)", fontSize: 13,
            fontWeight: 400, lineHeight: 1.4,
          }} data-testid="hero-subtitle">
            {hero.subtitle}
          </div>
        </div>

        {/* PROGRESS RAIL */}
        {rail && (
          <>
            <div className="ds-eyebrow mt-3 mb-0.5" style={{
              color: "rgba(255,255,255,0.30)", fontSize: 9, letterSpacing: "0.1em",
            }}>
              Where you are right now
            </div>
            <div className="ds-progress-track" data-testid="hero-progress-rail">
              {RAIL_STAGES.map((s, stIdx) => {
                const isActive = stIdx === rail.activeIdx;
                const isPast = stIdx < rail.activeIdx;
                return (
                  <div key={s.key}
                    className={`ds-progress-step${isActive ? " active" : ""}${isPast ? " past" : ""}`}
                    data-testid={`rail-stage-${s.key}`}>
                    <div className="ds-progress-dot" />
                    {s.label}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* CTA ROW */}
        <div className="flex items-center gap-3 mt-3">
          {hero.primaryCta && (
            <button onClick={hero.primaryCta.handler} disabled={hero.primaryCta.loading}
              className="ds-btn-primary text-[12px] sm:text-[13px] py-2 px-3.5 sm:py-2 sm:px-4"
              style={{ backgroundColor: hero.accent, opacity: hero.primaryCta.loading ? 0.6 : 1 }}
              data-testid="hero-primary-cta">
              {hero.primaryCta.loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : hero.primaryCta.icon && <hero.primaryCta.icon className="w-3.5 h-3.5" />}
              {hero.primaryCta.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {hero.secondaryCta && (
            <button onClick={hero.secondaryCta.handler}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.40)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; }}
              data-testid="hero-secondary-cta">
              {hero.secondaryCta.icon && <hero.secondaryCta.icon className="w-3.5 h-3.5" />}
              {hero.secondaryCta.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
