"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center space-y-6 p-8">
        <div className="text-5xl">📊</div>
        <h2 className="text-xl font-semibold">Dashboard failed to load</h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your dashboard data. This could be a temporary issue.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">
            Retry
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Refresh page
          </Button>
        </div>
      </div>
    </div>
  );
}
