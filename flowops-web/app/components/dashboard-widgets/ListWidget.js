"use client";

import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWidgetData } from "../../hooks/useWidgetData";

const ROW_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-teal-500 text-white",
  "bg-violet-500 text-white",
  "bg-amber-500 text-white",
  "bg-blue-500 text-white",
];

export default function ListWidget({ widget, orgId, days }) {
  const { entry, data, loading } = useWidgetData(widget, { orgId, days });
  if (!entry) return null;

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center p-5">
        <Users className="text-muted-foreground/50 mb-2" size={22} />
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }

  const max = rows[0]?.[entry.valueKey] || 1;

  return (
    <div className="p-5">
      <p className="text-sm font-semibold text-foreground mb-3">{entry.title}</p>
      <div className="divide-y divide-border/60">
        {rows.slice(0, 5).map((row, i) => {
          const label = row[entry.labelKey];
          const value = row[entry.valueKey];
          const pct = ((value / max) * 100).toFixed(0);
          return (
            <div
              key={label || i}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-muted-foreground text-xs font-medium w-5 text-center tabular-nums">
                #{i + 1}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROW_COLORS[i % ROW_COLORS.length]}`}
              >
                {label?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums ml-2">
                    {value}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "hsl(var(--primary))", opacity: 1 - i * 0.15 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
