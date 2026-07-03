"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitPullRequest, Eye, CheckCircle2, GitMerge, AlertTriangle } from "lucide-react";
import { fetchPRFlow } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const fmtHours = (h) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

/**
 * PR Lifecycle Flow Map — shows where time dies in the PR pipeline:
 * opened → first review → approved → merged, with each connector sized
 * proportionally to the average time spent in that stage. The slowest
 * stage is flagged as the bottleneck.
 */
export default function PRFlowMap({ orgId, days, data = null }) {
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(!data);
  const flow = data || fetched;

  useEffect(() => {
    if (data || !orgId) return;
    setLoading(true);
    fetchPRFlow({ orgId, days })
      .then(setFetched)
      .catch(() => setFetched(null))
      .finally(() => setLoading(false));
  }, [orgId, days, data]);

  if (loading) {
    return (
      <Card className="overflow-hidden mb-6">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!flow || !flow.totals?.opened) {
    return (
      <Card className="overflow-hidden mb-6" data-tour="flow-map">
        <CardHeader className="p-5 pb-0">
          <p className="text-sm font-semibold text-foreground">PR Lifecycle Flow</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where PRs spend their time, from open to merge
            {days ? ` · last ${days} days` : ""}
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <EmptyState
            icon={GitPullRequest}
            title="No pull requests in this window"
            description="Once your connected repos have opened PRs, this fills in with stage-by-stage timing and flags the bottleneck automatically."
            className="py-10"
          />
        </CardContent>
      </Card>
    );
  }

  const { totals, stages } = flow;
  const withData = stages.filter((s) => s.avgHours != null);
  const totalHours = withData.reduce((s, st) => s + st.avgHours, 0);
  const slowest =
    withData.length > 1
      ? withData.reduce((a, b) => (b.avgHours > a.avgHours ? b : a))
      : null;

  const nodes = [
    { key: "opened", label: "Opened", count: totals.opened, icon: GitPullRequest, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { key: "reviewed", label: "First review", count: totals.reviewed, icon: Eye, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
    { key: "approved", label: "Approved", count: totals.approved, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { key: "merged", label: "Merged", count: totals.merged, icon: GitMerge, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  ];

  return (
    <Card className="overflow-hidden mb-6" data-tour="flow-map">
      <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">PR Lifecycle Flow</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where PRs spend their time, from open to merge
            {days ? ` · last ${days} days` : ""}
          </p>
        </div>
        {slowest && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 shrink-0">
            <AlertTriangle size={11} />
            Bottleneck: {slowest.label.toLowerCase()}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-5 pt-6">
        {/* ── Pipeline nodes + connectors ── */}
        <div className="flex items-stretch overflow-x-auto pb-2">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            const stage = i > 0 ? stages[i - 1] : null;
            const isBottleneck = stage && slowest && stage.key === slowest.key;
            const share =
              stage?.avgHours != null && totalHours > 0
                ? stage.avgHours / totalHours
                : 0;
            return (
              <div key={node.key} className="flex items-center min-w-0">
                {/* Connector segment (time spent between stages) */}
                {i > 0 && (
                  <div
                    className="flex flex-col items-center justify-center px-1 shrink-0"
                    style={{ width: `${Math.max(72, 64 + share * 160)}px` }}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums mb-1",
                        isBottleneck ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                      )}
                    >
                      {fmtHours(stage?.avgHours)}
                    </span>
                    <div className="relative w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          isBottleneck
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : "bg-gradient-to-r from-primary/60 to-primary",
                        )}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                      {stage?.count ?? 0} PRs
                    </span>
                  </div>
                )}
                {/* Node */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.15 }}
                  className="flex flex-col items-center gap-1.5 px-2 shrink-0"
                >
                  <span className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", node.color)}>
                    <Icon size={16} />
                  </span>
                  <span className="text-lg font-bold text-foreground tabular-nums leading-none">
                    {node.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {node.label}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* ── Time share bar ── */}
        {totalHours > 0 && withData.length > 1 && (
          <div className="mt-5">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              {withData.map((s, i) => {
                const shareColors = ["bg-teal-500", "bg-blue-500", "bg-violet-500"];
                const isBn = slowest && s.key === slowest.key;
                return (
                  <motion.div
                    key={s.key}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: s.avgHours }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full", isBn ? "bg-amber-500" : shareColors[i % shareColors.length])}
                    style={{ flexBasis: 0 }}
                    title={`${s.label}: ${fmtHours(s.avgHours)}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {withData.map((s, i) => {
                const shareColors = ["bg-teal-500", "bg-blue-500", "bg-violet-500"];
                const isBn = slowest && s.key === slowest.key;
                return (
                  <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn("w-2 h-2 rounded-sm", isBn ? "bg-amber-500" : shareColors[i % shareColors.length])} />
                    {s.label} · {Math.round((s.avgHours / totalHours) * 100)}%
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {(totals.closedWithoutMerge > 0 || totals.open > 0) && (
          <p className="text-[11px] text-muted-foreground mt-4">
            {totals.open > 0 && `${totals.open} still open`}
            {totals.open > 0 && totals.closedWithoutMerge > 0 && " · "}
            {totals.closedWithoutMerge > 0 && `${totals.closedWithoutMerge} closed without merging`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
