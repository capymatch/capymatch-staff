/**
 * HeroSection — Scrollable horizontal section for a single tier of actions.
 *
 * Design rationale:
 * - Horizontal scroll with snap = natural mobile gesture, clean desktop layout
 * - Navigation arrows appear only when scrollable (no phantom controls)
 * - Section header uses a colored dot as the sole visual indicator of tier type
 * - Count badge provides at-a-glance volume without requiring counting
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HeroSection({ title, count, dotColor, variant, children }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, children]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = variant === "urgent" ? 336 : 296;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  return (
    <div style={{ marginBottom: 20 }} data-testid={`hero-section-${variant}`}>
      {/* ── Section header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          padding: "0 2px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
            data-testid={`hero-dot-${variant}`}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--cm-text)",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 10,
              background: `${dotColor}15`,
              color: dotColor,
            }}
            data-testid={`hero-count-${variant}`}
          >
            {count}
          </span>
        </div>

        {/* Desktop navigation arrows */}
        <div style={{ display: "flex", gap: 4 }} className="hero-nav-arrows">
          {[
            { dir: -1, can: canScrollLeft, id: "left", Icon: ChevronLeft },
            { dir: 1, can: canScrollRight, id: "right", Icon: ChevronRight },
          ].map(({ dir, can, id, Icon }) => (
            <button
              key={id}
              onClick={() => scroll(dir)}
              disabled={!can}
              data-testid={`hero-scroll-${id}-${variant}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: can ? "var(--cm-surface-2)" : "transparent",
                border: can ? "1px solid var(--cm-border)" : "1px solid transparent",
                cursor: can ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: can ? "var(--cm-text-2)" : "var(--cm-text-4)",
                transition: "all 0.15s",
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable card container ── */}
      <div
        ref={scrollRef}
        className="hero-scroll-container"
        data-testid={`hero-scroll-${variant}`}
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
