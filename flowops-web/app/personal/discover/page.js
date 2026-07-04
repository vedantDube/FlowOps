"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Compass, ExternalLink, GitFork, Heart, Search, Star } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { searchDiscover } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/ui/page-loading";

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const handleSearch = () => {
    const trimmed = topic.trim();
    if (!trimmed || fetching) return;
    setFetching(true);
    setHasSearched(true);
    searchDiscover(trimmed)
      .then(setResults)
      .catch(() => toast.error("Search failed. Please try again."))
      .finally(() => setFetching(false));
  };

  if (loading || !user) return <PageLoading />;

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Discover"
          description="Type what you want to build or learn — get relevant repos and articles."
          badge="AI"
        />

        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. RAG chatbot, rate limiter, browser extension..."
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={fetching || !topic.trim()}>
            {fetching ? "Searching..." : "Search"}
          </Button>
        </div>

        {results?.expansion?.tags?.length > 0 && (
          <p className="text-xs text-muted-foreground mb-6">
            Searched for: {results.expansion.tags.join(", ")}
          </p>
        )}
        {!results?.expansion?.tags?.length && <div className="mb-6" />}

        {!hasSearched ? (
          <EmptyState
            icon={Compass}
            title="Explore what to build next"
            description="Type a topic above to find relevant GitHub repos and dev.to articles."
          />
        ) : fetching ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Repositories */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Repositories</p>
              {results?.warnings?.github && (
                <p className="text-xs text-muted-foreground mb-3">{results.warnings.github}</p>
              )}
              {results?.repos?.length ? (
                <div className="space-y-3">
                  {results.repos.map((r) => (
                    <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Card className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground truncate">{r.fullName}</p>
                            <ExternalLink size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Star size={11} className="text-amber-500" />{r.stars}</span>
                            {r.language && <Badge variant="secondary" className="text-[10px]">{r.language}</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={GitFork} title="No repositories found" description="Try rephrasing your topic." />
              )}
            </div>

            {/* Articles */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Articles</p>
              {results?.warnings?.devto && (
                <p className="text-xs text-muted-foreground mb-3">{results.warnings.devto}</p>
              )}
              {results?.articles?.length ? (
                <div className="space-y-3">
                  {results.articles.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Card className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{a.title}</p>
                            <ExternalLink size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">by {a.author}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Heart size={11} className="text-rose-500" />{a.reactions}</span>
                            {a.tags?.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Search} title="No articles found" description="Try rephrasing your topic." />
              )}
            </div>
          </div>
        )}
      </div>
    </PersonalLayout>
  );
}
