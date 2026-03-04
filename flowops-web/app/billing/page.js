"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { createCheckout, verifyPayment, cancelPlan, fetchSubscription, fetchUsageSummary } from "../lib/api";
import { cn } from "../lib/utils";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "Perfect for individual developers",
    features: [
      "1 connected repository",
      "Basic engineering metrics",
      "GitHub OAuth",
      "Community support",
    ],
    cta: "Current Plan",
    isHighlight: false,
    accent: "border-border",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹2,499",
    period: "/month",
    description: "For growing engineering teams",
    features: [
      "Up to 10 repositories",
      "AI Code Review (Gemini)",
      "AutoDocs AI generation",
      "Team insights & sprint health",
      "Jira + Slack integrations",
      "Audit logs",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    isHighlight: true,
    accent: "border-primary/50",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹8,499",
    period: "/month",
    description: "Unlimited scale for large orgs",
    features: [
      "Unlimited repositories",
      "All Pro features",
      "SSO & advanced RBAC",
      "Custom AI models",
      "SLA & dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    isHighlight: false,
    accent: "border-border",
  },
];

export default function BillingPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);
    Promise.all([
      fetchSubscription(orgId).catch(() => null),
      fetchUsageSummary(orgId).catch(() => null),
    ])
      .then(([sub, usageData]) => {
        setSubscription(sub);
        setUsage(usageData);
      })
      .finally(() => setIsFetching(false));
  }, [orgId]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId) => {
    if (planId === "enterprise") {
      window.open(
        "mailto:sales@flowops.io?subject=Enterprise Plan Inquiry",
        "_blank",
      );
      return;
    }
    setIsUpgrading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay. Check your internet connection.");
        return;
      }

      const data = await createCheckout({ plan: planId, orgId });

      const options = {
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: "FlowOps",
        description: `${data.planName} Plan – ${data.orgName}`,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              orgId,
              plan: planId,
            });
            // Refresh subscription data
            const sub = await fetchSubscription(orgId);
            setSubscription(sub);
            alert("🎉 Successfully upgraded to " + planId + "!");
          } catch (e) {
            alert("Payment verification failed: " + (e.response?.data?.error || e.message));
          }
        },
        prefill: {
          name: user?.username || "",
          email: user?.email || "",
        },
        theme: {
          color: "#0D9488",
        },
        modal: {
          ondismiss: () => setIsUpgrading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.")) return;
    try {
      await cancelPlan(orgId);
      const sub = await fetchSubscription(orgId);
      setSubscription(sub);
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    }
  };

  if (loading || !user) return null;

  const currentPlan = subscription?.plan || "free";

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Billing & Plans"
          description="Manage your subscription and upgrade to unlock more features."
        />

        {/* ── Current Subscription Card ── */}
        {isFetching ? (
          <Card className="mb-8 max-w-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          subscription && (
            <Card className="mb-8 max-w-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-teal-500" />
              <CardContent className="p-6 pt-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <CreditCard size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Current Plan
                      </p>
                      <div className="flex items-center gap-2.5 mt-1">
                        <p className="text-xl font-bold text-foreground capitalize">
                          {currentPlan}
                        </p>
                        <Badge
                          variant="success"
                          className="text-[10px] uppercase tracking-wider"
                        >
                          Active
                        </Badge>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Renews{" "}
                          {new Date(
                            subscription.currentPeriodEnd,
                          ).toLocaleDateString()}
                        </p>
                      )}
                      {subscription.cancelAtPeriodEnd && (
                        <p className="text-xs text-red-500 mt-1">
                          Cancels at end of billing period
                        </p>
                      )}
                    </div>
                  </div>
                  {currentPlan !== "free" && (
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* ── Usage Metering (Feature #2) ── */}
        {usage && (
          <Card className="mb-8 max-w-2xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-foreground mb-4">
                Current Period Usage
              </h3>
              <div className="space-y-4">
                {usage.features?.map((feat) => {
                  const pct = feat.limit === Infinity || feat.limit === "unlimited"
                    ? 0
                    : Math.min(100, Math.round((feat.used / feat.limit) * 100));
                  const isNearLimit = pct >= 80;
                  const isAtLimit = pct >= 100;

                  return (
                    <div key={feat.feature} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {feat.feature.replace(/_/g, " ")}
                        </span>
                        <span className={cn(
                          "font-medium",
                          isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-foreground"
                        )}>
                          {feat.used} / {feat.limit === "unlimited" ? "∞" : feat.limit}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {usage.periodEnd && (
                <p className="text-[10px] text-muted-foreground mt-3">
                  Resets {new Date(usage.periodEnd).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Pricing Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                  plan.accent,
                  plan.isHighlight && "shadow-glow-sm ring-1 ring-primary/30",
                )}
              >
                {/* Accent bar */}
                {plan.isHighlight && (
                  <div className="h-1 bg-gradient-to-r from-primary to-emerald-400" />
                )}
                {plan.isHighlight && (
                  <div className="absolute -top-0 right-4 top-3">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="mb-5">
                    <h3 className="font-bold text-foreground text-lg">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      {plan.period}
                    </span>
                  </div>
                  <div className="border-t border-border/60 pt-5 mb-6">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      What&apos;s included
                    </p>
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-sm text-muted-foreground"
                        >
                          <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={10} className="text-primary" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto">
                    {isCurrent ? (
                      <Button variant="secondary" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : plan.isHighlight ? (
                      <ShimmerButton
                        onClick={() => handleUpgrade(plan.id)}
                        className="w-full justify-center py-2.5"
                        disabled={isUpgrading}
                      >
                        <Sparkles size={14} className="mr-2" />
                        {isUpgrading ? "Redirecting…" : plan.cta}
                      </ShimmerButton>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isUpgrading}
                        className="w-full"
                      >
                        {isUpgrading ? "Redirecting…" : plan.cta}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
