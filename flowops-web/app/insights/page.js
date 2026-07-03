"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  Sunrise,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { generateNarrative, generateStandup } from "../lib/api";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";

const WINDOW_OPTIONS = [7, 14, 30];

function MarkdownBlock({ children }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1.5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:text-foreground text-foreground/90">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs gap-1.5" onClick={copy}>
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {label}
    </Button>
  );
}

export default function InsightsPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();

  const [days, setDays] = useState(7);
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [standup, setStandup] = useState(null);
  const [standupLoading, setStandupLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const runNarrative = () => {
    if (!orgId || narrativeLoading) return;
    setNarrativeLoading(true);
    generateNarrative({ organizationId: orgId, days })
      .then((res) => setNarrative(res))
      .catch((err) =>
        toast.error(err.response?.data?.error || "Could not generate the report"),
      )
      .finally(() => setNarrativeLoading(false));
  };

  const runStandup = () => {
    if (!orgId || standupLoading) return;
    setStandupLoading(true);
    generateStandup({ organizationId: orgId })
      .then((res) => setStandup(res))
      .catch((err) =>
        toast.error(err.response?.data?.error || "Could not generate the standup"),
      )
      .finally(() => setStandupLoading(false));
  };

  if (loading || !user) return <PageLoading />;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="AI Insights"
          description="AI-written reports that turn your metrics into a story — what happened, why, and what to do next."
          badge="AI"
        />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 items-start">
          {/* ── State of Engineering narrative ── */}
          <Card className="overflow-hidden xl:col-span-3">
            <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">State of Engineering</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A narrative report on delivery, team dynamics, and risks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-muted-foreground" />
                  <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
                    {WINDOW_OPTIONS.map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={days === d ? "default" : "ghost"}
                        className={`h-7 px-2.5 text-xs rounded-md ${days === d ? "" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setDays(d)}
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5"
                  onClick={runNarrative}
                  disabled={narrativeLoading}
                >
                  {narrativeLoading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {narrative ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {narrativeLoading ? (
                <GeneratingSkeleton />
              ) : narrative ? (
                <>
                  <MarkdownBlock>{narrative.narrative}</MarkdownBlock>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Generated {new Date(narrative.generatedAt).toLocaleString()} · last{" "}
                      {narrative.windowDays} days · based only on your real GitHub data
                    </p>
                    <CopyButton text={narrative.narrative} label="Copy Markdown" />
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No report yet"
                  description="Pick a window and hit Generate — the AI reads your cycle times, review load, commits, deploys, and incidents, then writes the story."
                  className="py-12"
                />
              )}
            </CardContent>
          </Card>

          {/* ── Daily standup ── */}
          <Card className="overflow-hidden xl:col-span-2">
            <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Sunrise size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Daily Standup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last 24h of activity, per person — paste it into Slack
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs gap-1.5 shrink-0"
                onClick={runStandup}
                disabled={standupLoading}
              >
                {standupLoading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {standup ? "Regenerate" : "Generate"}
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {standupLoading ? (
                <GeneratingSkeleton />
              ) : standup ? (
                <>
                  <MarkdownBlock>{standup.standup}</MarkdownBlock>
                  <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/60">
                    <CopyButton text={standup.standup} label="Copy for Slack" />
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Sunrise}
                  title="Skip the standup scramble"
                  description="One click summarizes yesterday's commits, PRs, and reviews per teammate — plus anything stuck waiting on review."
                  className="py-12"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
