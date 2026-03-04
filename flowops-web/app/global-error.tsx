"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="mx-auto max-w-md text-center space-y-6 p-8">
          <div className="text-6xl">💥</div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <pre className="mt-4 rounded-lg bg-muted p-4 text-left text-xs overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Go home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
