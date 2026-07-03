"use client";

import { useId } from "react";
import { cn } from "@/app/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { NumberTicker } from "@/components/magicui/number-ticker";

/* ── Tiny pure-SVG sparkline (no chart lib overhead per card) ── */
function Sparkline({ data, colorClass }) {
  const gradId = useId();
  if (!data || data.length < 2) return null;

  const w = 100;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => [
    +(i * step).toFixed(2),
    +(h - 3 - ((v - min) / range) * (h - 6)).toFixed(2),
  ]);
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full h-7 mt-3", colorClass)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* Split "12.4h" / "85%" / 42 into an animatable number + suffix.
   Returns null for non-numeric values (e.g. a username) so they render as-is. */
function parseAnimatable(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { num: value, suffix: "", decimals: Number.isInteger(value) ? 0 : 1 };
  }
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const decimals = m[1].includes(".") ? m[1].split(".")[1].length : 0;
  return { num, suffix: m[2], decimals };
}

/** @param {{ title: string, value: string|number, subtitle?: string, icon?: React.ReactNode, color?: 'green'|'teal'|'amber'|'red'|'blue'|'purple', trend?: number, trendLabel?: string, sparkline?: number[], animate?: boolean }} props */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = "green",
  trend,
  trendLabel,
  sparkline,
  animate = true,
}) {
  const palette = {
    green: {
      accent: "bg-emerald-500",
      spark: "text-emerald-500",
    },
    teal: {
      accent: "bg-teal-500",
      spark: "text-teal-500",
    },
    amber: {
      accent: "bg-amber-500",
      spark: "text-amber-500",
    },
    red: {
      accent: "bg-red-500",
      spark: "text-red-500",
    },
    blue: {
      accent: "bg-blue-500",
      spark: "text-blue-500",
    },
    purple: {
      accent: "bg-violet-500",
      spark: "text-violet-500",
    },
  };
  const style = palette[color] || palette.green;
  const trendPositive = trend && trend > 0;
  const animatable = animate ? parseAnimatable(value) : null;

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group">
      {/* Top accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl", style.accent)} />
      <CardContent className="p-5 pt-6">
        <div className="flex items-center gap-2 mb-4">
          {icon && (
            <span className={cn("shrink-0 opacity-80 [&>svg]:w-3.5 [&>svg]:h-3.5", style.spark)}>
              {icon}
            </span>
          )}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
        </div>
        <p className="text-4xl font-display font-normal text-foreground tabular-nums tracking-tight truncate">
          {animatable ? (
            <>
              <NumberTicker value={animatable.num} decimalPlaces={animatable.decimals} />
              {animatable.suffix}
            </>
          ) : (
            value
          )}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                trendPositive
                  ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                  : "text-red-600 bg-red-500/10 dark:text-red-400",
              )}
            >
              {trendPositive ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          {(subtitle || trendLabel) && (
            <p className="text-xs text-muted-foreground">
              {trendLabel || subtitle}
            </p>
          )}
        </div>
        <Sparkline data={sparkline} colorClass={style.spark} />
      </CardContent>
    </Card>
  );
}
