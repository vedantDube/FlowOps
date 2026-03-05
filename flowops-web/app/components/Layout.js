"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchMyInvites } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/app/components/ThemeToggle";
import CommandPalette from "@/app/components/CommandPalette";
import FlowOpsLogo from "@/app/components/FlowOpsLogo";
import ChangelogModal from "@/app/components/ChangelogModal";
import OrgSwitcher from "@/app/components/OrgSwitcher";
import NotificationBell from "@/app/components/NotificationBell";

/** @type {Array<{href: string, label: string, icon: import('lucide-react').LucideIcon, badge?: string}>} */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-review", label: "AI Code Review", icon: Zap, badge: "AI" },
  { href: "/autodocs", label: "AutoDocs AI", icon: FileText, badge: "AI" },
  { href: "/team", label: "Team Insights", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

/* ── Sidebar content (shared between desktop & mobile) ── */
function SidebarContent({ pathname, user, logout, onNavClick, onSwitchPersonal, pendingInviteCount }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5">
        <FlowOpsLogo subtitle="Engineering Intelligence" />
      </div>

      <Separator className="opacity-50" />

      {/* Org Switcher (Feature #10) */}
      <OrgSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Sidebar navigation">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
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
              {isActive && <span className="w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Pending invite notifications */}
      {pendingInviteCount > 0 && (
        <div className="px-3 py-1">
          <Link
            href="/invites"
            onClick={onNavClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/15 transition-all"
          >
            <Bell size={14} />
            <span className="flex-1">{pendingInviteCount} Pending Invite{pendingInviteCount !== 1 ? 's' : ''}</span>
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingInviteCount}
            </span>
          </Link>
        </div>
      )}

      {/* Switch to Personal mode */}
      <div className="px-3 py-1">
        <button
          onClick={onSwitchPersonal}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <User size={14} />
          Switch to Personal
        </button>
      </div>

      {/* What's New / Changelog (Feature #19) */}
      <div className="px-3 py-1">
        <ChangelogModal />
      </div>

      {/* Keyboard shortcut hint (Feature #17) */}
      <div className="px-5 py-1">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Ctrl+K</kbd> for commands
        </p>
      </div>

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
            aria-label="Sign out"
          >
            <LogOut size={12} />
            Sign out
          </Button>
        </div>
      )}
    </>
  );
}

export default function Layout({ children }) {
  const pathname = usePathname();
  const { user, logout, setMode } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  // Fetch pending invites for the sidebar badge
  useEffect(() => {
    if (!user) return;
    fetchMyInvites()
      .then((invites) => setPendingInviteCount(invites.length))
      .catch(() => {});
  }, [user]);

  // Handle invite return URL after login
  useEffect(() => {
    const returnUrl = localStorage.getItem("flowops_invite_return");
    if (returnUrl && user) {
      localStorage.removeItem("flowops_invite_return");
      router.push(returnUrl);
    }
  }, [user, router]);

  const switchToPersonal = () => {
    setMode("personal");
    router.push("/personal/dashboard");
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Skip to content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      {/* Command Palette (Feature #17) */}
      <CommandPalette />
      {/* ── Mobile top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border/60 bg-card/95 backdrop-blur-sm lg:hidden">
        <FlowOpsLogo size={32} />
        <div className="flex items-center gap-2">
          <NotificationBell />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[260px] flex flex-col border-r border-border/60 bg-card transform transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <SidebarContent
          pathname={pathname}
          user={user}
          logout={logout}
          onNavClick={() => setMobileOpen(false)}
          onSwitchPersonal={switchToPersonal}
          pendingInviteCount={pendingInviteCount}
        />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 h-screen" aria-label="Main navigation">
        <SidebarContent
          pathname={pathname}
          user={user}
          logout={logout}
          onNavClick={() => {}}
          onSwitchPersonal={switchToPersonal}
          pendingInviteCount={pendingInviteCount}
        />
      </aside>

      {/* ── Main content ── */}
      <main id="main-content" className="flex-1 overflow-auto bg-background pt-14 lg:pt-0" role="main">
        {/* Desktop notification bell (top-right) */}
        <div className="hidden lg:flex justify-end items-center px-6 py-2">
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
