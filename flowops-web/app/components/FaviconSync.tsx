"use client";

import { useEffect } from "react";

// Gradient tile + mark colors per accent, one pair for light mode and one
// for dark mode, so the browser tab favicon visually matches whichever
// accent (ThemeAccentPicker) and mode (ThemeToggle) the site is currently in.
const ACCENT_ICONS: Record<string, { light: [string, string, string]; dark: [string, string, string] }> = {
  green: { light: ["#4ADE80", "#0D9488", "#09090B"], dark: ["#16A34A", "#052e2b", "#ECFDF5"] },
  blue: { light: ["#38BDF8", "#0284C7", "#09090B"], dark: ["#0284C7", "#082f49", "#F0F9FF"] },
  indigo: { light: ["#6366F1", "#4338CA", "#09090B"], dark: ["#4338CA", "#1e1b4b", "#EEF2FF"] },
  violet: { light: ["#8B5CF6", "#6D28D9", "#09090B"], dark: ["#6D28D9", "#2e1065", "#F5F3FF"] },
  rose: { light: ["#FB7185", "#E11D48", "#09090B"], dark: ["#E11D48", "#4c0519", "#FFF1F2"] },
  amber: { light: ["#FBBF24", "#D97706", "#09090B"], dark: ["#D97706", "#451a03", "#FFFBEB"] },
  teal: { light: ["#2DD4BF", "#0F766E", "#09090B"], dark: ["#0F766E", "#042f2e", "#F0FDFA"] },
};

const DEFAULT_ACCENT = "green";
const FAVICON_LINK_ID = "dynamic-favicon";

function buildFaviconDataUri(accent: string, isDark: boolean): string {
  const entry = ACCENT_ICONS[accent] ?? ACCENT_ICONS[DEFAULT_ACCENT];
  const [from, to, mark] = isDark ? entry.dark : entry.light;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#g)"/>
  <rect x="8" y="7" width="16" height="4" rx="2" fill="${mark}" opacity="0.9"/>
  <rect x="8" y="14" width="11" height="4" rx="2" fill="${mark}" opacity="0.9"/>
  <rect x="8" y="21" width="7" height="4" rx="2" fill="${mark}" opacity="0.9"/>
  <rect x="8" y="7" width="4" height="18" rx="2" fill="${mark}" opacity="0.9"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function applyFavicon() {
  const html = document.documentElement;
  const accent = html.getAttribute("data-accent") || DEFAULT_ACCENT;
  const isDark = html.classList.contains("dark");

  // Remove any static favicon <link>s Next.js rendered from metadata.icons
  // so our dynamic one is the only thing the browser picks up.
  document.querySelectorAll('link[rel="icon"]').forEach((el) => {
    if (el.id !== FAVICON_LINK_ID) el.remove();
  });

  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FAVICON_LINK_ID;
    link.rel = "icon";
    link.type = "image/svg+xml";
    document.head.appendChild(link);
  }
  link.href = buildFaviconDataUri(accent, isDark);
}

export function FaviconSync() {
  useEffect(() => {
    applyFavicon();

    const observer = new MutationObserver(applyFavicon);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
