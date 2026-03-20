/**
 * ParticleBurst — Subtle particle animation for card feedback.
 *
 * Triggers a soft glow pulse (scale 1→1.02→1, 300ms) on the card
 * and emits 6-12 particles that expand outward with upward drift.
 *
 * Particle specs:
 *   Size: 2-4px, round
 *   Motion: expand 20-40px radius, slight upward drift
 *   Duration: 400-600ms fade out
 *
 * Usage:
 *   <ParticleBurst active={shouldFire} color="#60a5fa" onComplete={() => setFired(false)}>
 *     <YourCard />
 *   </ParticleBurst>
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const PARTICLE_COUNT_MIN = 6;
const PARTICLE_COUNT_MAX = 12;
const PARTICLE_SIZE_MIN = 2;
const PARTICLE_SIZE_MAX = 4;
const RADIUS_MIN = 20;
const RADIUS_MAX = 40;
const DURATION = 500; // ms
const GLOW_DURATION = 300;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function generateParticles(color) {
  const count = Math.floor(randomBetween(PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX + 1));
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + randomBetween(-0.3, 0.3);
    const radius = randomBetween(RADIUS_MIN, RADIUS_MAX);
    const size = randomBetween(PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX);
    const duration = randomBetween(400, 600);
    const drift = randomBetween(-8, -16); // upward drift (negative Y)
    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius + drift,
      size,
      duration,
      color,
    };
  });
}

export default function ParticleBurst({ active, color = "rgba(255,255,255,0.9)", onComplete, children }) {
  const [particles, setParticles] = useState([]);
  const [glowPhase, setGlowPhase] = useState("idle"); // idle | scale-up | scale-down
  const containerRef = useRef(null);
  const hasCompletedRef = useRef(false);

  const fire = useCallback(() => {
    hasCompletedRef.current = false;
    setParticles(generateParticles(color));
    setGlowPhase("scale-up");

    // Glow: scale up → scale down
    setTimeout(() => setGlowPhase("scale-down"), GLOW_DURATION / 2);
    setTimeout(() => setGlowPhase("idle"), GLOW_DURATION);

    // Particles: clear after animation
    setTimeout(() => {
      setParticles([]);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
    }, DURATION + 50);
  }, [color, onComplete]);

  useEffect(() => {
    if (active) fire();
  }, [active, fire]);

  const scale = glowPhase === "scale-up" ? 1.02 : glowPhase === "scale-down" ? 1.005 : 1;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      {/* Card content with glow scale */}
      <div style={{
        transform: `scale(${scale})`,
        transition: `transform ${GLOW_DURATION / 2}ms ease-out`,
        transformOrigin: "center center",
      }}>
        {children}
      </div>

      {/* Particle layer */}
      {particles.length > 0 && (
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 0, height: 0,
          pointerEvents: "none",
          zIndex: 10,
        }}>
          {particles.map(p => (
            <Particle key={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Particle({ x, y, size, duration, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 ${size}px ${color}`,
      transform: mounted ? `translate(${x}px, ${y}px)` : "translate(0, 0)",
      opacity: mounted ? 0 : 1,
      transition: `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`,
      pointerEvents: "none",
    }} />
  );
}
