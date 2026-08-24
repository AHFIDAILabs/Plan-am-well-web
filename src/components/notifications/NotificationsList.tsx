"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { AppNotification } from "@/lib/types";

const TYPE_ICON: Record<string, string> = {
  appointment: "📅",
  new_message: "💬",
  chat: "💬",
  call_ended: "📞",
  order: "🛒",
  supplement: "💊",
  article: "📰",
  comment_flagged: "⚠️",
  system: "🔔",
};

function notificationLink(
  n: AppNotification,
  paths: { appointments: string; appointmentDetailBase?: string; messages: string }
): string | null {
  const appointmentId = n.metadata?.appointmentId;
  if (!appointmentId) return null;
  if (n.type === "new_message" || n.type === "chat") return `${paths.messages}/${appointmentId}`;
  if (n.type === "appointment") {
    return paths.appointmentDetailBase ? `${paths.appointmentDetailBase}/${appointmentId}` : paths.appointments;
  }
  return null;
}

export function NotificationsList({
  appointmentsPath,
  appointmentDetailBase,
  messagesPath,
}: {
  appointmentsPath: string;
  appointmentDetailBase?: string;
  messagesPath: string;
}) {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  function load() {
    apiGet<{ success: boolean; data?: AppNotification[]; message?: string }>("/api/notifications").then(
      ({ data }) => {
        if (data.success && data.data) {
          setNotifications(data.data);
        } else {
          setError(data.message ?? "Could not load notifications.");
        }
      }
    );
  }

  useEffect(load, []);

  async function handleMarkRead(id: string) {
    await apiPut(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev?.map((n) => (n._id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    await apiPut("/api/notifications/read-all");
    setMarkingAll(false);
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  async function handleDelete(id: string) {
    await apiDelete(`/api/notifications/${id}`);
    setNotifications((prev) => prev?.filter((n) => n._id !== id) ?? null);
  }

  const hasUnread = notifications?.some((n) => !n.isRead) ?? false;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-heading">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Updates on your appointments, messages, and account.</p>
        </div>
        {hasUnread && (
          <Button variant="outline" loading={markingAll} onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!notifications && !error && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {notifications && notifications.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">No notifications yet.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {notifications?.map((n) => {
          const href = notificationLink(n, { appointments: appointmentsPath, appointmentDetailBase, messages: messagesPath });
          const content = (
            <div
              className={`flex items-start gap-3 rounded-2xl p-4 shadow-atmospheric transition-shadow hover:shadow-md ${
                n.isRead ? "bg-card-bg" : "bg-accent-pink-bg/40"
              }`}
            >
              <span className="text-xl">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.isRead ? "font-medium text-body" : "font-bold text-heading"}`}>
                    {n.title}
                  </p>
                  {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(n.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold">
                {!n.isRead && (
                  <button
                    className="text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      handleMarkRead(n._id);
                    }}
                  >
                    Mark read
                  </button>
                )}
                <button
                  className="text-red-600"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(n._id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );

          return href ? (
            <Link key={n._id} href={href} onClick={() => !n.isRead && handleMarkRead(n._id)}>
              {content}
            </Link>
          ) : (
            <div key={n._id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
