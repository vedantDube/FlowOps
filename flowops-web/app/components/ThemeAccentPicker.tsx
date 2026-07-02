"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const ACCENTS = [
  { value: "green", label: "Green", swatch: "#4ADE80" },
  { value: "violet", label: "Violet", swatch: "#8B5CF6" },
  { value: "rose", label: "Rose", swatch: "#FB7185" },
  { value: "amber", label: "Amber", swatch: "#FBBF24" },
] as const;

type Accent = (typeof ACCENTS)[number]["value"];

const STORAGE_KEY = "flowops-accent";

/**
 * Swaps the app's accent color (primary/secondary/glow — see the
 * [data-accent] blocks in globals.css) by setting a data attribute on
 * <html>, mirroring how next-themes toggles the .dark class. Persisted in
 * localStorage and applied on mount via an inline script in layout.tsx to
 * avoid a flash of the default green before hydration.
 */
export default function ThemeAccentPicker({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [accent, setAccent] = useState<Accent>("green");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Accent | null;
    if (stored && ACCENTS.some((a) => a.value === stored)) {
      setAccent(stored);
    }
  }, []);

  const apply = (value: Accent) => {
    setAccent(value);
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.classList.add("theme-transitioning");
    document.documentElement.setAttribute("data-accent", value);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 700);
  };

  if (!mounted) return null;

  const active = ACCENTS.find((a) => a.value === accent) ?? ACCENTS[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
          text-muted-foreground hover:text-foreground hover:bg-muted ${compact ? "" : "w-full"}`}
        title={`Accent color: ${active.label}`}
        aria-label="Choose accent color"
      >
        <Palette size={15} strokeWidth={1.8} />
        {!compact && <span>{active.label}</span>}
        <span
          className={`h-3.5 w-3.5 rounded-full border border-border/50 ${compact ? "" : "ml-auto"}`}
          style={{ backgroundColor: active.swatch }}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 rounded-lg border border-border bg-popover p-1.5 shadow-card-hover
            ${compact ? "right-0 w-40" : "left-0 right-0"}`}
        >
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              onClick={() => apply(a.value)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border/50"
                style={{ backgroundColor: a.swatch }}
              />
              <span className={a.value === accent ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
