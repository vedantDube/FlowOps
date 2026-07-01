"use client";

import { useEffect, useRef, useState } from "react";

const RING_LAG = 0.18; // 0-1, how quickly the outer ring catches up to the dot (lower = more trailing lag)
const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, [role='button'], [onclick], label";

/**
 * Replaces the system cursor app-wide with a small dot + a trailing ring that
 * scales up over interactive elements. Only activates on desktop with a real
 * pointer and no reduced-motion preference — on touch devices or when the
 * user prefers reduced motion, the native cursor is left completely alone
 * (never risk hiding the cursor and not replacing it with anything).
 */
export function CustomCursor() {
  const [active, setActive] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
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
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        ringRef.current?.classList.add("is-hovering");
      }
    };
    const handleOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        ringRef.current?.classList.remove("is-hovering");
      }
    };
    const handleDown = () => ringRef.current?.classList.add("is-pressing");
    const handleUp = () => ringRef.current?.classList.remove("is-pressing");

    // Trailing ring: eased toward the raw cursor position every frame.
    const tick = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * RING_LAG;
      ring.current.y += (mouse.current.y - ring.current.y) * RING_LAG;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;
      }
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
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
    </>
  );
}
