"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { fetchConversations, fetchThread, sendChatMessage, markThreadRead } from "@/app/lib/api";
import { cn } from "@/app/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ChatWidget() {
  const { orgId, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // "list" | "thread"
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const activePeerRef = useRef(null);
  const viewRef = useRef("list");
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { activePeerRef.current = activePeer; }, [activePeer]);
  useEffect(() => { viewRef.current = view; }, [view]);

  const openThread = (peer) => {
    setActivePeer(peer);
    setView("thread");
    setMessages([]);
    if (!orgId) return;
    fetchThread(orgId, peer.id)
      .then(setMessages)
      .catch(() => {});
    markThreadRead(orgId, peer.id).catch(() => {});
    setConversations((prev) => prev.map((c) => (c.peer.id === peer.id ? { ...c, unread: 0 } : c)));
  };

  // Load conversation list
  useEffect(() => {
    if (!orgId) return;
    fetchConversations(orgId)
      .then((convos) => {
        setConversations(convos);
        setTotalUnread(convos.reduce((sum, c) => sum + c.unread, 0));
      })
      .catch(() => {});
  }, [orgId]);

  // Cross-component "open this thread" trigger, dispatched from /team's Message button
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      openThread(e.detail.peer);
    };
    window.addEventListener("flowops:open-chat", handler);
    return () => window.removeEventListener("flowops:open-chat", handler);
  }, [orgId]);

  // Socket connection for live delivery
  useEffect(() => {
    if (!orgId || !user?.id) return;

    let socket;
    const connect = async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io(BASE_URL, { transports: ["websocket", "polling"], withCredentials: true });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-org", orgId);
          socket.emit("join-user", user.id);
        });

        socket.on("chat-message", (msg) => {
          const peerId = msg.senderId === user.id ? msg.recipientId : msg.senderId;
          const isActiveThread = viewRef.current === "thread" && activePeerRef.current?.id === peerId;

          if (isActiveThread) {
            setMessages((prev) => [...prev, msg]);
            if (msg.senderId === peerId) markThreadRead(orgId, peerId).catch(() => {});
          } else if (msg.recipientId === user.id) {
            setTotalUnread((u) => u + 1);
          }

          setConversations((prev) => {
            const existing = prev.find((c) => c.peer.id === peerId);
            const peer = existing?.peer || (msg.senderId === peerId ? msg.sender : { id: peerId, username: "Teammate" });
            const updated = {
              peer,
              lastMessage: msg,
              unread: isActiveThread ? 0 : (existing?.unread || 0) + (msg.recipientId === user.id ? 1 : 0),
            };
            return [updated, ...prev.filter((c) => c.peer.id !== peerId)];
          });
        });
      } catch {
        /* Socket.IO not available — degrade gracefully */
      }
    };

    connect();
    return () => { if (socket) socket.disconnect(); };
  }, [orgId, user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !activePeer || sending) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendChatMessage(orgId, activePeer.id, body);
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => {
        const existing = prev.find((c) => c.peer.id === activePeer.id);
        const updated = { peer: activePeer, lastMessage: msg, unread: 0 };
        return [updated, ...prev.filter((c) => c.peer.id !== activePeer.id)];
      });
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[108px] right-6 z-40" ref={panelRef}>
      {open && (
        <div className="absolute bottom-14 right-0 w-[calc(100vw-2.5rem)] max-w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" role="dialog" aria-label="Chat">
          {view === "list" ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Messages</p>
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/60" aria-label="Close chat">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center">
                    <MessageSquare size={28} className="mb-2 opacity-30" />
                    <p className="text-xs">No conversations yet</p>
                    <p className="text-[11px] mt-0.5">Message a teammate from the Team page</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button key={c.peer.id} onClick={() => openThread(c.peer)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors text-left">
                      {c.peer.avatarUrl ? (
                        <img src={c.peer.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {c.peer.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{c.peer.username}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage.body}</p>
                      </div>
                      {c.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
                <button onClick={() => setView("list")} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/60" aria-label="Back to conversations">
                  <ArrowLeft size={14} />
                </button>
                <p className="text-sm font-semibold text-foreground truncate flex-1">{activePeer?.username}</p>
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted/60" aria-label="Close chat">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.senderId === user?.id ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-xl px-3 py-1.5 text-xs",
                      m.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}>
                      <p>{m.body}</p>
                      <p className={cn("text-[9px] mt-0.5 opacity-70")}>{timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-center gap-2 p-2 border-t border-border">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Message..."
                  className="flex-1 h-8 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={handleSend} disabled={!draft.trim() || sending} className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 shrink-0" aria-label="Send message">
                  <Send size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={`Chat${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}`}
      >
        <MessageSquare size={18} />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center" aria-hidden="true">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
