"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { X, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { askAssistant } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";

const MAX_LEAN = 12; // px — max translate offset from cursor lean
const MAX_ROTATE = 8; // deg — max tilt from cursor lean
const PUPIL_RANGE = 3; // px — how far the pupils shift within the eye socket
const IDLE_TIP_MS = 25000; // how long the cursor must be idle before a tip pops up

// Most-specific prefix first. Falls back to a generic entry for unmapped routes.
const PAGE_INFO = [
  { prefix: "/personal/dashboard", label: "Personal Dashboard", questions: ["What do my streaks mean?", "How do I connect more repos?"] },
  { prefix: "/personal/tasks", label: "Personal Task Tracker", questions: ["How do I create a task?", "Can I link a task to a PR?"] },
  { prefix: "/personal/snippets", label: "Code Snippets", questions: ["How do I favorite a snippet?", "Can I share a snippet with my team?"] },
  { prefix: "/personal/profile", label: "Developer Profile", questions: ["How do I make my profile public?", "What are achievements?"] },
  { prefix: "/personal/metrics", label: "Personal Metrics", questions: ["What is PR cycle time?", "How is my score calculated?"] },
  { prefix: "/personal", label: "Personal Mode", questions: ["What's the difference between Personal and Team mode?"] },
  { prefix: "/dashboard", label: "Team Dashboard", questions: ["What does review latency mean?", "How is the leaderboard scored?"] },
  { prefix: "/team", label: "Team Insights", questions: ["How do I invite a teammate?", "What is sprint health?"] },
  { prefix: "/settings", label: "Settings", questions: ["How do I create an API key?", "How does auto-approve work?"] },
  { prefix: "/billing", label: "Billing & Plans", questions: ["What's included in the Pro plan?", "How do I cancel my subscription?"] },
  { prefix: "/integrations", label: "Integrations", questions: ["How do I connect Slack?", "What does the GitHub webhook do?"] },
  { prefix: "/audit", label: "Audit Logs", questions: ["What actions get logged here?"] },
  { prefix: "/ai-review", label: "AI Code Review", questions: ["How do I trigger a review?", "What does the score mean?"] },
  { prefix: "/autodocs", label: "AutoDocs AI", questions: ["How do I generate documentation?", "Can I edit the generated docs?"] },
  { prefix: "/invites", label: "Invites", questions: ["How do I accept an invite?"] },
];
const DEFAULT_PAGE_INFO = { label: "FlowOps", questions: ["How do I connect a repo?", "What can FlowOps do for my team?"] };

function getPageInfo(pathname) {
  return PAGE_INFO.find((p) => pathname?.startsWith(p.prefix)) || DEFAULT_PAGE_INFO;
}

/**
 * Floating AI help widget. On desktop with a real pointer, the mascot has
 * full-page awareness of the cursor — it always leans/tilts toward it
 * (intensity fading smoothly with distance across the whole viewport, no
 * hard cutoff) while staying docked in its corner, and its eyes shift within
 * their sockets toward the cursor too (an Eilik-toy-style "watching" effect,
 * layered on top of the body lean using the same per-frame calculation so
 * the two motions never fight each other). A continuous bounce/wiggle idle
 * motion is layered on top so it always feels alive. Falls back to a plain
 * static button with a CSS-only bounce on touch devices or when the user
 * prefers reduced motion.
 */
