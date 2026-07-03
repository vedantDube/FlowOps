"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, ArrowRight, Timer } from "lucide-react";
import { fetchPRCycleTime, fetchReviewLatency } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fmtHours = (h) => {
  if (h == null) return "—";
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

function Slider({ label, value, onChange, max = 80 }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-semibold text-primary tabular-nums">−{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={5}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-[hsl(var(--primary))]"
        aria-label={label}
      />
    </div>
  );
}

/**
 * What-if simulator — turns the DORA scorecard from a rear-view mirror into a
 * planning tool. Purely client-side arithmetic on real current metrics:
 * review latency is a component of PR cycle time, so cutting it shortens the
 * projected cycle proportionally.
 */
export default function WhatIfSimulator({ orgId, days }) {
  const [cycle, setCycle] = useState(null);
  const [latency, setLatency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewCut, setReviewCut] = useState(20);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.allSettled([
      fetchPRCycleTime({ orgId, days }),
      fetchReviewLatency({ orgId, days }),
    ])
      .then(([c, l]) => {
        setCycle(c.status === "fulfilled" ? c.value : null);
        setLatency(l.status === "fulfilled" ? l.value : null);
      })
      .finally(() => setLoading(false));
  }, [orgId, days]);

  if (loading) {
    return (
      <Card className="overflow-hidden mb-8">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const cycleHours = cycle?.averageHours || 0;
  const latencyHours = latency?.averageHours || 0;
  if (!cycleHours || !latencyHours) return null;

  // Review wait can't exceed the cycle it's part of; clamp for weird data.
  const reviewShare = Math.min(latencyHours, cycleHours);
  const savedHours = reviewShare * (reviewCut / 100);
  const projectedCycle = Math.max(cycleHours - savedHours, cycleHours * 0.15);
  const improvementPct = cycleHours ? ((cycleHours - projectedCycle) / cycleHours) * 100 : 0;

  // Rough throughput read: hours saved per PR × PRs closed in the window
  const prCount = cycle?.total || 0;
  const totalSaved = savedHours * prCount;

  return (
    <Card className="overflow-hidden mb-8">
      <CardHeader className="p-5 pb-0 flex flex-row items-start gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
          <SlidersHorizontal size={15} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">What-If Simulator</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag the slider to see how faster reviews would move your cycle time
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-5">
            <Slider
              label={`Cut review latency (currently ${fmtHours(latencyHours)} avg)`}
              value={reviewCut}
              onChange={setReviewCut}
            />
            <p className="text-[11px] text-muted-foreground">
              Levers that typically get you there: smaller PRs, review SLAs, auto-assigning
              reviewers (see Automation Rules), and FlowOps stale-PR nudges.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-6 rounded-xl border border-border/60 bg-muted/30 p-5">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground mb-1">Cycle time today</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{fmtHours(cycleHours)}</p>
            </div>
            <ArrowRight size={18} className="text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground mb-1">Projected</p>
              <p className={cn("text-2xl font-bold tabular-nums", improvementPct > 0.5 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                {fmtHours(projectedCycle)}
              </p>
              {improvementPct > 0.5 && (
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {improvementPct.toFixed(0)}% faster
                </p>
              )}
            </div>
          </div>
        </div>

        {totalSaved > 1 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-4">
            <Timer size={12} />
            Across the {prCount} PRs closed in this window, that&apos;s roughly{" "}
            <span className="font-semibold text-foreground">{fmtHours(totalSaved)}</span> of waiting removed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
