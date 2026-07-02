"use client";

import MetricCard from "../MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useWidgetData } from "../../hooks/useWidgetData";

export default function MetricWidget({ widget, orgId, days }) {
  const { entry, data, loading } = useWidgetData(widget, { orgId, days });
  if (!entry) return null;

  if (loading || !data) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const Icon = entry.icon;
  const value = data[entry.valueKey] ?? 0;

  return (
    <MetricCard
      title={entry.title}
      value={`${value}${entry.unit}`}
      icon={Icon ? <Icon size={16} /> : undefined}
      color={entry.color}
      trend={data.trend}
      trendLabel={data.trend != null ? undefined : `${data.total || 0} total`}
    />
  );
}