export default function HelpAssistant() {
  const { orgId } = useAuth();
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);

  const [open, setOpen] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState(null);

  const mascotRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const openRef = useRef(open);
  const rafRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    openRef.current = open;
    if (open) {
      lastActivityRef.current = Date.now();
      setTip(null);
      if (mascotRef.current) {
        // Dock in place while the panel is open — reset any lean offset.
        mascotRef.current.style.transform = "translate(0px, 0px) rotate(0deg)";
      }
      [leftPupilRef, rightPupilRef].forEach((r) => {
        if (r.current) r.current.style.transform = "translate(0px, 0px)";
      });
    }
  }, [open]);

  // Decide once, client-side only, whether cursor-following is appropriate.
  // Touch (no fine pointer) and reduced-motion are tracked separately: touch
  // devices still get the CSS bounce fallback (harmless, adds life), but
  // reduced-motion must get zero animation of any kind.
  useEffect(() => {
    const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCanFollow(hoverFine && !reduceMotion);
    setReducedMotion(reduceMotion);
  }, []);

  // Track the cursor via a ref (not React state) so mousemove never triggers a re-render.
  useEffect(() => {
    if (!canFollow) return;
    const handleMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [canFollow]);

  // requestAnimationFrame loop applies the lean + eye-tracking + idle-bounce
  // transform directly to the DOM nodes. All of it is computed together here
  // (rather than splitting into separate CSS animations) because an inline
  // `style.transform` always wins over a CSS `animation`'s transform — trying
  // to run them independently means the JS one silently stomps the CSS one
  // every frame. Computing everything in one place avoids that entirely.
  useEffect(() => {
    if (!canFollow) return;

    const tick = () => {
      const el = mascotRef.current;
      if (el && !openRef.current) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mousePos.current.x - cx;
        const dy = mousePos.current.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diag = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) || 1;

        // Full-page awareness: lean intensity fades smoothly with distance
        // across the whole viewport (no hard radius cutoff), so the mascot
        // always has some reaction to the cursor no matter where it is.
        const factor = Math.max(0, 1 - dist / diag);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        const leanX = nx * MAX_LEAN * factor;
        const leanY = ny * MAX_LEAN * factor;
        const leanRotate = (dx / diag) * MAX_ROTATE * factor;

        // Continuous idle bounce/wiggle layered underneath the lean offset.
        const t = performance.now();
        const bounceY = Math.sin(t / 380) * 5;
        const wiggleRotate = Math.sin(t / 550) * 3;

        el.style.transform = `translate(${leanX}px, ${leanY + bounceY}px) rotate(${leanRotate + wiggleRotate}deg)`;

        // Eyes: pupils shift toward the cursor within their sockets, reusing
        // the direction already computed above (always tracking, not gated
        // by distance, for the "always watching" toy-like effect).
        const pupilX = nx * PUPIL_RANGE;
        const pupilY = ny * PUPIL_RANGE;
        const pupilTransform = `translate(${pupilX}px, ${pupilY}px)`;
        if (leftPupilRef.current) leftPupilRef.current.style.transform = pupilTransform;
        if (rightPupilRef.current) rightPupilRef.current.style.transform = pupilTransform;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canFollow]);

  // Unprompted idle tip: pops up once per page per browser session, only
  // while the chat is closed, purely client-side (no AI call — this is UI
  // engagement, not a real answer, so it shouldn't cost anything to show).
  useEffect(() => {
    if (!canFollow) return;
    const tipKey = `flowops_tip_shown_${pathname}`;

    const interval = setInterval(() => {
      if (openRef.current) return;
      if (sessionStorage.getItem(tipKey)) return;
      if (Date.now() - lastActivityRef.current < IDLE_TIP_MS) return;

      const text = pageInfo.questions[0];
      setTip(text);
      sessionStorage.setItem(tipKey, "1");
      setTimeout(() => setTip(null), 6000);
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFollow, pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !mascotRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-scroll message list to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (preset) => {
    const question = (preset ?? input).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const { answer } = await askAssistant({
        question,
        pageContext: pageInfo.label,
        ...(orgId && { organizationId: orgId }),
      });
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      const rateLimited = err.response?.status === 429;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: rateLimited
            ? "You're asking questions a bit fast — please wait a moment and try again."
            : "Sorry, the assistant is temporarily unavailable. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, orgId, pageInfo.label]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {tip && !open && (
        <div className="fixed bottom-[100px] right-6 z-50 max-w-[220px] bg-card border border-border rounded-xl shadow-xl px-3 py-2.5 animate-[fadeInScale_0.2s_ease-out]">
          <p className="text-xs text-foreground">{tip}</p>
          <div className="absolute -bottom-1.5 right-7 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
        </div>
      )}

      <button
        ref={mascotRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-xl transition-colors",
          "bg-gradient-to-br from-primary to-teal-500 text-neutral-950 hover:brightness-110",
          "animate-pulse-glow",
          !open && !canFollow && !reducedMotion && "animate-bot-bounce",
        )}
        style={{ transition: "transform 0.15s ease-out" }}
        aria-label={open ? "Close FlowOps assistant" : "Open FlowOps assistant"}
        aria-expanded={open}
      >
        {open ? (
          <X size={28} />
        ) : (
          <div className="mascot-face" aria-hidden="true">
            <span ref={leftPupilRef} className="mascot-pupil" />
            <span ref={rightPupilRef} className="mascot-pupil" />
          </div>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-28 right-6 z-50 w-80 sm:w-96 max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeInScale_0.2s_ease-out]"
          role="dialog"
          aria-label="FlowOps AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border bg-muted/30">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">FlowOps Assistant</p>
              <p className="text-[11px] text-muted-foreground">Ask about {pageInfo.label}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-3">
                <p className="text-xs text-muted-foreground px-2">
                  Ask me how to use FlowOps, what a feature does, or for general engineering advice.
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  {pageInfo.questions.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                    m.role === "user"
                      ? "ml-auto bg-primary text-neutral-950"
                      : m.error
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-foreground",
                  )}
                >
                  {m.role === "assistant" && !m.error ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-p:text-inherit prose-strong:text-inherit prose-code:text-primary prose-code:bg-black/10 prose-code:px-1 prose-code:rounded prose-a:text-primary prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  ) : (
                    m.text
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="bg-muted text-muted-foreground text-sm rounded-xl px-3 py-2 max-w-[85%] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-border">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              placeholder="Ask a question…"
              disabled={loading}
              className="flex-1 h-9 px-3 rounded-lg border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              aria-label="Your question"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-lg bg-primary text-neutral-950 flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
