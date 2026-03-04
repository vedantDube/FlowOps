"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Heart,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  Eye,
  GitBranch,
  Video,
  ExternalLink,
  Mail,
  Send,
  Copy,
  Link2,
  UserPlus,
  XCircle,
  ChevronDown,
  Calendar,
  Clock,
  X,
  Trash2,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  fetchSprintHealth,
  generateSprintHealth,
  fetchOrgRepos,
  fetchRepoContributors,
  deleteSprintHealth,
  fetchOrgMembers,
  updateMemberRole,
  createOrgInvite,
  fetchOrgInvites,
  cancelOrgInvite,
} from "../lib/api";
import { cn } from "../lib/utils";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const INSIGHT_STYLES = {
  positive: {
    border: "border-emerald-500/20 bg-emerald-500/5",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  warning: {
    border: "border-amber-500/20 bg-amber-500/5",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
  critical: {
    border: "border-red-500/20 bg-red-500/5",
    icon: AlertTriangle,
    iconClass: "text-red-500",
  },
};

const burnoutVariant = (r) =>
  r === "low" ? "success" : r === "medium" ? "warning" : "destructive";
const healthColor = (s) => (s >= 80 ? "green" : s >= 60 ? "yellow" : "red");

/* ── Custom chart tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{ color: p.color }}
          className="flex items-center gap-1.5"
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function TeamPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [sprints, setSprints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Repo contributors state
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);

  // RBAC members state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  // Invite state
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  // Meet scheduling state
  const [meetModalOpen, setMeetModalOpen] = useState(false);
  const [meetTarget, setMeetTarget] = useState(null);
  const [meetForm, setMeetForm] = useState({ date: "", time: "", topic: "" });
  const [selectedForMeet, setSelectedForMeet] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);
    fetchSprintHealth(orgId)
      .then((data) => {
        setSprints(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setIsFetching(false));
    // Also fetch repos for the contributor section
    fetchOrgRepos(orgId)
      .then((r) => setRepos(r))
      .catch(() => {});
    // Fetch org members for RBAC panel
    setLoadingMembers(true);
    fetchOrgMembers(orgId)
      .then((m) => setMembers(m))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
    // Fetch pending invites
    setLoadingInvites(true);
    fetchOrgInvites(orgId)
      .then((inv) => setInvites(inv))
      .catch(() => {})
      .finally(() => setLoadingInvites(false));
  }, [orgId]);

  // Fetch contributors when a repo is selected
  useEffect(() => {
    if (!orgId || !selectedRepo) return;
    setLoadingContribs(true);
    setContributors([]);
    fetchRepoContributors(orgId, selectedRepo.id)
      .then((c) => setContributors(c))
      .catch(() => setContributors([]))
      .finally(() => setLoadingContribs(false));
  }, [orgId, selectedRepo]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const sprint = await generateSprintHealth(orgId, {
        sprintName: `Sprint ${new Date().toLocaleDateString()}`,
      });
      setSprints((prev) => [sprint, ...prev]);
      setSelected(sprint);
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const openScheduleMeet = (contributor) => {
    setMeetTarget(contributor);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMeetForm({
      date: tomorrow.toISOString().split("T")[0],
      time: "10:00",
      topic: `Code discussion – ${selectedRepo?.name || "repo"}`,
    });
    setSelectedForMeet([contributor.login]);
    setMeetModalOpen(true);
  };

  const openGroupMeet = () => {
    setMeetTarget(null);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMeetForm({
      date: tomorrow.toISOString().split("T")[0],
      time: "10:00",
      topic: `Code review – ${selectedRepo?.name || "repo"}`,
    });
    setSelectedForMeet(contributors.map((c) => c.login));
    setMeetModalOpen(true);
  };

  const toggleMeetParticipant = (login) => {
    setSelectedForMeet((prev) =>
      prev.includes(login) ? prev.filter((l) => l !== login) : [...prev, login],
    );
  };

  const handleScheduleMeet = () => {
    const { date, time, topic } = meetForm;
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min
    const fmt = (d) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const emails = selectedForMeet
      .map((login) => {
        const c = contributors.find((x) => x.login === login);
        return c?.email || null;
      })
      .filter(Boolean);
    const names = selectedForMeet.join(", ");
    const details = `Participants: ${names}\nRepo: ${selectedRepo?.fullName || ""}`;
    let calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(topic)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(details)}`;
    if (emails.length > 0) {
      calUrl += `&add=${encodeURIComponent(emails.join(","))}`;
    }
    window.open(calUrl, "_blank");
    setMeetModalOpen(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const invite = await createOrgInvite(orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInvites((prev) => [invite, ...prev]);
      setInviteEmail("");
      setInviteRole("member");
    } catch (e) {
      alert("Failed to send invite: " + (e.response?.data?.error || e.message));
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await cancelOrgInvite(orgId, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      await updateMemberRole(orgId, userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user.id === userId ? { ...m, role: newRole } : m))
      );
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || e.message));
    } finally {
      setUpdatingRole(null);
    }
  };

  const ROLE_META = {
    owner: { icon: Crown, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Owner" },
    admin: { icon: ShieldCheck, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Admin" },
    member: { icon: UserCog, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Member" },
    viewer: { icon: Eye, color: "text-muted-foreground bg-muted/60 border-border", label: "Viewer" },
  };

  // Find current user's role
  const myMembership = members.find((m) => m.user.id === user.id);
  const myRole = myMembership?.role || "viewer";
  const canManageRoles = myRole === "owner" || myRole === "admin";

  if (loading || !user) return null;

  const healthChartData = [...sprints].reverse().map((s) => ({
    name: s.sprintName,
    score: s.healthScore,
    delivery: s.deliveryPredictability,
  }));

  const primary = "hsl(var(--primary))";
  const grid = "hsl(var(--border))";
  const muted = "hsl(var(--muted-foreground))";
  const axisProps = {
    stroke: "transparent",
    tick: { fontSize: 10, fill: muted },
    tickLine: false,
    axisLine: false,
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Team Insights"
          description="Sprint health scores, burnout detection, and delivery predictability."
          badge="AI"
          action={
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Sprint Health
                </>
              )}
            </Button>
          }
        />

        {/* ── Repo Contributors & Schedule Meet ── */}
        <Card className="overflow-hidden mb-6">
          <CardHeader className="p-4 sm:p-5 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <GitBranch size={13} className="text-indigo-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Repo Contributors
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  View people involved & schedule a meet
                </p>
              </div>
            </div>

            {/* Repo selector dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setRepoDropdownOpen((v) => !v)}
              >
                <GitBranch size={12} />
                {selectedRepo ? selectedRepo.name : "Select Repository"}
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform",
                    repoDropdownOpen && "rotate-180",
                  )}
                />
              </Button>
              {repoDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-64 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
                  {repos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No repos connected
                    </div>
                  ) : (
                    repos.map((r) => (
                      <button
                        key={r.id}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2",
                          selectedRepo?.id === r.id &&
                            "bg-primary/5 text-primary",
                        )}
                        onClick={() => {
                          setSelectedRepo(r);
                          setRepoDropdownOpen(false);
                        }}
                      >
                        <GitBranch
                          size={12}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{r.fullName}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-4">
            {/* No repo selected */}
            {!selectedRepo && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <GitBranch size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Select a repository
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Choose a connected repo to see who contributes and schedule
                  code discussions.
                </p>
              </div>
            )}

            {/* Loading contributors */}
            {selectedRepo && loadingContribs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contributors list */}
            {selectedRepo && !loadingContribs && contributors.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-muted-foreground">
                    {contributors.length} contributor
                    {contributors.length !== 1 ? "s" : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-xs"
                    onClick={openGroupMeet}
                  >
                    <Video size={12} /> Schedule Team Meet
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {contributors.map((c) => (
                    <div
                      key={c.login}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
                    >
                      <img
                        src={c.avatarUrl}
                        alt={c.login}
                        className="w-10 h-10 rounded-full ring-2 ring-border group-hover:ring-primary/30 transition-all"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.login}
                          </p>
                          <a
                            href={c.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink size={10} />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.contributions} contribution
                          {c.contributions !== 1 ? "s" : ""}
                          {c.email ? ` · ${c.email}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs shrink-0"
                        onClick={() => openScheduleMeet(c)}
                      >
                        <Video size={12} /> Meet
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {selectedRepo && !loadingContribs && contributors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users
                  size={20}
                  className="text-muted-foreground mb-2 opacity-40"
                />
                <p className="text-sm text-muted-foreground">
                  No contributors found for this repo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── RBAC: Team Members & Roles ── */}
        <Card className="overflow-hidden mb-6">
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Shield size={13} className="text-blue-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Team Members & Roles</p>
                <p className="text-[11px] text-muted-foreground">Manage who can do what in your organization</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {/* Role legend */}
            <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-3">
              {Object.entries(ROLE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon size={12} className={meta.color.split(" ")[0]} />
                    <span className="font-medium">{meta.label}</span>
                    <span>–</span>
                    <span>
                      {key === "owner" && "Full control, billing, danger zone"}
                      {key === "admin" && "Manage repos, members, integrations"}
                      {key === "member" && "View & contribute, trigger reviews"}
                      {key === "viewer" && "Read-only access to dashboards"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Members list */}
            {loadingMembers ? (
              <div className="px-4 sm:px-5 pb-4 space-y-2">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users size={20} className="text-muted-foreground mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No members found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {members
                  .sort((a, b) => {
                    const order = { owner: 0, admin: 1, member: 2, viewer: 3 };
                    return (order[a.role] ?? 4) - (order[b.role] ?? 4);
                  })
                  .map((m) => {
                    const meta = ROLE_META[m.role] || ROLE_META.viewer;
                    const RoleIcon = meta.icon;
                    const isMe = m.user.id === user.id;
                    const isOwner = m.role === "owner";
                    return (
                      <div key={m.user.id} className="flex items-center gap-4 px-4 sm:px-5 py-3 hover:bg-muted/30 transition-colors">
                        {/* Avatar */}
                        {m.user.avatarUrl ? (
                          <img src={m.user.avatarUrl} alt={m.user.username} className="w-9 h-9 rounded-full ring-2 ring-border/50 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                            {m.user.username?.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{m.user.username}</p>
                            {isMe && <Badge variant="outline" className="text-[9px] py-0">You</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{m.user.email || "No email"}</p>
                        </div>

                        {/* Role badge + dropdown */}
                        <div className="flex items-center gap-2">
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", meta.color)}>
                            <RoleIcon size={12} />
                            {meta.label}
                          </div>

                          {/* Role changer - only for admins/owners, can't change own role or demote owners */}
                          {canManageRoles && !isMe && !isOwner && (
                            <select
                              value={m.role}
                              disabled={updatingRole === m.user.id}
                              onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs cursor-pointer disabled:opacity-50"
                            >
                              {myRole === "owner" && <option value="admin">Admin</option>}
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Invite Members ── */}
        {canManageRoles && (
          <Card className="overflow-hidden mb-6">
            <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <UserPlus size={13} className="text-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Invite Members</p>
                  <p className="text-[11px] text-muted-foreground">Send invite links to add people to your org</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {/* Invite form */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="flex-1 relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="GitHub username or email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="h-9 gap-1.5"
                >
                  <Send size={13} />
                  {sendingInvite ? "Sending…" : "Send Invite"}
                </Button>
              </div>

              {/* Pending invites */}
              {loadingInvites ? (
                <div className="space-y-2">
                  {[1,2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : invites.filter((i) => i.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Mail size={18} className="text-muted-foreground mb-1.5 opacity-40" />
                  <p className="text-xs text-muted-foreground">No pending invites. Send one above!</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Pending Invites</p>
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                    {invites
                      .filter((i) => i.status === "pending")
                      .map((invite) => (
                        <div key={invite.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                            <Mail size={13} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Invited as <span className="font-medium">{invite.role}</span>
                              {invite.invitedBy && <> by {invite.invitedBy.username}</>}
                              {" · expires "}
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyInviteLink(invite.token)}
                              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                              title="Copy invite link"
                            >
                              {copiedLink === invite.token ? (
                                <CheckCircle2 size={13} className="text-emerald-500" />
                              ) : (
                                <Link2 size={13} className="text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelInvite(invite.id)}
                              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
                              title="Cancel invite"
                            >
                              <XCircle size={13} className="text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Loading ── */}
        {isFetching && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-xl" />
                <CardContent className="p-5 pt-6 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {!isFetching && sprints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Users size={24} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              No sprint health data yet
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click &quot;Generate Sprint Health&quot; to analyze your current
              team metrics with AI.
            </p>
          </div>
        )}

        {selected && (
          <>
            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Health Score"
                value={`${selected.healthScore}/100`}
                icon={<Heart size={16} />}
                color={healthColor(selected.healthScore)}
                trend={
                  selected.healthScore >= 80
                    ? 8
                    : selected.healthScore >= 60
                      ? -3
                      : -15
                }
                trendLabel="vs last sprint"
              />
              <MetricCard
                title="Delivery Predictability"
                value={`${selected.deliveryPredictability}%`}
                icon={<TrendingUp size={16} />}
                color="teal"
                trend={4}
                trendLabel="on target"
              />
              <MetricCard
                title="Burnout Risk"
                value={selected.burnoutRisk.toUpperCase()}
                icon={<AlertTriangle size={16} />}
                color={healthColor(
                  selected.burnoutRisk === "low"
                    ? 100
                    : selected.burnoutRisk === "medium"
                      ? 60
                      : 0,
                )}
                subtitle={`${selected.commitFrequency.toFixed(1)} commits/day`}
              />
              <MetricCard
                title="Open PRs"
                value={selected.openPRs}
                icon={<Users size={16} />}
                color="purple"
                subtitle={`${selected.mergedPRs} merged`}
              />
            </div>

            {/* ── Charts + Insights Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {sprints.length > 1 && (
                <Card className="overflow-hidden">
                  <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Sprint Health Trend
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Historical performance
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary" />{" "}
                        Health
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />{" "}
                        Delivery
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={healthChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={grid}
                            vertical={false}
                          />
                          <XAxis dataKey="name" {...axisProps} />
                          <YAxis domain={[0, 100]} {...axisProps} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke={primary}
                            strokeWidth={2.5}
                            dot={{
                              r: 4,
                              fill: primary,
                              strokeWidth: 2,
                              stroke: "hsl(var(--background))",
                            }}
                            name="Health"
                          />
                          <Line
                            type="monotone"
                            dataKey="delivery"
                            stroke="hsl(160 60% 45%)"
                            strokeWidth={2.5}
                            dot={{
                              r: 4,
                              fill: "hsl(160 60% 45%)",
                              strokeWidth: 2,
                              stroke: "hsl(var(--background))",
                            }}
                            name="Delivery %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles size={13} className="text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        AI Insights
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Generated recommendations
                      </p>
                    </div>
                  </div>
                  {selected.insights?.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {selected.insights.length}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-5 pt-4">
                  {selected.insights?.length > 0 ? (
                    <div className="space-y-3">
                      {selected.insights.map((ins, i) => {
                        const style =
                          INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.positive;
                        const Icon = style.icon;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-xl p-4 border",
                              style.border,
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                  style.border,
                                )}
                              >
                                <Icon size={13} className={style.iconClass} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {ins.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {ins.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        No insights generated for this sprint.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Sprint History Table ── */}
            {sprints.length > 1 && (
              <Card className="overflow-hidden">
                <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Sprint History
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sprints.length} sprint{sprints.length !== 1 ? "s" : ""}{" "}
                      analyzed
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                          <th className="text-left px-5 py-3 font-medium">
                            Sprint
                          </th>
                          <th className="text-left px-5 py-3 font-medium">
                            Health
                          </th>
                          <th className="text-left px-5 py-3 font-medium">
                            Delivery
                          </th>
                          <th className="text-left px-5 py-3 font-medium">
                            Burnout
                          </th>
                          <th className="text-left px-5 py-3 font-medium">
                            PR Cycle
                          </th>
                          <th className="text-left px-5 py-3 font-medium">
                            Date
                          </th>
                          <th className="text-right px-5 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sprints.map((s) => (
                          <tr
                            key={s.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/40 transition-colors",
                              selected?.id === s.id && "bg-primary/5",
                            )}
                            onClick={() => setSelected(s)}
                          >
                            <td className="px-5 py-3.5 font-medium text-foreground">
                              {s.sprintName}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={
                                  s.healthScore >= 80
                                    ? "success"
                                    : s.healthScore >= 60
                                      ? "warning"
                                      : "destructive"
                                }
                              >
                                {s.healthScore}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-teal-500 rounded-full"
                                    style={{
                                      width: `${s.deliveryPredictability}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {s.deliveryPredictability}%
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={burnoutVariant(s.burnoutRisk)}
                                className="capitalize text-[10px]"
                              >
                                {s.burnoutRisk}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                              {s.prCycleAvgHours}h
                            </td>
                            <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                              {new Date(s.generatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!confirm("Delete this sprint record?"))
                                    return;
                                  deleteSprintHealth(orgId, s.id)
                                    .then(() => {
                                      setSprints((prev) =>
                                        prev.filter((x) => x.id !== s.id),
                                      );
                                      if (selected?.id === s.id) {
                                        const remaining = sprints.filter(
                                          (x) => x.id !== s.id,
                                        );
                                        setSelected(
                                          remaining.length > 0
                                            ? remaining[0]
                                            : null,
                                        );
                                      }
                                    })
                                    .catch(() => alert("Failed to delete"));
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Delete sprint"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── Schedule Meet Modal ── */}
        {meetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMeetModalOpen(false)}
            />
            <div className="relative bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Video size={14} className="text-emerald-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Schedule Google Meet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meetTarget
                        ? `With ${meetTarget.login}`
                        : `Team discussion`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMeetModalOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Topic */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Topic
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={meetForm.topic}
                    onChange={(e) =>
                      setMeetForm((f) => ({ ...f, topic: e.target.value }))
                    }
                    placeholder="What to discuss..."
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Calendar size={10} /> Date
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={meetForm.date}
                      onChange={(e) =>
                        setMeetForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Clock size={10} /> Time
                    </label>
                    <input
                      type="time"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={meetForm.time}
                      onChange={(e) =>
                        setMeetForm((f) => ({ ...f, time: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Participants
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {contributors.map((c) => (
                      <button
                        key={c.login}
                        onClick={() => toggleMeetParticipant(c.login)}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
                          selectedForMeet.includes(c.login)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/20",
                        )}
                      >
                        <img
                          src={c.avatarUrl}
                          alt={c.login}
                          className="w-4 h-4 rounded-full"
                        />
                        {c.login}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMeetModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={
                    selectedForMeet.length === 0 ||
                    !meetForm.date ||
                    !meetForm.time
                  }
                  onClick={handleScheduleMeet}
                >
                  <Video size={12} /> Open in Google Calendar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
