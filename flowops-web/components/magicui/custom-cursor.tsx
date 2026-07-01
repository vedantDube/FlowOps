"use client";

import { useEffect, useRef, useState } from "react";

const TRAIL_COUNT = 6; // echo nodes behind the main orb
const CHAIN_LAG = 0.35; // 0-1, how quickly each echo node catches up to the one in front of it
const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, [role='button'], [onclick], label";

/**
 * Replaces the system cursor app-wide with a glowing orb that leads a short
 * comet-style trail of fading, shrinking echo nodes — each one easing toward
 * the node in front of it (a lag chain), all computed in one requestAnimationFrame
 * loop with direct DOM writes (no React state per frame). The orb glows
 * brighter/bigger over interactive elements and shrinks slightly on press.
 * Only activates on desktop with a real pointer and no reduced-motion
 * preference — on touch devices or when the user prefers reduced motion, the
 * native cursor is left completely alone (never risk hiding the cursor and
 * not replacing it with anything).
 */
export function CustomCursor() {
  const [active, setActive] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouse = useRef({ x: -100, y: -100 });
  const chain = useRef(Array.from({ length: TRAIL_COUNT }, () => ({ x: -100, y: -100 })));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(hoverFine && !reducedMotion);
  }, []);

  useEffect(() => {
    if (!active) return;

    document.documentElement.classList.add("custom-cursor-active");

    const handleMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        orbRef.current?.classList.add("is-hovering");
      }
    };
    const handleOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        orbRef.current?.classList.remove("is-hovering");
      }
    };
    const handleDown = () => orbRef.current?.classList.add("is-pressing");
    const handleUp = () => orbRef.current?.classList.remove("is-pressing");

    // Comet tail: each echo node eases toward the one in front of it, so the
    // chain stretches out behind the orb during fast movement and collapses
    // back in when the cursor stops — classic comet-tail lag chaining.
    const tick = () => {
      let leaderX = mouse.current.x;
      let leaderY = mouse.current.y;

      chain.current.forEach((node, i) => {
        node.x += (leaderX - node.x) * CHAIN_LAG;
        node.y += (leaderY - node.y) * CHAIN_LAG;
        const el = trailRefs.current[i];
        if (el) {
          // Scale is baked into this same transform string (not set via a
          // separate JSX style prop) — an inline `transform` write always
          // replaces the whole value, it doesn't merge with anything else.
          const scale = 1 - (i + 1) / (TRAIL_COUNT + 2);
          el.style.transform = `translate(${node.x}px, ${node.y}px) translate(-50%, -50%) scale(${scale})`;
        }
        leaderX = node.x;
        leaderY = node.y;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseover", handleOver, { passive: true });
    document.addEventListener("mouseout", handleOut, { passive: true });
    document.addEventListener("mousedown", handleDown, { passive: true });
    document.addEventListener("mouseup", handleUp, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("mouseup", handleUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { trailRefs.current[i] = el; }}
          className="custom-cursor-trail"
          style={{ opacity: 1 - (i + 1) / (TRAIL_COUNT + 1) }}
          aria-hidden="true"
        />
      ))}
      <div ref={orbRef} className="custom-cursor-orb" aria-hidden="true" />
    </>
  );
}
