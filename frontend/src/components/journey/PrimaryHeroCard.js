import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import "../pipeline/pipeline-premium.css";

export function PrimaryHeroCard({ hero, program }) {
  const [whyVisible, setWhyVisible] = useState(false);

  useEffect(() => {
    if (hero?.whyThis?.length > 0) {
      const t = setTimeout(() => setWhyVisible(true), 150);
      return () => clearTimeout(t);
    }
    setWhyVisible(false);
  }, [hero]);

  if (!hero) return null;
  const Icon = hero.icon;
  const isCommitted = hero.type === "committed";

  // Build rail from program data - not used in card anymore
  const hasRail = false;

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

  /* ── Standard hero — two-column: content left, rail right ── */
  return (
    <div className="mb-4 rounded-[12px] sm:rounded-[28px] overflow-hidden relative"
      style={{
        background: "#161921",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid="primary-hero-card">

      <div className="relative z-[1] px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex gap-4">

        {/* LEFT: badges, title, context, CTAs */}
        <div className="flex-1 min-w-0">

        {/* BADGE ROW */}
        <div className="flex items-center gap-2.5 flex-wrap mb-4" data-testid="hero-badge-row">
          <span className="ds-badge" style={{
            background: `${hero.accent}20`, color: hero.accent,
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

        {/* ICON + TITLE */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${hero.accent}18` }}>
            <Icon className="w-5 h-5" style={{ color: hero.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight"
              style={{ color: "#fff", lineHeight: 1.25, letterSpacing: "-0.03em" }}
              data-testid="hero-title">
              {hero.title}
            </h3>
          </div>
        </div>

        {/* CONTEXT LINE */}
        {hero.whyThis?.length > 0 && (
          <div className="mb-3 transition-all duration-300"
            style={{
              opacity: whyVisible ? 1 : 0,
              transform: whyVisible ? "translateY(0)" : "translateY(4px)",
            }}
            data-testid="hero-why-this">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              Why this?
            </p>
            <p className="text-[12px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.55)" }}>
              {hero.whyThis.join(" \u2022 ")}
            </p>
          </div>
        )}

        {/* SUBTITLE / QUOTE */}
        <p className="text-[13px] mb-5"
          style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}
          data-testid="hero-subtitle">
          {hero.subtitle}
        </p>

        {/* CTA ROW */}
        <div className="flex items-center gap-3">
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

        </div>{/* end LEFT */}

        </div>{/* end flex row */}
      </div>
    </div>
  );
}
