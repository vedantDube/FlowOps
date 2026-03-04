"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Sparkles, User } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { setUserMode } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ModeSelectPage() {
  const { user, loading, setMode } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setUserMode(selected);
      setMode(selected);
      if (selected === "personal") {
        router.push("/personal/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to FlowOps</h1>
          <p className="text-sm text-muted-foreground mt-2">
            How will you use FlowOps? You can always switch later.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card
            onClick={() => setSelected("personal")}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/40",
              selected === "personal"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border"
            )}
          >
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <User size={22} className="text-blue-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Individual Developer</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 text-left">
                <li>• Personal GitHub metrics & streaks</li>
                <li>• AI code review on your repos</li>
                <li>• Auto-generated documentation</li>
                <li>• Achievement badges & profile</li>
                <li>• Code snippet library</li>
                <li>• Personal task tracker</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelected("org")}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/40",
              selected === "org"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border"
            )}
          >
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <Building2 size={22} className="text-violet-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Team / Organization</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 text-left">
                <li>• Team metrics & DORA insights</li>
                <li>• PR cycle time & review latency</li>
                <li>• AI code review for all PRs</li>
                <li>• Sprint health reports</li>
                <li>• Slack & Jira integrations</li>
                <li>• Audit logs & compliance</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full h-11"
        >
          {saving ? "Setting up…" : "Continue"}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You can switch between modes anytime from the sidebar.
        </p>
      </div>
    </div>
  );
}
