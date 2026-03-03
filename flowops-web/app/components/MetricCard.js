import { cn } from "@/app/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

/** @param {{ title: string, value: string|number, subtitle?: string, icon?: React.ReactNode, color?: 'green'|'teal'|'yellow'|'red'|'blue'|'purple', trend?: number, trendLabel?: string }} props */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = "green",
  trend,
  trendLabel,
}) {
  const palette = {
    green: {
      icon: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      accent: "bg-emerald-500",
    },
    teal: {
      icon: "text-teal-500 bg-teal-500/10 border-teal-500/20",
      accent: "bg-teal-500",
    },
    yellow: {
      icon: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      accent: "bg-amber-500",
    },
    red: {
      icon: "text-red-500 bg-red-500/10 border-red-500/20",
      accent: "bg-red-500",
    },
    blue: {
      icon: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      accent: "bg-blue-500",
    },
    purple: {
      icon: "text-violet-500 bg-violet-500/10 border-violet-500/20",
      accent: "bg-violet-500",
    },
  };
  const style = palette[color] || palette.green;
  const trendPositive = trend && trend > 0;

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group">
      {/* Top accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl", style.accent)} />
      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {icon && (
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110",
                style.icon,
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
          {value}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
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
      </CardContent>
    </Card>
  );
}
