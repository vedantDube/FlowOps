"use client";

import { Lock } from "lucide-react";

import { githubReconnectUrl } from "@/app/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Shown wherever a page's data depends on the user's stored GitHub token
 * (personal dashboard/metrics/heatmap/repos) and that token no longer works
 * (see isGithubAuthExpiredError in lib/api.js). Reconnecting re-runs the
 * GitHub OAuth flow, which refreshes the stored token on the API.
 */
export function GithubReconnectCard({
  title = "GitHub Authorization Expired",
  description = "Your GitHub access token has expired. Please reconnect your GitHub account to continue.",
}) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardContent className="p-6 text-center">
        <Lock size={32} className="text-amber-600 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => { window.location.href = githubReconnectUrl(); }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Reconnect GitHub
          </Button>
          <Button
            onClick={() => { window.location.href = "/settings"; }}
            variant="outline"
          >
            Go to Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
