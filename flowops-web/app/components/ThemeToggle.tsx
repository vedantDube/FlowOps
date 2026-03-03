"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Clock } from "lucide-react";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "Auto", icon: Clock },
] as const;

/**
 * Auto mode sets the theme based on time of day:
 *   06:00 – 18:00  → light
 *   18:00 – 06:00  → dark
 */
function getTimeBasedTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"light" | "dark" | "auto">("dark");

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("flowops-theme-mode");
    if (stored === "auto" || stored === "light" || stored === "dark") {
      setMode(stored);
    } else {
      // Infer mode from current theme
      setMode(theme === "system" ? "auto" : (theme as "light" | "dark") ?? "dark");
    }
  }, [theme]);

  const smoothSetTheme = (newTheme: string) => {
    document.documentElement.classList.add('theme-transitioning');
    setTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 700);
  };

  // Auto-mode: sync theme on mount + every minute
  useEffect(() => {
    if (mode !== "auto") return;

    const apply = () => smoothSetTheme(getTimeBasedTheme());
    apply();

    const interval = setInterval(apply, 60_000);
    return () => clearInterval(interval);
  }, [mode, setTheme]);

  const cycle = () => {
    const idx = MODES.findIndex((m) => m.value === mode);
    const next = MODES[(idx + 1) % MODES.length];
    setMode(next.value);
    localStorage.setItem("flowops-theme-mode", next.value);

    if (next.value === "auto") {
      smoothSetTheme(getTimeBasedTheme());
    } else {
      smoothSetTheme(next.value);
    }
  };

  if (!mounted) return null;

  const ActiveIcon = MODES.find((m) => m.value === mode)?.icon ?? Moon;

  return (
    <button
      onClick={cycle}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
        text-muted-foreground hover:text-foreground hover:bg-muted ${className}`}
      title={`Theme: ${mode}`}
    >
      <ActiveIcon size={15} strokeWidth={1.8} />
      <span className="capitalize">{mode}</span>
    </button>
  );
}
