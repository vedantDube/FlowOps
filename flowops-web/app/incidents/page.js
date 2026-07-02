"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Siren, Plus, X, CheckCircle2 } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { createIncident, fetchIncidents, updateIncident, fetchOrgRepos } from "../lib/api";
import { cn } from "../lib/utils";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";

const SEVERITY_VARIANT = { low: "secondary", medium: "warning", high: "warning", critical: "destructive" };
const STATUS_VARIANT = { open: "destructive", investigating: "warning", resolved: "success" };

function mttrLabel(incident) {
  if (!incident.resolvedAt) return null;
  const hours = (new Date(incident.resolvedAt) - new Date(incident.detectedAt)) / 3_600_000;
  return `${hours.toFixed(1)}h to resolve`;
}

export default function IncidentsPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [repos, setRepos] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", repositoryId: "" });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const load = () => {
    if (!orgId) return;
    setIsFetching(true);
    fetchIncidents(orgId)
      .then(setIncidents)
      .catch(() => toast.error("Failed to load incidents"))
      .finally(() => setIsFetching(false));
  };

  useEffect(() => {
    if (!orgId) return;
    load();
    fetchOrgRepos(orgId).then(setRepos).catch(() => setRepos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleReport = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      await createIncident(orgId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        severity: form.severity,
        repositoryId: form.repositoryId || undefined,
      });
      toast.success("Incident reported");
      setModalOpen(false);
      setForm({ title: "", description: "", severity: "medium", repositoryId: "" });
      load();
    } catch (e) {
      toast.error("Failed to report incident: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (incident) => {
    try {
      await updateIncident(orgId, incident.id, { status: "resolved" });
      toast.success("Incident resolved");
      load();
    } catch (e) {
      toast.error("Failed to resolve: " + (e.response?.data?.error || e.message));
    }
  };

  if (loading || !user) return <PageLoading />;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Incidents"
          description="Track production incidents to power change-failure-rate and MTTR on the DORA Metrics page."
          badge="Beta"
          action={
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus size={14} /> Report Incident
            </Button>
          }
        />

        <Card className="overflow-hidden">
          {isFetching ? (
            <div className="p-5 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={Siren}
              title="No incidents reported"
              description="Report a production incident to start tracking change failure rate and mean time to restore."
              cta={{ label: "Report Incident", onClick: () => setModalOpen(true) }}
              className="py-16"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium">Severity</th>
                    <th className="text-left px-5 py-3 font-medium">Title</th>
                    <th className="text-left px-5 py-3 font-medium">Repository</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Detected</th>
                    <th className="text-right px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Badge variant={SEVERITY_VARIANT[incident.severity] || "secondary"} className="capitalize">
                          {incident.severity}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{incident.title}</p>
                        {incident.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{incident.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {incident.repository?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className={cn("inline-flex items-center gap-1.5")}>
                          <Badge variant={STATUS_VARIANT[incident.status] || "secondary"} className="capitalize">
                            {incident.status}
                          </Badge>
                          {mttrLabel(incident) && (
                            <span className="text-[11px] text-muted-foreground">{mttrLabel(incident)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs tabular-nums">
                        {new Date(incident.detectedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {incident.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 text-xs"
                            onClick={() => handleResolve(incident)}
                          >
                            <CheckCircle2 size={12} /> Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Report Incident modal ── */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Siren size={14} className="text-destructive" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Report Incident</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Checkout API returning 500s"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What happened, impact, root cause if known..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Severity</label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={form.severity}
                      onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Repository (optional)</label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={form.repositoryId}
                      onChange={(e) => setForm((f) => ({ ...f, repositoryId: e.target.value }))}
                    >
                      <option value="">None</option>
                      {repos.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleReport} disabled={saving}>
                  {saving ? "Reporting..." : "Report Incident"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
