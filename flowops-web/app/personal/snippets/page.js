"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, Copy, Heart, Plus, Search, Scissors, Star, Trash2, X } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchSnippets, createSnippet, updateSnippet, deleteSnippet, toggleSnippetFavorite } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C++", "Ruby", "Shell", "SQL", "HTML", "CSS", "Other"];

export default function SnippetsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [snippets, setSnippets] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [filterFav, setFilterFav] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", language: "JavaScript", code: "", tags: [] });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const load = () => {
    setFetching(true);
    const params = {};
    if (filterLang) params.language = filterLang;
    if (filterFav) params.favorite = "true";
    fetchSnippets(params)
      .then(setSnippets)
      .catch(() => {})
      .finally(() => setFetching(false));
  };

  useEffect(() => { if (user) load(); }, [user, filterLang, filterFav]);

  const filtered = search
    ? snippets.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : snippets;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await updateSnippet(editId, form);
      } else {
        await createSnippet(form);
      }
      setShowCreate(false);
      setEditId(null);
      setForm({ title: "", description: "", language: "JavaScript", code: "", tags: [] });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({ title: s.title, description: s.description || "", language: s.language, code: s.code, tags: s.tags || [] });
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this snippet?")) return;
    await deleteSnippet(id);
    load();
  };

  const handleFav = async (id) => {
    await toggleSnippetFavorite(id);
    load();
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
      setTagInput("");
    }
  };

  if (loading || !user) return null;

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <PageHeader title="Code Snippets" description="Save and organize your reusable code." badge={`${snippets.length}`} />
          <Button onClick={() => { setShowCreate(true); setEditId(null); setForm({ title: "", description: "", language: "JavaScript", code: "", tags: [] }); }} size="sm" className="mt-2">
            <Plus size={12} className="mr-1.5" /> New Snippet
          </Button>
        </div>

        {/* Create/Edit Modal */}
        {showCreate && (
          <Card className="mb-6 border-primary/30">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{editId ? "Edit Snippet" : "New Snippet"}</p>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setEditId(null); }}><X size={14} /></Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Textarea placeholder="Paste your code here..." value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                rows={8} className="font-mono text-xs" />
              <div className="flex gap-2">
                <Input placeholder="Add tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="max-w-[200px]" />
                <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
                {form.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs cursor-pointer" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>
                    {t} <X size={8} className="ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditId(null); }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !form.title || !form.code}>
                  {saving ? "Saving..." : editId ? "Update" : "Save Snippet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search snippets..." className="pl-9 h-9" />
          </div>
          <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}>
            <option value="">All Languages</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button size="sm" variant={filterFav ? "default" : "outline"} onClick={() => setFilterFav(!filterFav)}>
            <Star size={12} className="mr-1" /> Favorites
          </Button>
        </div>

        {/* Snippet List */}
        {fetching ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Scissors className="text-muted-foreground" size={24} />
            </div>
            <p className="font-semibold text-foreground mb-1">No snippets yet</p>
            <p className="text-sm text-muted-foreground">Save your first code snippet to build your personal library.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <Card key={s.id} className="overflow-hidden group">
                <CardContent className="p-0">
                  <div className="p-4 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">{s.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{s.language}</Badge>
                        {s.tags?.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleFav(s.id)}>
                        <Star size={12} className={s.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyCode(s.code, s.id)}>
                        <Copy size={12} className={copiedId === s.id ? "text-primary" : "text-muted-foreground"} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(s)}>
                        <Code2 size={12} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={12} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <pre className="px-4 pb-4 text-xs font-mono text-foreground bg-muted/30 overflow-x-auto max-h-48">
                    <code>{s.code}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PersonalLayout>
  );
}
