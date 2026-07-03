"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Rocket, Clock, ShieldAlert, Wrench, Calendar, GitBranch, Award } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  fetchDeploymentFrequency,
  fetchLeadTime,
  fetchChangeFailureRate,
  fetchMTTR,
  fetchOrgRepos,
  fetchPRCycleTime,
  fetchReviewLatency,
} from "../lib/api";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import WhatIfSimulator from "../components/WhatIfSimulator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { PageLoading } from "@/components/ui/page-loading";

const TIMELINE_OPTIONS = [7, 14, 30, 90];

// Illustrative reference bands from DORA's own published "State of DevOps"
// research (the industry-standard Elite/High/Medium/Low tiers). These are a
// fixed, static reference — not re-derived from FlowOps's own customer base
// — so they carry no privacy concerns and don't depend on customer volume.
// Thresholds are approximate and drift slightly year to year in DORA's own
// reports; treat this as a directional read, not a precise scorecard.
const TIER_STYLE = {
  Elite: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
  High: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400",
  Medium: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  Low: "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
};

function deployFreqTier(perDay) {
  if (perDay == null) return null;
  if (perDay >= 1) return "Elite"; // multiple times a day / on-demand
  if (perDay >= 1 / 7) return "High"; // between once a week and once a month
  if (perDay >= 1 / 180) return "Medium"; // between once a month and once every 6 months
  return "Low";
}

function leadTimeTier(hours) {
  if (hours == null) return null;
  if (hours < 1) return "Elite";
  if (hours < 24 * 7) return "High"; // under a week
  if (hours < 24 * 30 * 6) return "Medium"; // under 6 months
  return "Low";
}

function changeFailureTier(pct) {
  if (pct == null) return null;
  if (pct <= 15) return "Elite";
  if (pct <= 30) return "High";
  if (pct <= 45) return "Medium";
  return "Low";
}

function mttrTier(hours) {
  if (hours == null) return null;
  if (hours < 1) return "Elite";
  if (hours < 24) return "High"; // under a day
  if (hours < 24 * 7) return "Medium"; // under a week
  return "Low";
}

