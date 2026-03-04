"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Users, Zap, AlertTriangle, LogIn } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { acceptInvite } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function InviteAcceptPage() {
  const { token } = useParams();
  const { user, loading, setOrgId, setMode } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState("idle"); // idle | accepting | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // If not logged in, redirect to login with return URL
  useEffect(() => {
    if (!loading && !user) {
      const returnUrl = `/invite/${token}`;
      localStorage.setItem("flowops_invite_return", returnUrl);
      router.push("/login");
    }
  }, [user, loading, router, token]);

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const data = await acceptInvite(token);
      setResult(data);
      setStatus("success");
      // Auto-switch to the org they just joined
      if (data.orgId) {
        setTimeout(() => {
          setOrgId(data.orgId);
          setMode("org");
          router.push("/dashboard");
        }, 2000);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <LogIn size={24} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground">
              You need to sign in with GitHub before you can accept this invite.
            </p>
            <Button onClick={() => router.push("/login")} className="gap-2">
              <LogIn size={14} />
              Sign in with GitHub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header gradient bar */}
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #4ADE80, #0D9488)" }} />

        <CardContent className="p-8 space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)" }}
            >
              <Zap size={16} className="text-neutral-950" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">FlowOps</span>
          </div>

          {status === "idle" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Users size={28} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">You've been invited!</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Someone has invited you to join their organization on FlowOps.
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {user.avatarUrl && (
                    <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <p className="text-sm font-semibold text-foreground">{user.username}</p>
                </div>
              </div>
              <Button onClick={handleAccept} size="lg" className="w-full gap-2">
                <Users size={16} />
                Accept & Join Organization
              </Button>
            </div>
          )}

          {status === "accepting" && (
            <div className="text-center space-y-3 py-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Joining organization…</p>
            </div>
          )}

          {status === "success" && result && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">You're in!</h1>
                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
              </div>
              <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
