"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AppNotification } from "@/lib/types";
import { useNotifications } from "@/context/NotificationContext";

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
  paths: { appointments: string; appointmentDetailBase?: string; messages: string; orders?: string }
): string | null {
  // "Complete Your Payment" (and other order notifications) previously fell
  // through to null here since this only ever checked appointmentId — the
  // notification was un-clickable, the one entry point that existed to it.
  // orders is only passed by the patient portal (see app/notifications/page.tsx)
  // — orders are never created for/notified to doctor accounts, so the
  // provider portal's usage of this same component simply omits it.
  if (n.type === "order" && n.metadata?.orderId && paths.orders) {
    return `${paths.orders}/${n.metadata.orderId}`;
  }

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
  ordersPath,
}: {
  appointmentsPath: string;
  appointmentDetailBase?: string;
  messagesPath: string;
  ordersPath?: string;
}) {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  async function handleMarkRead(id: string) {
    await markAsRead(id);
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  }

  async function handleDelete(id: string) {
    await deleteNotification(id);
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

      {!notifications && <p className="mt-6 text-sm text-muted">Loading...</p>}
      {notifications && notifications.length === 0 && (
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">No notifications yet.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {notifications?.map((n) => {
          const href = notificationLink(n, {
            appointments: appointmentsPath,
            appointmentDetailBase,
            messages: messagesPath,
            orders: ordersPath,
          });
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