function TierBadge({ tier }) {
  if (!tier) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TIER_STYLE[tier]}`}>
      {tier}
    </span>
  );
}

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

/* ── Repo comparison: pure frontend aggregation, one call per repo per metric ── */
function RepoComparisonTable({ orgId, days }) {
  const [repos, setRepos] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetchOrgRepos(orgId)
      .then(async (repoList) => {
        setRepos(repoList);
        const results = await Promise.all(
          repoList.map(async (repo) => {
            const params = { orgId, repoId: repo.id, days };
            const [cycle, review, deployFreq, cfr, mttr] = await Promise.all([
              fetchPRCycleTime(params).catch(() => null),
              fetchReviewLatency(params).catch(() => null),
              fetchDeploymentFrequency(params).catch(() => null),
              fetchChangeFailureRate(params).catch(() => null),
              fetchMTTR(params).catch(() => null),
            ]);
            return {
              repo,
              cycleTime: cycle?.averageHours ?? null,
              reviewLatency: review?.averageHours ?? null,
              deployPerDay: deployFreq?.perDay ?? null,
              changeFailureRate: cfr?.ratePercent ?? null,
              mttr: mttr?.averageHours ?? null,
            };
          }),
        );
        setRows(results);
      })
      .finally(() => setLoading(false));
  }, [orgId, days]);

  if (loading) {
    return (
      <div className="space-y-2 p-5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!repos.length) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No repositories connected"
        description="Connect a repo to see a side-by-side comparison of engineering metrics."
        className="py-12"
      />
    );
  }

  const fmt = (v, suffix = "h") => (v == null ? "—" : `${v}${suffix}`);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
            <th className="py-2.5 px-5 font-medium">Repository</th>
            <th className="py-2.5 px-3 font-medium">PR Cycle Time</th>
            <th className="py-2.5 px-3 font-medium">Review Latency</th>
            <th className="py-2.5 px-3 font-medium">Deploys/day</th>
            <th className="py-2.5 px-3 font-medium">Change Failure Rate</th>
            <th className="py-2.5 px-3 pr-5 font-medium">MTTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map(({ repo, cycleTime, reviewLatency, deployPerDay, changeFailureRate, mttr }) => (
            <tr key={repo.id} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 px-5 font-medium text-foreground">{repo.name}</td>
              <td className="py-3 px-3 text-foreground tabular-nums">{fmt(cycleTime)}</td>
              <td className="py-3 px-3 text-foreground tabular-nums">{fmt(reviewLatency)}</td>
              <td className="py-3 px-3 text-foreground tabular-nums">{fmt(deployPerDay, "")}</td>
              <td className="py-3 px-3 text-foreground tabular-nums">{fmt(changeFailureRate, "%")}</td>
              <td className="py-3 px-3 pr-5 text-foreground tabular-nums">{fmt(mttr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DoraPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [isFetching, setIsFetching] = useState(true);

  const [deployFreq, setDeployFreq] = useState(null);
  const [leadTime, setLeadTime] = useState(null);
  const [changeFailureRate, setChangeFailureRate] = useState(null);
  const [mttr, setMttr] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);
    const params = { orgId, days };
    Promise.allSettled([
      fetchDeploymentFrequency(params),
      fetchLeadTime(params),
      fetchChangeFailureRate(params),
      fetchMTTR(params),
    ])
      .then(([df, lt, cfr, m]) => {
        setDeployFreq(df.status === "fulfilled" ? df.value : null);
        setLeadTime(lt.status === "fulfilled" ? lt.value : null);
        setChangeFailureRate(cfr.status === "fulfilled" ? cfr.value : null);
        setMttr(m.status === "fulfilled" ? m.value : null);
      })
      .finally(() => setIsFetching(false));
  }, [orgId, days]);

  if (loading || !user) return <PageLoading />;

  const primary = "hsl(var(--primary))";
  const secondary = "hsl(var(--secondary))";
  const muted = "hsl(var(--muted-foreground))";
  const grid = "hsl(var(--border))";
  const axisProps = {
    stroke: "transparent",
    tick: { fontSize: 11, fill: muted },
    tickLine: false,
    axisLine: false,
  };

  const hasDeployData = (deployFreq?.total || 0) > 0;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="DORA Metrics"
          description="Deployment frequency, lead time, change failure rate, and MTTR — the industry-standard scorecard for engineering delivery."
          badge="Beta"
        />

        {/* ── Timeline Selector ── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          <Calendar size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground mr-1 shrink-0">Timeline</span>
          <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
            {TIMELINE_OPTIONS.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "ghost"}
                className={`h-7 px-3 text-xs rounded-md transition-all ${
                  days === d ? "" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDays(d)}
              >
                {d}d
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
                title="Deployment Frequency"
                value={`${deployFreq?.perDay ?? 0}/day`}
                icon={<Rocket size={16} />}
                color="green"
                subtitle={`${deployFreq?.total ?? 0} deploys total`}
                sparkline={(deployFreq?.data || []).slice(-30).map((d) => d.deployments)}
              />
              <MetricCard
                title="Lead Time for Changes"
                value={leadTime?.resolvedCount ? `${leadTime.averageHours}h` : "—"}
                icon={<Clock size={16} />}
                color="teal"
                subtitle={
                  leadTime?.totalCount
                    ? `resolved ${leadTime.resolvedCount}/${leadTime.totalCount} deploys`
                    : "no deploy data yet"
                }
              />
              <MetricCard
                title="Change Failure Rate"
                value={`${changeFailureRate?.ratePercent ?? 0}%`}
                icon={<ShieldAlert size={16} />}
                color="amber"
                subtitle={`${changeFailureRate?.incidentCount ?? 0} of ${changeFailureRate?.deploymentCount ?? 0} deploys`}
              />
              <MetricCard
                title="MTTR"
                value={mttr?.total ? `${mttr.averageHours}h` : "—"}
                icon={<Wrench size={16} />}
                color="purple"
                trend={mttr?.trend}
                subtitle={mttr?.total ? `${mttr.total} resolved incidents` : "no resolved incidents yet"}
              />
            </>
          )}
        </div>

        {/* ── Industry Benchmark ── */}
        {!isFetching && (
          <Card className="overflow-hidden mb-8">
            <CardHeader className="p-5 pb-0 flex flex-row items-center gap-2">
              <Award size={14} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Where You Stand</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Against DORA&apos;s published Elite / High / Medium / Low industry bands
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Deployment Frequency</p>
                  <TierBadge tier={deployFreqTier(deployFreq?.perDay)} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <TierBadge tier={leadTime?.resolvedCount ? leadTimeTier(leadTime.averageHours) : null} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Change Failure Rate</p>
                  <TierBadge tier={changeFailureRate?.deploymentCount ? changeFailureTier(changeFailureRate.ratePercent) : null} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">MTTR</p>
                  <TierBadge tier={mttr?.total ? mttrTier(mttr.averageHours) : null} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4">
                Illustrative bands from DORA&apos;s own research, not FlowOps-derived — thresholds vary slightly by report year.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── What-if simulator ── */}
        {!isFetching && <WhatIfSimulator orgId={orgId} days={days} />}

        {/* ── Charts ── */}
        {!isFetching && !hasDeployData ? (
          <Card className="mb-8">
            <EmptyState
              icon={Rocket}
              title="No deployment data yet"
              description="Deployment frequency and lead time require your GitHub webhook to have the 'Deployment statuses' and 'Workflow runs' event types enabled. Go to your GitHub App or repo webhook settings to turn these on — once enabled, new deploys will start showing up here automatically."
              className="py-16"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <Card className="overflow-hidden">
              <CardHeader className="p-5 pb-0">
                <p className="text-sm font-semibold text-foreground">Deployment Frequency</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last {days} days</p>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                <div className="h-60">
                  {isFetching ? (
                    <Skeleton className="h-full rounded-lg" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={deployFreq?.data || []}>
                        <defs>
                          <linearGradient id="deployGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={primary} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis dataKey="day" {...axisProps} />
                        <YAxis {...axisProps} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="deployments"
                          stroke={primary}
                          strokeWidth={2.5}
                          fill="url(#deployGrad)"
                          dot={false}
                          activeDot={{ r: 5, fill: primary, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-5 pb-0">
                <p className="text-sm font-semibold text-foreground">Change Failure Rate</p>
                <p className="text-xs text-muted-foreground mt-0.5">Incidents linked to a deploy ÷ successful deploys</p>
              </CardHeader>
              <CardContent className="p-5 pt-4 flex items-center justify-center">
                {changeFailureRate?.deploymentCount ? (
                  <div className="text-center">
                    <p className="text-5xl font-bold text-foreground tabular-nums">
                      {changeFailureRate.ratePercent}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {changeFailureRate.incidentCount} incident{changeFailureRate.incidentCount === 1 ? "" : "s"} across{" "}
                      {changeFailureRate.deploymentCount} deploy{changeFailureRate.deploymentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No deploy data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Repo comparison ── */}
        <Card className="overflow-hidden">
          <CardHeader className="p-5 pb-0">
            <p className="text-sm font-semibold text-foreground">Repository Comparison</p>
            <p className="text-xs text-muted-foreground mt-0.5">See which repo is dragging the org average</p>
          </CardHeader>
          <RepoComparisonTable orgId={orgId} days={days} />
        </Card>
      </div>
    </Layout>
  );
}
