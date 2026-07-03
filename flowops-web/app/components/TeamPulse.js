"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { HeartPulse, Moon, CalendarDays, Scale, Users } from "lucide-react";
import { fetchWorkPatterns } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RISK_STYLE = {
  low: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  high: "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
};

/**
 * Team Pulse — burnout radar built from commit timing patterns
 * (after-hours, late-night, weekend shares + workload concentration).
 * Timing is measured in UTC, so treat it as a directional signal.
 */
export default function TeamPulse({ orgId, days = 30 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetchWorkPatterns({ orgId, days })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [orgId, days]);

  if (loading) {
    return (
      <Card className="overflow-hidden mb-6">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.totalCommits) return null;

  const { org, authors } = data;

  const radarData = [
    { axis: "After-hours", value: Math.min(100, org.afterHoursPct) },
    { axis: "Late night", value: Math.min(100, org.lateNightPct) },
    { axis: "Weekends", value: Math.min(100, org.weekendPct) },
    { axis: "Load concentration", value: Math.min(100, org.loadConcentrationPct) },
  ];

  const atRisk = authors.filter((a) => a.riskLevel !== "low");

  return (
    <Card className="overflow-hidden mb-6">
      <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
            <HeartPulse size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Team Pulse</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Burnout signals from commit timing · last {data.windowDays} days · times in UTC
            </p>
          </div>
        </div>
        {atRisk.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400">
            {atRisk.length} teammate{atRisk.length > 1 ? "s" : ""} showing elevated signals
          </span>
        )}
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* ── Radar ── */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Org signal tiles ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Moon, label: "After-hours commits", value: `${org.afterHoursPct}%`, warn: org.afterHoursPct > 30 },
              { icon: Moon, label: "Late-night (12–6am)", value: `${org.lateNightPct}%`, warn: org.lateNightPct > 15 },
              { icon: CalendarDays, label: "Weekend commits", value: `${org.weekendPct}%`, warn: org.weekendPct > 20 },
              { icon: Scale, label: "Top-contributor load", value: `${org.loadConcentrationPct}%`, warn: org.loadConcentrationPct > 60 },
            ].map(({ icon: Icon, label, value, warn }) => (
              <div key={label} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                  <Icon size={12} />
                  <p className="text-[11px]">{label}</p>
                </div>
                <p className={cn("text-xl font-bold tabular-nums", warn ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Per-person breakdown ── */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3 font-medium">
                  <span className="flex items-center gap-1.5"><Users size={12} /> Contributor</span>
                </th>
                <th className="py-2 px-3 font-medium">Commits</th>
                <th className="py-2 px-3 font-medium">After-hours</th>
                <th className="py-2 px-3 font-medium">Weekend</th>
                <th className="py-2 px-3 font-medium">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {authors.slice(0, 8).map((a) => (
                <tr key={a.author} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{a.author}</td>
                  <td className="py-2.5 px-3 tabular-nums text-foreground">{a.commits}</td>
                  <td className="py-2.5 px-3 tabular-nums text-foreground">{a.afterHoursPct}%</td>
                  <td className="py-2.5 px-3 tabular-nums text-foreground">{a.weekendPct}%</td>
                  <td className="py-2.5 px-3">
                    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", RISK_STYLE[a.riskLevel])}>
                      {a.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          A heuristic signal, not a diagnosis — commit timestamps are UTC and don&apos;t know anyone&apos;s
          working hours. Use it to start a conversation, not to score people.
        </p>
      </CardContent>
    </Card>
  );
}
