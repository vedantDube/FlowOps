"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface ShimmerButtonProps {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function ShimmerButton({
  shimmerColor = "#4ADE80",
  shimmerSize = "0.06em",
  borderRadius = "14px",
  shimmerDuration = "2.5s",
  background = "linear-gradient(180deg, #4ADE80 0%, #2AB862 100%)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as CSSProperties
      }
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-6 py-3",
        "text-sm font-semibold text-neutral-950",
        "[background:var(--bg)] [border-radius:var(--radius)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-green active:scale-[0.98]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {/* shimmer layer */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden [border-radius:var(--radius)]",
        )}
      >
        <div
          className="absolute inset-[-100%] animate-shimmer"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, var(--shimmer-color) 10deg, transparent 80deg)`,
            animation: `shimmer var(--speed) linear infinite`,
          }}
        />
      </div>
      {/* top highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
