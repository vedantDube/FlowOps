"use client";

import React from "react";

interface FlowOpsLogoProps {
  /** Size of the icon in pixels (default: 36) */
  size?: number;
  /** Show the "FlowOps" text next to the icon */
  showText?: boolean;
  /** Subtitle text below "FlowOps" (e.g. "Engineering Intelligence", "Personal Mode") */
  subtitle?: string;
  /** Extra className for the wrapper */
  className?: string;
}

/**
 * Inline SVG logo – renders the FlowOps "F" flow-mark without importing an
 * external file so it works everywhere (SSR, static export, email, etc.).
 */
function FlowOpsIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="flowops-bg"
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#flowops-bg)" />
      {/* Flow mark – three bars forming abstract "F" */}
      <rect x="132" y="120" width="248" height="48" rx="24" fill="#09090B" opacity="0.9" />
      <rect x="132" y="232" width="180" height="48" rx="24" fill="#09090B" opacity="0.9" />
      <rect x="132" y="344" width="120" height="48" rx="24" fill="#09090B" opacity="0.9" />
      {/* Vertical connector */}
      <rect x="132" y="120" width="48" height="272" rx="24" fill="#09090B" opacity="0.9" />
      {/* Pulse dot */}
      <circle cx="360" cy="144" r="18" fill="#09090B" opacity="0.35" />
    </svg>
  );
}

export default function FlowOpsLogo({
  size = 36,
  showText = true,
  subtitle,
  className = "",
}: FlowOpsLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        style={{ width: size, height: size }}
      >
        <FlowOpsIcon size={size} />
      </div>
      {showText && (
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground tracking-tight">
            FlowOps
          </p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
