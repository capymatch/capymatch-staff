import React, { useRef, useState, useCallback } from "react";
import { Check, ArrowRight, Clock } from "lucide-react";

const THRESHOLD = 80;
const SNAP_MS = 200;

/**
 * SwipeableCard — wraps card content with swipe-to-act panels.
 * Swipe right → primary action (green). Swipe left → snooze options (amber).
 * Props: children, onAction, onSnooze, actionLabel, programId
 */
export default function SwipeableCard({ children, onAction, onSnooze, actionLabel, programId }) {
  const [offsetX, setOffsetX] = useState(0);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [committed, setCommitted] = useState(null); // 'action' | 'snooze'
  const tracking = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false); // axis lock
  const didSwipe = useRef(false); // suppress click after swipe
  const containerRef = useRef(null);

  const reset = useCallback(() => {
    setOffsetX(0);
    tracking.current = false;
    locked.current = false;
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    if (committed) return;
    startX.current = clientX;
    startY.current = clientY;
    tracking.current = true;
    locked.current = false;
    didSwipe.current = false;
    setSnoozeOpen(false);
  }, [committed]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!tracking.current || committed) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    // Axis lock: if vertical motion > horizontal, abort swipe
    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        tracking.current = false;
        setOffsetX(0);
        return;
      }
      if (Math.abs(dx) > 8) { locked.current = true; didSwipe.current = true; }
      else return;
    }

    // Dampen beyond threshold
    const clamped = dx > 0
      ? Math.min(dx, THRESHOLD + (dx - THRESHOLD) * 0.3)
      : Math.max(dx, -(THRESHOLD + (-dx - THRESHOLD) * 0.3));
    setOffsetX(clamped);
  }, [committed]);

  const handleEnd = useCallback(() => {
    if (!tracking.current || committed) { tracking.current = false; return; }
    tracking.current = false;
    locked.current = false;

    if (offsetX > THRESHOLD) {
      // Commit right swipe → action
      setCommitted('action');
      setOffsetX(300);
      setTimeout(() => {
        onAction?.();
        setTimeout(() => { setCommitted(null); setOffsetX(0); }, 300);
      }, 180);
    } else if (offsetX < -THRESHOLD) {
      // Open snooze panel
      setSnoozeOpen(true);
      setOffsetX(0);
    } else {
      setOffsetX(0);
    }
  }, [offsetX, onAction, committed]);

  const handleSnooze = useCallback((days) => {
    setCommitted('snooze');
    setSnoozeOpen(false);
    setTimeout(() => {
      onSnooze?.(days);
      setTimeout(() => { setCommitted(null); }, 300);
    }, 120);
  }, [onSnooze]);

  // Touch handlers
  const onTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  // Mouse handlers (for desktop testing)
  const onMouseDown = (e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); };
  const onMouseMove = (e) => { if (tracking.current) handleMove(e.clientX, e.clientY); };
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { if (tracking.current) handleEnd(); };

  const isMoving = offsetX !== 0;
  const rightPct = Math.min(Math.abs(offsetX) / THRESHOLD, 1);
  const leftPct = Math.min(Math.abs(offsetX) / THRESHOLD, 1);

  const SNOOZE_OPTIONS = [
    { label: "Tomorrow", days: 1 },
    { label: "In 3 days", days: 3 },
    { label: "Next week", days: 7 },
  ];

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}
      data-testid={`swipeable-${programId}`}
    >
      {/* Right swipe reveal — green action */}
      {offsetX > 4 && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
          background: `rgba(16,185,129,${0.08 + rightPct * 0.12})`,
          display: 'flex', alignItems: 'center', paddingLeft: 20, gap: 8,
          transition: isMoving ? 'none' : `opacity ${SNAP_MS}ms ease-out`,
        }} data-testid={`swipe-right-${programId}`}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `rgba(16,185,129,${0.2 + rightPct * 0.5})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${0.7 + rightPct * 0.3})`,
            transition: isMoving ? 'none' : `transform ${SNAP_MS}ms ease-out`,
          }}>
            {rightPct >= 1
              ? <Check style={{ width: 14, height: 14, color: '#fff' }} />
              : <ArrowRight style={{ width: 14, height: 14, color: '#10b981' }} />
            }
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#047857',
            opacity: rightPct,
            transition: isMoving ? 'none' : `opacity ${SNAP_MS}ms ease-out`,
          }}>{actionLabel || 'Take Action'}</span>
        </div>
      )}

      {/* Left swipe reveal — amber snooze */}
      {offsetX < -4 && !snoozeOpen && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
          background: `rgba(217,119,6,${0.06 + leftPct * 0.10})`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, gap: 8,
          transition: isMoving ? 'none' : `opacity ${SNAP_MS}ms ease-out`,
        }} data-testid={`swipe-left-${programId}`}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#92400e',
            opacity: leftPct,
            transition: isMoving ? 'none' : `opacity ${SNAP_MS}ms ease-out`,
          }}>Snooze</span>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `rgba(217,119,6,${0.15 + leftPct * 0.35})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${0.7 + leftPct * 0.3})`,
            transition: isMoving ? 'none' : `transform ${SNAP_MS}ms ease-out`,
          }}>
            <Clock style={{ width: 14, height: 14, color: leftPct >= 1 ? '#fff' : '#d97706' }} />
          </div>
        </div>
      )}

      {/* Snooze options panel */}
      {snoozeOpen && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
          background: 'rgba(217,119,6,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          animation: 'swipe-panel-in 180ms ease-out both',
        }} data-testid={`snooze-panel-${programId}`}>
          {SNOOZE_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={(e) => { e.stopPropagation(); handleSnooze(opt.days); }}
              data-testid={`snooze-${opt.days}d-${programId}`}
              style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: 'rgba(217,119,6,0.1)', color: '#92400e',
                border: '1px solid rgba(217,119,6,0.15)', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 100ms ease-out',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(217,119,6,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(217,119,6,0.1)'}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); setSnoozeOpen(false); }}
            data-testid={`snooze-cancel-${programId}`}
            style={{
              padding: '6px 10px', borderRadius: 7, fontSize: 10, fontWeight: 600,
              background: 'transparent', color: 'var(--cm-text-4, #94a3b8)',
              border: '1px solid var(--cm-border, #e2e8f0)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
        </div>
      )}

      {/* Committed overlay */}
      {committed && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10, zIndex: 5,
          background: committed === 'action' ? 'rgba(16,185,129,0.15)' : 'rgba(217,119,6,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'swipe-commit 300ms ease-out both',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: committed === 'action' ? '#10b981' : '#d97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'swipe-check-pop 300ms ease-out both',
          }}>
            {committed === 'action'
              ? <Check style={{ width: 16, height: 16, color: '#fff' }} />
              : <Clock style={{ width: 16, height: 16, color: '#fff' }} />
            }
          </div>
        </div>
      )}

      {/* Card content — translated by swipe offset */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClickCapture={(e) => { if (didSwipe.current) { e.stopPropagation(); e.preventDefault(); } }}
        style={{
          position: 'relative', zIndex: snoozeOpen ? 0 : 2,
          transform: `translateX(${offsetX}px)`,
          transition: isMoving && tracking.current ? 'none' : `transform ${SNAP_MS}ms ease-out`,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: locked.current ? 'none' : 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
