"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Plug,
  Search,
  Trophy,
  Users,
  Zap,
  X,
  Command,
} from "lucide-react";

const COMMANDS = [
  { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, href: "/dashboard", keywords: ["home", "overview"] },
  { id: "ai-review", label: "AI Code Review", icon: Zap, href: "/ai-review", keywords: ["review", "ai", "code"] },
  { id: "autodocs", label: "AutoDocs AI", icon: FileText, href: "/autodocs", keywords: ["docs", "documentation", "generate"] },
  { id: "team", label: "Team Insights", icon: Users, href: "/team", keywords: ["team", "members", "contributors"] },
  { id: "integrations", label: "Integrations", icon: Plug, href: "/integrations", keywords: ["github", "slack", "jira", "connect"] },
  { id: "billing", label: "Billing & Plans", icon: CreditCard, href: "/billing", keywords: ["billing", "plan", "subscribe", "upgrade"] },
  { id: "audit", label: "Audit Logs", icon: ClipboardList, href: "/audit", keywords: ["audit", "logs", "activity"] },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, href: "/dashboard", keywords: ["leaderboard", "gamification", "badges", "ranking"] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  const filtered = query
    ? COMMANDS.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : COMMANDS;

  // Reset selection when query changes
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Keyboard shortcut to open (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [open]);

  const runCommand = useCallback(
    (cmd) => {
      setOpen(false);
      router.push(cmd.href);
    },
    [router]
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && filtered[selected]) {
      runCommand(filtered[selected]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No results found.
            </p>
          )}
          {filtered.map((cmd, idx) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => runCommand(cmd)}
                onMouseEnter={() => setSelected(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  idx === selected
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1 text-left">{cmd.label}</span>
                {idx === selected && (
                  <span className="text-[10px] text-muted-foreground">
                    ↵ Enter
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command size={10} />K to toggle
          </span>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
        </div>
      </div>
    </div>
  );
}
