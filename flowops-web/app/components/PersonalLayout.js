"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award, BookOpen, CheckSquare, Code2, FileText, Flame, LayoutDashboard,
  LogOut, Menu, Scissors, User, X, Zap, Building2,
} from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/app/components/ThemeToggle";
import FlowOpsLogo from "@/app/components/FlowOpsLogo";

const PERSONAL_NAV = [
  { href: "/personal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personal/metrics", label: "Metrics & Streaks", icon: Flame },
  { href: "/personal/ai-review", label: "AI Code Review", icon: Zap, badge: "AI" },
  { href: "/personal/autodocs", label: "AutoDocs AI", icon: FileText, badge: "AI" },
  { href: "/personal/profile", label: "My Profile", icon: User },
  { href: "/personal/achievements", label: "Achievements", icon: Award },
  { href: "/personal/snippets", label: "Code Snippets", icon: Scissors },
  { href: "/personal/tasks", label: "Task Tracker", icon: CheckSquare },
];

function SidebarContent({ pathname, user, logout, mode, setMode, onNavClick }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5">
        <FlowOpsLogo subtitle="Personal Mode" />
      </div>

      <Separator className="opacity-50" />

      {/* Mode Switcher */}
      <div className="px-3 py-3">
        <div className="flex bg-muted/60 rounded-lg p-0.5">
          <button
            onClick={() => { setMode("personal"); onNavClick(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
              mode === "personal" ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User size={12} /> Personal
          </button>
          <button
            onClick={() => {
              setMode("org");
              window.location.href = "/dashboard";
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
              mode === "org" ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 size={12} /> Organization
          </button>
        </div>
      </div>

      <Separator className="opacity-50" />

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Personal</p>
        {PERSONAL_NAV.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}>
              <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-muted")}>
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">{badge}</span>
              )}
              {isActive && <span className="w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />
      <div className="px-3 py-2.5"><ThemeToggle className="w-full" /></div>
      <Separator className="opacity-50" />

      {user && (
        <div className="px-3 py-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full ring-2 ring-border/50" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-950 text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)" }}>
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email || "GitHub User"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs" onClick={logout}>
            <LogOut size={12} />Sign out
          </Button>
        </div>
      )}
    </>
  );
}

export default function PersonalLayout({ children }) {
  const pathname = usePathname();
  const { user, mode, logout, setMode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border/60 bg-card/95 backdrop-blur-sm lg:hidden">
        <FlowOpsLogo size={32} />
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors" aria-label="Toggle menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col border-r border-border/60 bg-card transform transition-transform duration-300 ease-in-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <SidebarContent pathname={pathname} user={user} logout={logout} mode={mode} setMode={setMode} onNavClick={() => setMobileOpen(false)} />
      </aside>

      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 h-screen">
        <SidebarContent pathname={pathname} user={user} logout={logout} mode={mode} setMode={setMode} onNavClick={() => {}} />
      </aside>

      <main className="flex-1 overflow-auto bg-background pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
