"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { askAssistant } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";

const MAX_LEAN = 12; // px — max translate offset from cursor lean
const MAX_ROTATE = 8; // deg — max tilt from cursor lean

/**
 * Floating AI help widget. On desktop with a real pointer, the mascot has
 * full-page awareness of the cursor — it always leans/tilts toward it
 * (intensity fading smoothly with distance across the whole viewport, no
 * hard cutoff) while staying docked in its corner. A continuous bounce/wiggle
 * idle motion is layered on top so it always feels alive. Falls back to a
 * plain static button with a CSS-only bounce on touch devices or when the
 * user prefers reduced motion.
 */
export default function HelpAssistant() {
  const { orgId } = useAuth();
  const [open, setOpen] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const mascotRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const openRef = useRef(open);
  const rafRef = useRef(null);

  useEffect(() => {
    openRef.current = open;
    if (open && mascotRef.current) {
      // Dock in place while the panel is open — reset any lean offset.
      mascotRef.current.style.transform = "translate(0px, 0px) rotate(0deg)";
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
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [canFollow]);

  // requestAnimationFrame loop applies the lean + idle-bounce transform
  // directly to the DOM node. Both are computed together here (rather than
  // splitting the idle motion into a separate CSS animation) because an
  // inline `style.transform` always wins over a CSS `animation`'s transform —
  // trying to run them independently means the JS one silently stomps the
  // CSS one every frame. Computing both in one place avoids that entirely.
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
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canFollow]);

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

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const { answer } = await askAssistant({
        question,
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
  }, [input, loading, orgId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
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
        {open ? <X size={28} /> : <Bot size={28} />}
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
              <p className="text-[11px] text-muted-foreground">Ask a question, get instant help</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Bot size={28} className="text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ask me how to use FlowOps, what a feature does, or for general engineering advice.
                </p>
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
                  {m.text}
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
              onClick={sendMessage}
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
