"use client";

import { Plus, Pencil, Trash2, Users as TeamIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dropdown + actions for choosing/creating/renaming/deleting dashboard layouts.
 * `isAdmin` gates the "Save as Team Dashboard" action for the org-wide
 * (userId: null) shared layout — mirrors role-gating used elsewhere in the app.
 */
export default function LayoutSwitcher({
  layouts,
  activeLayoutId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onSaveAsTeam,
  isAdmin,
}) {
  const activeLayout = layouts.find((l) => l.id === activeLayoutId);

  const handleCreate = () => {
    const name = window.prompt("Name for the new layout:", "My Dashboard");
    if (name && name.trim()) onCreate(name.trim());
  };

  const handleRename = () => {
    const name = window.prompt("Rename layout:", activeLayout?.name || "");
    if (name && name.trim()) onRename(activeLayoutId, name.trim());
  };

  const handleDelete = () => {
    if (!activeLayout) return;
    if (window.confirm(`Delete "${activeLayout.name}"? This cannot be undone.`)) {
      onDelete(activeLayoutId);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={activeLayoutId || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
      >
        {layouts.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
            {l.userId === null ? " (Team)" : ""}
          </option>
        ))}
      </select>

      {activeLayout?.userId === null && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          <TeamIcon size={10} /> Team
        </span>
      )}

      <Button size="sm" variant="secondary" onClick={handleCreate}>
        <Plus size={14} /> New
      </Button>

      {activeLayout && (activeLayout.userId === null ? isAdmin : true) && (
        <Button size="sm" variant="ghost" onClick={handleRename}>
          <Pencil size={14} /> Rename
        </Button>
      )}

      {activeLayout && (activeLayout.userId === null ? isAdmin : true) && layouts.length > 1 && (
        <Button size="sm" variant="ghost" onClick={handleDelete}>
          <Trash2 size={14} /> Delete
        </Button>
      )}

      {isAdmin && activeLayout?.userId !== null && (
        <Button size="sm" variant="ghost" onClick={onSaveAsTeam}>
          <TeamIcon size={14} /> Save as Team Dashboard
        </Button>
      )}
    </div>
  );
}
