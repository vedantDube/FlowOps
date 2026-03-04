"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Github,
  Plug,
  Rocket,
  Check,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchOnboardingStatus, completeOnboarding, fetchOrgRepos, fetchIntegrations } from "@/app/lib/api";

const STEPS = [
  {
    id: "connect_repo",
    title: "Connect a Repository",
    description: "Link your GitHub repository to start tracking commits, PRs, and code quality.",
    icon: Github,
    href: "/integrations",
    action: "Connect Repository",
  },
  {
    id: "first_review",
    title: "Run Your First AI Review",
    description: "Trigger an AI-powered code review on any pull request to see FlowOps in action.",
    icon: Zap,
    href: "/ai-review",
    action: "Go to AI Review",
  },
  {
    id: "invite_team",
    title: "Invite Your Team",
    description: "Add team members to collaborate on code reviews, documentation, and insights.",
    icon: Plug,
    href: "/team",
    action: "Manage Team",
  },
];

export default function OnboardingPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchOnboardingStatus();
        setStatus(data);
      } catch {
        // New users start fresh
        setStatus({ completed: false, stepsCompleted: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeOnboarding();
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const completedSteps = status?.stepsCompleted || [];
  const allDone = completedSteps.length >= STEPS.length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
              }}
            >
              <Rocket size={22} className="text-neutral-950" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to FlowOps
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Complete these steps to set up your engineering intelligence platform.
            You&apos;ll be shipping insights in minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedSteps.length} of {STEPS.length} completed</span>
            <span>{Math.round((completedSteps.length / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedSteps.length / STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, #4ADE80, #0D9488)",
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const done = completedSteps.includes(step.id);
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-5 rounded-xl border transition-all ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
                {!done && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => router.push(step.href)}
                  >
                    {step.action}
                    <ChevronRight size={12} className="ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleComplete}
          >
            Skip for now
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleComplete}
            disabled={completing}
          >
            {allDone ? "Get Started" : "Continue to Dashboard"}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
