"use client";

import { useId } from "react";
import { cn } from "@/app/lib/utils";

/**
 * FlowLine — FlowOps' signature stroke: a single S-curve suggesting a
 * commit stream finding its way. Three variants:
 *  - "draw":    draws itself in once on mount (headers, empty states)
 *  - "current": a dash drifts along the path forever (loading states)
 *  - "static":  plain stroke, no motion (tiny contexts like active nav)
 * Gradient runs primary → secondary so it follows the active accent theme.
 */
export default function FlowLine({
  width = 72,
  height = 12,
  variant = "draw",
  strokeWidth = 2.5,
  useCurrentColor = false,
  className = "",
}) {
  const gradId = useId();
  // One period of the S-curve in a 72×12 box, scaled by the viewBox
  const d = "M2 9 C 16 9, 20 3, 36 3 S 56 9, 70 9";
  // Path length of the curve above is ~74 units; used to size the draw dash
  const pathLength = 80;

  return (
    <svg
      viewBox="0 0 72 12"
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      style={{ "--flow-length": pathLength }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="72" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
      <path
        d={d}
        stroke={useCurrentColor ? "currentColor" : `url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={cn(
          variant === "draw" && "flow-line-draw",
          variant === "current" && "flow-line-current",
        )}
      />
    </svg>
  );
}
