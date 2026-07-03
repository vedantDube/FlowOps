import FlowLine from "@/app/components/FlowLine";

/**
 * Minimal full-page fallback shown while useAuth() resolves its initial
 * session check — replaces a stark `return null` blank-white flash that
 * happened before each page's own data-loading skeleton ever got a chance
 * to mount. This window is normally brief (session check, not data fetch),
 * so a lightweight centered mark is enough; the page's real skeleton takes
 * over immediately after for the data-fetching phase. The drifting dash on
 * the flow line is the brand's loading signal.
 */
export function PageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <FlowLine width={96} height={16} strokeWidth={3} variant="current" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
