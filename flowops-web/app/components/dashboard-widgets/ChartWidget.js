"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { useWidgetData } from "../../hooks/useWidgetData";

export default function ChartWidget({ widget, orgId, days }) {
  const { entry, data, loading } = useWidgetData(widget, { orgId, days });
  if (!entry) return null;

  const primary = "hsl(var(--primary))";
  const destructive = "hsl(var(--destructive))";
  const muted = "hsl(var(--muted-foreground))";
  const grid = "hsl(var(--border))";
  const axisProps = {
    stroke: "transparent",
    tick: { fontSize: 11, fill: muted },
    tickLine: false,
    axisLine: false,
  };
  const gradId = `${widget.id}Grad`;

  if (loading) {
    return (
      <div className="p-5">
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-center p-5">
        <Activity className="text-muted-foreground/50 mb-2" size={22} />
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{entry.title}</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          {entry.chartKind === "bar" ? (
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={entry.xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              {(entry.dataKeys || [entry.dataKey]).map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={i === 0 ? primary : destructive}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={entry.xKey} {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey={entry.dataKey}
                stroke={primary}
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 5, fill: primary, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
