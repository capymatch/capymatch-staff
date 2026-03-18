/**
 * HeroSection — Scrollable section inside the dark hero card.
 * Styled for dark background. Navigation arrows in light/transparent style.
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
    const cardWidth = variant === "urgent" ? 356 : 296;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  return (
    <div style={{ marginBottom: 16 }} data-testid={`hero-section-${variant}`}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
            data-testid={`hero-dot-${variant}`}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 10,
              background: `${dotColor}20`,
              color: dotColor,
            }}
            data-testid={`hero-count-${variant}`}
          >
            {count}
          </span>
        </div>

        {/* Navigation arrows */}
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
                width: 26,
                height: 26,
                borderRadius: 7,
                background: can ? "rgba(255,255,255,0.06)" : "transparent",
                border: can ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                cursor: can ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: can ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                transition: "all 0.15s",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="hero-scroll-container"
        data-testid={`hero-scroll-${variant}`}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2,
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
