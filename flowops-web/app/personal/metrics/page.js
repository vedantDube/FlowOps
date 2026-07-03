"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Activity, Calendar, Flame, GitMerge, TrendingUp, Zap } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchPersonalMetrics, isGithubAuthExpiredError } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { GithubReconnectCard } from "@/app/components/GithubReconnectCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { PageLoading } from "@/components/ui/page-loading";

// GitHub's own per-language brand colors (the same ones shown on repo
// language bars) so a language always renders the same recognizable color
// regardless of its rank in the breakdown — a positional palette would
// silently reassign colors to different languages as usage shifts.
const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
};
// Deterministic fallback for languages not in the map above — hashed by
// name so the same unmapped language always lands on the same color.
const FALLBACK_COLORS = ["#8B5CF6", "#38BDF8", "#FB7185", "#FBBF24", "#2DD4BF", "#818CF8"];
function colorForLanguage(name) {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  const hash = [...(name || "")].reduce((h, c) => h + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

// Bars of varying height give a chart-shaped loading placeholder instead of
// a generic blank rectangle — purely decorative heights, not real data.
const CHART_SKELETON_HEIGHTS = [40, 65, 50, 80, 55, 70, 45, 60, 75, 50];

function ChartSkeleton() {
  return (
    <div className="h-full w-full flex items-end justify-between gap-2 px-1">
      {CHART_SKELETON_HEIGHTS.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default function PersonalMetrics() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [githubAuthExpired, setGithubAuthExpired] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    setGithubAuthExpired(false);
    fetchPersonalMetrics({ days })
      .then(setMetrics)
      .catch((err) => {
        if (isGithubAuthExpiredError(err)) setGithubAuthExpired(true);
        else toast.error("Failed to load metrics");
      })
      .finally(() => setFetching(false));
  }, [user, days]);

  if (loading || !user) return <PageLoading />;

  if (githubAuthExpired) {
    return (
      <PersonalLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
          <PageHeader title="Personal Metrics" description="Your coding velocity, streaks, and activity patterns." badge="Stats" />
          <GithubReconnectCard description="Your GitHub access token has expired. Please reconnect your GitHub account to view your metrics." />
        </div>
      </PersonalLayout>
    );
  }

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
                  <p className="text-3xl font-bold text-foreground tabular-nums">{metrics?.totalCommits || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{metrics?.dailyAvg || 0}/day avg</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame size={14} className="text-orange-500" />
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{metrics?.currentStreak || 0} days</p>
                  <p className="text-[10px] text-muted-foreground">Best: {metrics?.longestStreak || 0} days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <GitMerge size={14} className="text-violet-500" />
                    <p className="text-xs text-muted-foreground">Pull Requests</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{metrics?.totalPRs || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{metrics?.mergedPRs || 0} merged</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-amber-500" />
                    <p className="text-xs text-muted-foreground">Active Repos</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{metrics?.activeRepos || 0}</p>
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
                {fetching ? <ChartSkeleton /> : (
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
                {fetching ? <Skeleton variant="circle" className="h-40 w-40" /> : metrics?.languageBreakdown?.length ? (
                  <div className="flex items-center gap-6 w-full">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={metrics.languageBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%"
                          outerRadius={80} innerRadius={40} paddingAngle={2}>
                          {metrics.languageBreakdown.map((l) => (
                            <Cell key={l.name} fill={colorForLanguage(l.name)} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {metrics.languageBreakdown.map((l) => (
                        <div key={l.name} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-sm" style={{ background: colorForLanguage(l.name) }} />
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
                  <p className="text-3xl font-bold text-foreground tabular-nums">{metrics.currentStreak} day{metrics.currentStreak !== 1 ? "s" : ""}</p>
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
