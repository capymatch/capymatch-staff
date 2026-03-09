import { useState } from "react";

/**
 * UniversityLogo — shows real logo from KB, falls back to domain-based logo, then letter avatar.
 */
export default function UniversityLogo({ domain, name, logoUrl, size = 38, className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const initial = (name || domain || "?")[0].toUpperCase();

  // Try KB logo first, then Google high-res favicon, then letter avatar
  const primarySrc = logoUrl || null;
  const fallbackSrc = domain ? `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128` : null;

  if (primarySrc && !imgFailed) {
    return (
      <img
        src={primarySrc}
        alt={name}
        style={{ width: size, height: size, objectFit: "contain" }}
        className={`flex-shrink-0 ${className}`}
        onError={() => setImgFailed(true)}
        data-testid={`logo-${domain || "unknown"}`}
      />
    );
  }

  if (fallbackSrc && !fallbackFailed) {
    return (
      <img
        src={fallbackSrc}
        alt={name}
        style={{ width: size, height: size, objectFit: "contain" }}
        className={`flex-shrink-0 ${className}`}
        onError={() => setFallbackFailed(true)}
        data-testid={`logo-${domain || "unknown"}`}
      />
    );
  }

  // Letter avatar fallback
  const colors = [
    "#1a8a80", "#2563eb", "#d97706", "#dc2626", "#7c3aed",
    "#0891b2", "#16a34a", "#be123c", "#4f46e5", "#ca8a04",
  ];
  const hash = (domain || name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = colors[hash % colors.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: "white",
        fontSize: size * 0.42,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      className={className}
      data-testid={`logo-${domain || "unknown"}`}
    >
      {initial}
    </div>
  );
}
