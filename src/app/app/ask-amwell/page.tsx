"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPostForm, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Icon, ICONS } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import { ChatbotMessage } from "@/lib/types";

const SUPPORT_PHONE_DIGITS = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+2349168767784").replace(/[^\d]/g, "");
const WHATSAPP_GREETING = "Hello, I need help with my health needs";
const WHATSAPP_BENEFITS = ["24/7 instant responses", "Search & order products", "Get health information", "Book appointments"];

type ChatLanguage = "en" | "yo" | "ig" | "ha" | "pcm";
const LANGUAGE_OPTIONS: { code: ChatLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yorùbá" },
  { code: "ig", label: "Igbo" },
  { code: "ha", label: "Hausa" },
  { code: "pcm", label: "Pidgin" },
];
const CHAT_LANGUAGE_STORAGE_KEY = "askAmWellLanguage";

function newSessionId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `session_${Date.now()}_${Math.random()}`;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatFullDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateSeparatorLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function AskAmWellPage() {
  const { user, isAnonymous } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [canRecord] = useState(
    () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"
  );
  const [language, setLanguage] = useState<ChatLanguage>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(CHAT_LANGUAGE_STORAGE_KEY);
    return LANGUAGE_OPTIONS.some((l) => l.code === stored) ? (stored as ChatLanguage) : "en";
  });

  function changeLanguage(next: ChatLanguage) {
    setLanguage(next);
    window.localStorage.setItem(CHAT_LANGUAGE_STORAGE_KEY, next);
  }

  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const attachMenuRef = useRef<HTMLDivElement>(null);
  const busy = sending || uploading || transcribing;

  useEffect(() => {
    if (!showAttachMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showAttachMenu]);

  useEffect(() => {
    (async () => {
      const { data: convosData } = await apiGet<{ success: boolean; conversations?: { sessionId: string }[] }>(
        "/api/chatbot/conversations"
      );
      const mostRecent = convosData.success ? convosData.conversations?.[0] : undefined;

      if (mostRecent?.sessionId) {
        const { data: historyData } = await apiGet<{
          success: boolean;
          conversation?: { sessionId: string; messages: ChatbotMessage[] };
        }>(`/api/chatbot/conversation/${mostRecent.sessionId}`);
        if (historyData.success && historyData.conversation) {
          setSessionId(historyData.conversation.sessionId);
          setMessages(historyData.conversation.messages);
          setLoading(false);
          return;
        }
      }

      setSessionId(newSessionId());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendToBot(text: string) {
    if (!sessionId) return;
    setSending(true);
    setError(null);

    const { data } = await apiPost<{
      success: boolean;
      response?: string;
      intent?: ChatbotMessage["intent"];
      products?: ChatbotMessage["products"];
      message?: string;
    }>("/api/chatbot/message", { message: text, sessionId, language });

    setSending(false);

    if (data.success && data.response) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.response!,
          intent: data.intent,
          products: data.products,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      setError(data.message ?? "Ask AmWell couldn't respond right now. Please try again.");
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !sessionId || busy || recording) return;
    setDraft("");
    setMessages((prev) => [...prev, { sender: "user", text, timestamp: new Date().toISOString() }]);
    await sendToBot(text);
  }

  async function handleNewConversation() {
    if (sessionId) {
      await apiDelete(`/api/chatbot/conversation/${sessionId}`);
    }
    setMessages([]);
    setSessionId(newSessionId());
    setError(null);
  }

  // ── Attachments ──────────────────────────────────────────────────────────
  async function handleFileSelected(file: File, mediaType: "image" | "document") {
    setShowAttachMenu(false);
    if (!sessionId || busy || recording) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiPostForm<{
      success: boolean;
      data?: { url: string; fileType: "image" | "document"; extractedText?: string | null };
      message?: string;
    }>("/api/chatbot/upload", formData);

    setUploading(false);

    if (!data.success || !data.data) {
      setError(data.message ?? "Could not upload that file. Please try again.");
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: mediaType === "image" ? "Image" : file.name,
        timestamp: new Date().toISOString(),
        mediaUrl: data.data!.url,
        mediaType,
        mediaName: file.name,
      },
    ]);

    const extractedText = data.data.extractedText;
    const contextText =
      mediaType === "image"
        ? "I just shared a health-related image. Can you help me understand it or provide any guidance?"
        : extractedText
          ? `I shared a document called "${file.name}". Here's its content:\n\n${extractedText}\n\nCan you help me understand it?`
          : `I shared a document called "${file.name}", but its content couldn't be read automatically. Can you still help me with it?`;
    await sendToBot(contextText);
  }

  // ── Voice input ──────────────────────────────────────────────────────────
  async function startRecording() {
    if (!canRecord || busy || recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await transcribeAndSend(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone — check your browser's permission settings.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAndSend(blob: Blob) {
    if (!sessionId) return;
    setTranscribing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", blob, "voice-message.webm");
    const { data } = await apiPostForm<{ success: boolean; text?: string; message?: string }>(
      "/api/chatbot/transcribe",
      formData
    );

    setTranscribing(false);

    const text = data.text?.trim();
    if (!data.success || !text) {
      setError(data.message ?? "Couldn't understand that. Please try again or type your question.");
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text, timestamp: new Date().toISOString() }]);
    await sendToBot(text);
  }

  function handleMicClick() {
    if (recording) stopRecording();
    else startRecording();
  }

  // ── Cart ─────────────────────────────────────────────────────────────────
  async function handleAddToCart(product: { _id: string; drugId?: string; name: string }) {
    if (!product.drugId) return;
    setAddingProductId(product._id);
    setAddedProductId(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/cart", {
      items: [{ drugId: product.drugId, quantity: 1 }],
    });
    setAddingProductId(null);
    if (data.success) {
      setAddedProductId(product._id);
    } else {
      setError(data.message ?? "Could not add this item to your cart.");
    }
  }

  function openWhatsApp() {
    const text = encodeURIComponent(WHATSAPP_GREETING);
    window.open(`https://wa.me/${SUPPORT_PHONE_DIGITS}?text=${text}`, "_blank", "noopener,noreferrer");
    setShowWhatsAppModal(false);
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading Ask AmWell...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:h-[calc(100vh-8rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">Ask AmWell AI</h1>
          <p className="mt-1 text-sm text-muted">
            {isAnonymous ? "Guest Mode — " : ""}A private, judgment-free space for your sexual and reproductive health
            questions.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as ChatLanguage)}
            aria-label="Reply language"
            className="h-10 rounded-full border border-border bg-input-bg px-3 text-xs font-semibold text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowWhatsAppModal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105"
            aria-label="Chat on WhatsApp"
          >
            <Icon path={ICONS.whatsapp} className="h-5 w-5" />
          </button>
          {messages.length > 0 && (
            <Button variant="outline" onClick={handleNewConversation}>
              New conversation
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-card bg-card-bg shadow-atmospheric">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-lg font-bold text-heading">Hi, I&apos;m Ask AmWell 👋</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Ask me about menstrual health, contraception, STIs, fertility, or anything else on your mind.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showDateSeparator =
                !prev || new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

              return (
                <div key={i}>
                  {showDateSeparator && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-accent-gray-bg px-3 py-1 text-[10px] font-semibold text-accent-gray-fg">
                        {dateSeparatorLabel(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div className={`mb-3 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]" title={formatFullDateTime(msg.timestamp)}>
                      <p
                        className={`mb-1 px-1 text-[10px] font-semibold text-muted ${
                          msg.sender === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {msg.sender === "user" ? user?.pseudonym ?? "You" : "Ask AmWell"}
                      </p>

                      {msg.mediaUrl ? (
                        msg.mediaType === "image" ? (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.mediaUrl}
                              alt=""
                              className="max-h-48 rounded-[20px_20px_4px_20px] object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-[20px_20px_4px_20px] bg-primary px-4 py-2.5 text-sm text-white hover:brightness-95"
                          >
                            <Icon path={ICONS.folder} className="h-4 w-4 shrink-0" />
                            <span className="truncate">{msg.mediaName}</span>
                          </a>
                        )
                      ) : (
                        <div
                          className={`px-4 py-2.5 text-sm ${
                            msg.sender === "user"
                              ? "rounded-[20px_20px_4px_20px] bg-primary text-white"
                              : "rounded-[20px_20px_20px_4px] bg-accent-gray-bg text-heading"
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}

                      {msg.products && msg.products.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.products.map((p) => (
                            <div key={p._id} className="w-40 rounded-lg border border-border bg-input-bg p-2">
                              {p.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imageUrl} alt={p.name} className="h-20 w-full rounded object-cover" />
                              )}
                              <p className="mt-1 line-clamp-2 text-xs font-semibold text-heading">{p.name}</p>
                              {p.manufacturerName && (
                                <p className="truncate text-[10px] text-muted">{p.manufacturerName}</p>
                              )}
                              <p className="mt-0.5 text-xs font-bold text-primary">₦{p.price.toLocaleString()}</p>
                              {p.drugId && (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(p)}
                                  disabled={addingProductId === p._id}
                                  className="mt-1.5 w-full rounded-full bg-primary py-1 text-[10px] font-semibold text-white disabled:opacity-60"
                                >
                                  {addedProductId === p._id ? "Added ✓" : addingProductId === p._id ? "Adding..." : "Add to Cart"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <p
                        className={`mt-1 px-1 text-[10px] text-muted ${
                          msg.sender === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {formatMessageTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {sending && <p className="text-xs text-muted">Ask AmWell is typing...</p>}
            {transcribing && <p className="text-xs text-muted">Transcribing your voice message...</p>}
            {uploading && <p className="text-xs text-muted">Uploading...</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          {recording && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Listening... tap the mic to stop and send.
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                disabled={busy || recording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-input-bg disabled:opacity-50"
                aria-label="Attach a file"
              >
                <Icon path={ICONS.paperclip} className="h-5 w-5" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 z-20 w-44 rounded-card border border-border bg-card-bg p-2 shadow-atmospheric">
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

            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={busy || recording}
              placeholder={recording ? "Listening..." : "Type your question..."}
              className="flex-1"
            />

            {canRecord && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={busy && !recording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                  recording ? "bg-error text-on-error" : "text-muted hover:bg-input-bg"
                }`}
                aria-label={recording ? "Stop recording" : "Record a voice message"}
              >
                <Icon path={ICONS.mic} className="h-5 w-5" />
              </button>
            )}

            <Button loading={sending} disabled={!draft.trim() || busy || recording} onClick={handleSend}>
              Send
            </Button>
          </div>

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

          <p className="mt-2 text-center text-xs text-muted">Your conversation is private and confidential.</p>
        </div>
      </div>

      <Modal open={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)}>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10">
            <Icon path={ICONS.whatsapp} className="h-8 w-8 text-[#25D366]" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-heading">Chat on WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">Get instant responses on WhatsApp! Our AI assistant is available 24/7.</p>

          <div className="mt-4 flex flex-col gap-2 text-left">
            {WHATSAPP_BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-heading">
                <Icon path={ICONS.check} className="h-4 w-4 shrink-0 text-[#25D366]" />
                {b}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openWhatsApp}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-sm font-semibold text-white hover:brightness-95"
          >
            <Icon path={ICONS.whatsapp} className="h-4 w-4" />
            Open WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setShowWhatsAppModal(false)}
            className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-muted hover:bg-input-bg"
          >
            Continue Here
          </button>

          <p className="mt-4 text-xs text-muted">
            Or message us directly at <span className="font-semibold text-heading">+{SUPPORT_PHONE_DIGITS}</span>
          </p>
        </div>
      </Modal>
    </div>
  );
}
