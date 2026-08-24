"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Conversation, doctorFullName } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;

export function ChatThread({ appointmentId, basePath }: { appointmentId: string; basePath: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);

  async function load() {
    const { status, data } = await apiGet<{
      success: boolean;
      data?: Conversation;
      message?: string;
    }>(`/api/chat/appointment/${appointmentId}`);

    if (status === 401) {
      router.push("/login");
      return;
    }
    if (data.success && data.data) {
      setConversation(data.data);
    } else {
      setError(data.message ?? "Could not load this conversation.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  useEffect(() => {
    if (!conversation || hasMarkedRead.current) return;
    const unread = user?.role === "Doctor" ? conversation.unreadCount.doctor : conversation.unreadCount.user;
    if (unread > 0) {
      hasMarkedRead.current = true;
      apiPost(`/api/chat/conversation/${conversation._id}/read`);
    }
  }, [conversation, user?.role]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !conversation) return;
    setSending(true);
    setSendError(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/messages`,
      { content }
    );
    setSending(false);
    if (data.success) {
      setDraft("");
      load();
    } else {
      setSendError(data.message ?? "Could not send your message.");
    }
  }

  async function handleUnlock() {
    if (!conversation) return;
    setUnlocking(true);
    setSendError(null);
    const { data } = await apiPatch<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/unlock`
    );
    setUnlocking(false);
    if (data.success) {
      load();
    } else {
      setSendError(data.message ?? "Could not unlock this conversation.");
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href={basePath} className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to messages
        </Link>
      </div>
    );
  }

  if (!conversation) {
    return <p className="text-sm text-muted">Loading conversation...</p>;
  }

  const isDoctor = user?.role === "Doctor";
  const otherName = isDoctor
    ? conversation.participants.userId?.name ?? "Patient"
    : doctorFullName(conversation.participants.doctorId);

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-card bg-card-bg shadow-atmospheric">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <Link href={basePath} className="text-xs font-semibold text-primary">
            &larr; Back to messages
          </Link>
          <p className="mt-1 font-bold text-heading">{otherName}</p>
        </div>
        {!conversation.isActive && (
          <span className="rounded-full bg-accent-gray-bg px-3 py-1 text-xs font-semibold text-accent-gray-fg">
            Locked
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {conversation.messages.map((msg) => {
            const mine = isDoctor ? msg.senderType === "Doctor" : msg.senderType === "User";
            if (msg.messageType === "system") {
              return (
                <p key={msg._id} className="text-center text-xs text-muted">
                  {msg.content}
                </p>
              );
            }
            return (
              <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-white" : "bg-accent-gray-bg text-heading"
                  }`}
                >
                  <p className={msg.isDeleted ? "italic opacity-70" : ""}>{msg.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border p-4">
        {sendError && <p className="mb-2 text-sm text-red-600">{sendError}</p>}
        {conversation.isActive ? (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message"
              className="flex-1 rounded-lg border border-border bg-input-bg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button loading={sending} disabled={!draft.trim()} onClick={handleSend}>
              Send
            </Button>
          </div>
        ) : isDoctor ? (
          <div className="text-center">
            <p className="text-sm text-muted">This conversation is locked.</p>
            <Button variant="outline" className="mt-2" loading={unlocking} onClick={handleUnlock}>
              Unlock conversation
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted">
            This conversation is locked. The doctor can reopen it.
          </p>
        )}
      </div>
    </div>
  );
}
