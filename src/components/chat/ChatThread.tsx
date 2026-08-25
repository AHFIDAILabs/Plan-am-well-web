"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost, apiPostForm, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Icon, ICONS } from "@/components/ui/Icon";

function MoreDots() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <circle cx="12" cy="6" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18" r="1.6" />
    </svg>
  );
}
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Conversation, ChatMessage, doctorFullName } from "@/lib/types";
import { logEvent } from "@/lib/analytics";

// Real-time delivery (below) handles the common case instantly now — this
// interval is just a fallback safety net for a missed/dropped socket event,
// so it can be much slower than the old 5s "polling is the only mechanism"
// value.
const POLL_INTERVAL_MS = 30000;
const TYPING_DEBOUNCE_MS = 2000;
// Safety net only — the real "stop typing" signal is the sender's own
// isTyping:false emit after TYPING_DEBOUNCE_MS. This just guards against a
// lost event leaving the indicator stuck on.
const TYPING_AUTO_CLEAR_MS = 5000;

export function ChatThread({ appointmentId, basePath }: { appointmentId: string; basePath: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const callRoomPath = `${basePath.replace("/messages", "/appointments")}/${appointmentId}/call`;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [requestingCall, setRequestingCall] = useState(false);
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingAutoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

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

  useEffect(() => {
    if (!showAttachMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showAttachMenu]);

  useEffect(() => {
    if (!socket || !conversation) return;
    function onResponse(payload: { conversationId: string; status: string }) {
      if (payload.conversationId !== conversation!._id) return;
      setRequestingCall(false);
      if (payload.status === "accepted") {
        router.push(callRoomPath);
      } else if (payload.status === "declined") {
        setCallNotice("The other party declined the call.");
      } else if (payload.status === "expired") {
        setCallNotice("The call request timed out.");
      }
    }
    socket.on("video-call-response", onResponse);
    return () => {
      socket.off("video-call-response", onResponse);
    };
  }, [socket, conversation, router, callRoomPath]);

  // Real-time message/state sync — previously this thread only found out
  // about new messages, edits, deletes, read receipts, unlocks, or the
  // appointment ending by waiting for the next poll (was every 5s; mobile
  // has always gotten all of this instantly via these same socket events,
  // which the backend already broadcasts to every platform — web just never
  // listened). Re-uses the existing load() fetch rather than hand-rolling
  // client-side message state mutation, so this stays low-risk.
  useEffect(() => {
    if (!socket || !conversation) return;

    function refreshIfThisConversation(payload: { conversationId?: string }) {
      if (payload.conversationId === conversation!._id) load();
    }

    function onAppointmentEnded(payload: { appointmentId: string }) {
      if (payload.appointmentId === appointmentId) load();
    }

    function onTyping(payload: { conversationId: string; isTyping: boolean; senderRole: string }) {
      if (payload.conversationId !== conversation!._id) return;
      if (payload.senderRole === user?.role) return; // our own emit echoed back
      setOtherTyping(payload.isTyping);
      if (typingAutoClearRef.current) clearTimeout(typingAutoClearRef.current);
      if (payload.isTyping) {
        typingAutoClearRef.current = setTimeout(() => setOtherTyping(false), TYPING_AUTO_CLEAR_MS);
      }
    }

    socket.on("new-message", refreshIfThisConversation);
    socket.on("messages-read", refreshIfThisConversation);
    socket.on("message-edited", refreshIfThisConversation);
    socket.on("message-deleted", refreshIfThisConversation);
    socket.on("conversation-unlocked", refreshIfThisConversation);
    socket.on("appointment-ended", onAppointmentEnded);
    socket.on("typing-indicator", onTyping);

    return () => {
      socket.off("new-message", refreshIfThisConversation);
      socket.off("messages-read", refreshIfThisConversation);
      socket.off("message-edited", refreshIfThisConversation);
      socket.off("message-deleted", refreshIfThisConversation);
      socket.off("conversation-unlocked", refreshIfThisConversation);
      socket.off("appointment-ended", onAppointmentEnded);
      socket.off("typing-indicator", onTyping);
      if (typingAutoClearRef.current) clearTimeout(typingAutoClearRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, conversation?._id, appointmentId, user?.role]);

  // Emits our own typing status, debounced like mobile's handleTextChange:
  // isTyping:true on the first keystroke, isTyping:false after a pause.
  function handleDraftChange(value: string) {
    setDraft(value);
    if (!conversation) return;

    if (value.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      apiPost(`/api/chat/conversation/${conversation._id}/typing`, { isTyping: true });
    }

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      apiPost(`/api/chat/conversation/${conversation._id}/typing`, { isTyping: false });
    }, TYPING_DEBOUNCE_MS);
  }

  async function handleStartCall() {
    if (!conversation) return;
    setRequestingCall(true);
    setCallNotice(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/video-request`,
      { callType: "video" }
    );
    if (!data.success) {
      setRequestingCall(false);
      setCallNotice(data.message ?? "Could not start a video call.");
    } else {
      load();
    }
  }

  async function handleCancelCallRequest() {
    if (!conversation?.activeVideoRequest) return;
    setRequestingCall(false);
    await apiDelete(`/api/chat/conversation/${conversation._id}/video-request/${conversation.activeVideoRequest._id}`);
    load();
  }

  async function handleRespondToCall(accept: boolean) {
    if (!conversation?.activeVideoRequest) return;
    const { data } = await apiPost<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/video-request/${conversation.activeVideoRequest._id}/respond`,
      { accept }
    );
    if (accept && data.success) {
      router.push(callRoomPath);
    } else {
      load();
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || !conversation) return;
    setSending(true);
    setSendError(null);

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      apiPost(`/api/chat/conversation/${conversation._id}/typing`, { isTyping: false });
    }
    const { data } = await apiPost<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/messages`,
      { content }
    );
    setSending(false);
    if (data.success) {
      setDraft("");
      logEvent("chat_message_sent", { message_type: "text" });
      load();
    } else {
      setSendError(data.message ?? "Could not send your message.");
    }
  }

  async function handleFileSelected(file: File, mediaType: "image" | "document") {
    setShowAttachMenu(false);
    if (!conversation) return;
    setUploading(true);
    setSendError(null);

    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiPostForm<{
      success: boolean;
      data?: { url: string; fileType: "image" | "document" };
      message?: string;
    }>("/api/chat/upload", formData);

    if (!data.success || !data.data) {
      setUploading(false);
      setSendError(data.message ?? "Could not upload that file.");
      return;
    }

    const { data: sendData } = await apiPost<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/messages`,
      { content: mediaType === "image" ? "📷 Image" : file.name, messageType: mediaType, mediaUrl: data.data.url }
    );
    setUploading(false);
    if (sendData.success) {
      logEvent("chat_message_sent", { message_type: mediaType });
      load();
    } else {
      setSendError(sendData.message ?? "Could not send your file.");
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

  function startEdit(msg: ChatMessage) {
    setOpenMenuFor(null);
    setEditingId(msg._id);
    setEditDraft(msg.content);
  }

  async function saveEdit(messageId: string) {
    const content = editDraft.trim();
    if (!content || !conversation) return;
    const { data } = await apiPut<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/messages/${messageId}`,
      { content }
    );
    if (data.success) {
      setEditingId(null);
      load();
    } else {
      setSendError(data.message ?? "Could not edit this message.");
    }
  }

  async function handleDelete(messageId: string) {
    setOpenMenuFor(null);
    if (!conversation) return;
    if (!confirm("Delete this message?")) return;
    const { data } = await apiDelete<{ success: boolean; message?: string }>(
      `/api/chat/conversation/${conversation._id}/messages/${messageId}`
    );
    if (data.success) {
      load();
    } else {
      setSendError(data.message ?? "Could not delete this message.");
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
  // Either side can be null if that account was since deleted, leaving a
  // dangling reference — doctorFullName assumes a real object and throws on
  // null (same class of bug fixed in ConversationList.tsx).
  const otherName = isDoctor
    ? conversation.participants.userId?.name ?? "Patient"
    : conversation.participants.doctorId
    ? doctorFullName(conversation.participants.doctorId)
    : "Doctor";

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-card bg-card-bg shadow-atmospheric">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <Link href={basePath} className="text-xs font-semibold text-primary">
            &larr; Back to messages
          </Link>
          <p className="mt-1 font-bold text-heading">{otherName}</p>
        </div>
        <div className="flex items-center gap-3">
          {conversation.isActive && !conversation.activeVideoRequest && (
            <button
              type="button"
              onClick={handleStartCall}
              disabled={requestingCall}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-input-bg disabled:opacity-50"
              aria-label="Start video call"
            >
              <Icon path={ICONS.video} className="h-5 w-5" />
            </button>
          )}
          {!conversation.isActive && (
            <span className="rounded-full bg-accent-gray-bg px-3 py-1 text-xs font-semibold text-accent-gray-fg">
              Locked
            </span>
          )}
        </div>
      </div>

      {conversation.activeVideoRequest?.status === "pending" &&
        (conversation.activeVideoRequest.requestedBy === user?.id ? (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent-blue-bg px-4 py-2 text-sm text-accent-blue-fg">
            <span>Calling {otherName}…</span>
            <button onClick={handleCancelCallRequest} className="font-semibold underline">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-accent-blue-bg px-4 py-2 text-sm text-accent-blue-fg">
            <span>{otherName} is calling you.</span>
            <div className="flex gap-3">
              <button onClick={() => handleRespondToCall(false)} className="font-semibold underline">
                Decline
              </button>
              <button onClick={() => handleRespondToCall(true)} className="font-semibold underline">
                Accept
              </button>
            </div>
          </div>
        ))}

      {callNotice && (
        <div className="border-b border-border px-4 py-2 text-center text-sm text-muted">{callNotice}</div>
      )}

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
            const isEditing = editingId === msg._id;
            return (
              <div key={msg._id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                {mine && !msg.isDeleted && !isEditing && (
                  <div className="relative mr-1 self-center">
                    <button
                      onClick={() => setOpenMenuFor((v) => (v === msg._id ? null : msg._id))}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-input-bg group-hover:opacity-100"
                      aria-label="Message actions"
                    >
                      <MoreDots />
                    </button>
                    {openMenuFor === msg._id && (
                      <div className="absolute right-0 top-7 z-10 w-32 rounded-lg border border-border bg-card-bg py-1 shadow-atmospheric">
                        {msg.messageType === "text" && (
                          <button
                            onClick={() => startEdit(msg)}
                            className="block w-full px-3 py-1.5 text-left text-xs text-heading hover:bg-input-bg"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-input-bg"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-white" : "bg-accent-gray-bg text-heading"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(msg._id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/60 focus:outline-none"
                      />
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => saveEdit(msg._id)} className="font-semibold underline">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="underline opacity-80">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : msg.isDeleted ? (
                    <p className="italic opacity-70">{msg.content}</p>
                  ) : msg.messageType === "image" && msg.mediaUrl ? (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.mediaUrl} alt="" className="max-h-48 rounded-lg object-cover" />
                    </a>
                  ) : msg.messageType === "document" && msg.mediaUrl ? (
                    <a
                      href={msg.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 underline ${mine ? "text-white" : "text-heading"}`}
                    >
                      <Icon path={ICONS.folder} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{msg.content}</span>
                    </a>
                  ) : (
                    <p>{msg.content}</p>
                  )}

                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                    {msg.isEdited && !msg.isDeleted && <span>(edited)</span>}
                    {mine && !msg.isDeleted && (
                      <span className={msg.status === "read" ? "text-blue-300" : ""}>
                        {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {otherTyping && (
            <p className="text-xs italic text-muted">
              {user?.role === "Doctor" ? "Patient" : "Doctor"} is typing…
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border p-4">
        {sendError && <p className="mb-2 text-sm text-red-600">{sendError}</p>}
        {conversation.isActive ? (
          <div className="flex items-center gap-2">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                disabled={uploading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-input-bg disabled:opacity-50"
                aria-label="Attach a file"
              >
                <Icon path={ICONS.paperclip} className="h-4 w-4" />
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-11 left-0 z-20 w-40 rounded-card border border-border bg-card-bg p-2 shadow-atmospheric">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-heading hover:bg-input-bg"
                  >
                    <Icon path={ICONS.image} className="h-4 w-4 text-tertiary" />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-heading hover:bg-input-bg"
                  >
                    <Icon path={ICONS.folder} className="h-4 w-4 text-secondary" />
                    Document
                  </button>
                </div>
              )}
            </div>

            <input
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={uploading}
              placeholder={uploading ? "Uploading..." : "Type a message"}
              className="flex-1 rounded-lg border border-border bg-input-bg px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <Button loading={sending} disabled={!draft.trim() || uploading} onClick={handleSend}>
              Send
            </Button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleFileSelected(file, "image");
              }}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleFileSelected(file, "document");
              }}
            />
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
