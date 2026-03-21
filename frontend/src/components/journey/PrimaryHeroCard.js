import { Loader2 } from "lucide-react";

function HeroCta({ cta, accent, primary }) {
  const Icon = cta.icon;
  if (primary) {
    return (
      <button onClick={cta.handler} disabled={cta.loading}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-white transition-colors shadow-sm"
        style={{ backgroundColor: accent, opacity: cta.loading ? 0.6 : 1 }}
        data-testid="hero-primary-cta">
        {cta.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon && <Icon className="w-3.5 h-3.5" />}
        {cta.label}
      </button>
    );
  }
  return (
    <button onClick={cta.handler}
      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
      style={{ color: "#64748b", border: "1px solid #e2e8f0" }}
      data-testid="hero-secondary-cta">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {cta.label}
    </button>
  );
}

export function PrimaryHeroCard({ hero }) {
  if (!hero) return null;
  const Icon = hero.icon;
  const isCommitted = hero.type === "committed";

  return (
    <div className={`mb-4 rounded-lg overflow-hidden ${isCommitted ? "relative" : ""}`}
      style={{
        background: isCommitted
          ? "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(16,185,129,0.04) 40%, #fff 100%)"
          : "#fff",
        border: isCommitted ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(20,37,68,0.06)",
        borderLeft: !isCommitted ? `4px solid ${hero.accent}` : undefined,
        borderRadius: isCommitted ? 10 : 14,
        boxShadow: "0 1px 4px rgba(19,33,58,0.03)",
      }}
      data-testid="primary-hero-card">

      <div className={`p-4 sm:p-5 ${isCommitted ? "text-center py-6 sm:py-8" : ""}`}>
        {isCommitted ? (
          <>
            <div className="text-4xl mb-3">&#127942;</div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
              style={{ color: hero.accent }}>{hero.kicker}</p>
            <h3 className="text-xl sm:text-2xl font-extrabold mb-2"
              style={{ color: "#0f172a" }}
              data-testid="hero-title">{hero.title}</h3>
            <p className="text-sm" style={{ color: "#64748b" }}>{hero.subtitle}</p>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: hero.iconBg }}>
              <Icon className="w-5 h-5" style={{ color: hero.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: hero.accent }} data-testid="hero-kicker">{hero.kicker}</p>
              <h3 className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}
                data-testid="hero-title">{hero.title}</h3>
              <p className="text-xs mb-3" style={{ color: "#64748b" }}
                data-testid="hero-subtitle">{hero.subtitle}</p>
              {/* Pills */}
              {hero.pills?.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {hero.pills.map((pill, i) => (
                    <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(100,116,139,0.06)", color: "#64748b" }}>
                      {pill.label}
                    </span>
                  ))}
                </div>
              )}
              {/* CTAs */}
              <div className="flex gap-2 flex-wrap">
                {hero.primaryCta && <HeroCta cta={hero.primaryCta} accent={hero.accent} primary />}
                {hero.secondaryCta && <HeroCta cta={hero.secondaryCta} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
