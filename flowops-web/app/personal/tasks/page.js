"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Circle, Clock, Flag, ListTodo, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchTasks, fetchTaskStats, createTask, updateTask, deleteTask } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["todo", "in-progress", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUS_ICONS = { todo: Circle, "in-progress": Clock, done: CheckCircle2 };
const STATUS_COLORS = { todo: "text-muted-foreground", "in-progress": "text-blue-500", done: "text-emerald-500" };
const PRIORITY_COLORS = { low: "bg-slate-500/10 text-slate-500", medium: "bg-blue-500/10 text-blue-500", high: "bg-amber-500/10 text-amber-500", urgent: "bg-red-500/10 text-red-500" };

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", repoFullName: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);

  const load = async () => {
    setFetching(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const [t, s] = await Promise.all([fetchTasks(params), fetchTaskStats()]);
      setTasks(t);
      setStats(s);
    } catch (e) { console.error(e); }
    setFetching(false);
  };

  useEffect(() => { if (user) load(); }, [user, filterStatus, filterPriority]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.dueDate) delete data.dueDate;
      if (!data.repoFullName) delete data.repoFullName;
      if (editId) { await updateTask(editId, data); }
      else { await createTask(data); }
      setShowCreate(false);
      setEditId(null);
      setForm({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", repoFullName: "" });
      load();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setForm({ title: t.title, description: t.description || "", priority: t.priority, status: t.status, dueDate: t.dueDate?.split("T")[0] || "", repoFullName: t.repoFullName || "" });
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    await deleteTask(id);
    load();
  };

  const cycleStatus = async (t) => {
    const next = { todo: "in-progress", "in-progress": "done", done: "todo" };
    await updateTask(t.id, { status: next[t.status] });
    load();
  };

  if (loading || !user) return null;

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <PageHeader title="Task Tracker" description="Track your personal development tasks." badge={stats ? `${stats.total}` : "0"} />
          <Button onClick={() => { setShowCreate(true); setEditId(null); setForm({ title: "", description: "", priority: "medium", status: "todo", dueDate: "", repoFullName: "" }); }} size="sm" className="mt-2">
            <Plus size={12} className="mr-1.5" /> New Task
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "To Do", value: stats.todo, color: "text-muted-foreground" },
              { label: "In Progress", value: stats.inProgress, color: "text-blue-500" },
              { label: "Done", value: stats.done, color: "text-emerald-500" },
              { label: "Overdue", value: stats.overdue, color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit */}
        {showCreate && (
          <Card className="mb-6 border-primary/30">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <p className="text-sm font-semibold">{editId ? "Edit Task" : "New Task"}</p>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setEditId(null); }}><X size={14} /></Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                <Input placeholder="repo (user/repo)" value={form.repoFullName} onChange={(e) => setForm({ ...form, repoFullName: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditId(null); }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !form.title}>{saving ? "Saving..." : editId ? "Update" : "Create Task"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {/* Task List */}
        {fetching ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <ListTodo className="text-muted-foreground" size={24} />
            </div>
            <p className="font-semibold text-foreground mb-1">No tasks yet</p>
            <p className="text-sm text-muted-foreground">Create your first task to start tracking your work.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const StatusIcon = STATUS_ICONS[t.status] || Circle;
              const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";
              return (
                <Card key={t.id} className={`group transition-colors ${overdue ? "border-red-500/30" : ""}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <button onClick={() => cycleStatus(t)} className="shrink-0">
                      <StatusIcon size={18} className={STATUS_COLORS[t.status]} />
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(t)}>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                        <Badge className={`text-[9px] ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                        {t.repoFullName && <Badge variant="outline" className="text-[9px]">{t.repoFullName}</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.dueDate && (
                        <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          <Calendar size={10} /> {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(t.id)}>
                        <Trash2 size={12} className="text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PersonalLayout>
  );
}
