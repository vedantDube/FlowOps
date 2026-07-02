import {
  Clock,
  GitMerge,
  TrendingUp,
  ShieldAlert,
  Wrench,
  Activity,
  Users,
  Trophy,
} from "lucide-react";
import {
  fetchPRCycleTime,
  fetchReviewLatency,
  fetchLeadTime,
  fetchChangeFailureRate,
  fetchMTTR,
  fetchCommitActivity,
  fetchCodeChurn,
  fetchDeploymentFrequency,
  fetchTopContributors,
  fetchLeaderboard,
} from "./api";

/**
 * @typedef {Object} Widget
 * @property {string} id - client-generated uuid, stable across reorders/edits
 * @property {"metric"|"chart"|"list"} type
 * @property {string} metricKey - registry lookup key, e.g. "pr-cycle-time"
 * @property {number} order - 0-based position; mutated by drag-and-drop reordering
 * @property {1|2} span - column width (1 = single, 2 = double); default 1
 * @property {{repoId?: string, days?: number}} [config]
 */

// Title/color/icon deliberately live here, not in the persisted widget JSON —
// keeps stored layouts minimal and prevents label drift from the registry.
export const WIDGET_REGISTRY = {
  "pr-cycle-time": {
    type: "metric",
    title: "Avg PR Cycle Time",
    icon: Clock,
    color: "green",
    fetch: fetchPRCycleTime,
    valueKey: "averageHours",
    unit: "h",
    defaultSpan: 1,
  },
  "review-latency": {
    type: "metric",
    title: "Avg Review Latency",
    icon: GitMerge,
    color: "teal",
    fetch: fetchReviewLatency,
    valueKey: "averageHours",
    unit: "h",
    defaultSpan: 1,
  },
  "lead-time": {
    type: "metric",
    title: "Lead Time for Changes",
    icon: TrendingUp,
    color: "blue",
    fetch: fetchLeadTime,
    valueKey: "averageHours",
    unit: "h",
    defaultSpan: 1,
  },
  "change-failure-rate": {
    type: "metric",
    title: "Change Failure Rate",
    icon: ShieldAlert,
    color: "red",
    fetch: fetchChangeFailureRate,
    valueKey: "ratePercent",
    unit: "%",
    defaultSpan: 1,
  },
  mttr: {
    type: "metric",
    title: "MTTR",
    icon: Wrench,
    color: "yellow",
    fetch: fetchMTTR,
    valueKey: "averageHours",
    unit: "h",
    defaultSpan: 1,
  },
  "commit-activity": {
    type: "chart",
    title: "Commit Activity",
    icon: Activity,
    fetch: fetchCommitActivity,
    chartKind: "area",
    dataKey: "commits",
    xKey: "day",
    defaultSpan: 2,
  },
  "code-churn": {
    type: "chart",
    title: "Code Churn",
    icon: Activity,
    fetch: fetchCodeChurn,
    chartKind: "bar",
    dataKeys: ["additions", "deletions"],
    xKey: "day",
    defaultSpan: 2,
  },
  "deployment-frequency": {
    type: "chart",
    title: "Deployment Frequency",
    icon: TrendingUp,
    fetch: fetchDeploymentFrequency,
    chartKind: "area",
    dataKey: "deployments",
    xKey: "day",
    unwrap: (r) => r.data,
    defaultSpan: 2,
  },
  "top-contributors": {
    type: "list",
    title: "Top Contributors",
    icon: Users,
    fetch: fetchTopContributors,
    labelKey: "author",
    valueKey: "commits",
    defaultSpan: 1,
  },
  leaderboard: {
    type: "list",
    title: "Review Leaderboard",
    icon: Trophy,
    fetch: fetchLeaderboard,
    labelKey: "username",
    valueKey: "score",
    callShape: "positional",
    unwrap: (r) => r.leaderboard,
    defaultSpan: 1,
  },
};

export function createWidget(metricKey, order) {
  const entry = WIDGET_REGISTRY[metricKey];
  return {
    id: crypto.randomUUID(),
    type: entry.type,
    metricKey,
    order,
    span: entry.defaultSpan,
    config: {},
  };
}
