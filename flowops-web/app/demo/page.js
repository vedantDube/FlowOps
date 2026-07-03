"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Clock,
  GitMerge,
  Github,
  Rocket,
  ShieldAlert,
  Wrench,
  Zap,
} from "lucide-react";

import { fetchDemoShowcase } from "../lib/api";
import MetricCard from "../components/MetricCard";
import PRFlowMap from "../components/PRFlowMap";
import TeamPulse from "../components/TeamPulse";
import FlowOpsLogo from "../components/FlowOpsLogo";
import FlowLine from "../components/FlowLine";
import ThemeToggle from "../components/ThemeToggle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* DORA tier bands from the published State of DevOps research — same
   thresholds as the in-app DORA page. */
const TIER_STYLE = {
  Elite: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
  High: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400",
  Medium: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  Low: "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
};
const deployTier = (perDay) => (perDay >= 1 ? "Elite" : perDay >= 1 / 7 ? "High" : perDay >= 1 / 180 ? "Medium" : "Low");
const cfrTier = (pct) => (pct <= 15 ? "Elite" : pct <= 30 ? "High" : pct <= 45 ? "Medium" : "Low");
const mttrTier = (h) => (h < 1 ? "Elite" : h < 24 ? "High" : h < 168 ? "Medium" : "Low");

function TierBadge({ tier }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TIER_STYLE[tier]}`}>
      {tier}
    </span>
  );
}

export default function DemoPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDemoShowcase()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const m = data?.metrics;

  return (
    <div className="min-h-screen bg-background text-foreground app-surface">
      {/* ── Public nav ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <FlowOpsLogo subtitle="Live Demo" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="sm" className="gap-1.5">
              <a href={`${API_URL}/auth/github`}>
                <Github size={14} />
                Get started free
              </a>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* ── Hero strip ── */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            Live demo — real seeded data, no account needed
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2">
            This is FlowOps, running on a real engineering org
          </h1>
          <FlowLine width={72} height={12} className="mb-3" />
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Everything below is computed live from 60 days of seeded GitHub activity — 6 engineers,
            3 repos, {m ? `${m.totalCommits} commits in the last 30 days` : "hundreds of commits"},
            PRs with full review lifecycles, deployments, and incidents. Connect your own repos and
            this becomes your team.
          </p>
        </div>

        {error && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              The demo data isn&apos;t available right now. The full product is one GitHub login away —
              <a href={`${API_URL}/auth/github`} className="text-primary font-medium ml-1">get started free</a>.
            </CardContent>
          </Card>
        )}

        {/* ── Metric cards ── */}
        {m && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6" data-shot="metrics">
            <MetricCard
              title="Avg PR Cycle Time"
              value={`${m.cycleTimeAvgHours}h`}
              icon={<Clock size={16} />}
              color="green"
              subtitle="open → closed, 30 days"
            />
            <MetricCard
              title="Avg Review Latency"
              value={`${m.reviewLatencyAvgHours}h`}
              icon={<GitMerge size={16} />}
              color="teal"
              subtitle="open → first review"
            />
            <MetricCard
              title="Commits (30 days)"
              value={m.totalCommits}
              icon={<Activity size={16} />}
              color="purple"
              sparkline={(data?.commitSeries || []).map((d) => d.commits)}
              subtitle={`${data?.workPatterns?.org?.contributors ?? 0} contributors`}
            />
            <MetricCard
              title="Deploy Frequency"
              value={`${m.deploysPerDay}/day`}
              icon={<Rocket size={16} />}
              color="amber"
              subtitle={`${m.deployTotal} production deploys`}
            />
          </div>
        )}

        {/* ── Flow Map ── */}
        {data?.prFlow && <PRFlowMap data={data.prFlow} days={30} />}

        {/* ── Commit activity + DORA ── */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-5 pb-0">
                <p className="text-sm font-semibold text-foreground">Commit Activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.commitSeries}>
                      <defs>
                        <linearGradient id="demoCommitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" stroke="transparent" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis stroke="transparent" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="commits" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#demoCommitGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-5 pb-0">
                <p className="text-sm font-semibold text-foreground">DORA Scorecard</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Benchmarked against the published Elite / High / Medium / Low bands
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-4 space-y-4">
                {[
                  { icon: Rocket, label: "Deployment frequency", value: `${m.deploysPerDay}/day`, tier: deployTier(m.deploysPerDay) },
                  { icon: ShieldAlert, label: "Change failure rate", value: `${m.changeFailureRatePct}%`, tier: cfrTier(m.changeFailureRatePct) },
                  { icon: Wrench, label: "Mean time to restore", value: `${m.mttrHours}h`, tier: mttrTier(m.mttrHours) },
                ].map(({ icon: Icon, label, value, tier }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
                      <TierBadge tier={tier} />
                    </div>
                  </div>
                ))}
                {data.sprintHealth && (
                  <p className="text-[11px] text-muted-foreground">
                    Latest sprint health: <span className="font-semibold text-foreground">{data.sprintHealth.healthScore}/100</span> ·
                    delivery predictability {data.sprintHealth.deliveryPredictability}% · burnout risk {data.sprintHealth.burnoutRisk}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Team Pulse ── */}
        {data?.workPatterns && <TeamPulse data={data.workPatterns} days={30} />}

        {/* ── AI review samples ── */}
        {data?.aiReviews?.length > 0 && (
          <Card className="overflow-hidden mb-10">
            <CardHeader className="p-5 pb-0 flex flex-row items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <Zap size={15} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Code Reviews</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gemini reviews every PR for security, performance, and anti-patterns
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {data.aiReviews.map((r, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground truncate mr-2">
                      {r.repo} · PR #{r.prNumber}
                    </span>
                    <span className="text-sm font-bold font-display text-primary shrink-0">{r.score}/100</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-1.5 line-clamp-1">{r.prTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{r.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Closing CTA ── */}
        <div className="text-center py-10 border-t border-border/60">
          <h2 className="text-2xl font-bold font-display tracking-tight mb-2">
            Now imagine this with your repos
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            One GitHub login, one webhook, and every chart on this page fills with your team&apos;s real data.
          </p>
          <Button asChild size="lg" className="gap-2">
            <a href={`${API_URL}/auth/github`}>
              <Github size={16} />
              Get started free
              <ArrowRight size={14} />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
