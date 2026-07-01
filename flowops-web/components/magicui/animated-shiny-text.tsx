"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

interface AnimatedShinyTextProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedShinyText({
  children,
  className,
}: AnimatedShinyTextProps) {
  return (
    <p
      className={cn(
        "mx-auto max-w-md",
        "animate-[shimmerSlide_4s_ease-in-out_infinite]",
        // background-size is relative (200% of the element's own width) so the
        // gradient tile always fully covers the text at every animation frame —
        // a fixed pixel size + no-repeat left most of the text with no
        // background to clip against, making it invisible outside a narrow band.
        "bg-clip-text [background-size:200%_100%]",
        "[background-image:linear-gradient(90deg,hsl(var(--foreground)/0.7)_0%,rgba(74,222,128,1)_40%,rgba(74,222,128,1)_60%,hsl(var(--foreground)/0.7)_100%)]",
        "text-transparent",
        className,
      )}
    >
      {children}
    </p>
  );
}
