/**
 * ReinforcementToast — Dark glass toast for action feedback.
 *
 * Position: bottom center, 24px from bottom
 * Style: dark glass, backdrop blur, glowing indicator dot
 * Animation: fade + translateY enter/exit
 * Auto-dismiss: 3 seconds, only 1 visible at a time
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { onReinforcement, INDICATOR } from "../../lib/reinforcement";

const DISMISS_MS = 3000;

export default function ReinforcementToast() {
  const [toast, setToast] = useState(null);   // { message, subtext, indicator }
  const [phase, setPhase] = useState("idle");  // idle | enter | visible | exit
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase("exit");
    exitTimerRef.current = setTimeout(() => {
      setToast(null);
      setPhase("idle");
    }, 200);
  }, []);

  const show = useCallback((feedback) => {
    clearTimeout(timerRef.current);
    clearTimeout(exitTimerRef.current);

    // If already visible, quick exit then re-enter
    if (phase !== "idle") {
      setPhase("exit");
      setTimeout(() => {
        setToast(feedback);
        setPhase("enter");
        setTimeout(() => setPhase("visible"), 30);
        timerRef.current = setTimeout(dismiss, DISMISS_MS);
      }, 100);
    } else {
      setToast(feedback);
      setPhase("enter");
      setTimeout(() => setPhase("visible"), 30);
      timerRef.current = setTimeout(dismiss, DISMISS_MS);
    }
  }, [phase, dismiss]);

  useEffect(() => {
    const unsub = onReinforcement(show);
    return () => { unsub(); clearTimeout(timerRef.current); clearTimeout(exitTimerRef.current); };
  }, [show]);

  if (!toast || phase === "idle") return null;

  const dotColor = INDICATOR[toast.indicator] || INDICATOR.neutral;
  const isEntering = phase === "enter";
  const isExiting = phase === "exit";

  const opacity = isEntering ? 0 : isExiting ? 0 : 1;
  const translateY = isEntering ? 8 : isExiting ? 6 : 0;

  return createPortal(
    <div
      data-testid="reinforcement-toast"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity,
        transition: isExiting
          ? "opacity 180ms ease, transform 180ms ease"
          : "opacity 220ms ease, transform 220ms ease",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div style={{
        width: "max-content",
        minWidth: 280,
        maxWidth: 420,
        padding: "12px 16px",
        borderRadius: 14,
        background: "rgba(20,20,20,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}>
        {/* Glowing indicator dot */}
        <span style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}, 0 0 12px ${dotColor}40`,
          flexShrink: 0,
          marginTop: 5,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.35,
          }}>
            {toast.message}
          </div>
          {toast.subtext && (
            <div style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              marginTop: 2,
              lineHeight: 1.3,
            }}>
              {toast.subtext}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
