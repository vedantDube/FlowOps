"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Activity, Calendar, Flame, GitMerge, TrendingUp, Zap } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchPersonalMetrics } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const dataPoint = payload[0]?.payload;
  const dateStr = dataPoint?.date
    ? new Date(dataPoint.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : label;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground font-medium mb-1">{dateStr}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const PIE_COLORS = ["#4ADE80", "#3178c6", "#f1e05a", "#dea584", "#F05138", "#b07219", "#701516", "#3572A5"];

export default function PersonalMetrics() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    fetchPersonalMetrics({ days })
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, days]);

  if (loading || !user) return null;

  const primary = "hsl(var(--primary))";
  const muted = "hsl(var(--muted-foreground))";
  const grid = "hsl(var(--border))";
  const axisProps = { stroke: "transparent", tick: { fontSize: 11, fill: muted }, tickLine: false, axisLine: false };

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader title="Personal Metrics" description="Your coding velocity, streaks, and activity patterns." badge="Stats" />

        {/* Timeline */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground mr-1 shrink-0">Timeline</span>
          <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
            {[7, 14, 30, 60, 90].map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "ghost"}
                className={`h-7 px-3 text-xs rounded-md transition-all ${days === d ? "" : "text-muted-foreground"}`}
                onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {fetching ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-primary" />
                    <p className="text-xs text-muted-foreground">Total Commits</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metrics?.totalCommits || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{metrics?.dailyAvg || 0}/day avg</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame size={14} className="text-orange-500" />
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metrics?.currentStreak || 0} days</p>
                  <p className="text-[10px] text-muted-foreground">Best: {metrics?.longestStreak || 0} days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <GitMerge size={14} className="text-violet-500" />
                    <p className="text-xs text-muted-foreground">Pull Requests</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metrics?.totalPRs || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{metrics?.mergedPRs || 0} merged</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-amber-500" />
                    <p className="text-xs text-muted-foreground">Active Repos</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metrics?.activeRepos || 0}</p>
                  <p className="text-[10px] text-muted-foreground">with recent activity</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <Card className="overflow-hidden">
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Commit Activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last {days} days</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                <TrendingUp size={12} className="text-primary" />{metrics?.dailyAvg || 0}/day
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="h-60">
                {fetching ? <Skeleton className="h-full rounded-lg" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.commitActivity || []}>
                      <defs>
                        <linearGradient id="personalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={primary} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis dataKey="day" {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="commits" stroke={primary} strokeWidth={2.5} fill="url(#personalGrad)" dot={false}
                        activeDot={{ r: 5, fill: primary, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="p-5 pb-0">
              <p className="text-sm font-semibold text-foreground">Language Breakdown</p>
              <p className="text-xs text-muted-foreground mt-0.5">By repository count</p>
            </CardHeader>
            <CardContent className="p-5 pt-4 flex items-center justify-center">
              <div className="h-60 w-full flex items-center justify-center">
                {fetching ? <Skeleton className="h-full w-full rounded-lg" /> : metrics?.languageBreakdown?.length ? (
                  <div className="flex items-center gap-6 w-full">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={metrics.languageBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%"
                          outerRadius={80} innerRadius={40} paddingAngle={2}>
                          {metrics.languageBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {metrics.languageBreakdown.map((l, i) => (
                        <div key={l.name} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-foreground font-medium">{l.name}</span>
                          <span className="text-muted-foreground">{l.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Streak Card */}
        {!fetching && metrics && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <Flame size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{metrics.currentStreak} day{metrics.currentStreak !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">Current coding streak</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Personal best: <span className="font-semibold text-foreground">{metrics.longestStreak} days</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PersonalLayout>
  );
}
