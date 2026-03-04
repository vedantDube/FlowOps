"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronRight } from "lucide-react";
import { fetchChangelog } from "@/app/lib/api";

export default function ChangelogModal() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    // Check if there are new entries since last viewed
    const lastViewed = localStorage.getItem("flowops_changelog_viewed");
    if (!lastViewed) {
      setHasNew(true);
    } else {
      // Check periodically
      const checkNew = async () => {
        try {
          const data = await fetchChangelog();
          if (data.length > 0) {
            const latest = new Date(data[0].publishedAt).getTime();
            if (latest > parseInt(lastViewed)) {
              setHasNew(true);
            }
          }
        } catch {
          /* silent */
        }
      };
      checkNew();
    }
  }, []);

  const openModal = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const data = await fetchChangelog();
      setEntries(data);
      localStorage.setItem("flowops_changelog_viewed", Date.now().toString());
      setHasNew(false);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const tagColors = {
    feature: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    fix: "bg-red-500/15 text-red-600 dark:text-red-400",
    improvement: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    launch: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    ai: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    billing: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    major: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors w-full"
      >
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent group-hover:bg-muted">
          <Sparkles size={14} strokeWidth={1.8} />
        </span>
        <span className="flex-1 text-left">What&apos;s New</span>
        {hasNew && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  What&apos;s New
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loading && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading changelog…
                </div>
              )}
              {!loading && entries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No changelog entries yet.
                </div>
              )}
              {entries.map((entry) => (
                <div key={entry.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {entry.version && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                        v{entry.version}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {entry.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {entry.body}
                  </p>
                  {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            tagColors[tag] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
