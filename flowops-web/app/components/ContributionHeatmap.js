"use client";

import { useMemo } from "react";

const LEVELS = [
  "bg-muted/40",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-600 dark:bg-emerald-400",
];

function getLevel(count, maxCount) {
  if (count === 0) return 0;
  if (maxCount <= 1) return count > 0 ? 2 : 0;
  const pct = count / maxCount;
  if (pct <= 0.25) return 1;
  if (pct <= 0.5) return 2;
  if (pct <= 0.75) return 3;
  return 4;
}

export default function ContributionHeatmap({ data = [] }) {
  const { weeks, maxCount, totalContributions } = useMemo(() => {
    if (!data.length) return { weeks: [], maxCount: 0, totalContributions: 0 };

    const map = {};
    let max = 0;
    let total = 0;
    data.forEach((d) => {
      map[d.date] = d.count;
      if (d.count > max) max = d.count;
      total += d.count;
    });

    // Build 53 weeks of data
    const weeks = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    let week = [];
    const current = new Date(start);
    while (current <= today) {
      const key = current.toISOString().slice(0, 10);
      week.push({ date: key, count: map[key] || 0 });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.length) weeks.push(week);

    return { weeks, maxCount: max, totalContributions: total };
  }, [data]);

  const months = useMemo(() => {
    const result = [];
    if (!weeks.length) return result;
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const d = new Date(w[0].date + "T00:00:00");
      const m = d.getMonth();
      if (m !== lastMonth) {
        result.push({ month: d.toLocaleDateString("en-US", { month: "short" }), index: i });
        lastMonth = m;
      }
    });
    return result;
  }, [weeks]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {totalContributions} contributions in the last year
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          {LEVELS.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {months.map((m, i) => (
              <div key={i} className="text-[10px] text-muted-foreground" style={{ position: "relative", left: m.index * 15 - (i > 0 ? months[i - 1].index * 15 + 30 : 0) }}>
                {m.month}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <div key={i} className="h-3 text-[9px] text-muted-foreground flex items-center">{d}</div>
              ))}
            </div>

            {/* Heatmap grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${LEVELS[getLevel(day.count, maxCount)]} transition-colors cursor-default`}
                    title={`${day.date}: ${day.count} contribution${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
                {/* Pad incomplete weeks */}
                {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`pad-${i}`} className="w-3 h-3" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
