"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, Zap, GitPullRequest, FileText, GitCommit, BarChart3, Plug, Activity } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const EVENT_META = {
  "new-commit":            { icon: GitCommit,      color: "text-emerald-500", bg: "bg-emerald-500/10", label: "New Commit" },
  "new-pr":                { icon: GitPullRequest,  color: "text-blue-500",    bg: "bg-blue-500/10",    label: "New Pull Request" },
  "pr-updated":            { icon: GitPullRequest,  color: "text-amber-500",   bg: "bg-amber-500/10",   label: "PR Updated" },
  "pr-review":             { icon: GitPullRequest,  color: "text-purple-500",  bg: "bg-purple-500/10",  label: "PR Review" },
  "ai-review-complete":    { icon: Zap,             color: "text-primary",     bg: "bg-primary/10",     label: "AI Review Complete" },
  "doc-generated":         { icon: FileText,        color: "text-cyan-500",    bg: "bg-cyan-500/10",    label: "Doc Generated" },
  "sprint-health-generated": { icon: BarChart3,     color: "text-pink-500",    bg: "bg-pink-500/10",    label: "Sprint Health" },
  "integration-update":    { icon: Plug,            color: "text-amber-500",   bg: "bg-amber-500/10",   label: "Integration Update" },
  "usage-update":          { icon: Activity,        color: "text-red-500",     bg: "bg-red-500/10",     label: "Usage Update" },
};

export default function NotificationBell() {
  const { orgId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const socketRef = useRef(null);

  // Connect to Socket.IO
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
        });

        // Listen to all known events
        const eventTypes = Object.keys(EVENT_META);
        eventTypes.forEach((event) => {
          socket.on(event, (data) => {
            const notification = {
              id: Date.now() + Math.random(),
              event,
              data,
              time: new Date(),
              read: false,
            };
            setNotifications((prev) => [notification, ...prev].slice(0, 50));
            setUnread((u) => u + 1);
          });
        });
      } catch {
        /* Socket.IO not available — degrade gracefully */
      }
    };

    connect();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orgId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnread(0);
    setOpen(false);
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={16} className="text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center animate-pulse" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50" role="dialog" aria-label="Notifications panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded" aria-label="Clear all notifications">
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/60" aria-label="Close notifications">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
                <p className="text-[11px] mt-0.5">Real-time events will appear here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = EVENT_META[n.event] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted", label: n.event };
                const Icon = meta.icon;
                return (
                  <div key={n.id} className={cn("px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors", !n.read && "bg-primary/5")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
                        <Icon size={13} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {n.data?.message || n.data?.title || n.data?.repoName || JSON.stringify(n.data).slice(0, 60)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(n.time)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
