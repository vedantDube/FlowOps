import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FlowOps engineering report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Social-preview card for shared public reports — when a /report/[slug] link
 * is pasted into Slack/LinkedIn/X it unfurls as a branded metrics card
 * instead of a bare URL. Falls back to a generic FlowOps card if the report
 * can't be fetched (private, deleted, API down).
 */
export default async function OgImage({ params }) {
  let report = null;
  try {
    const res = await fetch(`${API_URL}/report/${params.slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) report = await res.json();
  } catch {
    /* fall through to the generic card */
  }

  const orgName = report?.org?.name || "Engineering Report";
  const m = report?.metrics;
  const stats = m
    ? [
        { label: "Commits (30d)", value: String(m.commits30d ?? 0) },
        { label: "PRs merged (7d)", value: String(m.mergedPRs7d ?? 0) },
        { label: "Avg cycle time", value: `${m.avgCycleTimeHours ?? 0}h` },
        { label: "AI reviews", value: String(m.aiReviewsCompleted ?? 0) },
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0a0a0f 0%, #10241a 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header: mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4ADE80, #0D9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0a0a0f",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>FlowOps</div>
            <div style={{ fontSize: 16, color: "#9ca3af" }}>Engineering Intelligence</div>
          </div>
        </div>

        {/* Org + flow line */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{orgName}</div>
          <svg width="180" height="26" viewBox="0 0 180 26">
            <path
              d="M4 20 C 40 20, 50 6, 90 6 S 140 20, 176 20"
              stroke="#4ADE80"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div style={{ fontSize: 22, color: "#9ca3af" }}>Public engineering report</div>
        </div>

        {/* Stats row */}
        {stats.length > 0 ? (
          <div style={{ display: "flex", gap: 20 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "20px 28px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 700, color: "#4ADE80" }}>{s.value}</div>
                <div style={{ fontSize: 16, color: "#9ca3af" }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 20, color: "#9ca3af" }}>
            Cycle time · review latency · DORA metrics · AI code review
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
