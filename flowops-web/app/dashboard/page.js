"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Activity,
  Calendar,
  Clock,
  GitMerge,
  TrendingUp,
  Users,
  Trophy,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  fetchCommitActivity,
  fetchCodeChurn,
  fetchPRCycleTime,
  fetchReviewLatency,
  fetchTopContributors,
  fetchLeaderboard,
} from "../lib/api";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Skeleton loader for metric cards ── */
function MetricSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-xl" />
      <CardContent className="p-5 pt-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/* ── Shared chart tooltip component ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const dataPoint = payload[0]?.payload;
  const dateStr = dataPoint?.date
    ? new Date(dataPoint.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : label;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground font-medium mb-1">{dateStr}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{ color: p.color }}
          className="flex items-center gap-1.5"
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [cycleTime, setCycleTime] = useState({ averageHours: 0 });
  const [reviewLatency, setReviewLatency] = useState({ averageHours: 0 });
  const [commitData, setCommitData] = useState([]);
  const [churnData, setChurnData] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [commitTrend, setCommitTrend] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [days, setDays] = useState(14);

  const TIMELINE_OPTIONS = [7, 14, 30, 60, 90, 0]; // 0 = All time
  const daysLabel = (d) => (d === 0 ? "All" : `${d}d`);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);

    // Build previous-period commit request for trend calculation
    const prevDays = days > 0 ? days : 0;
    const needsPrevCommits = prevDays > 0;

    const requests = [
      fetchPRCycleTime({ orgId, days }),
      fetchReviewLatency({ orgId, days }),
      fetchCommitActivity({ orgId, days }),
      fetchCodeChurn({ orgId, days }),
      fetchTopContributors({ orgId, limit: 5, days }),
    ];
    // Fetch the previous period's commit data so we can compute a real trend
    if (needsPrevCommits) {
      requests.push(fetchCommitActivity({ orgId, days, offset: days }));
    }

    Promise.allSettled(requests)
      .then(([ct, rl, ca, cc, tc, prevCa]) => {
        if (ct.status === "fulfilled") setCycleTime(ct.value);
        if (rl.status === "fulfilled") setReviewLatency(rl.value);
        if (ca.status === "fulfilled") setCommitData(ca.value);
        if (cc.status === "fulfilled") setChurnData(cc.value);
        if (tc.status === "fulfilled") setContributors(tc.value);

        // Fetch leaderboard separately
        fetchLeaderboard(orgId, { period: "month" })
          .then((data) => setLeaderboard(data.leaderboard || []))
          .catch(() => setLeaderboard([]));

        // Compute commit trend: current period total vs previous period total
        if (ca.status === "fulfilled" && prevCa?.status === "fulfilled") {
          const curTotal = ca.value.reduce((s, d) => s + d.commits, 0);
          const prevTotal = prevCa.value.reduce((s, d) => s + d.commits, 0);
          if (prevTotal > 0) {
            setCommitTrend(
              +(((curTotal - prevTotal) / prevTotal) * 100).toFixed(1),
            );
          } else if (curTotal > 0) {
            setCommitTrend(100); // went from 0 to something
          } else {
            setCommitTrend(null);
          }
        } else {
          setCommitTrend(null);
        }
      })
      .finally(() => setIsFetching(false));
  }, [orgId, days]);

  if (loading || !user) return null;

  const totalCommits = commitData.reduce((s, d) => s + d.commits, 0);
  const dailyAvg =
    commitData.length > 0 ? (totalCommits / commitData.length).toFixed(1) : "0";

  /* ── Colors ── */
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

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title={`Welcome back, ${user.username}`}
          description="Here's your engineering health at a glance."
          badge="Live"
        />

        {/* ── Timeline Selector ── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground mr-1 shrink-0">
            Timeline
          </span>
          <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
            {TIMELINE_OPTIONS.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "ghost"}
                className={`h-7 px-3 text-xs rounded-md transition-all ${
                  days === d
                    ? ""
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDays(d)}
              >
                {daysLabel(d)}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Metrics Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {isFetching ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Avg PR Cycle Time"
                value={`${cycleTime.averageHours}h`}
                icon={<Clock size={16} />}
                color="green"
                trend={cycleTime.trend}
                trendLabel={
                  cycleTime.trend != null
                    ? `vs prev ${days === 0 ? "period" : days + " days"}`
                    : `${cycleTime.total || 0} PRs total`
                }
              />
              <MetricCard
                title="Avg Review Latency"
                value={`${reviewLatency.averageHours}h`}
                icon={<GitMerge size={16} />}
                color="teal"
                trend={reviewLatency.trend}
                trendLabel={
                  reviewLatency.trend != null
                    ? `vs prev ${days === 0 ? "period" : days + " days"}`
                    : `${reviewLatency.total || 0} reviews total`
                }
              />
              <MetricCard
                title={`Commits (${days === 0 ? "all time" : days + " days"})`}
                value={totalCommits}
                icon={<Activity size={16} />}
                color="purple"
                trend={commitTrend}
                trendLabel={`${dailyAvg}/day avg`}
              />
              <MetricCard
                title="Top Contributor"
                value={contributors[0]?.author || "—"}
                icon={<Users size={16} />}
                color="yellow"
                subtitle={
                  contributors[0]
                    ? `${contributors[0].commits} commits`
                    : "No data yet"
                }
              />
            </>
          )}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <Card className="overflow-hidden">
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Commit Activity
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {days === 0 ? "All time" : `Last ${days} days`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                <TrendingUp size={12} className="text-primary" />
                {dailyAvg}/day
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={commitData}>
                    <defs>
                      <linearGradient
                        id="commitGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={primary}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor={primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={grid}
                      vertical={false}
                    />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="commits"
                      stroke={primary}
                      strokeWidth={2.5}
                      fill="url(#commitGrad)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: primary,
                        strokeWidth: 2,
                        stroke: "hsl(var(--background))",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Code Churn
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Additions vs Deletions
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary" />{" "}
                  Additions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-destructive" />{" "}
                  Deletions
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={days === 0 ? churnData : churnData.slice(-days)}
                    barGap={2}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={grid}
                      vertical={false}
                    />
                    <XAxis dataKey="day" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="additions"
                      name="Additions"
                      fill={primary}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="deletions"
                      name="Deletions"
                      fill={destructive}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Top Contributors ── */}
        {contributors.length > 0 && (
          <Card>
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Top Contributors
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By commit volume
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                {contributors.length} contributor
                {contributors.length !== 1 && "s"}
              </span>
            </CardHeader>
            <CardContent className="p-5 pt-4 divide-y divide-border/60">
              {contributors.map((c, i) => {
                const max = contributors[0]?.commits || 1;
                const pct = ((c.commits / max) * 100).toFixed(0);
                const colors = [
                  "bg-primary text-primary-foreground",
                  "bg-teal-500 text-white",
                  "bg-violet-500 text-white",
                  "bg-amber-500 text-white",
                  "bg-blue-500 text-white",
                ];
                return (
                  <div
                    key={c.author}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-muted-foreground text-xs font-medium w-5 text-center tabular-nums">
                      #{i + 1}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors[i % colors.length]}`}
                    >
                      {c.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {c.author}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums ml-2">
                          {c.commits} commits · {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: `hsl(var(--primary))`,
                            opacity: 1 - i * 0.15,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Leaderboard (Feature #9) ── */}
        {!isFetching && leaderboard.length > 0 && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader className="px-5 pt-6 pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={14} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    Review Leaderboard
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Top reviewers this month
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2 divide-y divide-border/60">
              {leaderboard.slice(0, 5).map((entry, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={entry.username}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-lg w-6 text-center">
                      {i < 3 ? medals[i] : `#${i + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        entry.username?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {entry.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.stats.reviews} reviews · {entry.stats.commits} commits · {entry.score} pts
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {entry.badges?.slice(0, 3).map((b, idx) => (
                        <span key={idx} title={b.name} className="text-sm">
                          {b.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Empty state ── */}
        {!isFetching && totalCommits === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Activity className="text-muted-foreground" size={24} />
            </div>
            <p className="font-semibold text-foreground mb-1">No data yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect your GitHub repos and configure a webhook to start
              ingesting engineering data.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
