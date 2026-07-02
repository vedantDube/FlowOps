/**
 * Shared recharts <Tooltip content={...}> renderer — was copy-pasted with
 * minor drift across dashboard/team/personal-metrics pages. If a data point
 * has a `date` field (YYYY-MM-DD), it's formatted as a friendly weekday/month/day
 * string; otherwise the raw recharts `label` is shown as-is (e.g. sprint names).
 */
export function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number | string; payload?: { date?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const dataPoint = payload[0]?.payload;
  const dateStr = dataPoint?.date
    ? new Date(dataPoint.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : label;

  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground font-medium mb-1">{dateStr}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}
