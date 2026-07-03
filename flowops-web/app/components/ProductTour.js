"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "flowops_tour_done";

const STEPS = [
  {
    target: null,
    title: "Welcome to FlowOps 👋",
    body: "Your engineering intelligence hub. Here's a 30-second tour of what matters — you can skip anytime.",
  },
  {
    target: '[data-tour="metrics"]',
    title: "Your health at a glance",
    body: "Cycle time, review latency, and commit velocity — each card shows its trend versus the previous period.",
  },
  {
    target: '[data-tour="flow-map"]',
    title: "The PR Lifecycle Flow Map",
    body: "See exactly where PRs spend their time from open to merge. The amber segment is your current bottleneck.",
  },
  {
    target: '[data-tour="live-activity"]',
    title: "Live activity",
    body: "Commits, PRs, reviews, and deploys stream in here in real time — the moment they hit GitHub.",
  },
  {
    target: '[data-tour="nav-insights"]',
    title: "AI Insights",
    body: "AI-written State of Engineering reports and one-click standup summaries, generated from your real data.",
  },
  {
    target: null,
    title: "One last thing…",
    body: "Press Ctrl+K anywhere to open the command palette and jump to any page instantly. Enjoy!",
  },
];

/**
 * First-run spotlight tour. Highlights elements tagged with data-tour
 * attributes; steps whose target isn't on screen are skipped. Runs once,
 * then remembers completion in localStorage.
 */
export default function ProductTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);

  // Start once, after the dashboard has had a moment to render
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const step = STEPS[stepIdx];

  // The sidebar renders twice (off-screen mobile drawer + desktop), so pick
  // the instance that is actually visible in the viewport.
  const findVisible = (selector) => {
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth) {
        return el;
      }
    }
    return null;
  };

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return true;
    }
    const el = findVisible(step.target);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    return true;
  }, [step]);

  // Position the spotlight for the current step; skip steps with no target found
  useEffect(() => {
    if (!active || !step) return;
    if (step.target) {
      const el = findVisible(step.target);
      if (!el) {
        // Target missing (e.g. no data yet, mobile nav) — skip forward
        setStepIdx((i) => (i + 1 < STEPS.length ? i + 1 : i));
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(measure, 350);
      const onUpdate = () => measure();
      window.addEventListener("resize", onUpdate);
      window.addEventListener("scroll", onUpdate, true);
      return () => {
        clearTimeout(t);
        window.removeEventListener("resize", onUpdate);
        window.removeEventListener("scroll", onUpdate, true);
      };
    }
    setRect(null);
  }, [active, stepIdx, step, measure]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
  };

  const next = () => {
    if (stepIdx + 1 >= STEPS.length) finish();
    else setStepIdx(stepIdx + 1);
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  if (!active || !step) return null;

  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Tooltip position: below the spotlight if there's room, else above; centered otherwise
  const tooltipStyle = spotlight
    ? spotlight.top + spotlight.height + 190 < window.innerHeight
      ? { top: spotlight.top + spotlight.height + 14, left: Math.min(Math.max(spotlight.left, 16), window.innerWidth - 356) }
      : { top: Math.max(16, spotlight.top - 200), left: Math.min(Math.max(spotlight.left, 16), window.innerWidth - 356) }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Product tour">
      {/* Dimmed backdrop with a punched-out spotlight */}
      {spotlight ? (
        <motion.div
          className="absolute rounded-xl pointer-events-none"
          animate={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            border: "2px solid hsl(var(--primary))",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="absolute w-[340px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-2xl p-5"
          style={tooltipStyle}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={14} />
            </span>
            <p className="text-sm font-bold text-foreground">{step.title}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.body}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === stepIdx ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={finish}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Skip
              </button>
              {stepIdx > 0 && (
                <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={back}>
                  Back
                </Button>
              )}
              <Button size="sm" className="h-7 px-3 text-xs" onClick={next}>
                {stepIdx + 1 >= STEPS.length ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
