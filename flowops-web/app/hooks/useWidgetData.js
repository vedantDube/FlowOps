"use client";

import { useEffect, useState } from "react";
import { WIDGET_REGISTRY } from "../lib/dashboard-widgets";

/**
 * Owns the fetch/loading lifecycle for a single dashboard widget, keyed off
 * its registry entry. Centralizes the fetch->state->loading chain that was
 * previously hand-rolled per metric on dashboard/page.js, dora/page.js, and
 * personal/metrics/page.js.
 */
export function useWidgetData(widget, { orgId, days }) {
  const entry = WIDGET_REGISTRY[widget.metricKey];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entry || !orgId) return;
    setLoading(true);
    setError(null);

    const params = {
      orgId,
      days: widget.config?.days ?? days,
      repoId: widget.config?.repoId,
    };

    const request =
      entry.callShape === "positional"
        ? entry.fetch(orgId, { days: params.days })
        : entry.fetch(params);

    request
      .then((res) => setData(entry.unwrap ? entry.unwrap(res) : res))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [entry, orgId, days, widget.config?.days, widget.config?.repoId]);

  return { entry, data, loading, error };
}
