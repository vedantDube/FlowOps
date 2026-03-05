"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Key, Shield, Database, Palette, BarChart3, Bell,
  Plus, Trash2, Copy, Check, AlertTriangle, Download,
  Save, Eye, EyeOff, RefreshCw, Search, ToggleLeft, ToggleRight,
  ChevronRight, Info, Lock, Globe, Mail, FileText, Settings,
} from "lucide-react";

import Layout from "@/app/components/Layout";
import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";
import {
  fetchApiKeys, createApiKey, revokeApiKey,
  fetchReviewRules, createReviewRule, updateReviewRule, deleteReviewRule,
  exportOrgData, deleteOrgData, fetchRetentionPolicy, updateRetentionPolicy,
  fetchOrgBranding, updateOrgBranding,
  fetchUsageSummary, fetchUsageHistory,
  fetchNotificationPrefs, updateNotificationPrefs,
} from "@/app/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "review-rules", label: "Review Rules", icon: Shield },
  { id: "compliance", label: "Compliance", icon: Database },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "usage", label: "Usage Analytics", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   API KEYS TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function ApiKeysTab({ orgId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: "*", expiresInDays: "" });
  const [newKey, setNewKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchApiKeys(orgId).then(setKeys).catch(() => toast.error("Failed to load API keys")).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Key name is required");
    setCreating(true);
    try {
      const data = {
        name: form.name.trim(),
        scopes: form.scopes.split(",").map((s) => s.trim()).filter(Boolean),
        ...(form.expiresInDays && { expiresInDays: parseInt(form.expiresInDays) }),
      };
      const result = await createApiKey(orgId, data);
      setNewKey(result);
      setForm({ name: "", scopes: "*", expiresInDays: "" });
      setShowForm(false);
      load();
      toast.success("API key created successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId, keyName) => {
    if (!window.confirm(`Revoke API key "${keyName}"? This cannot be undone.`)) return;
    try {
      await revokeApiKey(orgId, keyId);
      setKeys((k) => k.filter((x) => x.id !== keyId));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const copyKey = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      {/* New key reveal */}
      {newKey && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">Copy your API key now</p>
                <p className="text-xs text-muted-foreground mb-3">This key will only be shown once. Store it securely.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-xs font-mono truncate">{newKey.key}</code>
                  <Button size="sm" variant="outline" onClick={() => copyKey(newKey.key, "new")} aria-label="Copy API key">
                    {copiedId === "new" ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)} aria-label="Dismiss">✕</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage programmatic access to the FlowOps API</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5" aria-label="Create new API key">
          <Plus size={14} /> New Key
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label htmlFor="key-name" className="text-xs font-medium text-foreground mb-1 block">Key Name *</label>
              <input id="key-name" type="text" placeholder="e.g. CI/CD Pipeline" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="key-scopes" className="text-xs font-medium text-foreground mb-1 block">Scopes</label>
                <input id="key-scopes" type="text" placeholder="* (all)" value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label htmlFor="key-expires" className="text-xs font-medium text-foreground mb-1 block">Expires (days)</label>
                <input id="key-expires" type="number" placeholder="Never" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create Key"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Key size={32} className="mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No API keys yet</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <Card key={k.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Key size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {k.keyPrefix}••• · Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.expiresAt && ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyKey(k.keyPrefix + "•••", k.id)} aria-label="Copy key prefix">
                    {copiedId === k.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRevoke(k.id, k.name)} aria-label={`Revoke key ${k.name}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REVIEW RULES TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function ReviewRulesTab({ orgId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", pattern: "", severity: "warning" });
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchReviewRules(orgId).then(setRules).catch(() => toast.error("Failed to load rules")).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.pattern.trim()) return toast.error("Name and pattern are required");
    setSaving(true);
    try {
      if (editId) {
        await updateReviewRule(orgId, editId, form);
        toast.success("Rule updated");
      } else {
        await createReviewRule(orgId, form);
        toast.success("Rule created");
      }
      setForm({ name: "", description: "", pattern: "", severity: "warning" });
      setShowForm(false);
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    try {
      await deleteReviewRule(orgId, ruleId);
      setRules((r) => r.filter((x) => x.id !== ruleId));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleToggle = async (rule) => {
    try {
      await updateReviewRule(orgId, rule.id, { enabled: !rule.enabled });
      setRules((r) => r.map((x) => x.id === rule.id ? { ...x, enabled: !x.enabled } : x));
      toast.success(rule.enabled ? "Rule disabled" : "Rule enabled");
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const startEdit = (rule) => {
    setForm({ name: rule.name, description: rule.description, pattern: rule.pattern, severity: rule.severity });
    setEditId(rule.id);
    setShowForm(true);
  };

  const severityColors = {
    error: "bg-red-500/15 text-red-500",
    warning: "bg-amber-500/15 text-amber-500",
    info: "bg-blue-500/15 text-blue-500",
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Custom AI Review Rules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define patterns the AI should flag during code reviews</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: "", description: "", pattern: "", severity: "warning" }); }} className="gap-1.5" aria-label="Add new rule">
          <Plus size={14} /> New Rule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label htmlFor="rule-name" className="text-xs font-medium text-foreground mb-1 block">Rule Name *</label>
              <input id="rule-name" type="text" placeholder="e.g. No console.log in production" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label htmlFor="rule-pattern" className="text-xs font-medium text-foreground mb-1 block">Pattern * <span className="text-muted-foreground font-normal">(regex or description)</span></label>
              <input id="rule-pattern" type="text" placeholder="e.g. console\.(log|debug|warn)" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label htmlFor="rule-desc" className="text-xs font-medium text-foreground mb-1 block">Description</label>
              <input id="rule-desc" type="text" placeholder="Why this rule matters" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label htmlFor="rule-severity" className="text-xs font-medium text-foreground mb-1 block">Severity</label>
              <select id="rule-severity" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="h-9 rounded-lg border border-input bg-card text-foreground px-3 text-sm">
                <option value="error" className="bg-card text-foreground">Error</option>
                <option value="warning" className="bg-card text-foreground">Warning</option>
                <option value="info" className="bg-card text-foreground">Info</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editId ? "Update Rule" : "Create Rule"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Shield size={32} className="mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">No custom rules defined yet</p><p className="text-xs text-muted-foreground mt-1">Rules let the AI flag specific patterns during code reviews</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className={cn(!rule.enabled && "opacity-60")}>
              <CardContent className="p-4 flex items-center gap-4">
                <button onClick={() => handleToggle(rule)} className="shrink-0" aria-label={`Toggle rule ${rule.name}`}>
                  {rule.enabled
                    ? <ToggleRight size={24} className="text-primary" />
                    : <ToggleLeft size={24} className="text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", severityColors[rule.severity] || severityColors.warning)}>
                      {rule.severity}
                    </span>
                  </div>
                  {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                  <code className="text-[11px] text-muted-foreground font-mono mt-1 block truncate">{rule.pattern}</code>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(rule)} aria-label={`Edit rule ${rule.name}`}>
                    <FileText size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(rule.id)} aria-label={`Delete rule ${rule.name}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPLIANCE TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function ComplianceTab({ orgId }) {
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [retentionDays, setRetentionDays] = useState(365);

  useEffect(() => {
    fetchRetentionPolicy(orgId)
      .then((r) => { setRetention(r); setRetentionDays(r.retentionDays || 365); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportOrgData(orgId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowops-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete !== "DELETE_ALL_DATA") return toast.error("Type DELETE_ALL_DATA to confirm");
    setDeleting(true);
    try {
      await deleteOrgData(orgId, { confirm: "DELETE_ALL_DATA" });
      toast.success("All organization data has been deleted");
      setConfirmDelete("");
    } catch {
      toast.error("Failed to delete data");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveRetention = async () => {
    setSaving(true);
    try {
      await updateRetentionPolicy(orgId, { retentionDays });
      toast.success("Retention policy updated");
    } catch {
      toast.error("Failed to update retention policy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Data Compliance & Privacy</h3>
        <p className="text-xs text-muted-foreground mt-0.5">GDPR compliance tools — export, delete, and manage data retention</p>
      </div>

      {/* Export */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Download size={18} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Export All Data</p>
              <p className="text-xs text-muted-foreground mt-1">Download a complete JSON export of all your organization data including repos, commits, PRs, reviews, docs, and audit logs.</p>
            </div>
            <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 shrink-0" aria-label="Export organization data">
              <Download size={14} />
              {exporting ? "Exporting…" : "Export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Data Retention Policy</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Set how long data is retained before automatic cleanup.</p>
              <div className="flex items-center gap-3">
                <label htmlFor="retention-days" className="sr-only">Retention days</label>
                <input id="retention-days" type="number" min={30} max={3650} value={retentionDays} onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)} className="w-24 h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <span className="text-sm text-muted-foreground">days</span>
                <Button size="sm" onClick={handleSaveRetention} disabled={saving} aria-label="Save retention policy">
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Delete All Data</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Permanently delete all organization data. This action is irreversible and removes all repos, commits, PRs, reviews, docs, and usage records.</p>
              <div className="flex items-center gap-3">
                <label htmlFor="confirm-delete" className="sr-only">Type DELETE_ALL_DATA to confirm</label>
                <input id="confirm-delete" type="text" placeholder='Type "DELETE_ALL_DATA" to confirm' value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className="flex-1 h-9 px-3 rounded-lg border border-destructive/30 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30" />
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting || confirmDelete !== "DELETE_ALL_DATA"} aria-label="Delete all data">
                  {deleting ? "Deleting…" : "Delete Everything"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BRANDING TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function BrandingTab({ orgId }) {
  const [branding, setBranding] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrgBranding(orgId)
      .then(setBranding)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrgBranding(orgId, branding);
      toast.success("Branding updated successfully");
    } catch {
      toast.error("Failed to update branding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Organization Branding</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Customize your org&apos;s appearance and white-label settings</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Company Name */}
          <div>
            <label htmlFor="brand-company" className="text-xs font-medium text-foreground mb-1.5 block">Company Name</label>
            <input id="brand-company" type="text" placeholder="Your Company" value={branding.companyName || ""} onChange={(e) => setBranding({ ...branding, companyName: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="brand-logo" className="text-xs font-medium text-foreground mb-1.5 block">Logo URL</label>
            <div className="flex items-center gap-3">
              <input id="brand-logo" type="text" placeholder="https://example.com/logo.png" value={branding.customLogo || ""} onChange={(e) => setBranding({ ...branding, customLogo: e.target.value })} className="flex-1 h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {branding.customLogo && (
                <img src={branding.customLogo} alt="Logo preview" className="h-9 w-9 object-contain rounded-lg border border-border" />
              )}
            </div>
          </div>

          {/* Primary Color */}
          <div>
            <label htmlFor="brand-color" className="text-xs font-medium text-foreground mb-1.5 block">Primary Color</label>
            <div className="flex items-center gap-3">
              <input id="brand-color" type="color" value={branding.primaryColor || "#4ADE80"} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="h-9 w-12 rounded-lg border border-input cursor-pointer" />
              <input type="text" placeholder="#4ADE80" value={branding.primaryColor || ""} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="w-32 h-9 px-3 rounded-lg border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="Primary color hex value" />
              <div className="h-9 px-4 rounded-lg flex items-center text-xs font-semibold text-white" style={{ backgroundColor: branding.primaryColor || "#4ADE80" }}>Preview</div>
            </div>
          </div>

          {/* Custom Domain */}
          <div>
            <label htmlFor="brand-domain" className="text-xs font-medium text-foreground mb-1.5 block">Custom Domain</label>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <input id="brand-domain" type="text" placeholder="flowops.yourcompany.com" value={branding.customDomain || ""} onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })} className="flex-1 h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1"><Info size={11} /> CNAME your domain to flowops-web.onrender.com</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5" aria-label="Save branding settings">
              <Save size={14} />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   USAGE ANALYTICS TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function UsageTab({ orgId }) {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchUsageSummary(orgId).catch(() => null),
      fetchUsageHistory(orgId).catch(() => []),
    ])
      .then(([s, h]) => { setSummary(s); setHistory(h); })
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  const usageItems = summary ? [
    { label: "AI Reviews", used: summary.usage.aiReviews.used, limit: summary.usage.aiReviews.limit, color: "text-purple-500", bg: "bg-purple-500" },
    { label: "Doc Generations", used: summary.usage.docGenerations.used, limit: summary.usage.docGenerations.limit, color: "text-blue-500", bg: "bg-blue-500" },
    { label: "API Calls", used: summary.usage.apiCalls.used, limit: summary.usage.apiCalls.limit, color: "text-amber-500", bg: "bg-amber-500" },
    { label: "Repositories", used: summary.usage.repos.used, limit: summary.usage.repos.limit, color: "text-emerald-500", bg: "bg-emerald-500" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Usage Analytics</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Current billing period{summary ? `: ${new Date(summary.periodStart).toLocaleDateString()} — ${new Date(summary.periodEnd).toLocaleDateString()}` : ""}
          {summary && <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{summary.plan}</span>}
        </p>
      </div>

      {/* Usage meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {usageItems.map((item) => {
          const pct = item.limit === -1 ? 0 : Math.min(100, (item.used / item.limit) * 100);
          const isUnlimited = item.limit === -1;
          return (
            <Card key={item.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className={cn("text-xs font-semibold", item.color)}>{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.used.toLocaleString()} / {isUnlimited ? "∞" : item.limit.toLocaleString()}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.label} usage`}>
                  <div className={cn("h-full rounded-full transition-all", item.bg, pct > 80 && "bg-destructive")} style={{ width: isUnlimited ? "5%" : `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <p className="text-sm font-semibold text-foreground">Monthly Usage History</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No usage data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Month</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">AI Reviews</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Docs</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">API Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.month} className="border-b border-border/50">
                      <td className="py-2 text-foreground font-medium">{row.month}</td>
                      <td className="py-2 text-right text-muted-foreground">{(row.ai_review || 0).toLocaleString()}</td>
                      <td className="py-2 text-right text-muted-foreground">{(row.doc_generation || 0).toLocaleString()}</td>
                      <td className="py-2 text-right text-muted-foreground">{(row.api_call || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
   ═══════════════════════════════════════════════════════════════════════════════ */

function NotificationsTab() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotificationPrefs()
      .then(setPrefs)
      .catch(() => setPrefs({ emailDigest: true, emailBilling: true, emailReview: false, emailWeekly: true }))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPrefs(prefs);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  const items = [
    { key: "emailDigest", label: "Daily Email Digest", desc: "Receive a daily summary of activity in your org", icon: Mail },
    { key: "emailWeekly", label: "Weekly Report", desc: "Weekly engineering health report delivered to your inbox", icon: FileText },
    { key: "emailReview", label: "Review Notifications", desc: "Get notified when AI reviews complete on your PRs", icon: Shield },
    { key: "emailBilling", label: "Billing Alerts", desc: "Receive billing and usage limit alerts", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Choose what notifications you receive</p>
      </div>

      <div className="space-y-2">
        {items.map(({ key, label, desc, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button onClick={() => toggle(key)} className="shrink-0" aria-label={`Toggle ${label}`} role="switch" aria-checked={prefs?.[key]}>
                {prefs?.[key]
                  ? <ToggleRight size={28} className="text-primary" />
                  : <ToggleLeft size={28} className="text-muted-foreground" />}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5" aria-label="Save notification preferences">
          <Save size={14} />
          {saving ? "Saving…" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("api-keys");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const renderTab = () => {
    switch (activeTab) {
      case "api-keys": return <ApiKeysTab orgId={orgId} />;
      case "review-rules": return <ReviewRulesTab orgId={orgId} />;
      case "compliance": return <ComplianceTab orgId={orgId} />;
      case "branding": return <BrandingTab orgId={orgId} />;
      case "usage": return <UsageTab orgId={orgId} />;
      case "notifications": return <NotificationsTab />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your organization settings, API access, and preferences</p>
            </div>
          </div>
        </div>

        {/* Tab bar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab sidebar */}
          <nav className="lg:w-52 shrink-0" aria-label="Settings navigation">
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap",
                    activeTab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  aria-current={activeTab === id ? "page" : undefined}
                >
                  <Icon size={15} strokeWidth={activeTab === id ? 2.2 : 1.5} />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">
            {renderTab()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
