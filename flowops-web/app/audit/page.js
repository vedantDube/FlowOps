"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Shield,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { fetchAuditLogs } from "../lib/api";
import { cn } from "../lib/utils";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_COLOR_MAP = {
  "auth.login": "success",
  "repo.connected": "teal",
  "ai.review.generated": "info",
  "docs.generated": "info",
  "member.added": "warning",
  integration: "warning",
};

function actionVariant(action) {
  const match = Object.keys(ACTION_COLOR_MAP).find((k) => action.startsWith(k));
  return match ? ACTION_COLOR_MAP[match] : "secondary";
}

export default function AuditPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);
    fetchAuditLogs(orgId, {
      limit: 50,
      page,
      ...(search && { action: search }),
    })
      .then(({ logs: l, total: t }) => {
        setLogs(l);
        setTotal(t);
      })
      .finally(() => setIsFetching(false));
  }, [orgId, page, search]);

  if (loading || !user) return null;

  const totalPages = Math.ceil(total / 50);

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Audit Logs"
          description="A complete record of actions taken in your organization."
          badge="Security"
        />

        {/* ── Search + Stats Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by action (e.g. ai.review)"
              className="pl-9 h-10"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield size={12} />
            <span>
              <span className="font-semibold text-foreground tabular-nums">
                {total}
              </span>{" "}
              total events
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <Card className="overflow-hidden">
          {isFetching ? (
            <CardContent className="p-5 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </CardContent>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <ClipboardList size={24} className="opacity-40" />
              </div>
              <p className="font-semibold text-foreground mb-1">
                No audit logs found
              </p>
              <p className="text-sm">
                {search
                  ? "Try a different filter."
                  : "Actions taken in your org will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium">Action</th>
                    <th className="text-left px-5 py-3 font-medium">User</th>
                    <th className="text-left px-5 py-3 font-medium">
                      Resource
                    </th>
                    <th className="text-left px-5 py-3 font-medium">
                      IP Address
                    </th>
                    <th className="text-left px-5 py-3 font-medium">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        idx % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={actionVariant(log.action)}
                          className="font-mono text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {log.user ? (
                          <div className="flex items-center gap-2.5">
                            {log.user.avatarUrl ? (
                              <img
                                src={log.user.avatarUrl}
                                className="w-6 h-6 rounded-full ring-1 ring-border"
                                alt=""
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {log.user.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-foreground font-medium">
                              {log.user.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-muted-foreground font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                          {log.resourceType || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs tabular-nums">
                        {log.ipAddress || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs tabular-nums">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Pagination ── */}
        {total > 50 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * 50 + 1}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(page * 50, total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
              {totalPages <= 5 &&
                [...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={page === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(i + 1)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {i + 1}
                  </Button>
                ))}
              {totalPages > 5 && (
                <span className="text-xs text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 50 >= total}
                className="h-8 w-8 p-0"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
