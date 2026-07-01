"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, UserX, Sparkles, ChevronRight } from "lucide-react";
import { fetchNotifications } from "@/app/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const TYPE_META = {
  stale_pr: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  unassigned_reviewer: { icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
  auto_approved: { icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

/**
 * Surfaces open PR automation nudges (stale PRs, unassigned reviewers,
 * auto-approved merges). Used on both the org dashboard (team-visible)
 * and the personal dashboard (filtered to the current user's own PRs).
 */
export default function NeedsAttention({ orgId, username, scope = "org" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    fetchNotifications(orgId)
      .then((notifications) => {
        let alerts = notifications.filter((n) =>
          ["stale_pr", "unassigned_reviewer", "auto_approved"].includes(n.type),
        );
        if (scope === "personal" && username) {
          alerts = alerts.filter((n) => n.metadata?.prAuthor === username);
        }
        setItems(alerts.slice(0, 5));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [orgId, username, scope]);

  if (loading || items.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.03] mb-6">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <p className="text-sm font-semibold text-foreground">
            {scope === "personal" ? "Needs your attention" : "Needs attention"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 divide-y divide-border/60">
        {items.map((n) => {
          const meta = TYPE_META[n.type] || TYPE_META.stale_pr;
          const Icon = meta.icon;
          return (
            <a
              key={n.id}
              href={n.link || "#"}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                <Icon size={14} className={meta.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
              </div>
              <ChevronRight size={14} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
