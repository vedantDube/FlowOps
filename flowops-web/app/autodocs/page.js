"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Check,
  ChevronDown,
  Code,
  FileText,
  FolderGit2,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  deleteDoc,
  fetchDocs,
  fetchGithubRepos,
  fetchRepoContentFromGithub,
  fetchRepoTree,
  generateDoc,
} from "../lib/api";
import { cn } from "../lib/utils";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const DOC_TYPES = [
  {
    value: "readme",
    label: "README",
    icon: BookOpen,
    desc: "Comprehensive README.md",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    value: "api",
    label: "API Docs",
    icon: Code,
    desc: "Endpoint documentation",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "architecture",
    label: "Architecture",
    icon: Layers,
    desc: "System design overview",
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  },
  {
    value: "knowledge-base",
    label: "Knowledge Base",
    icon: Globe,
    desc: "Team knowledge article",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
];

const typeIcon = (type) => {
  const t = DOC_TYPES.find((d) => d.value === type);
  return t
    ? { Icon: t.icon, color: t.color }
    : { Icon: FileText, color: "text-muted-foreground" };
};

export default function AutoDocsPage() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "readme", title: "", context: "" });

  // ── GitHub repo fetch state ──
  const [sourceMode, setSourceMode] = useState("manual"); // 'manual' | 'github'
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoTree, setRepoTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [fetchingContent, setFetchingContent] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [emptyFileWarning, setEmptyFileWarning] = useState(false); // true when fetched files are empty

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!orgId) return;
    setIsFetching(true);
    fetchDocs({ orgId })
      .then((d) => setDocs(d.docs || []))
      .finally(() => setIsFetching(false));
  }, [orgId]);

  const handleGenerate = async () => {
    if (!form.context.trim()) return;
    setIsGenerating(true);
    try {
      const doc = await generateDoc({ ...form, organizationId: orgId });
      setDocs((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setShowForm(false);
      setForm({ type: "readme", title: "", context: "" });
    } catch (e) {
      toast.error("Generation failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    await deleteDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  // ── GitHub repo helpers ──
  const loadGithubRepos = async () => {
    setLoadingRepos(true);
    try {
      const repos = await fetchGithubRepos();
      setGithubRepos(repos);
    } catch (e) {
      toast.error("Failed to load repos: " + (e.response?.data?.error || e.message));
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setSelectedFiles(new Set());
    setRepoTree([]);
    setLoadingTree(true);
    try {
      const data = await fetchRepoTree({
        owner: repo.owner,
        repo: repo.name,
        branch: repo.defaultBranch,
      });
      setRepoTree(data.files || []);
    } catch (e) {
      toast.error(
        "Failed to load file tree: " + (e.response?.data?.error || e.message),
      );
    } finally {
      setLoadingTree(false);
    }
  };

  const toggleFile = (path) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAllFiles = () => {
    const filtered = filteredFiles;
    if (selectedFiles.size === filtered.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filtered.map((f) => f.path)));
    }
  };

  const handleFetchAndUseContent = async () => {
    if (!selectedRepo || selectedFiles.size === 0) return;
    setFetchingContent(true);
    setEmptyFileWarning(false);
    try {
      const data = await fetchRepoContentFromGithub({
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        branch: selectedRepo.defaultBranch,
        filePaths: Array.from(selectedFiles),
      });

      // Check if all fetched content is empty or unreadable
      const contextText = data.context?.trim() || "";
      const isContentEmpty =
        !contextText ||
        contextText
          .split("\n")
          .every(
            (line) =>
              line.startsWith("──") ||
              line.trim() === "" ||
              line.trim() === "[Could not read file]",
          );

      if (isContentEmpty) {
        setEmptyFileWarning(true);
        setForm((f) => ({
          ...f,
          context: "",
          title: f.title || `${selectedRepo.fullName} Documentation`,
        }));
        setSourceMode("manual");
        return;
      }

      setForm((f) => ({
        ...f,
        context: data.context,
        title: f.title || `${selectedRepo.fullName} Documentation`,
      }));
      // Switch to manual mode so user can see/edit the context and generate
      setSourceMode("manual");
    } catch (e) {
      toast.error(
        "Failed to fetch file contents: " +
          (e.response?.data?.error || e.message),
      );
    } finally {
      setFetchingContent(false);
    }
  };

  const handleGenerateGeneralReadme = async () => {
    if (!selectedRepo) return;
    setIsGenerating(true);
    setEmptyFileWarning(false);
    try {
      const generalContext = `Repository: ${selectedRepo.fullName}\nLanguage: ${selectedRepo.language || "Unknown"}\nDefault Branch: ${selectedRepo.defaultBranch}\n\nThis is a ${selectedRepo.language || ""} project hosted on GitHub. Generate a general README.md for this project based on the repository name, language, and standard best practices for ${selectedRepo.language || "software"} projects.`;
      const doc = await generateDoc({
        type: "readme",
        title: `${selectedRepo.fullName} - README`,
        context: generalContext,
        organizationId: orgId,
      });
      setDocs((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setShowForm(false);
      setForm({ type: "readme", title: "", context: "" });
    } catch (e) {
      toast.error("Generation failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredRepos = githubRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.language?.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  const filteredFiles = repoTree.filter((f) =>
    f.path.toLowerCase().includes(fileSearch.toLowerCase()),
  );

  if (loading || !user) return null;

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="AutoDocs AI"
          description="Generate living documentation from your codebase, APIs, and architecture."
          badge="AI"
          action={
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={14} /> Generate Doc
            </Button>
          }
        />

        {/* ── Generation Form ── */}
        {showForm && (
          <Card className="mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-violet-500" />
            <CardHeader className="p-5 pb-3 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  New Documentation
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {/* Doc type selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {DOC_TYPES.map(({ value, label, icon: Icon, desc, color }) => (
                  <button
                    key={value}
                    onClick={() => setForm((f) => ({ ...f, type: value }))}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all duration-200",
                      form.type === value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border mb-2",
                        form.type === value
                          ? color
                          : "bg-muted text-muted-foreground border-transparent",
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </button>
                ))}
              </div>

              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Document title (optional)"
                className="mb-3 h-10"
              />

              {/* Source mode toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSourceMode("manual")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    sourceMode === "manual"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  <Code size={14} />
                  Paste Context
                </button>
                <button
                  onClick={() => {
                    setSourceMode("github");
                    if (githubRepos.length === 0) loadGithubRepos();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    sourceMode === "github"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30",
                  )}
                >
                  <FolderGit2 size={14} />
                  Fetch from GitHub
                </button>
              </div>

              {/* Manual paste mode */}
              {sourceMode === "manual" && (
                <>
                  {/* Empty file warning */}
                  {emptyFileWarning && (
                    <div className="mb-4 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={14} className="text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            Selected files are empty
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The files you selected from{" "}
                            {selectedRepo?.fullName || "the repository"} have no
                            content. To generate docs for specific code, please
                            select files that contain code.
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <Button
                              size="sm"
                              onClick={handleGenerateGeneralReadme}
                              disabled={isGenerating}
                              className="h-8"
                            >
                              {isGenerating ? (
                                <>
                                  <RefreshCw
                                    size={12}
                                    className="mr-1.5 animate-spin"
                                  />{" "}
                                  Generating…
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} className="mr-1.5" />{" "}
                                  Generate General README Instead
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEmptyFileWarning(false);
                                setSourceMode("github");
                              }}
                              className="h-8"
                            >
                              Pick Different Files
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={form.context}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, context: e.target.value }));
                      if (emptyFileWarning && e.target.value.trim())
                        setEmptyFileWarning(false);
                    }}
                    placeholder="Paste your code, routes, architecture notes, or any context for the AI to generate from…"
                    rows={6}
                    className="mb-4 resize-none"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !form.context.trim()}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={14} className="mr-2 animate-spin" />{" "}
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="mr-2" /> Generate
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* GitHub fetch mode */}
              {sourceMode === "github" && (
                <div className="space-y-4">
                  {/* Repo selector */}
                  {!selectedRepo ? (
                    <div className="border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FolderGit2
                          size={14}
                          className="text-muted-foreground"
                        />
                        <p className="text-sm font-semibold text-foreground">
                          Select a Repository
                        </p>
                        {loadingRepos && (
                          <Loader2
                            size={14}
                            className="animate-spin text-muted-foreground"
                          />
                        )}
                      </div>
                      <div className="relative mb-3">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          placeholder="Search repositories…"
                          className="pl-9 h-9"
                        />
                      </div>
                      <div className="max-h-[240px] overflow-y-auto space-y-1">
                        {filteredRepos.map((repo) => (
                          <button
                            key={repo.id}
                            onClick={() => handleSelectRepo(repo)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FolderGit2
                                size={14}
                                className="text-muted-foreground shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {repo.fullName}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {repo.language || "Unknown"} ·{" "}
                                  {repo.defaultBranch}
                                  {repo.private && " · Private"}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              size={14}
                              className="text-muted-foreground opacity-0 group-hover:opacity-100 -rotate-90 transition-all"
                            />
                          </button>
                        ))}
                        {!loadingRepos && filteredRepos.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No repositories found
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Selected repo header */}
                      <div className="flex items-center justify-between border border-border rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderGit2 size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedRepo.fullName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedRepo.language || "Unknown"} ·{" "}
                              {selectedRepo.defaultBranch}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRepo(null);
                            setRepoTree([]);
                            setSelectedFiles(new Set());
                          }}
                        >
                          Change
                        </Button>
                      </div>

                      {/* File tree browser */}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                              value={fileSearch}
                              onChange={(e) => setFileSearch(e.target.value)}
                              placeholder="Filter files…"
                              className="pl-9 h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={selectAllFiles}
                              className="text-xs text-primary hover:underline whitespace-nowrap"
                            >
                              {selectedFiles.size === filteredFiles.length &&
                              filteredFiles.length > 0
                                ? "Deselect All"
                                : "Select All"}
                            </button>
                            <Badge variant="secondary" className="text-[10px]">
                              {selectedFiles.size} / {repoTree.length}
                            </Badge>
                          </div>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto">
                          {loadingTree && (
                            <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 size={14} className="animate-spin" />
                              <span className="text-sm">
                                Loading file tree…
                              </span>
                            </div>
                          )}
                          {!loadingTree && filteredFiles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">
                              No files found
                            </p>
                          )}
                          {!loadingTree &&
                            filteredFiles.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => toggleFile(file.path)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0",
                                  selectedFiles.has(file.path) &&
                                    "bg-primary/5",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    selectedFiles.has(file.path)
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30",
                                  )}
                                >
                                  {selectedFiles.has(file.path) && (
                                    <Check size={10} />
                                  )}
                                </div>
                                <FileText
                                  size={12}
                                  className="text-muted-foreground shrink-0"
                                />
                                <span className="text-sm text-foreground truncate">
                                  {file.path}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                  {(file.size / 1024).toFixed(1)}KB
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleFetchAndUseContent}
                          disabled={fetchingContent || selectedFiles.size === 0}
                        >
                          {fetchingContent ? (
                            <>
                              <Loader2
                                size={14}
                                className="mr-2 animate-spin"
                              />{" "}
                              Fetching files…
                            </>
                          ) : (
                            <>
                              <FolderGit2 size={14} className="mr-2" /> Fetch{" "}
                              {selectedFiles.size} file
                              {selectedFiles.size !== 1 ? "s" : ""} & Generate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Documents Split View ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar */}
          <Card className="lg:col-span-1 overflow-hidden flex flex-col">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-foreground">Documents</p>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {docs.length}
              </span>
            </CardHeader>
            <div className="overflow-y-auto max-h-[65vh] flex-1">
              {isFetching && (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isFetching && docs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                    <FileText size={20} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No documents yet</p>
                  <p className="text-xs mt-1">Generate your first doc above.</p>
                </div>
              )}
              {docs.map((doc) => {
                const { Icon, color } = typeIcon(doc.type);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "flex items-start gap-3 p-4 border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-all duration-150 group",
                      selectedDoc?.id === doc.id &&
                        "bg-primary/5 border-l-2 border-l-primary",
                    )}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                        color,
                      )}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                        {doc.type?.replace("-", " ")} · v{doc.version}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Document Preview */}
          <Card className="lg:col-span-3 overflow-hidden">
            {!selectedDoc ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <FileText size={24} className="opacity-30" />
                </div>
                <p className="font-semibold text-foreground mb-1">
                  Select a document
                </p>
                <p className="text-sm">
                  Choose a document from the sidebar to preview.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full max-h-[75vh]">
                <div className="p-6 pb-4 border-b border-border bg-muted/30 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const { Icon, color } = typeIcon(selectedDoc.type);
                        return (
                          <span
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border",
                              color,
                            )}
                          >
                            <Icon size={16} />
                          </span>
                        );
                      })()}
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {selectedDoc.title}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {selectedDoc.type?.replace("-", " ")} · Version{" "}
                          {selectedDoc.version} ·{" "}
                          {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        selectedDoc.status === "published"
                          ? "success"
                          : "secondary"
                      }
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {selectedDoc.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:text-muted-foreground prose-p:leading-relaxed prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted/60 prose-pre:border prose-pre:border-border prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground">
                    <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
