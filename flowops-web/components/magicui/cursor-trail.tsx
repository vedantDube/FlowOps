"use client";

import { useEffect, useRef, useState } from "react";

const SPAWN_INTERVAL_MS = 45; // throttle mousemove spawns to a smooth-but-cheap rate
const PARTICLE_LIFETIME_MS = 650;
const MAX_PARTICLES = 20; // safety cap in case of frame-drop bursts

interface Particle {
  id: number;
  x: number;
  y: number;
}

/**
 * A tasteful, minimal cursor trail for the marketing landing page only.
 * Small glowing dots (brand green) spawn at the cursor, fade and shrink out.
 * Inert on touch devices and when the user prefers reduced motion.
 */
export function CursorTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [enabled, setEnabled] = useState(false);
  const lastSpawn = useRef(0);
  const nextId = useRef(0);

  useEffect(() => {
    const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(hoverFine && !reducedMotion);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn.current < SPAWN_INTERVAL_MS) return;
      lastSpawn.current = now;

      const id = nextId.current++;
      setParticles((prev) => [...prev.slice(-MAX_PARTICLES + 1), { id, x: e.clientX, y: e.clientY }]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, PARTICLE_LIFETIME_MS);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="cursor-trail-dot"
          style={{ left: p.x - 4, top: p.y - 4 }}
        />
      ))}
    </div>
  );
}
