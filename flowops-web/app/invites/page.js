"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  XCircle,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { fetchMyInvites, acceptInvite } from "../lib/api";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitesPage() {
  const { user, loading, setOrgId, setMode } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    fetchMyInvites()
      .then((data) => setInvites(data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  const handleAccept = async (invite) => {
    setAccepting(invite.token);
    try {
      const result = await acceptInvite(invite.token);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      // Switch to the org
      if (result.orgId) {
        setOrgId(result.orgId);
        setMode("org");
        router.push("/dashboard");
      }
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    } finally {
      setAccepting(null);
    }
  };

  if (loading || !user) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Pending Invites"
          subtitle="Organization invites waiting for your response"
          icon={Bell}
        />

        {fetching ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                All caught up!
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You don't have any pending invites. When someone invites you to
                their organization, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mt-6">
            {invites.map((invite) => (
              <Card key={invite.id} className="overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  {/* Org avatar */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {invite.organization?.avatarUrl ? (
                      <img
                        src={invite.organization.avatarUrl}
                        alt={invite.organization.name}
                        className="w-12 h-12 rounded-xl"
                      />
                    ) : (
                      <Users size={20} className="text-primary" />
                    )}
                  </div>

                  {/* Invite info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {invite.organization?.name || "Organization"}
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">
                        <Shield size={10} className="mr-1" />
                        {invite.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Invited by{" "}
                      <span className="font-medium">
                        {invite.invitedBy?.username || "someone"}
                      </span>
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                      <Clock size={10} />
                      Expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={accepting === invite.token}
                    className="gap-1.5 shrink-0"
                  >
                    {accepting === invite.token ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Joining…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Accept & Join
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
