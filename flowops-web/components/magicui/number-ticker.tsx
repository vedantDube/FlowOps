"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/app/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mounted = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const start = direction === "up" ? 0 : value;
    const end = direction === "up" ? value : 0;
    const duration = 1500;
    const startTime = performance.now() + delay * 1000;

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const tick = (currentTime: number) => {
      if (!ref.current) return;
      const elapsed = Math.max(0, currentTime - startTime);
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = start + (end - start) * easedProgress;
      ref.current.textContent = current.toFixed(decimalPlaces);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, direction, delay, decimalPlaces]);

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      0
    </span>
  );
}
