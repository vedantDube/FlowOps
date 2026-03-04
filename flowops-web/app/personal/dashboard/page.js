"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Award, BookOpen, CheckSquare, ExternalLink, Flame,
  GitFork, Lock, Star, TrendingUp,
} from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchPersonalDashboard, fetchContributionHeatmap } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import ContributionHeatmap from "@/app/components/ContributionHeatmap";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function StatCard({ icon: Icon, label, value, color = "primary" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-500",
    violet: "bg-violet-500/10 text-violet-500",
    blue: "bg-blue-500/10 text-blue-500",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonalDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.allSettled([fetchPersonalDashboard(), fetchContributionHeatmap()])
      .then(([dash, heat]) => {
        if (dash.status === "fulfilled") setData(dash.value);
        if (heat.status === "fulfilled") setHeatmap(heat.value);
      })
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  const langColors = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    Java: "#b07219", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516",
    CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051", C: "#555555",
    "C++": "#f34b7d", "C#": "#178600", PHP: "#4F5D95", Swift: "#F05138",
  };

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title={`Hey, ${user.username}!`}
          description="Your personal developer dashboard — repos, activity, and goals."
          badge="Personal"
        />

        {/* Stats Row */}
        {fetching ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : data && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <StatCard icon={BookOpen} label="Repositories" value={data.stats.totalRepos} color="primary" />
            <StatCard icon={Star} label="Total Stars" value={data.stats.totalStars} color="amber" />
            <StatCard icon={GitFork} label="Total Forks" value={data.stats.totalForks} color="violet" />
            <StatCard icon={Award} label="Achievements" value={data.stats.achievementsEarned} color="blue" />
          </div>
        )}

        {/* Contribution Heatmap */}
        <Card className="mb-6">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Contribution Activity</p>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {fetching ? <Skeleton className="h-32 rounded-lg" /> : <ContributionHeatmap data={heatmap} />}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Top Repos */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Top Repositories</p>
                <span className="text-xs text-muted-foreground">{data?.topRepos?.length || 0} shown</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-2">
              {fetching ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
              ) : data?.topRepos?.map((repo) => (
                <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{repo.name}</p>
                      {repo.isPrivate && <Lock size={10} className="text-muted-foreground" />}
                      <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: langColors[repo.language] || "#888" }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star size={10} /> {repo.stars}
                    </span>
                  </div>
                </a>
              ))}
              {!fetching && !data?.topRepos?.length && (
                <p className="text-sm text-muted-foreground text-center py-6">No repos found</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Recent Commits</p>
                <Activity size={14} className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-1.5">
              {fetching ? (
                [1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)
              ) : data?.recentCommits?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{c.sha}</code>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{c.message}</p>
                    <p className="text-[10px] text-muted-foreground">{c.repo} · {c.date ? new Date(c.date).toLocaleDateString() : ""}</p>
                  </div>
                </div>
              ))}
              {!fetching && !data?.recentCommits?.length && (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Languages & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="p-5 pb-2">
              <p className="text-sm font-semibold text-foreground">Languages Used</p>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="flex flex-wrap gap-2">
                {data?.stats?.languages?.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: langColors[lang] || "#888" }} />
                    {lang}
                  </Badge>
                ))}
                {!data?.stats?.languages?.length && (
                  <p className="text-xs text-muted-foreground">No language data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Task Summary</p>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="flex items-center gap-4">
                {[
                  { label: "To Do", key: "todo", color: "text-muted-foreground" },
                  { label: "In Progress", key: "in-progress", color: "text-amber-500" },
                  { label: "Done", key: "done", color: "text-primary" },
                ].map(({ label, key, color }) => (
                  <div key={key} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{data?.taskSummary?.[key] || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PersonalLayout>
  );
}
