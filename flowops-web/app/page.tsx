"use client";

import { useEffect, type ReactNode, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart2,
  ChevronRight,
  FileText,
  Github,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { useInView } from "./hooks/useInView";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import ThemeToggle from "@/app/components/ThemeToggle";

/* ─── Scroll animation wrapper ───────────────────────────────────────────── */

type AnimVariant =
  | "fade-up"
  | "blur-in"
  | "scale-in"
  | "slide-left"
  | "slide-right";

const VARIANT_CLASS: Record<AnimVariant, string> = {
  "fade-up": "animate-on-scroll",
  "blur-in": "animate-blur-in",
  "scale-in": "animate-scale-in",
  "slide-left": "animate-slide-left",
  "slide-right": "animate-slide-right",
};

function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  className = "",
  threshold = 0.15,
}: {
  children: ReactNode;
  variant?: AnimVariant;
  delay?: number;
  className?: string;
  threshold?: number;
}) {
  const [ref, isVisible] = useInView<HTMLDivElement>({ threshold });
  return (
    <div
      ref={ref}
      className={`${VARIANT_CLASS[variant]} ${isVisible ? "is-visible" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: BarChart2,
    title: "Engineering Metrics",
    desc: "Commit velocity, PR cycle time, code churn, and contributor leaderboards — all in one live dashboard.",
    accent: "#4ADE80",
  },
  {
    icon: Zap,
    title: "AI Code Review",
    desc: "Gemini-powered security scanning, anti-pattern detection, and refactor suggestions on every PR.",
    accent: "#2DD4BF",
  },
  {
    icon: FileText,
    title: "AutoDocs AI",
    desc: "Generate and maintain living READMEs, API docs, and architecture guides always in sync with your code.",
    accent: "#818CF8",
  },
  {
    icon: Users,
    title: "Team Health",
    desc: "Sprint health scores, burnout risk detection, delivery predictability, and weekly AI digest for leads.",
    accent: "#FB923C",
  },
  {
    icon: Shield,
    title: "Audit Logs",
    desc: "Full tamper-proof audit trail of every AI action, code review, and config change across your org.",
    accent: "#F472B6",
  },
  {
    icon: Github,
    title: "GitHub Native",
    desc: "One-click OAuth setup. No agents, no config files. Works with any repo, any size, any team.",
    accent: "#A3E635",
  },
];

const STATS = [
  { value: "< 2 min", label: "Time to first insight" },
  { value: "4-in-1", label: "Tools consolidated" },
  { value: "Gemini", label: "AI backbone" },
  { value: "100%", label: "GitHub native" },
];

const STEPS = [
  {
    step: "01",
    title: "Connect GitHub",
    desc: "One-click OAuth. FlowOps reads your repos, PRs, and commit history securely via the GitHub API.",
    color: "#4ADE80",
  },
  {
    step: "02",
    title: "Get instant insights",
    desc: "Dashboard populates with live metrics, AI code reviews, and team health scores in under 2 minutes.",
    color: "#2DD4BF",
  },
  {
    step: "03",
    title: "Ship smarter",
    desc: "Use AI-generated docs, review suggestions, and team alerts to catch problems before they ship.",
    color: "#818CF8",
  },
];



/* ─── Component ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, loading } = useAuth() as any;
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const handleGitHub = () => {
    window.location.href = `${apiUrl}/auth/github`;
  };

  return (
    <div className="min-h-screen font-sans bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 transition-shadow group-hover:shadow-primary/40"
              style={{
                background:
                  "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
              }}
            >
              <Zap size={15} color="#09090B" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-foreground text-base tracking-tight">
              FlowOps
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </a>

          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ShimmerButton
              onClick={handleGitHub}
              className="text-sm px-5 py-2.5"
            >
              <Github size={14} className="mr-1.5" />
              Sign in with GitHub
            </ShimmerButton>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 sm:pt-32 pb-20 text-center overflow-hidden">
        {/* Background effects */}
        <DotPattern className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,black,transparent)]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(74,222,128,0.12) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-10 left-1/4 w-72 h-72 rounded-full pointer-events-none blur-3xl"
          style={{ background: "rgba(74,222,128,0.06)" }}
        />
        <div
          className="absolute top-20 right-1/4 w-72 h-72 rounded-full pointer-events-none blur-3xl"
          style={{ background: "rgba(45,212,191,0.05)" }}
        />

        <div className="relative z-10">
          {/* Badge */}
          <Reveal variant="blur-in" delay={100}>
            <div className="inline-flex items-center mb-8">
              <AnimatedShinyText
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full border border-primary/20 bg-primary/5"
              >
                <Sparkles size={12} className="text-primary" /> Powered by Google
                Gemini
              </AnimatedShinyText>
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal variant="fade-up" delay={250}>
            <h1
              className="font-display italic mb-6 leading-[1.1] tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              Engineering intelligence
              <br />
              <span
                className="animate-gradient-text"
                style={{
                  background:
                    "linear-gradient(90deg, #4ADE80 0%, #2DD4BF 33%, #818CF8 66%, #4ADE80 100%)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                built for modern teams
              </span>
            </h1>
          </Reveal>

          {/* Subline */}
          <Reveal variant="fade-up" delay={400}>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-muted-foreground">
              Engineering analytics, AI code review, and living documentation
              &mdash; one platform so your team ships faster and stays healthier.
            </p>
          </Reveal>

          {/* CTA buttons */}
          <Reveal variant="scale-in" delay={550}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <ShimmerButton
                onClick={handleGitHub}
                className="px-8 py-4 text-[15px] shadow-xl shadow-primary/20 animate-pulse-glow"
              >
                <Github size={16} className="mr-2" />
                Get Started Free
                <ArrowRight size={14} className="ml-2" />
              </ShimmerButton>
              <a
                href="#features"
                className="group flex items-center gap-1.5 px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore features
                <ChevronRight
                  size={14}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </a>
            </div>
          </Reveal>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20 max-w-2xl mx-auto">
            {STATS.map(({ value, label }, i) => (
              <Reveal key={label} variant="fade-up" delay={700 + i * 120}>
                <div className="relative py-4 px-3 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
                  <div className="text-xl sm:text-2xl font-bold mb-1 text-primary">
                    {value}
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground">
                    {label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted By (Social Proof Bar) ──────────────────────────────────── */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
          <Reveal variant="blur-in" delay={0}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Trusted by engineering teams at
            </p>
          </Reveal>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-muted-foreground/50">
            {[
              "Acme Corp",
              "StartupHQ",
              "DevScale",
              "TechFlow",
              "CloudBase",
            ].map((name, i) => (
              <Reveal key={name} variant="fade-up" delay={100 + i * 100}>
                <span className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors duration-300">
                  {name}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <Reveal variant="fade-up" delay={0}>
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Features
            </p>
            <h2
              className="font-display italic mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              Everything your team needs
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              One platform. Zero context switching. Replace 4+ fragmented tools
              with a single engineering intelligence layer.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
            <Reveal
              key={title}
              variant={i % 3 === 0 ? "slide-left" : i % 3 === 2 ? "slide-right" : "fade-up"}
              delay={i * 100}
              threshold={0.1}
            >
              <div className="group relative rounded-2xl p-7 bg-card border border-border/60 transition-all duration-300 hover:border-primary/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 h-full">
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${accent}08, transparent 70%)`,
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `${accent}15` }}
                  >
                    <Icon
                      size={22}
                      style={{ color: accent }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2 text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="relative border-y border-border/50 bg-muted/20"
      >
        <div className="max-w-5xl mx-auto px-6 py-24">
          <Reveal variant="blur-in" delay={0}>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                How it works
              </p>
              <h2
                className="font-display italic mb-4"
                style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
              >
                Up and running in 3 steps
              </h2>
              <p className="text-muted-foreground">
                No agents, no YAML, no DevOps required.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, desc, color }, i) => (
              <Reveal key={step} variant="fade-up" delay={i * 180}>
                <div className="relative h-full">
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  <div className="rounded-2xl p-7 bg-card border border-border/60 h-full hover:border-primary/20 transition-colors duration-300">
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 text-2xl font-bold font-display animate-float"
                      style={{
                        background: `${color}12`,
                        color: color,
                        animationDelay: `${i * 0.5}s`,
                      }}
                    >
                      {step}
                    </div>
                    <h3 className="text-[15px] font-semibold mb-2 text-foreground">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-6 py-28 text-center overflow-hidden">
        <DotPattern className="absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,222,128,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <Reveal variant="scale-in" delay={0}>
            <h2
              className="font-display italic mb-5 text-center"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.75rem)" }}
            >
              Ready to ship smarter?
            </h2>
          </Reveal>
          <Reveal variant="fade-up" delay={150}>
            <p className="mb-10 text-muted-foreground max-w-lg mx-auto text-center">
              Connect your GitHub in one click. First insight in under 2 minutes.
              No credit card required.
            </p>
          </Reveal>
          <Reveal variant="scale-in" delay={300}>
            <ShimmerButton
              onClick={handleGitHub}
              className="px-10 py-4 text-[15px] shadow-xl shadow-primary/20 animate-pulse-glow"
            >
              <Github size={16} className="mr-2" />
              Start for free
              <ArrowRight size={14} className="ml-2" />
            </ShimmerButton>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)",
                  }}
                >
                  <Zap size={13} color="#09090B" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-foreground text-sm">
                  FlowOps
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered engineering intelligence for modern software teams.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a
                    href="#features"
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-foreground transition-colors"
                  >
                    How it works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Company
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy;{" "}
              <span suppressHydrationWarning>
                {new Date().getFullYear()}
              </span>{" "}
              FlowOps. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a
                href="https://github.com"
                className="hover:text-foreground transition-colors"
              >
                <Github size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
