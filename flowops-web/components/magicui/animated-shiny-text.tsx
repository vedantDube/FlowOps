"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface AnimatedShinyTextProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 200,
}: AnimatedShinyTextProps) {
  return (
    <p
      style={{ "--shimmer-width": `${shimmerWidth}px` } as React.CSSProperties}
      className={cn(
        "mx-auto max-w-md",
        "animate-[shimmerSlide_4s_ease-in-out_infinite]",
        "bg-clip-text bg-no-repeat [background-size:var(--shimmer-width)_100%]",
        "[background-image:linear-gradient(90deg,hsl(var(--foreground)/0.7)_0%,rgba(74,222,128,1)_40%,rgba(74,222,128,1)_60%,hsl(var(--foreground)/0.7)_100%)]",
        "text-transparent",
        className,
      )}
    >
      {children}
    </p>
  );
}
