"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { LayoutGrid, Save } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import {
  fetchDashboardLayouts,
  createDashboardLayout,
  updateDashboardLayout,
  deleteDashboardLayout,
} from "../../lib/api";
import { WIDGET_REGISTRY, createWidget } from "../../lib/dashboard-widgets";
import Layout from "../../components/Layout";
import PageHeader from "../../components/PageHeader";
import WidgetRenderer from "../../components/dashboard-widgets/WidgetRenderer";
import LayoutSwitcher from "../../components/dashboard-widgets/LayoutSwitcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";

const STARTER_WIDGET_KEYS = ["pr-cycle-time", "review-latency", "commit-activity", "top-contributors"];

export default function CustomDashboard() {
  const { user, orgId, loading } = useAuth();
  const router = useRouter();

  const [layouts, setLayouts] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [days] = useState(14);

  const role = useMemo(
    () => user?.memberships?.find((m) => m.organizationId === orgId)?.role,
    [user, orgId],
  );
  const isAdmin = role === "admin" || role === "owner";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadLayouts = useCallback(() => {
    if (!orgId) return;
    setIsFetching(true);
    fetchDashboardLayouts(orgId)
      .then((data) => {
        setLayouts(data);
        const mine = data.filter((l) => l.userId);
        const shared = data.find((l) => l.userId === null);
        const preferred = mine.find((l) => l.isDefault) || mine[0] || shared;
        if (preferred) {
          setActiveLayoutId(preferred.id);
          setWidgets(preferred.widgets || []);
        } else {
          setActiveLayoutId(null);
          setWidgets(STARTER_WIDGET_KEYS.map((key, i) => createWidget(key, i)));
        }
        setDirty(false);
      })
      .finally(() => setIsFetching(false));
  }, [orgId]);

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  const activeLayout = layouts.find((l) => l.id === activeLayoutId);

  const handleSelectLayout = (id) => {
    const layout = layouts.find((l) => l.id === id);
    if (!layout) return;
    setActiveLayoutId(id);
    setWidgets(layout.widgets || []);
    setDirty(false);
  };

  const handleCreateLayout = async (name) => {
    const layout = await createDashboardLayout(orgId, {
      name,
      widgets: STARTER_WIDGET_KEYS.map((key, i) => createWidget(key, i)),
    });
    setLayouts((prev) => [...prev, layout]);
    setActiveLayoutId(layout.id);
    setWidgets(layout.widgets);
    setDirty(false);
  };

  const handleRenameLayout = async (id, name) => {
    const updated = await updateDashboardLayout(id, { name });
    setLayouts((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleDeleteLayout = async (id) => {
    await deleteDashboardLayout(id);
    const remaining = layouts.filter((l) => l.id !== id);
    setLayouts(remaining);
    if (remaining[0]) {
      setActiveLayoutId(remaining[0].id);
      setWidgets(remaining[0].widgets || []);
    } else {
      setActiveLayoutId(null);
      setWidgets([]);
    }
    setDirty(false);
  };

  const handleSaveAsTeam = async () => {
    const existingShared = layouts.find((l) => l.userId === null);
    if (existingShared) {
      const updated = await updateDashboardLayout(existingShared.id, { widgets, name: existingShared.name });
      setLayouts((prev) => prev.map((l) => (l.id === existingShared.id ? updated : l)));
      setActiveLayoutId(updated.id);
    } else {
      const layout = await createDashboardLayout(orgId, {
        name: "Team Dashboard",
        widgets,
        shared: true,
      });
      setLayouts((prev) => [...prev, layout]);
      setActiveLayoutId(layout.id);
    }
    setDirty(false);
  };

  const handleAddWidget = (metricKey) => {
    setWidgets((prev) => [...prev, createWidget(metricKey, prev.length)]);
    setDirty(true);
  };

  const handleRemoveWidget = (id) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, order: i })));
    setDirty(true);
  };

  const handleToggleSpan = (id) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, span: w.span === 2 ? 1 : 2 } : w)),
    );
    setDirty(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((w, i) => ({ ...w, order: i }));
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!activeLayoutId) {
      const layout = await createDashboardLayout(orgId, { name: "My Dashboard", widgets });
      setLayouts((prev) => [...prev, layout]);
      setActiveLayoutId(layout.id);
    } else {
      setSaving(true);
      try {
        const updated = await updateDashboardLayout(activeLayoutId, { widgets });
        setLayouts((prev) => prev.map((l) => (l.id === activeLayoutId ? updated : l)));
      } finally {
        setSaving(false);
      }
    }
    setDirty(false);
  };

  if (loading || !user) return <PageLoading />;

  const availableWidgetKeys = Object.keys(WIDGET_REGISTRY).filter(
    (key) => !widgets.some((w) => w.metricKey === key),
  );

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Custom Dashboard"
          description="Build your own view — add, arrange, and resize the metrics that matter to you."
          badge="Beta"
          action={
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              <Save size={14} /> {saving ? "Saving…" : "Save Layout"}
            </Button>
          }
        />

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          {isFetching ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <LayoutSwitcher
              layouts={layouts}
              activeLayoutId={activeLayoutId}
              onSelect={handleSelectLayout}
              onCreate={handleCreateLayout}
              onRename={handleRenameLayout}
              onDelete={handleDeleteLayout}
              onSaveAsTeam={handleSaveAsTeam}
              isAdmin={isAdmin}
            />
          )}

          {!isFetching && availableWidgetKeys.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && handleAddWidget(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
            >
              <option value="">+ Add widget…</option>
              {availableWidgetKeys.map((key) => (
                <option key={key} value={key}>
                  {WIDGET_REGISTRY[key].title}
                </option>
              ))}
            </select>
          )}
        </div>

        {isFetching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : widgets.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No widgets yet"
            description="Add a widget from the dropdown above to start building your dashboard."
            className="py-20"
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {widgets.map((widget) => (
                  <WidgetRenderer
                    key={widget.id}
                    widget={widget}
                    orgId={orgId}
                    days={days}
                    onRemove={handleRemoveWidget}
                    onToggleSpan={handleToggleSpan}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Layout>
  );
}
