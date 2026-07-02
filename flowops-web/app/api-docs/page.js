"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Key, ArrowUpRight } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/v1";

const ENDPOINTS = [
  {
    group: "Engineering Metrics",
    routes: [
      { path: "/metrics/pr-cycle-time", desc: "Average and p75 PR cycle time (open → close), with trend vs. the previous period." },
      { path: "/metrics/review-latency", desc: "Average time from PR open to first review." },
      { path: "/metrics/commit-activity", desc: "Daily commit counts over the window." },
      { path: "/metrics/code-churn", desc: "Daily additions/deletions." },
      { path: "/metrics/leaderboard", desc: "Top contributors by commit count. Accepts an extra `limit` param (default 10)." },
    ],
  },
  {
    group: "DORA Metrics",
    routes: [
      { path: "/metrics/deployment-frequency", desc: "Daily deployment counts and per-day average." },
      { path: "/metrics/lead-time", desc: "Average time from PR merge to deploy. Response includes `approximate: true` and `resolvedCount`/`totalCount` — not every deploy can be traced back to a PR." },
      { path: "/metrics/change-failure-rate", desc: "Percentage of deploys with a linked incident." },
      { path: "/metrics/mttr", desc: "Average time to resolve an incident, in hours." },
    ],
  },
];

const COMMON_PARAMS = [
  { name: "repoId", desc: "Scope to a single repository (UUID). Omit for an org-wide rollup." },
  { name: "days", desc: "Lookback window in days. Default 7, max 365." },
];

function CodeBlock({ children }) {
  return (
    <pre className="px-4 py-3 text-xs font-mono text-foreground bg-muted/30 rounded-lg overflow-x-auto">
      {children}
    </pre>
  );
}

export default function ApiDocsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return <PageLoading />;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[900px] mx-auto">
        <PageHeader
          title="API Documentation"
          description="Pull your organization's engineering metrics into your own tools and dashboards."
          badge="Beta"
          action={
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="/settings?tab=api-keys">
                <Key size={14} /> Manage API Keys <ArrowUpRight size={12} />
              </a>
            </Button>
          }
        />

        <Card className="mb-6">
          <CardHeader className="p-5 pb-0">
            <p className="text-sm font-semibold text-foreground">Authentication</p>
          </CardHeader>
          <CardContent className="p-5 pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Every request must include an <code className="text-primary bg-primary/10 px-1 rounded">X-API-Key</code> header
              with a key generated from Settings → API Keys. Keys are scoped — this API currently uses one scope,{" "}
              <code className="text-primary bg-primary/10 px-1 rounded">metrics:read</code>, which a key must have (or the
              wildcard <code className="text-primary bg-primary/10 px-1 rounded">*</code>) to read any endpoint below.
            </p>
            <CodeBlock>
{`curl -H "X-API-Key: fops_..." \\
  "${BASE_URL}/metrics/commit-activity?days=7"`}
            </CodeBlock>
            <p className="text-xs text-muted-foreground">
              A key only ever returns data for the organization it was created under — any{" "}
              <code className="bg-muted px-1 rounded">orgId</code> you pass in the query string is ignored.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="p-5 pb-0">
            <p className="text-sm font-semibold text-foreground">Base URL</p>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <CodeBlock>{BASE_URL}</CodeBlock>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="p-5 pb-0">
            <p className="text-sm font-semibold text-foreground">Common query parameters</p>
            <p className="text-xs text-muted-foreground mt-0.5">Accepted by every endpoint below.</p>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="divide-y divide-border/60">
              {COMMON_PARAMS.map((p) => (
                <div key={p.name} className="py-2.5 flex items-start gap-4">
                  <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{p.name}</code>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {ENDPOINTS.map((group) => (
          <Card key={group.group} className="mb-6">
            <CardHeader className="p-5 pb-0 flex flex-row items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{group.group}</p>
              <Badge variant="secondary" className="text-[10px]">{group.routes.length} endpoints</Badge>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="divide-y divide-border/60">
                {group.routes.map((r) => (
                  <div key={r.path} className="py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-[10px] font-mono">GET</Badge>
                      <code className="text-xs font-mono text-foreground">{r.path}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
