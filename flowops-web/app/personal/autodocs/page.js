"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  BookOpen, Check, ChevronDown, Code, FileText, FolderGit2, Globe, Layers,
  Loader2, Plus, Search, Sparkles, Trash2,
} from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchGithubRepos, fetchRepoTree, fetchRepoContentFromGithub, generateDoc } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const DOC_TYPES = [
  { value: "readme", label: "README", icon: BookOpen, desc: "Comprehensive README.md", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "api", label: "API Docs", icon: Code, desc: "Endpoint documentation", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "architecture", label: "Architecture", icon: Layers, desc: "System design overview", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  { value: "knowledge-base", label: "Knowledge Base", icon: Globe, desc: "General knowledge article", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
];

const typeIcon = (type) => {
  const t = DOC_TYPES.find((d) => d.value === type);
  return t ? { Icon: t.icon, color: t.color } : { Icon: FileText, color: "text-muted-foreground" };
};

export default function PersonalAutoDocsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "readme", title: "", context: "" });

  // GitHub
  const [sourceMode, setSourceMode] = useState("manual");
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoTree, setRepoTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [fetchingContent, setFetchingContent] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);

  const handleGenerate = async () => {
    if (!form.context.trim()) return;
    setIsGenerating(true);
    try {
      const doc = await generateDoc({ ...form }); // no orgId for personal
      setDocs((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setShowForm(false);
      setForm({ type: "readme", title: "", context: "" });
    } catch (e) { alert("Generation failed: " + (e.response?.data?.error || e.message)); }
    finally { setIsGenerating(false); }
  };

  const loadGithubRepos = async () => {
    setLoadingRepos(true);
    try { setGithubRepos(await fetchGithubRepos()); }
    catch (e) { console.error(e); }
    finally { setLoadingRepos(false); }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setSelectedFiles(new Set());
    setRepoTree([]);
    setLoadingTree(true);
    try {
      const data = await fetchRepoTree({ owner: repo.owner, repo: repo.name, branch: repo.defaultBranch });
      setRepoTree(data.files || []);
    } catch (e) { console.error(e); }
    finally { setLoadingTree(false); }
  };

  const toggleFile = (path) => {
    setSelectedFiles((prev) => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
  };

  const selectAllFiles = () => {
    const f = filteredFiles;
    setSelectedFiles(selectedFiles.size === f.length ? new Set() : new Set(f.map((x) => x.path)));
  };

  const handleFetchAndUse = async () => {
    if (!selectedRepo || selectedFiles.size === 0) return;
    setFetchingContent(true);
    try {
      const data = await fetchRepoContentFromGithub({
        owner: selectedRepo.owner, repo: selectedRepo.name,
        branch: selectedRepo.defaultBranch, filePaths: Array.from(selectedFiles),
      });
      const codeContext = (data.files || []).map((f) => `── ${f.path} ──\n${f.content}`).join("\n\n");
      setForm((prev) => ({ ...prev, context: prev.context ? prev.context + "\n\n" + codeContext : codeContext, title: prev.title || `${selectedRepo.name} Documentation` }));
      setSourceMode("manual");
    } catch (e) { alert("Failed: " + (e.response?.data?.error || e.message)); }
    finally { setFetchingContent(false); }
  };

  const filteredRepos = githubRepos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) || r.language?.toLowerCase().includes(repoSearch.toLowerCase()));
  const filteredFiles = repoTree.filter((f) => f.path.toLowerCase().includes(fileSearch.toLowerCase()));

  if (loading || !user) return null;

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader title="AutoDocs AI" description="Generate documentation from your personal repositories." badge="AI" />

        {/* Generate Card */}
        {!showForm ? (
          <Card className="mb-6 overflow-hidden cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setShowForm(true); if (githubRepos.length === 0) loadGithubRepos(); }}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Plus size={16} className="text-primary" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Generate New Documentation</p>
                <p className="text-xs text-muted-foreground">Create a README, API reference, architecture doc or knowledge article.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-primary/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-teal-500 to-violet-500" />
            <CardContent className="p-5 pt-6 space-y-4">
              {/* Doc type selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOC_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  return (
                    <button key={dt.value} onClick={() => setForm({ ...form, type: dt.value })}
                      className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm transition-all", form.type === dt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                      <Icon size={14} className={form.type === dt.value ? "text-primary" : "text-muted-foreground"} />
                      <div className="text-left">
                        <p className="font-medium text-foreground text-xs">{dt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{dt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Input placeholder="Document title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              {/* Source toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => setSourceMode("manual")}
                  className={cn("text-xs px-3 py-1.5 rounded-lg border font-medium transition-all", sourceMode === "manual" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                  Paste Code
                </button>
                <button onClick={() => { setSourceMode("github"); if (githubRepos.length === 0) loadGithubRepos(); }}
                  className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all", sourceMode === "github" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                  <FolderGit2 size={12} /> From GitHub
                </button>
              </div>

              {sourceMode === "manual" ? (
                <Textarea placeholder="Paste your code, describe the project, or add context…" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={10} className="font-mono text-xs" />
              ) : (
                <div className="space-y-3">
                  {!selectedRepo ? (
                    <div className="border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FolderGit2 size={14} className="text-muted-foreground" />
                        <p className="text-sm font-semibold">Select Repository</p>
                        {loadingRepos && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                      </div>
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)} placeholder="Search…" className="pl-9 h-9" />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {filteredRepos.map((repo) => (
                          <button key={repo.id} onClick={() => handleSelectRepo(repo)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3 min-w-0">
                              <FolderGit2 size={14} className="text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{repo.fullName}</p>
                                <p className="text-[11px] text-muted-foreground">{repo.language || "Unknown"}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border border-border rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FolderGit2 size={14} className="text-primary" /></div>
                          <p className="text-sm font-semibold text-foreground">{selectedRepo.fullName}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedRepo(null); setRepoTree([]); setSelectedFiles(new Set()); }}>Change</Button>
                      </div>
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} placeholder="Filter files…" className="pl-9 h-8 text-sm" />
                          </div>
                          <button onClick={selectAllFiles} className="text-xs text-primary hover:underline whitespace-nowrap">
                            {selectedFiles.size === filteredFiles.length && filteredFiles.length > 0 ? "Deselect All" : "Select All"}
                          </button>
                          <Badge variant="secondary" className="text-[10px]">{selectedFiles.size}</Badge>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {loadingTree && <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" /><span className="text-sm">Loading…</span></div>}
                          {!loadingTree && filteredFiles.map((file) => (
                            <button key={file.path} onClick={() => toggleFile(file.path)}
                              className={cn("w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0", selectedFiles.has(file.path) && "bg-primary/5")}>
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", selectedFiles.has(file.path) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>
                                {selectedFiles.has(file.path) && <Check size={10} />}
                              </div>
                              <FileText size={12} className="text-muted-foreground shrink-0" />
                              <span className="text-sm text-foreground truncate">{file.path}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled={fetchingContent || selectedFiles.size === 0} onClick={handleFetchAndUse}>
                        {fetchingContent ? <><Loader2 size={12} className="mr-1.5 animate-spin" /> Fetching…</> : <>Use {selectedFiles.size} files as context</>}
                      </Button>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleGenerate} disabled={isGenerating || !form.context.trim()}>
                  {isGenerating ? <><Loader2 size={12} className="mr-1.5 animate-spin" /> Generating…</> : <><Sparkles size={12} className="mr-1.5" /> Generate</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Docs grid + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 overflow-hidden flex flex-col">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-foreground">Generated Docs</p>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{docs.length}</span>
            </CardHeader>
            <div className="overflow-y-auto max-h-[60vh] flex-1">
              {docs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-3"><BookOpen size={20} className="opacity-40" /></div>
                  <p className="text-sm font-medium">No docs yet</p>
                  <p className="text-xs mt-1">Generate your first document above.</p>
                </div>
              )}
              {docs.map((d) => {
                const { Icon, color } = typeIcon(d.type);
                return (
                  <button key={d.id} onClick={() => setSelectedDoc(d)}
                    className={cn("w-full text-left p-4 border-b border-border/60 hover:bg-muted/40 transition-all duration-150", selectedDoc?.id === d.id && "bg-primary/5 border-l-2 border-l-primary")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", color)}><Icon size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.title || "Untitled"}</p>
                        <p className="text-[11px] text-muted-foreground">{d.type} · {new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="lg:col-span-3">
            {!selectedDoc ? (
              <Card className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4"><BookOpen size={24} className="opacity-30" /></div>
                <p className="font-semibold text-foreground mb-1">Select a document</p>
                <p className="text-sm">Choose a doc from the list to preview its content.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedDoc.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{selectedDoc.type} · {new Date(selectedDoc.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-6 overflow-y-auto max-h-[60vh] prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{selectedDoc.content || "No content."}</ReactMarkdown>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PersonalLayout>
  );
}
