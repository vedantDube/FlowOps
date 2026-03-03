"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Plug,
  Users,
  Zap,
} from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/app/components/ThemeToggle";

/** @type {Array<{href: string, label: string, icon: import('lucide-react').LucideIcon, badge?: string}>} */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-review", label: "AI Code Review", icon: Zap, badge: "AI" },
  { href: "/autodocs", label: "AutoDocs AI", icon: FileText, badge: "AI" },
  { href: "/team", label: "Team Insights", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList },
];

export default function Layout({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-border/60 bg-card/80 backdrop-blur-sm">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
            }}
          >
            <Zap size={15} className="text-neutral-950" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground tracking-tight">
              FlowOps
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              Engineering Intelligence
            </p>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Navigation
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isActive
                      ? "bg-primary/15"
                      : "bg-transparent group-hover:bg-muted",
                  )}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator className="opacity-50" />

        {/* Theme toggle */}
        <div className="px-3 py-2.5">
          <ThemeToggle className="w-full" />
        </div>

        <Separator className="opacity-50" />

        {/* User footer */}
        {user && (
          <div className="px-3 py-4 space-y-3">
            <div className="flex items-center gap-3 px-2">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full ring-2 ring-border/50"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-950 text-xs font-bold shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
                  }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.username}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email || "GitHub User"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs"
              onClick={logout}
            >
              <LogOut size={12} />
              Sign out
            </Button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
