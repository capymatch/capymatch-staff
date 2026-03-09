/**
 * UniversityLogo — shows a school initial badge.
 * Can be extended later to fetch real logos from Clearbit / logo APIs.
 */
export default function UniversityLogo({ domain, name, logoUrl, size = 38, className = "" }) {
  const initial = (name || domain || "?")[0].toUpperCase();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{ width: size, height: size, objectFit: "cover" }}
        className={`flex-shrink-0 ${className}`}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
    );
  }

  // Generate a deterministic color from the domain
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
