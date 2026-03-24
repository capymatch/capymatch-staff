import { useState, useEffect } from "react";
import { Loader2, ArrowRight, Pencil, Check } from "lucide-react";
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

  // Extract urgency line from whyThis (first item that mentions days/overdue)
  const urgencyLine = (hero.whyThis || []).find(w =>
    /no response|overdue|days|time to follow/i.test(w)
  );

  // Format message into short paragraphs for readability
  const formatMessage = (msg) => {
    if (!msg) return null;
    const parts = msg.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length <= 1) return msg;
    // Group into 2-3 paragraphs
    if (parts.length === 2) return [parts[0], parts[1]];
    return [parts[0], parts.slice(1, -1).join(" "), parts[parts.length - 1]];
  };

  const messageParagraphs = hero.isCommunication
    ? formatMessage(hero.suggestedMessage || hero.suggestedReply)
    : null;

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

  /* ── Standard hero — action-driven layout ── */
  return (
    <div className="mb-4 rounded-[12px] sm:rounded-[28px] overflow-hidden relative"
      style={{
        background: "#161921",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid="primary-hero-card">

      <div className="relative z-[1] px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex gap-4">

        <div className="flex-1 min-w-0">

        {/* BADGE ROW */}
        <div className="flex items-center gap-2.5 flex-wrap mb-3" data-testid="hero-badge-row">
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

        {/* 1. ICON + TITLE */}
        <div className="flex items-start gap-3.5 mb-1">
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

        {/* 2. URGENCY LINE */}
        {hero.isCommunication && urgencyLine && (
          <div className="flex items-center gap-1.5 ml-[54px] mb-2.5" data-testid="hero-urgency-line">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
            <p className="text-[12px] font-semibold" style={{ color: "#f87171" }}>
              {urgencyLine}
            </p>
          </div>
        )}

        {/* 3. MESSAGE TO COACH — tighter, brighter, interactive */}
        {hero.isCommunication && messageParagraphs && (
          <div className="mb-3 ml-[54px] rounded-lg px-3 py-2.5 transition-colors"
            style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}
            data-testid="hero-suggested-message">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.30)" }}>
                Message to coach
              </p>
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "rgba(255,255,255,0.22)", cursor: "pointer" }}>
                <Pencil className="w-2.5 h-2.5" /> Tap to edit
              </span>
            </div>
            {Array.isArray(messageParagraphs) ? (
              <div className="space-y-1.5">
                {messageParagraphs.map((p, i) => (
                  <p key={i} className="text-[13px]"
                    style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                    {i === 0 ? `"${p}` : i === messageParagraphs.length - 1 ? `${p}"` : p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[13px]"
                style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                "{messageParagraphs}"
              </p>
            )}
          </div>
        )}

        {/* 4. CTA ROW */}
        <div className="flex items-center gap-3 ml-[54px] mb-2">
          {hero.primaryCta && (
            <div className="flex flex-col gap-1.5">
              {/* Ready signal */}
              {hero.isCommunication && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "rgba(16,185,129,0.7)" }} data-testid="hero-ready-signal">
                  <Check className="w-3 h-3" /> Ready to send
                </span>
              )}
              <button onClick={hero.primaryCta.handler} disabled={hero.primaryCta.loading}
                className="ds-btn-primary text-[13px] sm:text-[14px] py-2.5 px-4 sm:py-2.5 sm:px-5"
                style={{ backgroundColor: hero.accent, opacity: hero.primaryCta.loading ? 0.6 : 1 }}
                data-testid="hero-primary-cta">
                {hero.primaryCta.loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : hero.primaryCta.icon && <hero.primaryCta.icon className="w-3.5 h-3.5" />}
                {hero.isCommunication ? "Send to coach" : hero.primaryCta.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 5. SECONDARY CTA — ghost, minimal */}
          {hero.secondaryCta && (
            <button onClick={hero.secondaryCta.handler}
              className="inline-flex items-center gap-1 text-[10px] font-medium self-end mb-0.5"
              style={{ color: "rgba(255,255,255,0.15)", background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}
              data-testid="hero-secondary-cta">
              {hero.secondaryCta.icon && <hero.secondaryCta.icon className="w-2.5 h-2.5" />}
              {hero.secondaryCta.label}
            </button>
          )}
        </div>

        {/* 6. WHY THIS — de-emphasized */}
        {hero.whyThis?.length > 0 && (
          <div className="ml-[54px] mb-1.5 mt-3 transition-all duration-300"
            style={{
              opacity: whyVisible ? 1 : 0,
              transform: whyVisible ? "translateY(0)" : "translateY(4px)",
            }}
            data-testid="hero-why-this">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-0.5"
              style={{ color: "rgba(255,255,255,0.20)" }}>
              Why this?
            </p>
            <p className="text-[11px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.30)" }}>
              {hero.whyThis.join(" \u2022 ")}
            </p>
          </div>
        )}

        {/* METADATA */}
        <p className="text-[11px] ml-[54px]"
          style={{ color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}
          data-testid="hero-subtitle">
          {hero.subtitle}
        </p>

        </div>

        </div>
      </div>
    </div>
  );
}
