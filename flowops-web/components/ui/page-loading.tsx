/**
 * Minimal full-page fallback shown while useAuth() resolves its initial
 * session check — replaces a stark `return null` blank-white flash that
 * happened before each page's own data-loading skeleton ever got a chance
 * to mount. This window is normally brief (session check, not data fetch),
 * so a lightweight centered pulse is enough; the page's real skeleton takes
 * over immediately after for the data-fetching phase.
 */
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
    </div>
  );
}
