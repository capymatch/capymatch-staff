import { useState, useEffect } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
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
    // Split on explicit double newlines first
    const byBreaks = msg.split(/\n\n/).map(s => s.trim()).filter(Boolean);
    if (byBreaks.length > 1) return byBreaks;
    // Fallback: split on sentences
    const parts = msg.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length <= 1) return msg;
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
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
      }}
      data-testid="primary-hero-card">

      <div className="relative z-[1] px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex gap-4">

        <div className="flex-1 min-w-0">

        {/* METADATA CHIPS — compact, low-dominance */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2" data-testid="hero-badge-row">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide" style={{
            background: `${hero.accent}15`, color: hero.accent,
          }} data-testid="hero-kicker">
            {hero.kicker}
          </span>
          {hero.pills?.map((pill, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium" style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.32)",
            }}>
              {pill.label}
            </span>
          ))}
        </div>

        {/* 1. ICON + TITLE */}
        <div className="flex items-start gap-3.5 mb-0.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${hero.accent}18`, boxShadow: `0 0 16px ${hero.accent}12` }}>
            <Icon className="w-[22px] h-[22px]" style={{ color: hero.accent }} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight"
              style={{ color: "#fff", lineHeight: 1.15, letterSpacing: "-0.025em" }}
              data-testid="hero-title">
              {hero.title}
            </h3>
          </div>
        </div>

        {/* 2. URGENCY LINE */}
        {hero.isCommunication && urgencyLine && (
          <div className="flex items-center gap-1.5 ml-[58px] mt-1 mb-2" data-testid="hero-urgency-line">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
            <p className="text-[13px] font-bold" style={{ color: "rgba(248,113,113,0.9)", lineHeight: 1.4 }}>
              {urgencyLine}
            </p>
          </div>
        )}

        {/* 3. MESSAGE TO COACH — read-only preview */}
        {hero.isCommunication && messageParagraphs && (
          <div className="mb-3 ml-[58px] rounded-2xl px-6 py-5"
            style={{ background: "rgba(255,255,255,0.03)" }}
            data-testid="hero-suggested-message">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2.5"
              style={{ color: "rgba(255,255,255,0.30)" }}>
              Message to coach
            </p>
            {Array.isArray(messageParagraphs) ? (
              <div className="space-y-2">
                {messageParagraphs.map((p, i) => (
                  <p key={i} className="text-[13px]"
                    style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                    {i === 0 ? `\u201c${p}` : i === messageParagraphs.length - 1 ? `${p}\u201d` : p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[13px]"
                style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                &ldquo;{messageParagraphs}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* 4. HELPER TEXT — above CTA */}
        {hero.isCommunication && messageParagraphs && (
          <p className="ml-[58px] mt-1 mb-2 text-[10px]"
            style={{ color: "rgba(255,255,255,0.28)" }}
            data-testid="hero-edit-hint">
            You can edit before sending
          </p>
        )}

        {/* 5. PRIMARY CTA */}
        <div className="ml-[58px] mt-1.5">
          {hero.primaryCta && (
            <>
              {hero.isCommunication && (
                <span className="flex items-center gap-1 text-[10px] font-medium mb-1" style={{ color: "rgba(16,185,129,0.65)" }} data-testid="hero-ready-signal">
                  <Check className="w-3 h-3" /> {["Ready to send", "Looks good to send", "Quick follow-up ready"][Math.abs((hero.id || "").length) % 3]}
                </span>
              )}
              <button onClick={() => {
                  if (hero.isCommunication && hero.primaryCta?.handler) {
                    hero.primaryCta.handler({
                      subject: hero.suggestedSubject || "",
                      body: hero.suggestedMessage || hero.suggestedReply || "",
                    });
                  } else if (hero.primaryCta?.handler) {
                    hero.primaryCta.handler();
                  }
                }} disabled={hero.primaryCta.loading}
                className="ds-btn-primary text-[14px] sm:text-[15px] py-3.5 px-6 sm:py-3.5 sm:px-7 font-bold"
                style={{ backgroundColor: hero.accent, opacity: hero.primaryCta.loading ? 0.6 : 1, boxShadow: `0 0 28px ${hero.accent}35, 0 4px 12px ${hero.accent}20` }}
                data-testid="hero-primary-cta">
                {hero.primaryCta.loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : hero.primaryCta.icon && <hero.primaryCta.icon className="w-3.5 h-3.5" />}
                {hero.isCommunication ? "Send to coach" : hero.primaryCta.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* 6. SECONDARY CTA — own row, below primary */}
          {hero.secondaryCta && (
            <div className="mt-3">
              <button onClick={hero.secondaryCta.handler}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px]"
                style={{ color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 400 }}
                data-testid="hero-secondary-cta">
                {hero.secondaryCta.label}
              </button>
            </div>
          )}
        </div>

        {/* 7. WHY THIS — intentional, readable */}
        {hero.whyThis?.length > 0 && (
          <div className="ml-[58px] mt-5 mb-1 transition-all duration-300"
            style={{
              opacity: whyVisible ? 1 : 0,
              transform: whyVisible ? "translateY(0)" : "translateY(4px)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: 14,
            }}
            data-testid="hero-why-this">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
              style={{ color: "rgba(255,255,255,0.50)" }}>
              Why this?
            </p>
            <p className="text-[12px] sm:text-[13px]"
              style={{ color: "rgba(255,255,255,0.60)", lineHeight: 1.6 }}>
              {hero.whyThis.join(" \u2022 ")}
            </p>
          </div>
        )}

        {/* 8. METADATA */}
        <p className="text-[10px] ml-[58px] mt-2"
          style={{ color: "rgba(255,255,255,0.22)", lineHeight: 1.5 }}
          data-testid="hero-subtitle">
          {hero.subtitle}
        </p>

        </div>

        </div>
      </div>
    </div>
  );
}
