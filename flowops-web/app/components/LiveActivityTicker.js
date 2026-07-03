"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCommit, GitPullRequest, Zap, Rocket, Radio, Eye } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const EVENT_META = {
  "new-commit": {
    icon: GitCommit,
    color: "text-emerald-500 bg-emerald-500/10",
    render: (d) => `${d.count || 1} new commit${(d.count || 1) > 1 ? "s" : ""} in ${d.repoName}`,
  },
  "pr-updated": {
    icon: GitPullRequest,
    color: "text-blue-500 bg-blue-500/10",
    render: (d) => `PR #${d.prNumber} ${d.action || "updated"} — ${d.prTitle || d.repoName}`,
  },
  "pr-review": {
    icon: Eye,
    color: "text-purple-500 bg-purple-500/10",
    render: (d) => `Review on PR #${d.prNumber ?? ""} ${d.repoName ? `in ${d.repoName}` : ""}`.trim(),
  },
  "ai-review-complete": {
    icon: Zap,
    color: "text-primary bg-primary/10",
    render: (d) => `AI review done — PR #${d.prNumber}${d.score != null ? ` scored ${d.score}/100` : ""}`,
  },
  "deployment-status": {
    icon: Rocket,
    color: "text-amber-500 bg-amber-500/10",
    render: (d) => `Deployment ${d.status || "update"}${d.repoName ? ` — ${d.repoName}` : ""}`,
  },
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

/**
 * Live Activity — real-time feed of org events streamed over Socket.IO.
 * Shares the org room already emitted to by the GitHub webhook handlers.
 */
export default function LiveActivityTicker({ orgId }) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  // Re-render every 30s so the relative timestamps stay honest
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!orgId) return;

    let socket;
    const connect = async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io(BASE_URL, { transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-org", orgId);
          setConnected(true);
        });
        socket.on("disconnect", () => setConnected(false));

        Object.keys(EVENT_META).forEach((event) => {
          socket.on(event, (data) => {
            setEvents((prev) =>
              [{ id: `${Date.now()}-${Math.random()}`, event, data, time: new Date() }, ...prev].slice(0, 8),
            );
          });
        });
      } catch {
        /* socket unavailable — hide gracefully */
      }
    };
    connect();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orgId]);

  return (
    <Card className="overflow-hidden mb-6" data-tour="live-activity">
      <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                connected ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
          </span>
          <p className="text-sm font-semibold text-foreground">Live Activity</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Radio size={11} />
          {connected ? "streaming" : "connecting…"}
        </span>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Listening for commits, PRs, reviews, and deploys — events appear here the moment they hit GitHub.
          </p>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {events.map((e) => {
                const meta = EVENT_META[e.event];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -12, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-center gap-3 overflow-hidden"
                  >
                    <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 my-1", meta.color)}>
                      <Icon size={12} />
                    </span>
                    <p className="flex-1 min-w-0 text-xs text-foreground truncate">
                      {meta.render(e.data || {})}
                    </p>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {timeAgo(e.time)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
