"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  GitBranch,
  GitPullRequest,
  Users,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";
import { fetchPublicReport } from "@/app/lib/api";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon size={14} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function PublicReportPage() {
  const params = useParams();
  const slug = params?.slug;
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const data = await fetchPublicReport(slug);
        setReport(data);
      } catch (err) {
        setError(err.response?.data?.error || "Report not found");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">
          Loading report…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Shield size={40} className="text-muted-foreground mx-auto" />
          <h1 className="text-lg font-bold text-foreground">{error}</h1>
          <p className="text-sm text-muted-foreground">
            This engineering report may be private or doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const { organization, metrics, sprintHealth, topContributors } = report;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  organization.primaryColor
                    ? organization.primaryColor
                    : "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
              }}
            >
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {organization.companyName || organization.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                Engineering Status Report
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Powered by{" "}
            <span className="text-primary font-semibold">FlowOps</span> •
            Generated{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Repositories"
            value={metrics?.totalRepos || 0}
            icon={GitBranch}
            color="bg-blue-500/15 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Total Commits"
            value={metrics?.totalCommits?.toLocaleString() || 0}
            icon={Activity}
            color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Pull Requests"
            value={metrics?.totalPRs || 0}
            icon={GitPullRequest}
            color="bg-purple-500/15 text-purple-600 dark:text-purple-400"
          />
          <StatCard
            label="Contributors"
            value={metrics?.totalContributors || 0}
            icon={Users}
            color="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Sprint Health */}
        {sprintHealth && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={14} />
              Sprint Health
            </h2>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Health Score
                </span>
                <span
                  className={`text-2xl font-bold ${
                    sprintHealth.healthScore >= 70
                      ? "text-emerald-500"
                      : sprintHealth.healthScore >= 40
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {sprintHealth.healthScore}/100
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${sprintHealth.healthScore}%`,
                    background:
                      sprintHealth.healthScore >= 70
                        ? "#10b981"
                        : sprintHealth.healthScore >= 40
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-xs">
                <div>
                  <span className="text-muted-foreground">PR Cycle Time</span>
                  <p className="font-semibold text-foreground mt-1">
                    {sprintHealth.prCycleAvgHours?.toFixed(1)}h
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Review Latency</span>
                  <p className="font-semibold text-foreground mt-1">
                    {sprintHealth.reviewLatencyAvgHours?.toFixed(1)}h
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Burnout Risk</span>
                  <p className="font-semibold text-foreground mt-1 capitalize">
                    {sprintHealth.burnoutRisk}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery</span>
                  <p className="font-semibold text-foreground mt-1">
                    {sprintHealth.deliveryPredictability}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Contributors */}
        {topContributors?.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users size={14} />
              Top Contributors
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {topContributors.map((c, idx) => (
                <div
                  key={c.username}
                  className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0"
                >
                  <span className="text-xs font-bold text-muted-foreground w-5">
                    {idx + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.username}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      c.username?.[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">
                    {c.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.commits} commits
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-8 pb-4">
          <p>
            This is a public engineering status page powered by{" "}
            <a
              href="/"
              className="text-primary hover:underline font-medium"
            >
              FlowOps
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
